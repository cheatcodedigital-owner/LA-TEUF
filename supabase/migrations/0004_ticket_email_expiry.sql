-- E-mail du billet et validité du QR
--
--  * `orders.tickets_emailed_at` : horodatage de l'envoi de l'e-mail contenant les QR. Posé de façon atomique
--    avant l'envoi (une seule exécution gagne : confirmation navigateur et webhook ne doublonnent pas) et remis à
--    null si l'envoi échoue, pour qu'une relance puisse réessayer.
--  * Un billet est valable jusqu'à la fin du lendemain de la soirée (minuit UTC du jour J + 2 jours, exclu).
--    Après, le scan renvoie `expired`. Cette règle est dupliquée dans src/lib/ticketing/ticket-token.ts
--    (`ticketValidUntil`) pour l'affichage dans l'e-mail : la garder alignée avec `_ticket_valid_until`.

alter table orders add column tickets_emailed_at timestamptz;

create function _ticket_valid_until(p_starts_at timestamptz)
returns timestamptz
language sql stable as $$
  select (date_trunc('day', p_starts_at at time zone 'UTC') + interval '2 days') at time zone 'UTC';
$$;

revoke all on function _ticket_valid_until(timestamptz) from public;
grant execute on function _ticket_valid_until(timestamptz) to service_role;

-- result : ok | already_used | invalid | wrong_event | cancelled | expired
create or replace function scan_ticket(p_ticket_id uuid, p_nonce text, p_event_id uuid, p_staff uuid default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  t     tickets;
  res   text;
  until timestamptz;
begin
  select _ticket_valid_until(e.starts_at) into until from events e where e.id = p_event_id;

  update tickets set status = 'used', scanned_at = now(), scanned_by = p_staff
    where id = p_ticket_id and nonce = p_nonce and event_id = p_event_id and status = 'valid'
      and now() < until
    returning * into t;

  if found then
    insert into scan_log (ticket_id, event_id, result, staff_id) values (p_ticket_id, p_event_id, 'ok', p_staff);
    return jsonb_build_object('result', 'ok');
  end if;

  select * into t from tickets where id = p_ticket_id;
  if not found or t.nonce <> p_nonce then res := 'invalid';
  elsif t.event_id <> p_event_id then res := 'wrong_event';
  elsif t.status = 'used' then res := 'already_used';
  elsif t.status = 'valid' then res := 'expired';
  else res := 'cancelled';
  end if;

  insert into scan_log (ticket_id, event_id, result, staff_id) values (p_ticket_id, p_event_id, res, p_staff);
  return jsonb_build_object('result', res, 'scannedAt', t.scanned_at);
end $$;
