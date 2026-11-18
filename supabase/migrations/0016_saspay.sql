-- 18/11/2026 : second prestataire de paiement, SasPay (checkout hébergé), à côté de Kkiapay qui reste en place.
-- Le prestataire actif est choisi par la variable d'environnement PAYMENT_PROVIDER (kkiapay | saspay).
--
--  * `orders.payment_provider` : prestataire qui a encaissé (ou doit encaisser) la commande.
--  * `orders.saspay_session_id` / `saspay_checkout_url` : session de checkout créée côté serveur. Une seule par commande :
--    un double clic ou une relance réutilise la même (SasPay ne prend pas d'Idempotency-Key sur /checkout-sessions/).
--  * `orders.saspay_transaction_id` : transaction SasPay vérifiée (SUCCESS) qui a payé la commande. Unique : une
--    transaction ne paie jamais deux commandes.
--  * `mark_order_paid` reçoit le prestataire. La garantie « une commande n'émet jamais deux jeux de billets » est
--    inchangée : verrou sur la commande, et une commande déjà payée renvoie ses billets existants.

alter table orders add column payment_provider text check (payment_provider in ('kkiapay', 'saspay'));
alter table orders add column saspay_session_id text unique;
alter table orders add column saspay_checkout_url text;
alter table orders add column saspay_transaction_id text unique;

-- Recherche des commandes SasPay en attente de rapprochement (webhook → session → commande)
create index orders_saspay_open_idx on orders (created_at) where saspay_session_id is not null and saspay_transaction_id is null;

-- Les commandes payées avant cette migration l'ont été par Kkiapay
update orders set payment_provider = 'kkiapay' where kkiapay_transaction_id is not null;

-- Rattache une session de checkout SasPay à une commande encore payable. Atomique : si une session est déjà
-- rattachée (double clic, deux onglets), elle est renvoyée et la nouvelle doit être annulée par l'appelant.
-- result : attached | existing | not_payable
create function attach_saspay_session(p_order_id uuid, p_session_id text, p_checkout_url text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  o orders;
begin
  select * into o from orders where id = p_order_id for update;
  if not found or o.status <> 'pending' or o.expires_at <= now() then
    return jsonb_build_object('result', 'not_payable');
  end if;
  if o.saspay_session_id is not null then
    return jsonb_build_object('result', 'existing', 'sessionId', o.saspay_session_id, 'checkoutUrl', o.saspay_checkout_url);
  end if;
  update orders set payment_provider = 'saspay', saspay_session_id = p_session_id, saspay_checkout_url = p_checkout_url
    where id = o.id;
  return jsonb_build_object('result', 'attached', 'sessionId', p_session_id, 'checkoutUrl', p_checkout_url);
end $$;

-- Paiement confirmé (après vérification serveur auprès du prestataire). Remplace la version à 3 arguments :
-- le 4e (prestataire) vaut 'kkiapay' par défaut, les appels existants restent valides.
drop function mark_order_paid(uuid, text, int);

create function mark_order_paid(p_order_id uuid, p_transaction_id text, p_amount_xof int, p_provider text default 'kkiapay')
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  o     orders;
  e     events;
  tier  record;
  tids  jsonb;
  v_seats int;
begin
  if p_provider not in ('kkiapay', 'saspay') then raise exception 'invalid_provider'; end if;

  select * into o from orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;

  select * into e from events where id = o.event_id for update;

  -- Déjà payée : aucun nouveau billet, on renvoie ceux qui existent (webhook rejoué, double confirmation)
  if o.status = 'paid' then
    select coalesce(jsonb_agg(id order by created_at, id), '[]'::jsonb) into tids from tickets where order_id = o.id;
    return jsonb_build_object('status', 'paid', 'ticketIds', tids);
  end if;

  if o.status in ('refund_needed', 'refunded', 'failed') then
    return jsonb_build_object('status', o.status::text, 'ticketIds', '[]'::jsonb);
  end if;

  -- Une transaction SasPay ne peut payer que la commande dont elle a ouvert la session
  if p_provider = 'saspay' and o.saspay_session_id is null then raise exception 'provider_mismatch'; end if;

  if p_amount_xof <> o.total_xof then raise exception 'amount_mismatch'; end if;

  if o.status <> 'pending' or o.expires_at <= now() then
    select * into tier from _tiers(o.event_id) t where t.ticket_type_id = o.ticket_type_id;
    if not found or tier.available < o.quantity then
      update orders set status = 'refund_needed', payment_provider = p_provider,
        kkiapay_transaction_id = case when p_provider = 'kkiapay' then p_transaction_id else kkiapay_transaction_id end,
        saspay_transaction_id  = case when p_provider = 'saspay'  then p_transaction_id else saspay_transaction_id end
        where id = o.id;
      return jsonb_build_object('status', 'refund_needed', 'ticketIds', '[]'::jsonb);
    end if;
  end if;

  update orders set status = 'paid', paid_at = now(), expires_at = null, payment_provider = p_provider,
    kkiapay_transaction_id = case when p_provider = 'kkiapay' then p_transaction_id else kkiapay_transaction_id end,
    saspay_transaction_id  = case when p_provider = 'saspay'  then p_transaction_id else saspay_transaction_id end
    where id = o.id;

  select seats into v_seats from ticket_types where id = o.ticket_type_id;

  insert into tickets (order_id, event_id, ticket_type_id, nonce)
  select o.id, o.event_id, o.ticket_type_id,
         replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
  from generate_series(1, o.quantity * v_seats);

  select coalesce(jsonb_agg(id order by created_at, id), '[]'::jsonb) into tids from tickets where order_id = o.id;
  return jsonb_build_object('status', 'paid', 'ticketIds', tids);
end $$;

-- Réservées au serveur (clé service_role), voir 0006
revoke all on function attach_saspay_session(uuid, text, text)    from public, anon, authenticated;
revoke all on function mark_order_paid(uuid, text, int, text)     from public, anon, authenticated;
grant execute on function attach_saspay_session(uuid, text, text) to service_role;
grant execute on function mark_order_paid(uuid, text, int, text)  to service_role;
