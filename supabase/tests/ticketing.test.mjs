// Tests du schéma billetterie sur un Postgres en mémoire (PGlite).
// Lancer : npm run test:db
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url)).replace(/\/$/, "");
const db = new PGlite();
await db.exec("create role anon; create role authenticated; create role service_role;");
for (const f of readdirSync(`${root}/migrations`).sort()) await db.exec(readFileSync(`${root}/migrations/${f}`, "utf8"));
await db.exec(readFileSync(`${root}/seed.sql`, "utf8"));

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => { if (cond) pass++; else fail++; console.log(`${cond ? "PASS" : "FAIL"}  ${name} ${cond ? "" : extra}`); };
const q = async (sql, params) => (await db.query(sql, params)).rows;
const err = async (fn) => { try { await fn(); return null; } catch (e) { return e.message; } };
const sales = async () => (await q("select event_sales('la-teuf-karma') as s"))[0].s;
const tier = (s, kind) => s.tiers.find((t) => t.kind === kind);
let n = 0;
const order = async (type, qty, over = {}) => {
  const a = { email: `buyer${n++}@x.com`, promo: null, ...over };
  return (await q("select create_order('la-teuf-karma',$1,$2,'Test',$3,'+22890000000','TG',$4) as o", [type, qty, a.email, a.promo]))[0].o;
};

// Place l'événement à `days` jours d'aujourd'hui et recale les fenêtres (J-21 → J-7 → J)
async function setEventIn(days) {
  await q("update events set starts_at = now() + make_interval(days => $1) where slug = 'la-teuf-karma'", [days]);
  await q(`update ticket_types tt set
      sales_start = case tt.kind when 'early_bird' then e.starts_at - interval '21 days' else e.starts_at - interval '7 days' end,
      sales_end   = case tt.kind when 'early_bird' then e.starts_at - interval '7 days'  else e.starts_at end
    from events e where e.id = tt.event_id and e.slug = 'la-teuf-karma'`);
}
const resetOrders = async () => { await q("delete from tickets"); await q("delete from orders"); };

// --- Seed : règles de vente ----------------------------------------------------------------
const seeded = await q("select kind, price_xof, quota, sort from ticket_types order by sort");
ok("seed : early bird 3000 ×60, standard 5000 ×100", seeded[0].quota === 60 && seeded[0].price_xof === 3000 && seeded[1].price_xof === 5000 && seeded[1].quota === 100);

// --- Phase 1 : avant l'ouverture (J-25) -----------------------------------------------------
await setEventIn(25);
let s = await sales();
ok("J-25 : early bird et standard ne sont pas encore en vente (upcoming)", tier(s, "early_bird").state === "upcoming" && tier(s, "standard").state === "upcoming");
ok("J-25 : les deux tarifs restent listés avec leur date d'ouverture", s.tiers.length === 2 && tier(s, "standard").salesStart && tier(s, "early_bird").salesStart);
ok("J-25 : achat impossible", (await err(() => order(tier(s, "early_bird").id, 1))) === "type_unavailable");

// --- Phase 2 : early bird (J-15) ------------------------------------------------------------
await setEventIn(15);
s = await sales();
const early = tier(s, "early_bird"), std2 = tier(s, "standard");
ok("J-15 : early bird en vente, standard en attente", early.state === "on_sale" && std2.state === "upcoming");
ok("J-15 : standard grisé → achat refusé", (await err(() => order(std2.id, 1))) === "type_unavailable");
let o = await order(early.id, 2);
ok("early bird 2 billets : 6000 FCFA sans remise", o.totalXof === 6000 && o.discountXof === 0 && o.autoDiscountPct === 0, JSON.stringify(o));
ok("11 billets refusés (max 10)", (await err(() => order(early.id, 11))) === "invalid_quantity");
ok("0 billet refusé", (await err(() => order(early.id, 0))) === "invalid_quantity");
await q("insert into promo_codes (code, kind, value) values ('TEUF10','percent',10), ('FIX500','amount',500), ('BIG','percent',30), ('SMALL','percent',5)");
ok("code promo refusé sur early bird", (await err(() => order(early.id, 1, { promo: "TEUF10" }))) === "promo_not_allowed");
o = await order(early.id, 10);
ok("early bird ×10 : aucune remise de groupe (réservée au standard)", o.discountXof === 0 && o.totalXof === 30000, JSON.stringify(o));

// Quota de 60 : on remplit avec des commandes de 10
await resetOrders();
for (let i = 0; i < 6; i++) await order(early.id, 10);
s = await sales();
ok("quota early bird atteint : sold_out", tier(s, "early_bird").state === "sold_out" && tier(s, "early_bird").remaining === 0, JSON.stringify(tier(s, "early_bird")));
ok("early bird complet : achat refusé (sold_out)", (await err(() => order(early.id, 1))) === "sold_out");
ok("early bird épuisé avant J-7 : le standard s'ouvre aussitôt", tier(s, "standard").state === "on_sale" && tier(s, "standard").remaining === 100, JSON.stringify(tier(s, "standard")));
const earlyStd = await order(tier(s, "standard").id, 2);
ok("achat standard possible avant J-7 une fois l'early bird épuisé", earlyStd.totalXof === 10000, JSON.stringify(earlyStd));
await q("update orders set expires_at = now() - interval '1 minute'");
s = await sales();
ok("réservations expirées : early bird rouvert, standard de nouveau en attente", tier(s, "early_bird").state === "on_sale" && tier(s, "standard").state === "upcoming");
await resetOrders();
await order(early.id, 10); await order(early.id, 10); await order(early.id, 10); await order(early.id, 10); await order(early.id, 10); await order(early.id, 5);
ok("early bird non épuisé (55/60) : standard toujours en attente avant J-7", tier(await sales(), "standard").state === "upcoming");
await resetOrders();
await order(early.id, 10); await order(early.id, 10); await order(early.id, 10); await order(early.id, 10); await order(early.id, 10);
await order(early.id, 5);
ok("not_enough : 6 demandés pour 5 restants", (await err(() => order(early.id, 6))) === "not_enough");

// --- Phase 3 : standard (J-3) ---------------------------------------------------------------
await setEventIn(3);
await resetOrders();
s = await sales();
const std3 = tier(s, "standard"), early3 = tier(s, "early_bird");
ok("J-3 : standard en vente, early bird fermé", std3.state === "on_sale" && early3.state === "closed");
ok("J-3 : early bird impossible à acheter", (await err(() => order(early3.id, 1))) === "type_unavailable");
const std = std3;
let r = await order(std.id, 1);
ok("standard ×1 : 5000, pas de remise", r.totalXof === 5000 && r.autoDiscountPct === 0);
r = await order(std.id, 4);
ok("standard ×4 : pas de remise", r.discountXof === 0 && r.totalXof === 20000);
r = await order(std.id, 5);
ok("standard ×5 : -10 % → 22500", r.autoDiscountPct === 10 && r.discountXof === 2500 && r.totalXof === 22500, JSON.stringify(r));
r = await order(std.id, 7);
ok("standard ×7 : -10 % → 31500", r.autoDiscountPct === 10 && r.totalXof === 31500, JSON.stringify(r));
r = await order(std.id, 8);
ok("standard ×8 : -15 % → 34000", r.autoDiscountPct === 15 && r.discountXof === 6000 && r.totalXof === 34000, JSON.stringify(r));
r = await order(std.id, 9);
ok("standard ×9 : -15 % → 38250", r.autoDiscountPct === 15 && r.totalXof === 38250, JSON.stringify(r));
r = await order(std.id, 10);
ok("standard ×10 : -20 % → 40000", r.autoDiscountPct === 20 && r.discountXof === 10000 && r.totalXof === 40000, JSON.stringify(r));

// --- Codes promo vs remise de groupe (pas de cumul, la meilleure gagne) ----------------------
r = await order(std.id, 2, { promo: "teuf10" });
ok("promo 10 % sur standard ×2 (aucune remise de groupe)", r.promoApplied === true && r.discountXof === 1000 && r.totalXof === 9000, JSON.stringify(r));
r = await order(std.id, 5, { promo: "SMALL" });
ok("×5 avec promo 5 % : la remise de groupe 10 % l'emporte, promo non consommée", r.promoApplied === false && r.autoDiscountPct === 10 && r.discountXof === 2500, JSON.stringify(r));
ok("la promo non retenue n'est pas liée à la commande", (await q("select promo_code_id from orders where id = $1", [r.orderId]))[0].promo_code_id === null);
r = await order(std.id, 5, { promo: "BIG" });
ok("×5 avec promo 30 % : la promo l'emporte", r.promoApplied === true && r.autoDiscountPct === 0 && r.discountXof === 7500, JSON.stringify(r));
r = await order(std.id, 3, { promo: "FIX500" });
ok("promo montant fixe", r.discountXof === 500 && r.totalXof === 14500, JSON.stringify(r));
ok("promo inconnue", (await err(() => order(std.id, 1, { promo: "ZZZ" }))) === "invalid_promo");
await q("update promo_codes set active = false where code = 'SMALL'");
ok("promo inactive", (await err(() => order(std.id, 1, { promo: "SMALL" }))) === "invalid_promo");
await q("insert into promo_codes (code, kind, value, max_uses) values ('ONCE','percent',10,1)");
await order(std.id, 1, { promo: "ONCE" });
ok("promo limitée à 1 usage → épuisée", (await err(() => order(std.id, 1, { promo: "ONCE" }))) === "promo_exhausted");

// --- Annulation par l'acheteur et contrôle avant paiement -----------------------------------
await resetOrders();
const mine = await order(std.id, 3, { email: "me@x.com" });
ok("3 places maintenues", (await sales()).remaining === 157);
ok("order_payable : payable", (await q("select order_payable($1) as p", [mine.orderId]))[0].p.payable === true);
ok("annulation refusée avec un autre e-mail", (await q("select cancel_order($1,'other@x.com') as c", [mine.orderId]))[0].c === false);
ok("annulation par l'acheteur", (await q("select cancel_order($1,'ME@x.com') as c", [mine.orderId]))[0].c === true);
ok("places libérées après annulation", (await sales()).remaining === 160);
ok("order_payable : plus payable", (await q("select order_payable($1) as p", [mine.orderId]))[0].p.payable === false);
ok("annulation idempotente (déjà annulée)", (await q("select cancel_order($1,'me@x.com') as c", [mine.orderId]))[0].c === false);
ok("order_payable : commande inconnue", (await q("select order_payable(gen_random_uuid()) as p"))[0].p.payable === false);

// --- Une réservation active par e-mail, expiration -------------------------------------------
await resetOrders();
await order(std.id, 3, { email: "same@x.com" }); await order(std.id, 2, { email: "same@x.com" });
ok("nouvelle réservation du même e-mail remplace l'ancienne", (await sales()).remaining === 158);
await q("update orders set expires_at = now() - interval '1 minute'");
ok("après expiration les places sont libérées", (await sales()).remaining === 160);
ok("expire_stale_orders", (await q("select expire_stale_orders() as n"))[0].n === 1);

// --- Paiement, billets, scan -----------------------------------------------------------------
await resetOrders();
const pay = await order(std.id, 2, { email: "pay@x.com" });
ok("montant incorrect refusé", (await err(() => q("select mark_order_paid($1,'txX',1)", [pay.orderId]))) === "amount_mismatch");
const p1 = (await q("select mark_order_paid($1,'tx1',$2) as p", [pay.orderId, pay.totalXof]))[0].p;
const p2 = (await q("select mark_order_paid($1,'tx1',$2) as p", [pay.orderId, pay.totalXof]))[0].p;
ok("paiement → 2 billets, idempotent", p1.status === "paid" && p1.ticketIds.length === 2 && JSON.stringify(p1.ticketIds) === JSON.stringify(p2.ticketIds));
const t1 = (await q("select id, nonce, event_id from tickets where order_id=$1 limit 1", [pay.orderId]))[0];
const scan = async (nonce = t1.nonce, ev = t1.event_id) => (await q("select scan_ticket($1,$2,$3) as r", [t1.id, nonce, ev]))[0].r.result;
ok("scan : faux nonce → invalid", (await scan("bad")) === "invalid");
ok("scan : ok", (await scan()) === "ok");
ok("scan : déjà utilisé", (await scan()) === "already_used");
const other = (await q("select id from events where slug='la-teuf-cotonou'"))[0].id;
ok("scan : mauvais événement", (await scan(t1.nonce, other)) === "wrong_event");

// Validité : jusqu'à la fin du lendemain de la soirée
const startsBefore = (await q("select starts_at from events where slug='la-teuf-karma'"))[0].starts_at;
const t2 = (await q("select id, nonce, event_id from tickets where order_id=$1 and id<>$2 limit 1", [pay.orderId, t1.id]))[0];
const scan2 = async () => (await q("select scan_ticket($1,$2,$3) as r", [t2.id, t2.nonce, t2.event_id]))[0].r.result;
await q("update events set starts_at = now() - interval '3 days' where slug='la-teuf-karma'");
ok("scan : après le lendemain de la soirée → expired", (await scan2()) === "expired");
await q("update events set starts_at = now() - interval '1 day' where slug='la-teuf-karma'");
ok("scan : le lendemain de la soirée → ok", (await scan2()) === "ok");
await q("update events set starts_at = $1 where slug='la-teuf-karma'", [startsBefore]);

// --- Pas de survente : paiement tardif sans place ---------------------------------------------
await resetOrders();
await q("update events set capacity = 3 where slug = 'la-teuf-karma'");
const late = await order(std.id, 3, { email: "late@x.com" });
ok("capacité atteinte : plus de réservation", (await err(() => order(std.id, 1))) === "sold_out");
await q("update orders set expires_at = now() - interval '1 second' where id=$1", [late.orderId]);
const taker = await order(std.id, 3, { email: "taker@x.com" });
await q("select mark_order_paid($1,'tx3',$2)", [taker.orderId, taker.totalXof]);
const lp = (await q("select mark_order_paid($1,'tx4',$2) as p", [late.orderId, late.totalXof]))[0].p;
ok("paiement après expiration sans place → refund_needed", lp.status === "refund_needed", JSON.stringify(lp));
ok("jamais plus de billets que la capacité", (await q("select count(*)::int n from tickets where status in ('valid','used')"))[0].n <= 3);
await q("update events set capacity = 160 where slug = 'la-teuf-karma'");

// --- RLS et droits ----------------------------------------------------------------------------
const rls = await q("select relrowsecurity from pg_class where relname in ('events','ticket_types','promo_codes','orders','tickets','scan_log')");
ok("RLS activée sur les 6 tables", rls.length === 6 && rls.every((r) => r.relrowsecurity));
const pol = await q("select cmd from pg_policies");
ok("seules 2 policies, en lecture", pol.length === 2 && pol.every((p) => p.cmd === "SELECT"));
const g = await q(`select
  has_function_privilege('anon','create_order(text,uuid,int,text,text,text,text,text,text,int,int)','execute') a1,
  has_function_privilege('anon','cancel_order(uuid,text)','execute') a2,
  has_function_privilege('anon','order_payable(uuid)','execute') a3,
  has_function_privilege('service_role','create_order(text,uuid,int,text,text,text,text,text,text,int,int)','execute') s1,
  has_function_privilege('service_role','cancel_order(uuid,text)','execute') s2`);
ok("fonctions interdites à anon, permises à service_role", !g[0].a1 && !g[0].a2 && !g[0].a3 && g[0].s1 && g[0].s2);

console.log(`\n${pass} réussis, ${fail} échoués`);
process.exit(fail ? 1 : 0);
