-- Les fonctions de la billetterie ne doivent être appelées que par le serveur (clé service_role).
-- Sur Supabase, `revoke ... from public` ne suffit pas : les privilèges par défaut du schéma public accordent
-- EXECUTE à `anon` et `authenticated` sur chaque nouvelle fonction, donc toute personne munie de la clé publique
-- pouvait appeler `mark_order_paid` & co. via l'API REST. On les retire explicitement.
revoke all on function _group_discount_pct(text, int)                                                   from anon, authenticated;
revoke all on function _ticket_valid_until(timestamptz)                                                 from anon, authenticated;
revoke all on function _tiers(uuid)                                                                     from anon, authenticated;
revoke all on function cancel_order(uuid, text)                                                         from anon, authenticated;
revoke all on function create_order(text, uuid, int, text, text, text, text, text, text, int, int)      from anon, authenticated;
revoke all on function event_sales(text)                                                                from anon, authenticated;
revoke all on function expire_stale_orders()                                                            from anon, authenticated;
revoke all on function mark_order_paid(uuid, text, int)                                                 from anon, authenticated;
revoke all on function order_payable(uuid)                                                              from anon, authenticated;
revoke all on function scan_ticket(uuid, text, uuid, uuid)                                              from anon, authenticated;
revoke all on function scan_ticket_at(uuid, text, uuid, timestamptz, text, uuid)                        from anon, authenticated;
