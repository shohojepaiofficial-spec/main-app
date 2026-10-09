# Security handoff

Updated: 2026-10-09. This is a repository checkpoint, not a complete prior-chat transcript.

- User requested implementation of the remaining security queue, with efficient token use. User selected **email verification at checkout only; allow sign-in**.
- SEC-01 through SEC-03 were already implemented locally. The current working tree adds application changes for SEC-04 through SEC-12, plus a read-only SEC-13 preflight and operational checklist. Read [rollout and limitations](ROLLOUT_2026-10-08.md) and [the queue](README.md) before deciding what remains.
- No deployment, production database write, TOTP migration, translation sync, restore or provider-setting change was performed. Keep local implementation and production verification separate.
- Remaining external work: real MongoDB races, browser/Google/gateway smoke checks, TOTP key provisioning/migration, indexes and historical pending-order review, edge/origin controls, provider MFA, isolated restore and alert evidence.
- SEC-07: verified Railway uses `npm start` and an `ON_FAILURE` restart policy (10 retries); removed the unused PM2 dependency, startup script and ecosystem config locally. Both production audits now report zero findings; deployment of this removal remains pending. Do not restore a vulnerable supervisor or use a force downgrade. Latest validation: backend 331 tests, frontend 87 tests, both builds pass.
- Preserve provider separation, optional staff-only 2FA, recent-authentication checks, session revocation, authoritative pricing and ordinary/variant/pre-order inventory.
- Historical progress is in [PROGRESS.md](../PROGRESS.md). Check `git status` and the latest verification entry before changing files; the previous implementation checkpoint was committed as `a2e9084`.
- 2026-10-09 localhost 2FA regression: user confirmed localhost shares the live database. Local encryption keys and legacy compatibility were missing; a read-only aggregate found two enabled legacy-or-missing factor records and no encrypted factors. Enabled the explicit legacy compatibility flag in ignored `server/.env`; restart is required to reload it. No shared factor records were changed and no encryption keys were generated. See the rollout's shared-database section before migration. Configuration failures now have a safe 503 response, backup recovery remains available, and tests no longer silently permit plaintext under NODE_ENV=test.

Suggested continuation prompt:

> Read docs/security/HANDOFF.md, docs/security/README.md and the latest docs/PROGRESS.md entry. Continue the first remaining security acceptance check that can be completed locally. Inspect only relevant files, run focused checks, update those documents with actual results, and keep the final summary brief. Identify any external access needed precisely.
