# Remaining work queue

Updated: 2026-10-07. Use IDs such as `WORK-01` to choose one task at a time. These are proposed tasks, not features already implemented. Security tasks are tracked separately in [security](../security/README.md).

The existing [REMAINING_WORK.md](../REMAINING_WORK.md) is preserved as the historical backlog, including completed work. Check it and current implementation before starting a task. Record completed changes and verification in [PROGRESS.md](../PROGRESS.md), and keep both backlogs consistent when closing a legacy item.

## Finish existing operational work

| ID | Status | Task | Completion criteria |
| --- | --- | --- | --- |
| WORK-01 | Open; needs merchant credentials | Activate live bKash when the merchant account is approved (legacy 2.14). | Securely configure live credentials; verify the available-method gate; test success/cancel/failure/reconciliation with controlled transactions after security fixes. |
| WORK-02 | Open; needs gateway setup | Configure the existing SMS integration (legacy 2.6). | Confirm provider contract/config, opt-in and unsubscribe behavior, controlled delivery and failure handling. |
| WORK-03 | Open; live action | Verify first real Pathao booking (legacy 2.8). | On a genuine order, confirm booking, pickup/tracking and correct collection amount; review unmatched-zone fallbacks. Do not create test pickups. |
| WORK-04 | Open; verification | Complete existing UI checks (legacy 2.13). | Verify user pagination using fixtures, review replies, and sign-in from Facebook/Instagram in-app browsers. |
| WORK-05 | Open; catalog review | Clean test products/ads and review delivery fees and weights (legacy 4.5/4.10). | Identify proposed edits/deletions for review; legitimate catalog data and calculated shipping remain correct. |
| WORK-06 | Open | Add missing Bangla 2FA strings (legacy 4.12). | Add seed entries, sync through existing workflow, verify translated flows. |

## Proposed features, in suggested order

| ID | Status | Task | Completion criteria |
| --- | --- | --- | --- |
| WORK-07 | Proposed | Customer delivery timeline and notifications. | Show courier tracking and status updates; respect notification preferences; failed sends do not block orders. |
| WORK-08 | Proposed | Returns, exchanges and refunds. | Define eligibility, approval and refund states; keep inventory changes auditable and prevent duplicate refunds/restocks. |
| WORK-09 | Proposed | Per-variant inventory alerts and stock ledger (includes legacy 4.13). | Flag sold-out/low-stock variants; record adjustments, supplier receipts and reasons; preserve total/variant consistency. |
| WORK-10 | Proposed | Admin audit history. | Record actor, timestamp and important changes to access, prices, orders and campaigns; redact secrets and restrict access. |
| WORK-11 | Proposed; depends on SEC-05 | Payment reconciliation dashboard. | Display aging unpaid reservations and provider/order mismatches; provide audited recovery actions without duplicate stock release. |
| WORK-12 | Proposed; depends on SEC-03/08 | Customer session management and security alerts. | Show/revoke active sessions; notify relevant account-security changes; never expose session secrets. |
| WORK-13 | Proposed | Notify customers about store review replies (legacy 4.14). | Send one notification per intended event, with links and delivery-failure handling. |

## Task workflow

1. Pick a single ID and confirm current behavior and dependencies.
2. Define acceptance criteria and any required provider configuration.
3. Implement using the MVC rules in `../ARCHITECTURE.md`.
4. Run checks appropriate to the change and record results.
5. Mark complete only after required verification; log deployment separately if still pending.

Backup/restore, infrastructure MFA, database access and capacity review belong to SEC-13. A remembered-device 2FA option remains deferred until the authentication fixes and revocable-session design are complete.
