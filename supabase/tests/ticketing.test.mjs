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

// Place l'événement à `days` jours d'aujourd'hui et recale les fenêtres : early bird dès J-21 jusqu'au jour J,
// standard sans date (ouvert seulement quand l'early bird est épuisé), tables dès J-21 avec changement de prix à J-2
async function setEventIn(days) {
  await q("update events set starts_at = now() + make_interval(days => $1) where slug = 'la-teuf-karma'", [days]);
  await q(`update ticket_types tt set
      sales_start = case tt.kind when 'standard' then null else e.starts_at - interval '21 days' end,
      sales_end   = case tt.kind when 'table' then e.starts_at else date_trunc('day', e.starts_at at time zone 'UTC') at time zone 'UTC' end,
      price_step_at = case tt.kind when 'table' then e.starts_at - interval '2 days' end
    from events e where e.id = tt.event_id and e.slug = 'la-teuf-karma'`);
}
// `fill` : les 70 early birds sont vendus (le standard est ouvert) ; ce « remplissage » survit aux remises à zéro
let fill = false;
const resetOrders = async () => {
  await q("delete from tickets"); await q("delete from orders");
  if (!fill) return;
  const o = (await q(`insert into orders (event_id, ticket_type_id, quantity, unit_price_xof, subtotal_xof, total_xof, buyer_name, buyer_email, buyer_whatsapp, buyer_country, status, paid_at)
    select e.id, tt.id, 70, 5000, 350000, 350000, 'Remplissage', 'fill@x.com', '+22890000000', 'TG', 'paid', now()
    from events e join ticket_types tt on tt.event_id = e.id where e.slug = 'la-teuf-karma' and tt.kind = 'early_bird' returning id, event_id, ticket_type_id`))[0];
  await q("insert into tickets (order_id, event_id, ticket_type_id, nonce) select $1, $2, $3, 'fill' || g from generate_series(1, 70) g", [o.id, o.event_id, o.ticket_type_id]);
};

// --- Seed : règles de vente ----------------------------------------------------------------
const seeded = await q("select kind, price_xof, quota, sort from ticket_types order by sort");
ok("seed : early bird 5000 ×70, standard 8000 ×30", seeded[0].quota === 70 && seeded[0].price_xof === 5000 && seeded[1].price_xof === 8000 && seeded[1].quota === 30);
ok("seed : le standard n'a pas de date d'ouverture", (await q("select sales_start from ticket_types where kind='standard'"))[0].sales_start === null);
ok("seed : 4 tables de 6 personnes à 80000 (100000 dès le 18 novembre)", seeded[2].kind === "table" && seeded[2].quota === 4 && seeded[2].price_xof === 80000
  && (await q("select seats, price_after_xof from ticket_types where kind='table'"))[0].seats === 6
  && (await q("select price_after_xof from ticket_types where kind='table'"))[0].price_after_xof === 100000);
ok("seed : capacité générale 100", (await q("select capacity from events where slug='la-teuf-karma'"))[0].capacity === 100);

// --- Phase 1 : avant l'ouverture (J-25) -----------------------------------------------------
await setEventIn(25);
let s = await sales();
ok("J-25 : early bird et standard ne sont pas encore en vente (upcoming)", tier(s, "early_bird").state === "upcoming" && tier(s, "standard").state === "upcoming");
ok("J-25 : les tarifs restent listés (l'early bird avec sa date d'ouverture, le standard sans date)", s.tiers.length === 3 && tier(s, "early_bird").salesStart && tier(s, "standard").salesStart === null);
ok("J-25 : achat impossible", (await err(() => order(tier(s, "early_bird").id, 1))) === "type_unavailable");

// --- Phase 2 : early bird (J-15) ------------------------------------------------------------
await setEventIn(15);
s = await sales();
const early = tier(s, "early_bird"), std2 = tier(s, "standard");
ok("J-15 : early bird en vente, standard en attente", early.state === "on_sale" && std2.state === "upcoming");
ok("J-15 : standard grisé → achat refusé", (await err(() => order(std2.id, 1))) === "type_unavailable");
let o = await order(early.id, 2);
ok("early bird 2 billets : 10000 FCFA sans remise", o.totalXof === 10000 && o.discountXof === 0 && o.autoDiscountPct === 0, JSON.stringify(o));
ok("11 billets refusés (max 10)", (await err(() => order(early.id, 11))) === "invalid_quantity");
ok("0 billet refusé", (await err(() => order(early.id, 0))) === "invalid_quantity");
await q("insert into promo_codes (code, kind, value) values ('TEUF10','percent',10), ('FIX500','amount',500), ('BIG','percent',30), ('SMALL','percent',5)");
ok("code promo refusé sur early bird", (await err(() => order(early.id, 1, { promo: "TEUF10" }))) === "promo_not_allowed");
o = await order(early.id, 10);
ok("early bird ×10 : aucune remise de groupe (réservée au standard)", o.discountXof === 0 && o.totalXof === 50000, JSON.stringify(o));

// Quota de 70 : on remplit avec des commandes de 10
await resetOrders();
for (let i = 0; i < 7; i++) await order(early.id, 10);
s = await sales();
ok("quota early bird atteint : sold_out", tier(s, "early_bird").state === "sold_out" && tier(s, "early_bird").remaining === 0, JSON.stringify(tier(s, "early_bird")));
ok("early bird complet : achat refusé (sold_out)", (await err(() => order(early.id, 1))) === "sold_out");
ok("early bird épuisé : le standard s'ouvre aussitôt", tier(s, "standard").state === "on_sale" && tier(s, "standard").remaining === 30, JSON.stringify(tier(s, "standard")));
const earlyStd = await order(tier(s, "standard").id, 2);
ok("achat standard possible une fois l'early bird épuisé", earlyStd.totalXof === 16000, JSON.stringify(earlyStd));
await q("update orders set expires_at = now() - interval '1 minute'");
s = await sales();
ok("réservations expirées : early bird rouvert, standard de nouveau en attente", tier(s, "early_bird").state === "on_sale" && tier(s, "standard").state === "upcoming");
await resetOrders();
await order(early.id, 10); await order(early.id, 10); await order(early.id, 10); await order(early.id, 10); await order(early.id, 10); await order(early.id, 10); await order(early.id, 5);
ok("early bird non épuisé (65/70) : standard toujours en attente", tier(await sales(), "standard").state === "upcoming");
await setEventIn(1);
s = await sales();
ok("la veille (J-1), early bird non épuisé : early bird encore en vente, standard toujours en attente", tier(s, "early_bird").state === "on_sale" && tier(s, "standard").state === "upcoming", JSON.stringify(s.tiers));
await setEventIn(15);
await resetOrders();
await order(early.id, 10); await order(early.id, 10); await order(early.id, 10); await order(early.id, 10); await order(early.id, 10); await order(early.id, 10);
await order(early.id, 5);
ok("not_enough : 6 demandés pour 5 restants", (await err(() => order(early.id, 6))) === "not_enough");

// --- Phase 3 : standard (early bird épuisé) --------------------------------------------------
fill = true;
await setEventIn(3);
await resetOrders();
s = await sales();
const std3 = tier(s, "standard"), early3 = tier(s, "early_bird");
ok("early bird vendu (70/70) : standard en vente avec ses 30 places, early bird épuisé", std3.state === "on_sale" && std3.remaining === 30 && early3.state === "sold_out", JSON.stringify(s.tiers));
ok("early bird épuisé : achat impossible", (await err(() => order(early3.id, 1))) === "sold_out");
const std = std3;
let r = await order(std.id, 1);
ok("standard ×1 : 8000, pas de remise", r.totalXof === 8000 && r.autoDiscountPct === 0);
r = await order(std.id, 4);
ok("standard ×4 : pas de remise", r.discountXof === 0 && r.totalXof === 32000);
await resetOrders();
r = await order(std.id, 5);
ok("standard ×5 : -10 % → 36000", r.autoDiscountPct === 10 && r.discountXof === 4000 && r.totalXof === 36000, JSON.stringify(r));
await resetOrders();
r = await order(std.id, 7);
ok("standard ×7 : -10 % → 50400", r.autoDiscountPct === 10 && r.totalXof === 50400, JSON.stringify(r));
await resetOrders();
r = await order(std.id, 8);
ok("standard ×8 : -15 % → 54400", r.autoDiscountPct === 15 && r.discountXof === 9600 && r.totalXof === 54400, JSON.stringify(r));
await resetOrders();
r = await order(std.id, 9);
ok("standard ×9 : -15 % → 61200", r.autoDiscountPct === 15 && r.totalXof === 61200, JSON.stringify(r));
await resetOrders();
r = await order(std.id, 10);
ok("standard ×10 : -20 % → 64000", r.autoDiscountPct === 20 && r.discountXof === 16000 && r.totalXof === 64000, JSON.stringify(r));

await resetOrders();
// --- Codes promo vs remise de groupe (pas de cumul, la meilleure gagne) ----------------------
r = await order(std.id, 2, { promo: "teuf10" });
ok("promo 10 % sur standard ×2 (aucune remise de groupe)", r.promoApplied === true && r.discountXof === 1600 && r.totalXof === 14400, JSON.stringify(r));
r = await order(std.id, 5, { promo: "SMALL" });
ok("×5 avec promo 5 % : la remise de groupe 10 % l'emporte, promo non consommée", r.promoApplied === false && r.autoDiscountPct === 10 && r.discountXof === 4000, JSON.stringify(r));
ok("la promo non retenue n'est pas liée à la commande", (await q("select promo_code_id from orders where id = $1", [r.orderId]))[0].promo_code_id === null);
r = await order(std.id, 5, { promo: "BIG" });
ok("×5 avec promo 30 % : la promo l'emporte", r.promoApplied === true && r.autoDiscountPct === 0 && r.discountXof === 12000, JSON.stringify(r));
r = await order(std.id, 3, { promo: "FIX500" });
ok("promo montant fixe", r.discountXof === 500 && r.totalXof === 23500, JSON.stringify(r));
ok("promo inconnue", (await err(() => order(std.id, 1, { promo: "ZZZ" }))) === "invalid_promo");
await q("update promo_codes set active = false where code = 'SMALL'");
ok("promo inactive", (await err(() => order(std.id, 1, { promo: "SMALL" }))) === "invalid_promo");
await q("insert into promo_codes (code, kind, value, max_uses) values ('ONCE','percent',10,1)");
await order(std.id, 1, { promo: "ONCE" });
ok("promo limitée à 1 usage → épuisée", (await err(() => order(std.id, 1, { promo: "ONCE" }))) === "promo_exhausted");

await resetOrders();
// --- Affiliation par lien : rattachement, commission 20 % sur le total ------------------------
await q("insert into affiliates (name, slug) values ('Marie', 'marie'), ('Inactif', 'old-influ')");
await q("update affiliates set active = false where slug = 'old-influ'");
const aff = (await q("select id, rate_pct from affiliates where slug='marie'"))[0];
ok("affilié : taux 20 % par défaut", aff.rate_pct === 20);
ok("slug en majuscules refusé", (await err(() => q("insert into affiliates (name, slug) values ('X', 'ABC')"))) !== null);
ok("slug trop court refusé", (await err(() => q("insert into affiliates (name, slug) values ('X', 'ab')"))) !== null);
const withRef = async (type, qty, ref, over = {}) => (await q(
  "select create_order('la-teuf-karma',$1,$2,'Test',$3,'+22890000000','TG',$4,$5) as o",
  [type, qty, over.email ?? `buyer${n++}@x.com`, over.promo ?? null, ref]))[0].o;
r = await withRef(std.id, 2, "marie");
let ro = (await q("select affiliate_id, affiliate_commission_xof, affiliate_ref from orders where id=$1", [r.orderId]))[0];
ok("lien d'affilié : aucune remise pour l'acheteur", r.discountXof === 0 && r.totalXof === 16000, JSON.stringify(r));
ok("commission 20 % du total (3200 sur 16000), figée sur la commande", ro.affiliate_id === aff.id && ro.affiliate_commission_xof === 3200 && ro.affiliate_ref === null, JSON.stringify(ro));
r = await withRef(std.id, 1, "MARIE:Instagram Story!");
ro = (await q("select affiliate_id, affiliate_ref from orders where id=$1", [r.orderId]))[0];
ok("campagne nettoyée (minuscules, caractères sûrs) et slug insensible à la casse", ro.affiliate_id === aff.id && ro.affiliate_ref === "instagramstory", JSON.stringify(ro));
r = await withRef(std.id, 5, "marie");
ok("commission sur le total après remise de groupe (36000 → 7200)", r.totalXof === 36000 && (await q("select affiliate_commission_xof c from orders where id=$1", [r.orderId]))[0].c === 7200, JSON.stringify(r));
r = await withRef(std.id, 2, "marie", { promo: "TEUF10" });
ok("commission sur le total après code promo (14400 → 2880)", r.totalXof === 14400 && (await q("select affiliate_commission_xof c from orders where id=$1", [r.orderId]))[0].c === 2880, JSON.stringify(r));
r = await withRef(std.id, 1, "inconnu");
ok("slug inconnu ignoré (pas d'erreur, pas de commission)", (await q("select affiliate_id, affiliate_commission_xof c from orders where id=$1", [r.orderId]))[0].affiliate_id === null);
r = await withRef(std.id, 1, "old-influ");
ok("affilié inactif ignoré", (await q("select affiliate_id from orders where id=$1", [r.orderId]))[0].affiliate_id === null);
fill = false;
await resetOrders();
await setEventIn(15);
const e15 = tier(await sales(), "early_bird");
r = await withRef(e15.id, 2, "marie");
ok("l'early bird compte aussi : 20 % de 10000 = 2000", (await q("select affiliate_commission_xof c from orders where id=$1", [r.orderId]))[0].c === 2000, JSON.stringify(r));
fill = true;
await setEventIn(3);
await resetOrders();
const pa = await withRef(std.id, 2, "marie", { email: "pa@x.com" });
await withRef(std.id, 3, "marie", { email: "pb@x.com" });
await q("select mark_order_paid($1,'txa1',$2)", [pa.orderId, pa.totalXof]);
const due = (await q("select coalesce(sum(affiliate_commission_xof),0)::int as c, count(*)::int as n, coalesce(sum(total_xof),0)::int as t from orders where affiliate_id=$1 and status='paid'", [aff.id]))[0];
ok("commission comptée seulement sur les commandes payées (3200 sur 1 commande de 16000)", due.c === 3200 && due.n === 1 && due.t === 16000, JSON.stringify(due));
await q("insert into affiliate_clicks (affiliate_id, campaign, visitor_id) values ($1,'ig','v1'), ($1,'ig','v1'), ($1,null,'v2')", [aff.id]);
ok("clics comptés, visiteurs uniques distincts", (await q("select count(*)::int c, count(distinct visitor_id)::int u from affiliate_clicks where affiliate_id=$1", [aff.id]))[0].u === 2);
await q("insert into affiliate_payouts (affiliate_id, amount_xof) values ($1, 1500)", [aff.id]);
ok("versement enregistré", (await q("select sum(amount_xof)::int s from affiliate_payouts where affiliate_id=$1", [aff.id]))[0].s === 1500);
ok("versement nul refusé", (await err(() => q("insert into affiliate_payouts (affiliate_id, amount_xof) values ($1, 0)", [aff.id]))) !== null);
await resetOrders();

// --- Tables (salons de 6 personnes) : offre additionnelle, hors capacité générale -----------------
await resetOrders();
await setEventIn(3);
s = await sales();
const tbl = tier(s, "table");
ok("table : en vente, 4 restantes, 6 places par table, prix 80000", tbl.state === "on_sale" && tbl.remaining === 4 && tbl.seats === 6 && tbl.priceXof === 80000, JSON.stringify(tbl));
ok("table : le prochain prix (100000) et sa date sont annoncés", tbl.nextPriceXof === 100000 && !!tbl.nextPriceAt, JSON.stringify(tbl));
r = await order(tbl.id, 2);
ok("2 tables : 160000 FCFA, aucune remise de groupe", r.totalXof === 160000 && r.discountXof === 0 && r.autoDiscountPct === 0, JSON.stringify(r));
ok("code promo refusé sur une table", (await err(() => order(tbl.id, 1, { promo: "TEUF10" }))) === "promo_not_allowed");
s = await sales();
ok("tables réservées : 2 restantes, capacité générale intacte (30 restantes après les 70 early birds)", tier(s, "table").remaining === 2 && s.remaining === 30, JSON.stringify(s));
ok("5 tables refusées (quota 4)", (await err(() => order(tbl.id, 5))) === "not_enough");
const tp = await order(tbl.id, 1, { email: "table@x.com" });
await q("select mark_order_paid($1,'txT1',$2)", [tp.orderId, tp.totalXof]);
ok("table payée : 6 billets émis (un par personne)", (await q("select count(*)::int n from tickets where order_id=$1", [tp.orderId]))[0].n === 6);
s = await sales();
ok("table payée (1 vendue + 2 maintenues) : 1 restante, capacité générale inchangée", tier(s, "table").remaining === 1 && s.remaining === 30, JSON.stringify(tier(s, "table")));
await order(tbl.id, 1, { email: "t3@x.com" });
ok("4 tables prises : complet", (await err(() => order(tbl.id, 1))) === "sold_out" && tier(await sales(), "table").state === "sold_out");
await resetOrders();
await setEventIn(1);
const tbl1 = tier(await sales(), "table");
ok("dès le 18 novembre : table à 100000, plus de prochain prix", tbl1.priceXof === 100000 && tbl1.nextPriceXof == null, JSON.stringify(tbl1));
r = await order(tbl1.id, 1);
ok("1 table à 100000 FCFA", r.totalXof === 100000 && r.unitPriceXof === 100000, JSON.stringify(r));
await setEventIn(25);
ok("avant le 9 novembre : table en attente", tier(await sales(), "table").state === "upcoming");
await setEventIn(3);
await resetOrders();

// --- Annulation par l'acheteur et contrôle avant paiement -----------------------------------
await resetOrders();
const mine = await order(std.id, 3, { email: "me@x.com" });
ok("3 places maintenues", (await sales()).remaining === 27);
ok("order_payable : payable", (await q("select order_payable($1) as p", [mine.orderId]))[0].p.payable === true);
ok("annulation refusée avec un autre e-mail", (await q("select cancel_order($1,'other@x.com') as c", [mine.orderId]))[0].c === false);
ok("annulation par l'acheteur", (await q("select cancel_order($1,'ME@x.com') as c", [mine.orderId]))[0].c === true);
ok("places libérées après annulation", (await sales()).remaining === 30);
ok("order_payable : plus payable", (await q("select order_payable($1) as p", [mine.orderId]))[0].p.payable === false);
ok("annulation idempotente (déjà annulée)", (await q("select cancel_order($1,'me@x.com') as c", [mine.orderId]))[0].c === false);
ok("order_payable : commande inconnue", (await q("select order_payable(gen_random_uuid()) as p"))[0].p.payable === false);

// --- Une réservation active par e-mail, expiration -------------------------------------------
await resetOrders();
await order(std.id, 3, { email: "same@x.com" }); await order(std.id, 2, { email: "same@x.com" });
ok("nouvelle réservation du même e-mail remplace l'ancienne", (await sales()).remaining === 28);
await q("update orders set expires_at = now() - interval '1 minute'");
ok("après expiration les places sont libérées", (await sales()).remaining === 30);
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

// --- Scan hors ligne : synchronisation différée (scan_ticket_at) -------------------------------
await resetOrders();
const off = await order(std.id, 3, { email: "off@x.com" });
await q("select mark_order_paid($1,'txoff',$2)", [off.orderId, off.totalXof]);
const [o1, o2, o3] = await q("select id, nonce, event_id from tickets where order_id=$1 order by id", [off.orderId]);
const scanAt = async (t, at, device = "Entrée 1", nonce = t.nonce) =>
  (await q("select scan_ticket_at($1,$2,$3,$4,$5) as r", [t.id, nonce, t.event_id, at, device]))[0].r;
const earlier = new Date(Date.now() - 3600_000).toISOString();
ok("scan différé : faux nonce → invalid", (await scanAt(o1, earlier, "Entrée 1", "bad")).result === "invalid");
ok("scan différé : ok, daté de l'instant réel", (await scanAt(o1, earlier)).result === "ok");
const row = (await q("select scanned_at, scanned_device from tickets where id=$1", [o1.id]))[0];
ok("scan différé : heure et appareil enregistrés", new Date(row.scanned_at).toISOString() === earlier && row.scanned_device === "Entrée 1");
ok("scan différé : rejeu du même appareil → ok idempotent", (await scanAt(o1, earlier)).result === "ok");
const dup = await scanAt(o1, new Date().toISOString(), "Entrée 2");
ok("scan différé : autre appareil → already_used avec l'appareil du premier", dup.result === "already_used" && dup.scannedDevice === "Entrée 1", JSON.stringify(dup));
ok("scan différé : l'heure future est bornée à maintenant", (await scanAt(o2, new Date(Date.now() + 86400_000).toISOString())).result === "ok"
  && new Date((await q("select scanned_at from tickets where id=$1", [o2.id]))[0].scanned_at) <= new Date());
await q("update events set starts_at = now() - interval '3 days' where slug='la-teuf-karma'");
ok("scan différé : expiré selon l'instant du scan", (await scanAt(o3, new Date().toISOString())).result === "expired");
const during = (await q("select (starts_at + interval '1 hour') as at from events where slug='la-teuf-karma'"))[0].at;
ok("scan différé : scan fait pendant la validité, synchronisé après → ok (heure du scan retenue)", (await scanAt(o3, during)).result === "ok");
await q("update events set starts_at = $1 where slug='la-teuf-karma'", [startsBefore]);
ok("journal : les scans différés sont tracés avec l'appareil", (await q("select count(*)::int n from scan_log where device is not null"))[0].n >= 4);
ok("scan_ticket_at interdit à anon, permis à service_role", await (async () => {
  const r = (await q(`select has_function_privilege('anon','scan_ticket_at(uuid,text,uuid,timestamptz,text,uuid)','execute') a,
    has_function_privilege('service_role','scan_ticket_at(uuid,text,uuid,timestamptz,text,uuid)','execute') s`))[0];
  return !r.a && r.s;
})());

// --- Pas de survente : paiement tardif sans place ---------------------------------------------
fill = false;
await resetOrders();
await setEventIn(15);
const eb = tier(await sales(), "early_bird");
await q("update events set capacity = 3 where slug = 'la-teuf-karma'");
const late = await order(eb.id, 3, { email: "late@x.com" });
ok("capacité atteinte : plus de réservation", (await err(() => order(eb.id, 1))) === "sold_out");
await q("update orders set expires_at = now() - interval '1 second' where id=$1", [late.orderId]);
const taker = await order(eb.id, 3, { email: "taker@x.com" });
await q("select mark_order_paid($1,'tx3',$2)", [taker.orderId, taker.totalXof]);
const lp = (await q("select mark_order_paid($1,'tx4',$2) as p", [late.orderId, late.totalXof]))[0].p;
ok("paiement après expiration sans place → refund_needed", lp.status === "refund_needed", JSON.stringify(lp));
ok("jamais plus de billets que la capacité", (await q("select count(*)::int n from tickets where status in ('valid','used')"))[0].n <= 3);
await q("update events set capacity = 100 where slug = 'la-teuf-karma'");

// --- Jour J : early bird et standard fermés (vente physique), tables encore en vente --------------
await resetOrders();
await q("update ticket_types set sales_end = now() - interval '1 minute' where kind in ('early_bird','standard')");
s = await sales();
ok("jour J, early bird non épuisé : early bird fermé, standard toujours en attente (jamais ouvert)", tier(s, "early_bird").state === "closed" && !tier(s, "standard").onSale, JSON.stringify(s.tiers));
ok("jour J : achat early bird refusé", (await err(() => order(tier(s, "early_bird").id, 1))) === "type_unavailable");
fill = true;
await resetOrders();
s = await sales();
ok("jour J, early bird épuisé : standard fermé aussi (pas d'achat en ligne)", tier(s, "standard").state === "closed" && !tier(s, "standard").onSale, JSON.stringify(tier(s, "standard")));
ok("jour J : achat standard refusé", (await err(() => order(tier(s, "standard").id, 1))) === "type_unavailable");
ok("jour J : les tables restent en vente", tier(s, "table").onSale === true, JSON.stringify(tier(s, "table")));
fill = false;
await resetOrders();

// --- RLS et droits ----------------------------------------------------------------------------
const rls = await q("select relrowsecurity from pg_class where relname in ('events','ticket_types','promo_codes','orders','tickets','scan_log')");
ok("RLS activée sur les 6 tables", rls.length === 6 && rls.every((r) => r.relrowsecurity));
const rls2 = await q("select relrowsecurity from pg_class where relname in ('affiliates','affiliate_payouts','affiliate_clicks')");
ok("RLS activée sur affiliates, affiliate_payouts et affiliate_clicks", rls2.length === 3 && rls2.every((r) => r.relrowsecurity));
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
