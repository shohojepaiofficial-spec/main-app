# SEC-03: revocable sessions

Implemented and verified locally on 2026-10-08. Deployment and live MongoDB/browser verification are pending.

## Session lifetime and verification

Password login, Google login, registration and successful staff 2FA exchange create an `AuthSession` record. No session or refresh credential is issued while a staff 2FA challenge is outstanding. Records contain a random session ID, user ID, account session version, original primary-authentication time where applicable, refresh-token hash, absolute expiry and revocation time. Refresh credentials are never stored in plaintext in MongoDB.

Access JWTs expire after 15 minutes and have purpose `access`. Refresh JWTs have purpose `refresh`, a unique token ID and a seven-day expiry fixed at the original sign-in. These lifetimes are defined in `server/src/utils/authTokens.ts`; the old `JWT_EXPIRES_IN` environment setting no longer controls them.

`protect` and `optionalAuth` check the session's owner, version, expiry and revocation state, plus the current account version. A deleted user is rejected. Database errors fail closed. MongoDB's TTL index cleans up expired records; authorization explicitly checks expiry and never relies on TTL cleanup timing. Staff permission checks continue to read the current database role/permissions.

## Refresh and revocation

| Endpoint/event | Behavior |
| --- | --- |
| `POST /api/auth/refresh` with JSON `refreshToken` | Validates signature, purpose, expiry and account version. Atomically matches the stored hash and replaces it with a new token's hash, returning `token`, `refreshToken` and `user`. Limited to 300 requests per 15 minutes per IP per server process. |
| Replay of a correctly signed spent refresh token | Rejects the refresh and revokes that session, including its most recently issued access/refresh credentials. Invalid signatures or a different token purpose cannot trigger revocation. |
| `POST /api/auth/logout` with access bearer token | Revokes this session in MongoDB before the browser clears its credentials. Other devices remain signed in. |
| `POST /api/auth/logout-all` with access bearer token | Increments the account version. All existing access/refresh tokens and outstanding 2FA challenges become invalid. Available in Settings as “Sign out on all devices.” |
| Password change | Atomically writes a bcrypt hash and increments the account version; removes outstanding password-reset credentials. All devices must sign in again. |
| Password reset | Atomically consumes the reset link, changes the hash and increments the version. Prior credentials fail; the recovery browser receives a new session or staff 2FA challenge. Concurrent reset requests cannot consume the link twice. |
| Factor enrollment, replacement or disabling | Increments the account version, invalidating older sessions/challenges, and issues a fresh session to the browser completing the change. Backup codes remain visible after confirmation. |

Refresh preserves the original `authenticatedAt` timestamp. It cannot renew SEC-02's five-minute primary-authentication requirement. Recovery sessions do not acquire a recent-primary-authentication timestamp. Requests already past authorization when revocation occurs may finish; later authorization checks reject the revoked credentials.

## Browser behavior and remaining limitations

The shared API client refreshes expired/nearly expired access credentials before requests and retries a server-reported access-expiry once. Credential entry points can proceed without refreshing an older session. Revoked credentials clear the local session; temporary network/server failures retain credentials and report failure so users can retry. Logout only clears credentials after server confirmation or a response that they are already invalid.

Requests share one refresh promise per tab. The Web Locks API serializes refresh/logout across tabs where supported. Other tabs receive a localStorage change signal containing no credentials and reread cookies. Responses from an earlier account/session cannot overwrite a newer login or undo logout.

Rotation is strict: if a successful refresh response is lost, replaying the old token ends the session and requires sign-in. Browsers without Web Locks have only per-tab coordination; simultaneous cross-tab refresh can also require sign-in. This favors revocation over a grace period that would allow spent credentials to remain reusable.

Cookies still remain readable by JavaScript, with SameSite Strict and Secure on HTTPS and expiry fixed to the refresh token. SEC-08 remains open: this implementation does not provide HttpOnly storage or claim protection against credential theft through XSS. The database checks also add authentication queries on each protected request; staging should measure their latency.

## Verification

281 backend tests and 80 frontend tests passed, along with both production builds, frontend TypeScript and lint on changed frontend files. Coverage includes password/Google login, staff challenges, token-purpose boundaries across private routes, session revocation, password changes/resets, single-use reset consumption, refresh replay, expiry, deleted users, database failure, browser refresh coordination, API retry limits, logout confirmation and delayed responses after account changes.

Session persistence is simulated in tests. The in-memory adapter evaluates conditional filters but does not establish real MongoDB concurrency behavior. OAuth callbacks/hooks are mocked; no production accounts, secrets or database records were changed.

## Rollout and staging checks

1. Release frontend and backend together. Existing access tokens without a session ID/version are rejected, and old browser cookies without a refresh token cannot resume a session. Users must sign in again.
2. Ensure the application database identity can read/write the new `authsessions` collection. Provision/verify its indexes, including the `expiresAt` TTL index, using the deployment's normal index-management process. Existing users with no stored `sessionVersion` are treated as version zero; their next increment initializes it.
3. Run the normal translation sync to add the logout-all, logout-failure and password-change sign-in messages. No translation sync was run against a database during this work.
4. With test accounts, verify local and Google sign-in, customer login without 2FA, admin/coadmin challenge completion, provider mismatch messages and checkout return. Verify factor enrollment/replacement/disabling return a working session and revoke another browser's older session.
5. In two separate browser profiles, verify logout affects only its own session; logout-all and password change/reset reject saved old access **and** refresh credentials on both profiles. Reusing a reset link must fail.
6. On staging, exercise concurrent refresh requests against real MongoDB, then replay the spent refresh token and check that the newly returned credentials fail. Verify that forged credentials cannot revoke a legitimate session. Do not log raw credentials.
7. Verify refresh after 15 minutes, the fixed seven-day expiry, multi-tab coordination, network failures and server outage recovery. A lost refresh response can require a new sign-in as described above.

Design references: [OWASP session management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), [OWASP OAuth2 guidance](https://cheatsheetseries.owasp.org/cheatsheets/OAuth2_Cheat_Sheet.html).
