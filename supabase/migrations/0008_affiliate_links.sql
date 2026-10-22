-- Affiliation par liens (remplace les codes d'affiliation de la 0007)
--
--  * Un influenceur a un lien `/r/<slug>` (optionnellement `?c=<campagne>`). Le clic est compté dans `affiliate_clicks`
--    et un cookie de 30 jours rattache l'acheteur à l'influenceur (dernier clic).
--  * `create_order(p_affiliate = 'slug' ou 'slug:campagne')` rattache la commande à l'influenceur actif (slug inconnu ou
--    inactif : ignoré, jamais une erreur pour l'acheteur). Aucune remise pour l'acheteur.
--  * Commission = `rate_pct` % (20) du total de la commande, FIGÉE à la réservation dans `affiliate_commission_xof`
--    (total après remise de groupe ou code promo) ; elle n'est comptée que si la commande est payée.
--  * `affiliates.password_hash` : mot de passe de connexion à l'espace influenceur (scrypt, jamais en clair).
--  * Les codes promo génériques de l'admin sont inchangés.

drop trigger if exists promo_codes_code_free on promo_codes;
drop trigger if exists affiliates_code_free on affiliates;
drop function if exists _code_is_free();

-- Les anciens codes d'affiliation (remise acheteur) n'existent plus : on détache les commandes et on vide la table
-- (la 0007 n'a servi qu'à des essais).
update orders set affiliate_id = null, affiliate_commission_xof = 0 where affiliate_id is not null;
delete from affiliates;

alter table affiliates drop column access_token;
alter table affiliates drop constraint if exists affiliates_code_check;
alter table affiliates rename column code to slug;
alter table affiliates add constraint affiliates_slug_check check (slug = lower(slug) and slug ~ '^[a-z0-9]([a-z0-9-]{1,28})[a-z0-9]$');
alter table affiliates add column password_hash text;
alter table affiliates add column default_event_slug text;  -- destination du lien (null : prochain événement en vente)

create table affiliate_clicks (
  id           bigint generated always as identity primary key,
  affiliate_id uuid not null references affiliates (id) on delete cascade,
  campaign     text,
  visitor_id   text not null,
  created_at   timestamptz not null default now()
);
create index affiliate_clicks_affiliate_idx on affiliate_clicks (affiliate_id, created_at desc);
alter table affiliate_clicks enable row level security;

-- Réservation : p_affiliate = 'slug' ou 'slug:campagne' ; plus de code d'affiliation dans p_promo
create or replace function create_order(
  p_event_slug      text,
  p_ticket_type_id  uuid,
  p_quantity        int,
  p_name            text,
  p_email           text,
  p_whatsapp        text,
  p_country         text,
  p_promo           text    default null,
  p_affiliate       text    default null,
  p_hold_minutes    int     default 10,
  p_max_per_order   int     default 10
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  e          events;
  tier       record;
  pc         promo_codes;
  af         affiliates;
  used       int;
  subtotal   int;
  auto_pct   int;
  auto_disc  int;
  promo_disc int := 0;
  discount   int := 0;
  use_promo  boolean := false;
  oid        uuid;
  total      int;
  v_slug     text := lower(btrim(split_part(coalesce(p_affiliate, ''), ':', 1)));
  v_camp     text := nullif(left(regexp_replace(lower(btrim(coalesce(split_part(p_affiliate, ':', 2), ''))), '[^a-z0-9_-]', '', 'g'), 40), '');
  expires    timestamptz := now() + make_interval(mins => p_hold_minutes);
begin
  if p_quantity is null or p_quantity < 1 or p_quantity > p_max_per_order then
    raise exception 'invalid_quantity';
  end if;

  select * into e from events where slug = p_event_slug for update;
  if not found then raise exception 'event_not_found'; end if;
  if e.status <> 'on_sale' then raise exception 'sales_closed'; end if;

  select * into tier from _tiers(e.id) t where t.ticket_type_id = p_ticket_type_id;
  if not found or not tier.in_window then raise exception 'type_unavailable'; end if;
  if tier.available <= 0 then raise exception 'sold_out'; end if;
  if tier.available < p_quantity then
    raise exception 'not_enough' using detail = tier.available::text;
  end if;

  subtotal  := tier.price_xof * p_quantity;
  auto_pct  := _group_discount_pct(tier.kind, p_quantity);
  auto_disc := floor(subtotal * auto_pct / 100.0)::int;

  if p_promo is not null and btrim(p_promo) <> '' then
    if tier.kind = 'early_bird' then raise exception 'promo_not_allowed'; end if;

    select * into pc from promo_codes where code = upper(btrim(p_promo)) for update;
    if not found or not pc.active
       or (pc.event_id is not null and pc.event_id <> e.id)
       or (pc.starts_at is not null and now() < pc.starts_at)
       or (pc.ends_at is not null and now() >= pc.ends_at) then
      raise exception 'invalid_promo';
    end if;
    if pc.max_uses is not null then
      select count(*) into used from orders
        where promo_code_id = pc.id and (status = 'paid' or (status = 'pending' and expires_at > now()));
      if used >= pc.max_uses then raise exception 'promo_exhausted'; end if;
    end if;
    promo_disc := case pc.kind
      when 'percent' then floor(subtotal * pc.value / 100.0)::int
      else least(pc.value, subtotal) end;
    use_promo := promo_disc > auto_disc;
  end if;

  discount := case when use_promo then promo_disc else auto_disc end;
  total    := subtotal - discount;

  -- Influenceur : slug inconnu ou inactif ignoré
  if v_slug <> '' then
    select * into af from affiliates where slug = v_slug and active;
  end if;

  update orders set status = 'cancelled'
    where event_id = e.id and lower(buyer_email) = lower(btrim(p_email))
      and status = 'pending' and channel = 'online';

  insert into orders (
    event_id, ticket_type_id, quantity, unit_price_xof, subtotal_xof, discount_xof, total_xof,
    buyer_name, buyer_email, buyer_whatsapp, buyer_country, promo_code_id, affiliate_ref, expires_at,
    auto_discount_pct, affiliate_id, affiliate_commission_xof
  ) values (
    e.id, tier.ticket_type_id, p_quantity, tier.price_xof, subtotal, discount, total,
    btrim(p_name), lower(btrim(p_email)), btrim(p_whatsapp), btrim(p_country),
    case when use_promo then pc.id else null end,
    case when af.id is not null then v_camp else null end, expires,
    case when use_promo then 0 else auto_pct end,
    af.id,
    case when af.id is not null then floor(total * af.rate_pct / 100.0)::int else 0 end
  ) returning id into oid;

  return jsonb_build_object(
    'orderId', oid, 'expiresAt', expires, 'quantity', p_quantity,
    'unitPriceXof', tier.price_xof, 'subtotalXof', subtotal,
    'discountXof', discount, 'totalXof', total,
    'autoDiscountPct', case when use_promo then 0 else auto_pct end,
    'promoApplied', use_promo);
end $$;
