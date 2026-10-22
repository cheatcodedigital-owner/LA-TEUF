-- LA TEUF — billetterie : schéma, RLS et fonctions atomiques (anti-survente)
--
-- Principes
--  * Tout passe par des fonctions SECURITY DEFINER appelées côté serveur avec la clé service_role.
--    Le navigateur n'écrit jamais dans ces tables (RLS activée, aucune policy d'écriture).
--  * Une commande `pending` MAINTIENT ses places jusqu'à `expires_at` (réservation temporaire).
--    Les places maintenues et vendues sont comptées sous verrou de la ligne `events` :
--    deux achats simultanés sur le même événement sont donc sérialisés.
--  * Les paliers de tarif (early bird, standard) sont séquentiels : un palier n'est proposé que
--    si aucun palier de rang inférieur n'est encore en vente (bascule automatique).

-- ---------------------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------------------
create type event_status  as enum ('soon', 'on_sale', 'ended');
create type order_status  as enum ('pending', 'paid', 'cancelled', 'expired', 'failed', 'refund_needed', 'refunded');
create type order_channel as enum ('online', 'onsite');
create type ticket_status as enum ('valid', 'used', 'cancelled');
create type promo_kind    as enum ('percent', 'amount');

-- ---------------------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------------------
create table events (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null,
  venue      text,
  city       text not null,
  country    text not null,
  starts_at  timestamptz not null,
  capacity   int  not null check (capacity > 0),
  status     event_status not null default 'soon',
  created_at timestamptz not null default now()
);

create table ticket_types (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references events (id) on delete cascade,
  kind        text not null check (kind in ('early_bird', 'standard')),
  price_xof   int  not null check (price_xof >= 0),
  quota       int  check (quota > 0),          -- null : limité seulement par la capacité
  sales_start timestamptz,
  sales_end   timestamptz,
  sort        int  not null default 0,         -- rang du palier (le plus bas est proposé d'abord)
  unique (event_id, kind)
);

create table promo_codes (
  id        uuid primary key default gen_random_uuid(),
  code      text not null unique check (code = upper(code)),
  kind      promo_kind not null,
  value     int  not null check (value > 0),   -- % ou montant FCFA retiré de la commande
  max_uses  int  check (max_uses > 0),         -- nombre de commandes
  event_id  uuid references events (id) on delete cascade,  -- null : tous les événements
  starts_at timestamptz,
  ends_at   timestamptz,
  active    boolean not null default true,
  created_at timestamptz not null default now(),
  check (kind <> 'percent' or value <= 100)
);

create table orders (
  id                     uuid primary key default gen_random_uuid(),
  event_id               uuid not null references events (id),
  ticket_type_id         uuid not null references ticket_types (id),
  quantity               int  not null check (quantity > 0),
  unit_price_xof         int  not null check (unit_price_xof >= 0),
  subtotal_xof           int  not null check (subtotal_xof >= 0),
  discount_xof           int  not null default 0 check (discount_xof >= 0),
  total_xof              int  not null check (total_xof >= 0),
  buyer_name             text not null,
  buyer_email            text not null,
  buyer_whatsapp         text not null,
  buyer_country          text not null,
  status                 order_status  not null default 'pending',
  channel                order_channel not null default 'online',
  promo_code_id          uuid references promo_codes (id),
  affiliate_ref          text,
  kkiapay_transaction_id text unique,
  expires_at             timestamptz,           -- fin du maintien des places (commandes pending)
  created_at             timestamptz not null default now(),
  paid_at                timestamptz
);
create index orders_event_status_idx on orders (event_id, status, expires_at);
create index orders_type_status_idx  on orders (ticket_type_id, status, expires_at);
create index orders_email_idx        on orders (lower(buyer_email));

create table tickets (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references orders (id) on delete cascade,
  event_id       uuid not null references events (id),
  ticket_type_id uuid not null references ticket_types (id),
  status         ticket_status not null default 'valid',
  -- Secret aléatoire ; le QR contient `id.nonce` signé (HMAC) côté application
  nonce          text not null unique,
  scanned_at     timestamptz,
  scanned_by     uuid,
  created_at     timestamptz not null default now()
);
create index tickets_event_status_idx on tickets (event_id, status);
create index tickets_type_status_idx  on tickets (ticket_type_id, status);
create index tickets_order_idx        on tickets (order_id);

create table scan_log (
  id         bigint generated always as identity primary key,
  ticket_id  uuid,
  event_id   uuid,
  result     text not null,
  staff_id   uuid,
  scanned_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------------------
-- RLS : lecture publique des événements et des tarifs, rien d'autre
-- ---------------------------------------------------------------------------------------
alter table events       enable row level security;
alter table ticket_types enable row level security;
alter table promo_codes  enable row level security;
alter table orders       enable row level security;
alter table tickets      enable row level security;
alter table scan_log     enable row level security;

create policy "events lisibles par tous"       on events       for select using (true);
create policy "tarifs lisibles par tous"       on ticket_types for select using (true);

-- ---------------------------------------------------------------------------------------
-- Disponibilité : paliers avec places restantes (interne)
-- ---------------------------------------------------------------------------------------
create function _tiers(p_event uuid)
returns table (
  ticket_type_id uuid, kind text, price_xof int, sort int,
  sold int, held int, available int, in_window boolean, on_sale boolean, offered boolean
)
language sql stable security definer set search_path = public as $$
  with c as (
    select
      (select capacity from events where id = p_event) as cap,
      (select count(*) from tickets where event_id = p_event and status in ('valid', 'used')) as sold_e,
      (select coalesce(sum(quantity), 0) from orders
        where event_id = p_event and status = 'pending' and expires_at > now()) as held_e
  ),
  t as (
    select tt.*,
      (select count(*) from tickets k
        where k.ticket_type_id = tt.id and k.status in ('valid', 'used')) as sold_t,
      (select coalesce(sum(o.quantity), 0) from orders o
        where o.ticket_type_id = tt.id and o.status = 'pending' and o.expires_at > now()) as held_t
    from ticket_types tt where tt.event_id = p_event
  ),
  a as (
    select t.id, t.kind, t.price_xof, t.sort, t.sold_t, t.held_t,
      greatest(0, least(
        case when t.quota is null then c.cap else t.quota - t.sold_t - t.held_t end,
        c.cap - c.sold_e - c.held_e
      )) as avail,
      ((t.sales_start is null or now() >= t.sales_start)
        and (t.sales_end is null or now() < t.sales_end)) as in_window
    from t cross join c
  )
  select a.id, a.kind, a.price_xof, a.sort, a.sold_t::int, a.held_t::int, a.avail::int,
         a.in_window,
         (a.in_window and a.avail > 0),
         (a.in_window and a.avail > 0
           and not exists (select 1 from a a2 where a2.sort < a.sort and a2.in_window and a2.avail > 0))
  from a order by a.sort;
$$;

-- Vue publique de la billetterie d'un événement (jsonb)
create function event_sales(p_slug text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  e events;
  sold int;
  held int;
begin
  select * into e from events where slug = p_slug;
  if not found then return null; end if;

  select count(*) into sold from tickets where event_id = e.id and status in ('valid', 'used');
  select coalesce(sum(quantity), 0) into held from orders
    where event_id = e.id and status = 'pending' and expires_at > now();

  return jsonb_build_object(
    'event', jsonb_build_object(
      'id', e.id, 'slug', e.slug, 'name', e.name, 'venue', e.venue, 'city', e.city,
      'country', e.country, 'startsAt', e.starts_at, 'status', e.status, 'capacity', e.capacity),
    'remaining', greatest(0, e.capacity - sold - held),
    'soldOut', (e.capacity - sold - held) <= 0,
    'tiers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', ticket_type_id, 'kind', kind, 'priceXof', price_xof,
        'remaining', available, 'onSale', on_sale, 'offered', offered) order by sort)
      from _tiers(e.id)), '[]'::jsonb)
  );
end $$;

-- ---------------------------------------------------------------------------------------
-- Réservation : crée une commande `pending` qui maintient les places
-- Erreurs (message de l'exception) : event_not_found, sales_closed, invalid_quantity,
--   type_unavailable, sold_out, not_enough, invalid_promo, promo_exhausted
-- ---------------------------------------------------------------------------------------
create function create_order(
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
  p_max_per_order   int     default 6
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  e        events;
  tier     record;
  pc       promo_codes;
  used     int;
  subtotal int;
  discount int := 0;
  oid      uuid;
  expires  timestamptz := now() + make_interval(mins => p_hold_minutes);
begin
  if p_quantity is null or p_quantity < 1 or p_quantity > p_max_per_order then
    raise exception 'invalid_quantity';
  end if;

  -- Verrou de l'événement : sérialise toutes les réservations concurrentes
  select * into e from events where slug = p_event_slug for update;
  if not found then raise exception 'event_not_found'; end if;
  if e.status <> 'on_sale' then raise exception 'sales_closed'; end if;

  select * into tier from _tiers(e.id) t where t.ticket_type_id = p_ticket_type_id;
  if not found or not tier.offered then
    -- Palier absent, hors période ou masqué par un palier moins cher encore disponible
    if found and tier.in_window and tier.available <= 0 then raise exception 'sold_out'; end if;
    raise exception 'type_unavailable';
  end if;
  if tier.available <= 0 then raise exception 'sold_out'; end if;
  if tier.available < p_quantity then
    raise exception 'not_enough' using detail = tier.available::text;
  end if;

  subtotal := tier.price_xof * p_quantity;

  if p_promo is not null and btrim(p_promo) <> '' then
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
    discount := case pc.kind
      when 'percent' then floor(subtotal * pc.value / 100.0)::int
      else least(pc.value, subtotal) end;
  end if;

  -- Un acheteur ne garde qu'une réservation active par événement (évite de bloquer des places)
  update orders set status = 'cancelled'
    where event_id = e.id and lower(buyer_email) = lower(btrim(p_email))
      and status = 'pending' and channel = 'online';

  insert into orders (
    event_id, ticket_type_id, quantity, unit_price_xof, subtotal_xof, discount_xof, total_xof,
    buyer_name, buyer_email, buyer_whatsapp, buyer_country, promo_code_id, affiliate_ref, expires_at
  ) values (
    e.id, tier.ticket_type_id, p_quantity, tier.price_xof, subtotal, discount, subtotal - discount,
    btrim(p_name), lower(btrim(p_email)), btrim(p_whatsapp), btrim(p_country), pc.id,
    nullif(btrim(p_affiliate), ''), expires
  ) returning id into oid;

  return jsonb_build_object(
    'orderId', oid, 'expiresAt', expires, 'quantity', p_quantity,
    'unitPriceXof', tier.price_xof, 'subtotalXof', subtotal,
    'discountXof', discount, 'totalXof', subtotal - discount);
end $$;

-- ---------------------------------------------------------------------------------------
-- Paiement confirmé (webhook Kkiapay, après vérification serveur de la transaction)
-- Idempotent. Si le paiement arrive après l'expiration et que les places sont parties,
-- la commande passe en `refund_needed` (à rembourser) au lieu de survendre.
-- ---------------------------------------------------------------------------------------
create function mark_order_paid(p_order_id uuid, p_transaction_id text, p_amount_xof int)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  o     orders;
  e     events;
  tier  record;
  tids  jsonb;
begin
  select * into o from orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;

  -- Verrou de l'événement avant de recompter les places
  select * into e from events where id = o.event_id for update;

  if o.status = 'paid' then
    select coalesce(jsonb_agg(id order by created_at, id), '[]'::jsonb) into tids from tickets where order_id = o.id;
    return jsonb_build_object('status', 'paid', 'ticketIds', tids);
  end if;

  if o.status in ('refund_needed', 'refunded', 'failed') then
    return jsonb_build_object('status', o.status::text, 'ticketIds', '[]'::jsonb);
  end if;

  if p_amount_xof <> o.total_xof then raise exception 'amount_mismatch'; end if;

  -- Commande expirée ou remplacée : on ne l'honore que s'il reste de la place
  if o.status <> 'pending' or o.expires_at <= now() then
    select * into tier from _tiers(o.event_id) t where t.ticket_type_id = o.ticket_type_id;
    if not found or tier.available < o.quantity then
      update orders set status = 'refund_needed', kkiapay_transaction_id = p_transaction_id where id = o.id;
      return jsonb_build_object('status', 'refund_needed', 'ticketIds', '[]'::jsonb);
    end if;
  end if;

  update orders set status = 'paid', paid_at = now(), kkiapay_transaction_id = p_transaction_id,
                    expires_at = null where id = o.id;

  insert into tickets (order_id, event_id, ticket_type_id, nonce)
  select o.id, o.event_id, o.ticket_type_id,
         replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
  from generate_series(1, o.quantity);

  select coalesce(jsonb_agg(id order by created_at, id), '[]'::jsonb) into tids from tickets where order_id = o.id;
  return jsonb_build_object('status', 'paid', 'ticketIds', tids);
end $$;

-- Libère les réservations expirées (le comptage les ignore déjà ; ceci nettoie les statuts)
create function expire_stale_orders()
returns int
language sql security definer set search_path = public as $$
  with u as (
    update orders set status = 'expired'
    where status = 'pending' and expires_at <= now() returning 1
  ) select count(*)::int from u;
$$;

-- ---------------------------------------------------------------------------------------
-- Scan à l'entrée : usage unique, atomique
-- result : ok | already_used | invalid | wrong_event | cancelled
-- ---------------------------------------------------------------------------------------
create function scan_ticket(p_ticket_id uuid, p_nonce text, p_event_id uuid, p_staff uuid default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  t   tickets;
  res text;
begin
  update tickets set status = 'used', scanned_at = now(), scanned_by = p_staff
    where id = p_ticket_id and nonce = p_nonce and event_id = p_event_id and status = 'valid'
    returning * into t;

  if found then
    insert into scan_log (ticket_id, event_id, result, staff_id) values (p_ticket_id, p_event_id, 'ok', p_staff);
    return jsonb_build_object('result', 'ok');
  end if;

  select * into t from tickets where id = p_ticket_id;
  if not found or t.nonce <> p_nonce then res := 'invalid';
  elsif t.event_id <> p_event_id then res := 'wrong_event';
  elsif t.status = 'used' then res := 'already_used';
  else res := 'cancelled';
  end if;

  insert into scan_log (ticket_id, event_id, result, staff_id) values (p_ticket_id, p_event_id, res, p_staff);
  return jsonb_build_object('result', res, 'scannedAt', t.scanned_at);
end $$;

-- ---------------------------------------------------------------------------------------
-- Droits : seules les fonctions publiques de lecture sont ouvertes ; le reste est réservé
-- au rôle service_role (clé serveur).
-- ---------------------------------------------------------------------------------------
revoke all on function _tiers(uuid) from public;
revoke all on function event_sales(text) from public;
revoke all on function create_order(text, uuid, int, text, text, text, text, text, text, int, int) from public;
revoke all on function mark_order_paid(uuid, text, int) from public;
revoke all on function expire_stale_orders() from public;
revoke all on function scan_ticket(uuid, text, uuid, uuid) from public;

grant execute on function _tiers(uuid)                                                          to service_role;
grant execute on function event_sales(text)                                                     to service_role;
grant execute on function create_order(text, uuid, int, text, text, text, text, text, text, int, int) to service_role;
grant execute on function mark_order_paid(uuid, text, int)                                      to service_role;
grant execute on function expire_stale_orders()                                                 to service_role;
grant execute on function scan_ticket(uuid, text, uuid, uuid)                                   to service_role;
