# Injection and DDoS protection plan

> Later implementation: see [2026-10-08 rollout](ROLLOUT_2026-10-08.md) and the [current queue](README.md). Statements below about open source weaknesses or JavaScript-readable credentials describe the earlier review/design; deployment checks still apply.

Updated: 2026-10-07. This is a proposed plan, not a statement that protection has been deployed.

## Injection protection

This application uses MongoDB/Mongoose, so MongoDB operator injection is the immediate database-injection concern. MongoDB is not immune to injection. Existing `isNonEmptyString` checks protect important auth inputs, and search code uses escaped regular expressions.

Implement under SEC-10:

1. Validate body, query and route parameters with runtime schemas before controllers use them. TypeScript assertions do not validate incoming requests. Require exact scalar types, maximum string/array lengths, valid IDs, bounded integer quantities, allowed enum values and strict object keys. Apply schemas to JSON and multipart fields.
2. Build query filters from validated values. Never pass arbitrary body/query objects to find, update or aggregation operations; never allow a client to supply `$where`, `$expr`, `$regex` or arbitrary operators.
3. Replace request-body spreads in product create/update with explicit editable fields and server-built update operators. Reject client-controlled `$` operators and dotted update keys, while keeping legitimate server-built MongoDB operators intact.
4. Review Mongoose filter sanitization as defense in depth, with tests for intentional operator queries. Sanitization is not a replacement for schemas and allowlists.
5. Use a database identity restricted to this application's required database operations. Restrict network access using deployment-supported networking; keep credentials server-side and return generic unexpected errors.
6. Add regression cases for object/array values where strings are expected, operator-shaped fields, arbitrary update operators, malformed IDs and oversized searches. Rejections must leave data unchanged. Run only against local/staging fixtures.

If SQL is introduced later, use parameterized queries or correctly bound ORM queries. Never concatenate user input into SQL; allowlist identifiers such as sort columns that cannot be parameterized.

References: [OWASP NoSQL security](https://cheatsheetseries.owasp.org/cheatsheets/NoSQL_Security_Cheat_Sheet.html), [OWASP SQL injection prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html).

## DDoS and abuse protection

App rate limiting reduces abuse but cannot absorb a large network flood. Protection needs both hosting/edge controls and bounded application work. No setup guarantees immunity.

Implement under SEC-11, with checkout changes tracked under SEC-05:

1. Inventory protection for both the frontend and API. Documentation identifies Vercel and Railway deployments; verify actual current routing and provider controls. Apply CDN/WAF/DDoS controls to the API as well as the storefront. Select a provider only after verifying compatibility, budget and existing defenses.
2. Address direct-origin bypass. Protect or disable alternate origin domains where supported; use provider-supported private ingress or authenticated edge-to-origin requests. Reject missing origin authentication before expensive work. A public origin still needs its hosting provider's network-level defenses; CORS or a hidden URL does not prevent DDoS.
3. Validate trusted proxy configuration against the actual deployment. `app.set("trust proxy", 1)` assumes one hop; adding an edge can change that. Do not blindly trust arbitrary forwarded IP headers. Test that spoofed headers cannot evade limits.
4. Add endpoint-specific limits for checkout, quotes, shared carts, password attempts, 2FA changes and expensive searches. Combine IP, account and account-target buckets where relevant; do not let distributed IPs bypass all controls. Use a shared rate-limit store when running multiple app instances; current in-memory counters are process-local and reset on restart.
5. Bound body sizes, multipart fields, item counts, search lengths, pagination, request/concurrency budgets and external API timeouts. Add database query time limits where appropriate. Keep public catalog requests cheap; cache only public data, never personalized orders or sessions.
6. Use risk-based bot challenges for suspicious signup/contact/login activity. Verify challenge tokens on the server. Avoid browser challenges on server-to-server routes and payment callbacks; secure those with the appropriate protocol instead.
7. Monitor request rate, 429/5xx, latency, CPU/memory, database pressure and provider spending. Set alerts and record emergency edge rules, rollback instructions and recovery contacts. Scaling alone can turn an attack into a larger bill.
8. Verify with bounded, authorized local/staging load and synthetic rate-limit tests. Do not flood the live storefront, payment provider or courier API. Confirm normal shoppers behind shared mobile-network IPs can still check out.

Reference: [OWASP denial-of-service prevention](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html).
