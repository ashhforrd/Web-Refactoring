# Assessment Notes

Use `ASSESSMENT_INSTRUCTIONS.md` as the required structure for your findings.

## Finding — Workspace header is trusted without membership authorization

Category: Security / Authorization
Confidence: High

### Evidence

`packages/auth/src/policy.ts` defines `workspaceScope` by checking only that a workspace header is present, then returning the supplied value as `workspaceId`. `apps/api/src/auth-hook.ts` passes the authenticated user and the untrusted `x-workspace-id` header into this function. The ticket handlers in `apps/api/src/routes/tickets.ts` then use `req.scope.workspaceId` for list, read, create, update, and comment operations without verifying that the requesting user belongs to that workspace.

The membership query needed for this check already exists as `UserRepository.isMember(userId, workspaceId)` in `packages/db/src/repositories/users.ts`, but it is not invoked for the requesting user along this execution path.

### Root Cause

The authenticated request path establishes a workspace scope without performing workspace membership authorization. The absence of a check inside `workspaceScope` is a symptom of this broader boundary issue; that helper currently has no repository dependency and therefore cannot validate membership itself.

### Production Impact

An authenticated user who supplies another workspace's ID can access that workspace's tickets and may also create or modify data there. This is a cross-tenant authorization vulnerability.

### Solution

At the API authorization boundary, verify `d.users.isMember(user.id, workspaceId)` before assigning `request.scope`. Reject non-members with a `403 Forbidden` response. Keep the downstream workspace filtering as defense in depth, and add focused tests covering a valid member and an authenticated non-member.

### Backwards Compatibility

No API shape change is required. Requests with a valid session and authorized workspace continue to work. Requests that previously relied on an unauthorized workspace ID will begin returning `403`, which is the intended security correction.

### Verification

Add integration tests that authenticate as a user belonging to one workspace and submit the other workspace's ID to every protected ticket operation. Verify each request is rejected and that no cross-workspace read or mutation occurs. Also verify that normal member access remains successful.

### Trade-offs

Checking membership on every request adds a database lookup. If this becomes material, membership may be cached or embedded in a suitably invalidated authorization context, but correctness and revocation behavior must be preserved.

## Finding — Ticket creation is not exposed in the web application

Category: Frontend / Feature Gap
Confidence: Medium

### Evidence

`apps/api/src/routes/tickets.ts` exposes `POST /tickets` and passes validated input to `TicketService.create`. However, `apps/web/src/api.ts` has no corresponding `createTicket` client method, and the components under `apps/web/src` provide ticket listing, ticket details, comments, and closing but no ticket-creation form or navigation.

### Root Cause

The backend creation capability has not been integrated into the web application. Whether this is an implementation omission or an intentional API-only intake path cannot be established from the repository documentation.

### Production Impact

Users of the web application cannot create tickets directly. The claim that the endpoint is unused is unproven because external clients or intake integrations may call it. This is a production defect only if agent-driven ticket creation is a product requirement.

### Solution

Confirm the intended ticket-ingestion workflow. If web-based creation is required, add a typed `createTicket` API-client method and a form that collects the fields required by `createTicketSchema`, handles validation and request errors, and refreshes or navigates to the newly created ticket. If creation is intentionally integration-only, document the endpoint and its intended consumers instead.

### Backwards Compatibility

Adding a web creation flow would be additive and would not change the existing API contract. Any API changes made while clarifying the endpoint's intended consumers should preserve existing integrations.

### Verification

If implemented, add a frontend test that submits valid ticket data, verifies the expected POST payload, and confirms the created ticket becomes accessible. Also test validation and API-error states. Usage telemetry or consumer documentation is needed to determine whether the endpoint is currently used outside the web app.

### Trade-offs

A creation UI adds validation, error-state, accessibility, and maintenance work. Leaving creation API-only keeps the agent interface smaller but requires a documented and operational external intake mechanism.

## Finding — General ticket updates are not exposed in the web application

Category: Frontend / Feature Gap
Confidence: Medium

### Evidence

`apps/api/src/routes/tickets.ts` exposes `PATCH /tickets/:id` using `updateTicketSchema`, and the service supports changes to ticket status, priority, and assignee. The frontend API client in `apps/web/src/api.ts` only exposes `closeTicket`, which sends the fixed payload `{ status: 'closed' }`. `apps/web/src/TicketDetail.tsx` provides a Close ticket button but no controls for changing priority, assigning a user, or making other supported status changes.

### Root Cause

The frontend implements one specialized update action rather than integrating the backend's general ticket-update capabilities. Whether the omitted controls are intentional product scope or incomplete implementation is not documented.

### Production Impact

Web users can close tickets but cannot perform other backend-supported updates such as changing priority or assignee. Those operations require another API client or direct requests. This is a production defect only if those ticket-management actions are required in the web workflow.

### Solution

Confirm the intended agent workflow. If general editing is required, add a typed update method to the frontend API client and accessible controls for the supported fields, with validation, loading, success, and failure states. Retain the Close ticket shortcut if it remains useful.

### Backwards Compatibility

Adding update controls is additive and can use the existing PATCH contract. Existing close-ticket behavior can remain unchanged. Care is needed to preserve omitted fields so partial updates do not unintentionally overwrite existing values.

### Verification

Add frontend tests for each exposed update control, verify the PATCH payload contains only intended changes, and confirm the refreshed ticket displays the server response. Test invalid input, API failures, and preservation of fields not being edited.

### Trade-offs

More editing controls increase UI complexity and require an assignee-data source and authorization rules. A smaller set of task-specific actions is simpler, but it leaves part of the backend capability inaccessible to web users.

## Finding — Ticket search and pagination occur after loading all workspace rows

Category: Database Query / Performance
Confidence: Medium

### Evidence

`TicketRepository.list` in `packages/db/src/repositories/tickets.ts` queries every ticket matching the workspace and optional status. It then performs the free-text search with JavaScript `Array.filter` and applies pagination with `Array.slice`. Consequently, a request for a single page still transfers and materializes all matching workspace rows before discarding most of them.

### Root Cause

Search filtering and pagination are implemented in application memory rather than as part of the database query. The JavaScript search filter is only part of the issue; applying `offset` and `limit` after fetching all rows also prevents bounded retrieval.

### Production Impact

Query time, application memory, database-to-application data transfer, and JavaScript processing increase with the total number of tickets in a workspace rather than the requested page size. This can cause progressively higher latency and resource consumption for large workspaces.

### Solution

Move filtering and pagination into the SQL query using bound parameters and `LIMIT`/`OFFSET`. For the current substring behavior, use an escaped, case-insensitive search predicate across subject, body, and requester email. If production volume makes substring scans expensive, introduce SQLite FTS with an appropriate migration and clearly define any search-semantics changes.

### Backwards Compatibility

Preserve the current case-insensitive substring behavior, status filter, updated-at ordering, and pagination semantics. SQL wildcard characters in user input must be escaped if `%` and `_` are expected to remain literal characters. Moving to FTS may change tokenization and matching behavior and should therefore be treated as a separate product and migration decision.

### Verification

Add repository tests covering combined status and text filters, case-insensitive matches across all three searchable fields, literal wildcard characters, stable ordering, and page boundaries. Use a large fixture or query-plan inspection to confirm that only the requested page is returned to the application.

### Trade-offs

SQL `LIKE` filtering reduces transferred rows and application work but may still scan all tickets in the selected workspace. FTS scales search more effectively but adds schema, migration, synchronization, and search-semantics complexity. Large offsets may eventually require cursor-based pagination.
