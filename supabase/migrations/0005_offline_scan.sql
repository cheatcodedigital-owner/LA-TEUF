-- Scan hors ligne : synchronisation différée des entrées
--
--  * `scan_ticket_at` : comme `scan_ticket`, mais l'heure du scan est fournie (`p_at`, bornée à now()) pour qu'un scan fait
--    sans réseau soit daté de l'instant réel de l'entrée, y compris pour la règle d'expiration du billet.
--  * Idempotent par appareil : rejouer la même synchronisation (réponse perdue) renvoie `ok` au lieu de `already_used`.
--  * Deux appareils ayant validé le même billet hors ligne : le premier synchronisé l'emporte, l'autre reçoit
--    `already_used` avec l'heure et l'appareil du premier (visible dans le tableau de bord).
--  * `tickets.scanned_device` et `scan_log.device` : étiquette libre de l'appareil de scan (ex. « Entrée 1 »).

alter table tickets  add column scanned_device text;
alter table scan_log add column device text;
alter table scan_log add column scanned_for timestamptz;  -- heure réelle du scan (scanned_at = heure d'enregistrement)

create function scan_ticket_at(
  p_ticket_id uuid, p_nonce text, p_event_id uuid, p_at timestamptz, p_device text default null, p_staff uuid default null
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  t      tickets;
  res    text;
  until  timestamptz;
  at_ts  timestamptz := least(coalesce(p_at, now()), now());
  dev    text := nullif(left(btrim(coalesce(p_device, '')), 40), '');
begin
  select _ticket_valid_until(e.starts_at) into until from events e where e.id = p_event_id;

  update tickets set status = 'used', scanned_at = at_ts, scanned_by = p_staff, scanned_device = dev
    where id = p_ticket_id and nonce = p_nonce and event_id = p_event_id and status = 'valid'
      and at_ts < until
    returning * into t;

  if found then
    insert into scan_log (ticket_id, event_id, result, staff_id, device, scanned_for) values (p_ticket_id, p_event_id, 'ok', p_staff, dev, at_ts);
    return jsonb_build_object('result', 'ok');
  end if;

  select * into t from tickets where id = p_ticket_id;
  if not found or t.nonce <> p_nonce then res := 'invalid';
  elsif t.event_id <> p_event_id then res := 'wrong_event';
  elsif t.status = 'used' then
    -- Même appareil, même instant : rejeu d'une synchronisation déjà enregistrée
    if t.scanned_at = at_ts and t.scanned_device is not distinct from dev then
      return jsonb_build_object('result', 'ok', 'replayed', true);
    end if;
    res := 'already_used';
  elsif t.status = 'valid' then res := 'expired';
  else res := 'cancelled';
  end if;

  insert into scan_log (ticket_id, event_id, result, staff_id, device, scanned_for) values (p_ticket_id, p_event_id, res, p_staff, dev, at_ts);
  return jsonb_build_object('result', res, 'scannedAt', t.scanned_at, 'scannedDevice', t.scanned_device);
end $$;

revoke all on function scan_ticket_at(uuid, text, uuid, timestamptz, text, uuid) from public;
grant execute on function scan_ticket_at(uuid, text, uuid, timestamptz, text, uuid) to service_role;

-- Index pour le journal des scans du tableau de bord
create index scan_log_event_idx on scan_log (event_id, scanned_at desc);
