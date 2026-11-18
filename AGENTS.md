<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Intégration de l'API SasPay

Règles officielles (https://docs.saspay.me/ai/agents-md), reprises telles quelles :

- Utilisez la documentation officielle : /llms.txt de la documentation SasPay.
- Utilisez la spécification OpenAPI : /api-reference/openapi.json.
- Utilisez l'URL de base `https://api.saspay.me/api/v1`.
- Effectuez toutes les requêtes SasPay depuis le backend.
- Stockez la clé API dans un gestionnaire de secrets ou une variable d'environnement.
- Ne placez jamais la clé API dans le frontend, les logs ou le dépôt Git.
- Envoyez la clé avec `Authorization: Bearer sk_test_...` en développement, `sk_live_...` en production.
- Montants : chaînes décimales (`"2500.00"`), jamais de flottants.
- Envoyez un `Idempotency-Key` sur `POST /payments/softpay/`, `POST /payouts/initialize/`, `POST /wallet-transfers/` et `POST /payments/{payment_id}/retry/`.
- Ne livrez un produit ou n'activez un accès que lorsque `GET /payments/{payment_id}/verify/` renvoie `SUCCESS`.
- Si `checkout_url` est non vide après un softpay, redirigez le client vers cette URL.
- Vérifiez la signature des webhooks (`X-Webhook-Signature`, `X-Webhook-Timestamp`) sur le corps brut, et rejetez un horodatage de plus de 300 secondes.
- Pour un retrait, whitelistez l'IP du serveur ; sinon l'appel renvoie `403 ip_not_whitelisted`.
- Gérez les réponses `401`, `403`, `404`, `409`, `422` et `429` selon l'endpoint ; en cas de `429`, espacez les appels.
- N'inventez aucun endpoint, champ, statut ou événement absent de la spécification OpenAPI.

Précisions propres à ce projet (en cas de doute, l'OpenAPI https://docs.saspay.me/api-reference/openapi.json fait foi) :

- Les clés `sk_test_...` s'utilisent avec l'URL sandbox `https://sandbox-api.saspay.me/api/v1` (page « Référence API » et `servers` de l'OpenAPI) ; `sk_live_...` avec `https://api.saspay.me/api/v1`.
- Clé secrète dans `SASPAY_SECRET_KEY`, secret de signature du webhook dans `SASPAY_WEBHOOK_SECRET` ; fournisseur actif choisi par `PAYMENT_PROVIDER` (`kkiapay` | `saspay`). Kkiapay reste en place.
- Le webhook `transaction.success` ne transporte ni `metadata` ni l'id de la session de checkout : la commande se retrouve par la session enregistrée sur la commande (`GET /checkout-sessions/{id}/status/` → `transaction_id`), jamais par le contenu du webhook seul.
