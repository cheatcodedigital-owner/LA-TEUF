-- Codes promo générés depuis l'admin et affiliation des influenceurs
--
--  * `affiliates` : un code par influenceur. Le code s'entre dans le champ « code promo » : sur le tarif standard
--    l'acheteur reçoit `rate_pct` % de remise (20 %) et ce même montant est dû à l'influenceur (commission figée sur la
--    commande dans `affiliate_commission_xof`, comptée seulement si la commande est payée).
--  * Pas de cumul avec la remise de groupe : on retient la plus avantageuse. À égalité, le code d'affiliation l'emporte
--    (l'acheteur paie pareil, l'influenceur est crédité).
--  * Pas de code promo ni d'affiliation sur l'early bird (comme les codes promo).
--  * `access_token` : secret du lien de suivi de l'influenceur (/influenceur/<token>), régénérable.
--  * `affiliate_payouts` : versements faits aux influenceurs (le solde dû = commissions payées - versements).
--  * Un code ne peut exister qu'une fois, promo ou affiliation (triggers).

create table affiliates (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  code         text not null unique check (code = upper(code) and code ~ '^[A-Z0-9_-]{3,32}$'),
  contact      text,
  rate_pct     int  not null default 20 check (rate_pct between 1 and 50),
  access_token text not null unique
               default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

create table affiliate_payouts (
  id           uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references affiliates (id) on delete cascade,
  amount_xof   int  not null check (amount_xof > 0),
  paid_at      timestamptz not null default now(),
  note         text,
  created_at   timestamptz not null default now()
);
create index affiliate_payouts_affiliate_idx on affiliate_payouts (affiliate_id);

alter table affiliates        enable row level security;
alter table affiliate_payouts enable row level security;

alter table promo_codes add column label text;  -- usage interne (ex. « Story Instagram »)

alter table orders add column affiliate_id uuid references affiliates (id);
alter table orders add column affiliate_commission_xof int not null default 0 check (affiliate_commission_xof >= 0);
create index orders_affiliate_idx on orders (affiliate_id, status);

-- Un code est unique sur promo_codes ET affiliates
create function _code_is_free()
returns trigger
language plpgsql as $$
begin
  if tg_table_name = 'promo_codes' and exists (select 1 from affiliates where code = new.code) then
    raise exception 'code_taken';
  end if;
  if tg_table_name = 'affiliates' and exists (select 1 from promo_codes where code = new.code) then
    raise exception 'code_taken';
  end if;
  return new;
end $$;

create trigger promo_codes_code_free before insert or update of code on promo_codes
  for each row execute function _code_is_free();
create trigger affiliates_code_free before insert or update of code on affiliates
  for each row execute function _code_is_free();

revoke all on function _code_is_free() from public, anon, authenticated;

-- Réservation : accepte aussi les codes d'affiliation (même signature que 0002 : droits conservés)
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
  aff_disc   int := 0;
  discount   int := 0;
  use_promo  boolean := false;
  use_aff    boolean := false;
  oid        uuid;
  v_code     text := upper(btrim(coalesce(p_promo, '')));
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

  if v_code <> '' then
    if tier.kind = 'early_bird' then raise exception 'promo_not_allowed'; end if;

    select * into pc from promo_codes where promo_codes.code = v_code for update;
    if found then
      if not pc.active
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
    else
      select * into af from affiliates where affiliates.code = v_code and active;
      if not found then raise exception 'invalid_promo'; end if;
      aff_disc := floor(subtotal * af.rate_pct / 100.0)::int;
      use_aff  := aff_disc > 0 and aff_disc >= auto_disc;
    end if;
  end if;

  discount := case when use_promo then promo_disc when use_aff then aff_disc else auto_disc end;

  update orders set status = 'cancelled'
    where event_id = e.id and lower(buyer_email) = lower(btrim(p_email))
      and status = 'pending' and channel = 'online';

  insert into orders (
    event_id, ticket_type_id, quantity, unit_price_xof, subtotal_xof, discount_xof, total_xof,
    buyer_name, buyer_email, buyer_whatsapp, buyer_country, promo_code_id, affiliate_ref, expires_at,
    auto_discount_pct, affiliate_id, affiliate_commission_xof
  ) values (
    e.id, tier.ticket_type_id, p_quantity, tier.price_xof, subtotal, discount, subtotal - discount,
    btrim(p_name), lower(btrim(p_email)), btrim(p_whatsapp), btrim(p_country),
    case when use_promo then pc.id else null end,
    nullif(btrim(p_affiliate), ''), expires,
    case when use_promo or use_aff then 0 else auto_pct end,
    case when use_aff then af.id else null end,
    case when use_aff then discount else 0 end
  ) returning id into oid;

  return jsonb_build_object(
    'orderId', oid, 'expiresAt', expires, 'quantity', p_quantity,
    'unitPriceXof', tier.price_xof, 'subtotalXof', subtotal,
    'discountXof', discount, 'totalXof', subtotal - discount,
    'autoDiscountPct', case when use_promo or use_aff then 0 else auto_pct end,
    'promoApplied', use_promo or use_aff,
    'affiliateApplied', use_aff);
end $$;
