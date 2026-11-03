# Clarion remediation plan

Based on [REVIEW.md](REVIEW.md), pinned to `4584cc036d75ab0132cd741461a3f1e5be97d7db`. This is a future plan, not a record of fixes or execution. Preserve existing thresholds and tests; do not weaken gates to obtain green results.

## Dependency map and phase criteria

| Phase | Tasks | Entry → exit |
|---|---|---|
| 0. Baseline | T1 | Owner grants isolated sandbox access → reproducible baseline and documented failures |
| 1. Correctness | T2, T3 | T1 fixtures available → C1–C3 and C5 independently checked |
| 2. Security and privacy | T4 | T1 and owner policy decisions → access/data-flow controls tested |
| 3. Automation | T5 | T2–T4 tests defined → reproducible CI runs real gates |
| 4. Operations | T6 | Owner deployment and storage decisions; T4 → recovery and rollback observed |
| 5. Accessibility and acceptance | T7 | T2–T6 → independent evidence and owner sign-off |

Tasks may overlap only where prerequisites permit. A failure or unresolved owner decision blocks the affected exit criterion, not merely the documentation.

### T1 — Establish baseline and seams (C4; prerequisite for all tasks)

Observed paths: `package.json`, `.github/workflows/ci.yml`, `src/app.ts`, `src/listeners/shortcuts.ts`, `src/listeners/events.ts`. Proposed path: `tests/`.
1. Record the exact checkout SHA, Node version, lockfile status and sandbox boundaries; inventory existing tests and scripts without assuming the placeholders test behavior.
2. In a disposable authorized environment, reproduce installation and the existing `build` and `typecheck` scripts; preserve complete results and distinguish environment failure from code failure.
3. Introduce or document injectable Slack, model, clock and database seams and fixture payloads, including page cursors and missing fields; never use actual workspace content.

Deliverable: baseline log and fixture plan. **Verification:** another reviewer reproduces the baseline at the same SHA and confirms each failure is attributable. **DoD:** [ ] versions and SHA recorded; [ ] existing gates and limitations distinguished; [ ] negative fixtures agreed.

### T2 — Correct thread handling and configuration (C1, C3, C5; requires T1)

Observed paths: `src/listeners/shortcuts.ts`, `src/core/llm.ts`, `src/app.ts`.
1. Validate shortcut fields before accessing timestamps, returning a private actionable error for malformed payloads.
2. Follow thread cursors to completion subject to documented time, message and token budgets; clearly label any incomplete result, including upstream failures.
3. Define supported single-key and multi-key provider configurations, align startup validation and ensure errors never reveal credential values.

Deliverable: patched handlers/configuration and regression cases. **Verification:** drive the registered shortcut with missing payloads, two-page and truncated threads, page failure, and each credential configuration; assert text actually sent to the model and shown to the user. **DoD:** [ ] no dereference before validation; [ ] partial data never presented as complete; [ ] multi-key-only and missing-key outcomes match policy.

### T3 — Complete image recipient membership (C2; requires T1)

Observed path: `src/listeners/events.ts`; proposed path: `tests/events/`.
1. Retrieve membership across cursors under a documented limit; reject incomplete membership rather than guessing authorization.
2. Resolve enabled recipients against the verified membership set and preserve private DM delivery; specify behavior for API errors and rate limits.
3. Add fixtures with an enabled user on a later page, a nonmember, an empty page and interrupted pagination.

Deliverable: membership handling and privacy-focused regression tests. **Verification:** inspect calls and DM destinations through the registered event listener, with a separately specified expected recipient set. **DoD:** [ ] later-page member receives a description; [ ] nonmember never does; [ ] incomplete lookup sends no unauthorized DM.

### T4 — Establish privacy and trust boundaries (C6, C7; requires T1 and owner decisions)

Observed paths: `src/core/profiles.ts`, `src/core/llm.ts`, `src/listeners/events.ts`, `src/mcp/server.ts`; proposed path: `docs/data-flow.md`.
1. Trace Slack scopes, requester identity, action ownership, MCP client access, profile writes, provider calls and data retention; record who can see each datum and inspect the previously unread handlers.
2. Obtain owner approval for explicit image opt-in/defaults, provider processing, deletion/retention and log redaction; implement controls where the trace reveals gaps, including tenant boundaries if multiple workspaces are supported.
3. Validate private image URL provenance and redirects before attaching bearer credentials; constrain model inputs/outputs and exercise hostile thread instructions as untrusted content.

Deliverable: data-flow/consent decision and justified controls. **Verification:** negative authorization, opt-out, redirect-to-untrusted-host and prompt-injection cases; inspect outbound mock requests and logs for credential and content leakage. **DoD:** [ ] consent evidenced at collection; [ ] unauthorized delivery and credential forwarding blocked; [ ] unresolved provider/privacy assumptions documented and approved.

### T5 — Replace false-green automation (C4; requires T2–T4 test cases)

Observed paths: `package.json`, `package-lock.json`, `.github/workflows/ci.yml`.
1. Reconcile manifest and lockfile deliberately; select a supported Node version and define real test and lint scripts rather than retaining echo placeholders.
2. Update CI to use a reproducible lockfile install and run build, typecheck, lint and behavior tests; restrict workflow permissions and pin actions per owner policy.
3. Add dependency scanning with a triage process and run negative controls by deliberately breaking a pagination assertion and a lint rule in an isolated branch.

Deliverable: lock-consistent CI and meaningful scripts. **Verification:** observe the actual CI run at the remediation SHA; each deliberate break must fail the relevant gate before restoration. **DoD:** [ ] clean installation proven; [ ] every gate executes real work; [ ] failures and dependency exceptions have owners.

### T6 — Deployment, recovery and rollback (C7; requires T4 and owner deployment approval)

Observed paths: `src/app.ts`, `src/core/profiles.ts`; proposed path: `docs/operations.md`.
1. Document deployment target, secret injection and rotation, SQLite volume, access permissions, log retention and cost/rate alerts; choose a release owner.
2. Define a consistent database backup and tested restore, including profile and welcome-state checks, and document achievable recovery objectives.
3. Deploy a versioned candidate only to an authorized sandbox, observe Socket Mode reconnect and failure alerting, then rehearse rollback to the prior version with data compatibility checked.

Deliverable: operations runbook and dated restore/rollback evidence. **Verification:** restore an isolated backup and compare expected records; observe actual deployment, alerts and rollback rather than trusting command exit status. **DoD:** [ ] restore measured; [ ] secrets absent from logs; [ ] prior version and database compatibility verified.

### T7 — Accessible independent acceptance (C1–C7; requires T2–T6)

Observed paths: `src/listeners/shortcuts.ts`, `src/listeners/events.ts`; proposed path: `docs/acceptance.md`.
1. Have an independent reviewer trace the deployed entry points to the modified handlers and compare deployed revision with the reviewed revision.
2. With consenting participants, exercise Slack screen readers, modal consent, private cards and DMs, error announcements, long threads and uncertain image descriptions.
3. Record failures and limitations, rerun the original negative cases, and seek explicit owner acceptance only for the scope actually observed.

Deliverable: signed acceptance evidence and open-issues list. **Verification:** a deliberately broken handler or privacy guard must fail an independent end-to-end case; tests must not merely mirror implementation logic. **DoD:** [ ] revision and environment recorded; [ ] participant outcomes and limitations documented; [ ] owner accepts or rejects each remaining risk.

## Release policy and acceptance checklist

- [ ] Owner approves workspace access, scopes, provider terms, sensitive-data policy, production deployment, budget and release authority before external use.
- [ ] Correctness, consent, authorization, secret redaction and independent accessibility cases pass on the release candidate; CI results are tied to its SHA.
- [ ] Restore and rollback are observed with compatible data; backup access is separate and appropriately restricted.
- [ ] Release progressively to the approved sandbox first. On privacy leakage or correctness regression, stop rollout, revoke affected credentials if warranted, restore the last verified version/data as appropriate, and document the incident. No production-readiness claim follows from this plan alone.
