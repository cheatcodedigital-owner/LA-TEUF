-- 18/11/2026 : limites de débit partagées (audit de sécurité). Sur Vercel, un compteur gardé en mémoire ne vaut que pour
-- une instance et disparaît au redémarrage : les tentatives se comptent donc ici, en base, pour toutes les instances.
--
--  * `rate_limits` : un compteur par clé et par fenêtre (`scope:empreinte`). La clé ne contient jamais d'IP ni d'e-mail en
--    clair : le serveur envoie une empreinte HMAC (voir src/lib/security/rate-limit.ts).
--  * `rate_limit_hit` compte une tentative et renvoie le total de la fenêtre en cours ; `rate_limit_count` lit le total
--    sans compter ; `rate_limit_clear` remet à zéro (connexion réussie).
--  * `active_holds` : réservations encore actives (pending, non expirées) d'un même e-mail ou numéro WhatsApp. Empêche
--    un robot de bloquer tous les billets early bird en enchaînant les réservations sans payer.
-- Comme le reste de la billetterie : appelées uniquement par le serveur (clé service_role).

create table rate_limits (
  key          text primary key,
  window_start timestamptz not null default now(),
  hits         int not null default 0
);
create index rate_limits_window_idx on rate_limits (window_start);
alter table rate_limits enable row level security;
revoke all on table rate_limits from anon, authenticated;

create function rate_limit_hit(p_key text, p_window_seconds int)
returns int
language plpgsql security definer set search_path = public as $$
declare
  v_hits int;
  v_since timestamptz := now() - make_interval(secs => p_window_seconds);
begin
  insert into rate_limits as r (key, window_start, hits) values (p_key, now(), 1)
  on conflict (key) do update set
    hits         = case when r.window_start < v_since then 1 else r.hits + 1 end,
    window_start = case when r.window_start < v_since then now() else r.window_start end
  returning hits into v_hits;
  -- Ménage de temps en temps : les fenêtres de plus d'un jour ne servent plus
  if random() < 0.02 then
    delete from rate_limits where window_start < now() - interval '1 day';
  end if;
  return v_hits;
end $$;

create function rate_limit_count(p_key text, p_window_seconds int)
returns int
language sql stable security definer set search_path = public as $$
  select coalesce((select hits from rate_limits
    where key = p_key and window_start >= now() - make_interval(secs => p_window_seconds)), 0);
$$;

create function rate_limit_clear(p_key text)
returns void
language sql security definer set search_path = public as $$
  delete from rate_limits where key = p_key;
$$;

create function active_holds(p_email text, p_whatsapp text)
returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from orders
  where status = 'pending' and expires_at > now()
    and (lower(buyer_email) = lower(p_email) or buyer_whatsapp = p_whatsapp);
$$;

revoke all on function rate_limit_hit(text, int)   from public, anon, authenticated;
revoke all on function rate_limit_count(text, int) from public, anon, authenticated;
revoke all on function rate_limit_clear(text)      from public, anon, authenticated;
revoke all on function active_holds(text, text)    from public, anon, authenticated;
grant execute on function rate_limit_hit(text, int)   to service_role;
grant execute on function rate_limit_count(text, int) to service_role;
grant execute on function rate_limit_clear(text)      to service_role;
grant execute on function active_holds(text, text)    to service_role;
