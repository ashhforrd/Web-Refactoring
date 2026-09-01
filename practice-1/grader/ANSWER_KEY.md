# Private Answer Key

This material is for the evaluator only. The candidate repository is intentionally not linked to this directory.

## Finding 1 — Unauthenticated identity compatibility path

- **Category:** Authentication / trust boundary
- **Severity:** Critical
- **Root cause:** The request authentication hook treats the externally supplied `x-teamboard-user` header as an authenticated identity whenever a signed session cookie is absent. The compatibility mechanism has no gateway attestation, shared signature, network restriction, or production disablement.
- **Affected flow:** HTTP request → `onRequest` identity selection → `requireUser` existence check → all authenticated routes.
- **Sub-issues:** A valid user ID can be enumerated or learned from responses; a caller can impersonate any existing account; the visible service-client test cements a legacy contract without defining its trust boundary.
- **Production impact:** Complete account impersonation and unauthorized reading/writing of workspace data.
- **Expected diagnosis:** Explain that checking whether the asserted user exists is not authentication, and trace how the header reaches route authorization.
- **Acceptable minimal fixes:** Remove the fallback for public traffic; or require a separately signed service credential and verify the user assertion; or gate the legacy mode behind an explicit disabled-by-default config and trusted proxy/service authentication. Preserve cookie sessions.
- **Tempting incorrect fixes:** Renaming the header, hiding it in CORS, checking that it starts with `usr_`, or trusting it only when there is no cookie.
- **Compatibility:** Existing internal callers and one visible test use the header. A safe change needs a staged deprecation or authenticated replacement, not an unexplained hard deletion.
- **Migration:** Introduce signed service tokens, update callers, observe legacy usage, then disable the old path.
- **Verification:** Requests with only the identity header fail; cookie sessions work; authenticated service assertions work if retained; mixed invalid cookie/header requests cannot downgrade.

## Finding 2 — Card update authorization is detached from ownership

- **Category:** Authorization
- **Severity:** High
- **Root cause:** The update route requires a valid user but never loads the card's board or checks membership before mutating it. The repository update method accepts only a globally unique card ID, so authorization cannot be enforced by its current call contract.
- **Affected flow:** `PATCH /api/cards/:cardId` → `requireUser` → unscoped `updateCard` → database update.
- **Sub-issues:** Existence is disclosed by 200/404 differences; repository API encourages unscoped mutation.
- **Production impact:** Any authenticated user who obtains a card ID can alter another team's data.
- **Expected diagnosis:** Follow the resource relationship card → board → membership and identify the missing subject/resource check.
- **Acceptable minimal fixes:** Fetch the card, verify membership, then update; preferably expose an update scoped by both user and card in one query/transaction. Return a consistent not-found response for inaccessible resources.
- **Tempting incorrect fixes:** Restricting updates to `createdBy`, validating UUID syntax, or relying on IDs being hard to guess.
- **Compatibility:** Existing members must retain edit behavior, including cards created by other board members. API response shapes and 404 semantics should remain stable.
- **Migration:** None for data; repository callers may need a transitional overload or coordinated update.
- **Verification:** Member succeeds, non-member receives 404, unknown ID receives 404, and data remains unchanged.

## Finding 3 — Board hydration performs query-per-row fan-out

- **Category:** Database performance / scale
- **Severity:** High
- **Root cause:** `listBoards` runs one card query per board and one user query per card. Query volume is `1 + boards + cards`, and repeated creators are fetched repeatedly.
- **Affected flow:** boards endpoint → membership board query → per-board card query → per-card creator query.
- **Sub-issues:** No pagination bounds the card set; repeated creator lookups amplify work.
- **Production impact:** Latency and database load rise linearly with result size, potentially exhausting the synchronous API event loop and creating timeouts.
- **Expected diagnosis:** Quantify query growth and note why seed data hides it.
- **Acceptable minimal fixes:** A joined query with deterministic grouping; a bounded set of bulk queries (`boards`, all cards, all users) plus maps; add compatible pagination only with a migration plan.
- **Tempting incorrect fixes:** Promise parallelism around synchronous SQLite calls, a process-global cache, or indexing alone.
- **Compatibility:** Preserve board/card ordering, `creatorName`, and the `Former member` fallback. Abruptly changing the endpoint to a paginated response breaks clients.
- **Migration:** If pagination is introduced, add an opt-in/versioned contract before changing defaults.
- **Verification:** Assert output equivalence and instrument query count against many boards/cards/creators.

## Finding 4 — Invitation capacity check and consumption are non-atomic

- **Category:** Reliability / concurrency / transactional behavior
- **Severity:** High
- **Root cause:** Redemption reads capacity, inserts membership, and increments usage in separate statements without a transaction or conditional atomic update. Concurrent callers can pass the same stale check. `INSERT OR IGNORE` also allows an existing member to consume capacity repeatedly.
- **Affected flow:** invitation endpoint → `redeemInvite` select → membership insert → unconditional usage increment.
- **Sub-issues:** Capacity oversubscription; repeat redemption burns uses; partial state is possible if a later statement fails.
- **Production impact:** Invite limits become unreliable and legitimate users may be locked out; membership and counters can diverge.
- **Expected diagnosis:** Identify the race and idempotency problem, not merely the visible counter symptom.
- **Acceptable minimal fixes:** Use an immediate transaction with an atomic conditional update and increment only when membership was newly inserted; or model redemptions with a uniqueness constraint and transactional capacity enforcement.
- **Tempting incorrect fixes:** An in-process mutex, checking twice without a transaction, or changing `INSERT OR IGNORE` to a throwing insert.
- **Compatibility:** Existing invite codes and memberships must remain valid; duplicate redemption should become idempotent rather than an error if clients retry.
- **Migration:** Reconcile counters from unique memberships before relying on existing `invite_uses`; document whether owners count.
- **Verification:** Concurrent last-slot attempts admit at most one new member, repeats do not consume uses, and injected failure rolls back all changes.

## Finding 5 — Request correlation uses process-global mutable state

- **Category:** Observability / async context propagation
- **Severity:** Medium
- **Root cause:** `beginRequest` writes the request ID to a module-level variable and loggers read it later. Interleaved asynchronous requests overwrite one another's context.
- **Affected flow:** Fastify `onRequest` → global request ID → asynchronous handler → `requestLogger` at success/error logging.
- **Sub-issues:** The logger duplicates Fastify's request-aware capabilities; failures are especially likely to be attributed to whichever request most recently began.
- **Production impact:** Mis-correlated logs make incident diagnosis and audit trails unreliable under concurrency.
- **Expected diagnosis:** Demonstrate or reason about interleaving across an await boundary and distinguish this from generating IDs incorrectly.
- **Acceptable minimal fixes:** Use `request.log` directly; pass the request-scoped logger explicitly; or use `AsyncLocalStorage` with lifecycle-safe setup.
- **Tempting incorrect fixes:** Clearing the global after response, adding another global map without async ownership, or serializing requests.
- **Compatibility:** Preserve the `requestId` logging field expected by log ingestion and retain Fastify's inbound request-ID behavior.
- **Migration:** Coordinate field-name changes with dashboards if choosing Fastify's default `reqId` rather than the current `requestId`.
- **Verification:** Interleave two requests around delayed work and assert each emitted record carries its own ID, including error paths.
