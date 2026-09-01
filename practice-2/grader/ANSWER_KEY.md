# RelayDesk Practice 2 — Private Answer Key

This document is private grading material. The intended major findings are exactly P2-01 through P2-05. Related symptoms listed under one ID are one finding, not additional findings.

## P2-01 — Caller-selected workspace is treated as authorization

- **Category / severity:** Authorization and trust boundaries / Critical
- **Root cause:** The browser persists the active workspace and sends it in `x-workspace-id`. Authentication proves the bearer token's user, but `workspaceScope` turns the caller-controlled header directly into an access scope without checking `memberships`. Ticket reads and writes subsequently trust that scope.
- **Flow:** `apps/web/src/session.ts` → `apps/web/src/api.ts` → `apps/api/src/auth-hook.ts` → `packages/auth/src/policy.ts` → ticket routes/service/repositories.
- **Files:** `apps/web/src/api.ts`, `apps/web/src/session.ts`, `apps/api/src/auth-hook.ts`, `packages/auth/src/policy.ts`, `packages/db/src/repositories/users.ts`, `packages/services/src/ticket-service.ts`.
- **Sub-issues:** Any authenticated user can select another workspace ID; IDs can be learned or guessed; create/list/detail/update/comment operations inherit the unauthorized scope. Ticket detail's workspace comparison is not sufficient because it compares against an attacker-selected value.
- **Broken assumption:** A UI-originated tenant selector is trustworthy and authentication implies tenant authorization.
- **Impact:** Cross-tenant disclosure and modification, including requester PII and private comments.
- **Why simple tests miss it:** The UI only renders memberships returned at login and the visible API test checks only unauthenticated access.
- **Expected reasoning:** Identify the browser as an untrusted boundary, distinguish identity from workspace membership, and follow scope into storage queries.
- **Minimal fix:** Inject `UserRepository` into policy/hook and reject unless `isMember(user.id, workspaceId)`. Prefer a typed forbidden error and tests using two users/workspaces.
- **Alternatives:** Workspace in URL plus mandatory policy lookup; membership-derived server session scope; repository methods that require a verified membership capability.
- **Tempting wrong fixes:** Hide the header in the UI, validate ID syntax, check only that the workspace exists, or remove multi-workspace selection.
- **Compatibility:** Existing clients depend on `x-workspace-id`; keep it during a staged change while validating it. Changing routes or token shape immediately would break clients and active sessions. A later API version may move workspace into the route.
- **Migration:** Deploy membership validation first with forbidden telemetry; inventory service accounts; provide explicit service membership; only later deprecate the header contract if desired.
- **Verification:** Integration tests prove a member succeeds and a valid user from a different workspace receives 403 for every operation.
- **Hidden tests:** Authenticate Maya, send `ws_north`, assert list/create/detail/update/comment cannot cross tenants; ensure Maya still accesses `ws_acme`.

## P2-02 — Search and list hydration have production-scale query/work bounds

- **Category / severity:** Database performance and scale / High
- **Root cause:** `TicketRepository.list` fetches every matching-status ticket in a workspace, performs free-text filtering in JavaScript, then paginates. `TicketService.list` performs a separate count query for every returned ticket.
- **Flow:** GET `/tickets` → route filter parsing → `TicketService.list` → `TicketRepository.list` → in-memory filter/slice → repeated `commentCount`.
- **Files:** `apps/api/src/routes/tickets.ts`, `packages/services/src/ticket-service.ts`, `packages/db/src/repositories/tickets.ts`, `packages/db/src/schema.ts`, `packages/services/src/ticket-mapper.ts`.
- **Sub-issues:** Unbounded row/materialization cost before a maximum 100-row response; 1+N query count for comment metadata; `%term%` search needs an intentional indexing strategy at scale.
- **Broken assumption:** Response pagination bounds database work and small seed-data performance represents production.
- **Impact:** Memory pressure, event-loop stalls, rising SQLite lock time, latency proportional to all workspace tickets, and 101 queries for a 100-row page. Cross-workspace traffic can amplify contention.
- **Why simple tests miss it:** Three seed tickets make both the unbounded read and fan-out invisible.
- **Expected reasoning:** Quantify rows and statements: O(all matching tickets) materialization plus 1+page-size queries, not merely call it “slow.”
- **Minimal fix:** Push filtering, limit, and offset into SQL and join a grouped comment-count subquery (or use a second batched `GROUP BY ... IN (...)` query). Add an appropriate search/index plan.
- **Alternatives:** SQLite FTS5 with migration/backfill; keyset pagination; denormalized maintained count when justified.
- **Tempting wrong fixes:** Reduce the API limit while still reading all rows; debounce only the frontend; parallelize count queries; add an index that cannot help the JavaScript filter.
- **Compatibility:** Preserve response shape, default ordering, query semantics, and offset behavior. FTS token semantics may differ from substring matching and require an API/version rollout.
- **Verification:** Instrument statement count, seed thousands of rows, compare query plan and bounded work, and test ordering/filter/page edges.
- **Hidden tests:** Trace SQL statements for a 50-item page; insert records outside the page; assert bounded hydration and unchanged comment counts.

## P2-03 — Closing a ticket is neither atomic nor idempotent

- **Category / severity:** Reliability, transactions, retries, concurrency / Critical
- **Root cause:** `TicketService.update` reads state, updates the ticket, and inserts the outbox record as independent statements. Failure after the update loses the notification. Concurrent close requests can both observe open and enqueue duplicates. Retrying after an ambiguous response can also create inconsistent behavior. The outbox has no operation/event uniqueness key.
- **Flow:** PATCH ticket → service `get` → repository update → outbox enqueue → worker delivery/marking.
- **Files:** `packages/services/src/ticket-service.ts`, `packages/db/src/repositories/tickets.ts`, `packages/db/src/repositories/outbox.ts`, `packages/db/src/schema.ts`, `packages/services/src/outbox-worker.ts`.
- **Sub-issues:** Partial commit, duplicate close events, no stable idempotency identity, worker delivery is at-least-once because a crash after send but before `markDone` can redeliver.
- **Broken assumption:** Sequential success-path execution makes a multi-statement business transition safe and delivery acknowledgement is atomic with an external side effect.
- **Impact:** Customers receive duplicate closure notices or none; ticket state and audit/notification state diverge.
- **Why simple tests miss it:** The test performs one close with no injected failure or concurrency.
- **Expected reasoning:** Separate database atomicity from external-delivery semantics and state the achievable guarantee (transactional enqueue plus idempotent consumer/provider).
- **Minimal fix:** Add a DB-level transaction that conditionally transitions `status != 'closed'` and inserts one deterministic close event; add a unique event key. Make delivery idempotent with that key and retain retry attempts.
- **Alternatives:** Transactional outbox with `(ticket_id, kind, transition_version)` uniqueness; client idempotency keys persisted with result; optimistic ticket versioning.
- **Tempting wrong fixes:** Catch and retry enqueue in memory, check status without a conditional update/constraint, serialize in one Node process, or mark done before sending.
- **Compatibility:** Existing databases have an outbox table and possibly duplicate historical rows. Adding a unique constraint directly may fail; changing event payload/IDs can break consumers.
- **Migration:** Add nullable event key, deploy dual-write, backfill deterministic keys while resolving duplicates, create a partial unique index, then require the key. Consumers should accept both legacy and new payloads during rollout.
- **Verification:** Fault injection between statements, two concurrent closers, retry tests, database reopen tests, and delivery tests keyed by event ID.
- **Hidden tests:** Force enqueue to throw and assert status rolls back; issue parallel close operations and assert one pending event; simulate worker crash after delivery and verify downstream dedupe strategy.

## P2-04 — Production silently accepts a known session-secret default

- **Category / severity:** Configuration and application security / High
- **Root cause:** `SESSION_SECRET` defaults to a repository-known development value for every environment. There is no production refinement or startup validation. Although the current database session implementation does not consume it, operators are led to believe a configured session secret exists; future or adjacent signed-session use would be insecure, and missing security configuration goes unnoticed.
- **Flow:** process environment → `loadConfig` → server startup; configuration contract and `.env.example`/deployment expectations.
- **Files:** `packages/config/src/index.ts`, `packages/config/src/index.test.ts`, `.env.example`, `apps/api/src/server.ts`.
- **Sub-issues:** Production starts successfully with unsafe/misleading configuration; tests explicitly protect generic local defaults but do not exercise production; config value is currently dead, masking drift between intended and actual session design.
- **Broken assumption:** Development defaults are safe in every environment and a declared secret proves the application uses the intended session mechanism.
- **Impact:** Unsafe future rollout or operational false confidence; identical known secrets across deployments if signed tokens are enabled; configuration mistakes detected only after incidents.
- **Why simple tests miss it:** Tests run with `NODE_ENV=test` and assert defaults. Opaque random DB tokens work locally.
- **Expected reasoning:** Notice both validation and consumption, avoid claiming immediate token forgery under the current opaque-token design, and frame the concrete risk accurately.
- **Minimal fix:** Use a discriminated/refined config schema: allow local default only outside production, require a sufficiently strong production value if the setting remains; or remove the unused setting and document opaque-session requirements.
- **Alternatives:** Secret-file provider with startup validation; explicit auth mode configuration with mode-specific required fields.
- **Tempting wrong fixes:** Change the checked-in default string to another checked-in string; generate a new secret on every boot; claim current DB tokens are signed by it.
- **Compatibility:** No stored-token migration is currently required because opaque tokens are hashed in SQLite. If introducing signed tokens, support existing DB sessions until expiry rather than invalidating all active users.
- **Verification:** Production config tests reject missing/placeholder values; development still starts; test whichever auth mode actually consumes the config.
- **Hidden tests:** `loadConfig({NODE_ENV:'production'})` must not silently return a known default; verify active opaque sessions remain valid after the config hardening.

## P2-05 — CI's test command excludes both applications

- **Category / severity:** CI and testing correctness / High
- **Root cause:** GitHub Actions runs `pnpm --filter './packages/**' test`, so it executes package tests but skips `apps/api` and `apps/web`. The root developer command `pnpm test` is recursive across all workspaces, creating a false equivalence between local and CI coverage.
- **Flow:** push/PR → workflow filter → workspace selection → only package tests; API integration tests never gate merges.
- **Files:** `.github/workflows/ci.yml`, root `package.json`, `apps/api/package.json`, `apps/api/src/app.test.ts`, `pnpm-workspace.yaml`.
- **Sub-issues:** Integration regressions can merge green; typecheck/lint do not replace runtime tests; future app tests are silently omitted.
- **Broken assumption:** The packages filter represents the whole monorepo or typechecking applications provides equivalent coverage.
- **Impact:** Broken auth hooks, routing, lifecycle, and HTTP contracts can reach production despite a green pipeline.
- **Why simple tests miss it:** `pnpm test` locally passes and CI syntax is valid; the workflow visibly runs a command named test.
- **Expected reasoning:** Compare workspace glob, root scripts, and per-app scripts; identify exactly which projects execute.
- **Minimal fix:** Run `pnpm test` in CI, or explicitly filter both `./packages/**` and `./apps/**`; optionally use a workspace-aware task runner with an asserted project list.
- **Alternatives:** Separate unit and integration jobs with explicit filters and required status checks.
- **Tempting wrong fixes:** Move API tests into a package, rely on typecheck, or add `--passWithNoTests` globally.
- **Compatibility:** Preserve the root developer command and required check name where branch protection depends on it. Splitting jobs may require updating required-status settings.
- **Verification:** Inspect pnpm's selected projects in CI, introduce a controlled failing API test in a temporary branch, and ensure the workflow fails.
- **Hidden tests:** Parse/run workflow command against workspace inventory; ensure API test script executes.

## Distribution checklist

- Cross-file findings: P2-01, P2-02, P2-03, P2-04, P2-05.
- Frontend-to-backend boundary: P2-01.
- Repository/database inspection required: P2-02 and P2-03 (also relevant to P2-01).
- Configuration/tooling/lifecycle: P2-04 and P2-05.
- Backwards-compatibility constraints: P2-01, P2-03, P2-04, P2-05.
- Difficulty calibration: discoverable P2-05; medium P2-01/P2-02; subtle P2-03/P2-04.

Do not award an extra major finding merely for noting password SHA-256. It is a legitimate concern but intentionally outside the five-major-finding design; grade it as a low-priority observation only if accurately evidenced and do not let it substitute for an intended finding.
