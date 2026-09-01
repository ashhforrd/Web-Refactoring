# Assessment

## 1. Card editing is exposed by the API but unavailable in the frontend

### Evidence

- The server exposes `PATCH /api/cards/:cardId` in `apps/api/src/app.ts`.
- The frontend API client in `apps/web/src/api.ts` has no update-card method.
- The UI in `apps/web/src/main.tsx` displays cards but provides no edit controls.

### Root cause

The backend and frontend have different feature coverage: card editing is implemented at the API and repository layers but is not exposed by the web client.

### Trigger

A user attempting to edit an existing card through the web interface cannot do so. The endpoint remains usable by clients that call the API directly.

### Compatibility concern

Removing the endpoint because the current frontend does not use it could break other API clients. Adding an update method and editing UI would preserve the existing API contract.

## 2. Card updates authenticate users but do not authorize access to the card

### Evidence

The PATCH handler calls `await requireUser(request)`, but discards the returned user ID. It then calls `repo.updateCard(request.params.cardId, input)`. The repository updates the card using only its ID and does not check the card's creator, board membership, or member role.

### Root cause

The update path performs authentication but lacks resource-level authorization.

### Trigger

Any authenticated user who knows or obtains a card ID can attempt to update that card, including cards belonging to boards where the user has no membership.

### Compatibility concern

Adding authorization will cause previously accepted unauthorized updates to return an error. The intended policy—creator-only, any board member, or role-based editing—must be established before implementing the check.

## 3. Logout does not revoke an issued session token

### Evidence

- Login creates a self-contained JWT with an eight-hour expiration in `apps/api/src/session.ts`.
- The application does not store issued sessions in the database or maintain a token revocation list.
- `POST /api/logout` clears only the current browser's `session` cookie.
- `readSession` will continue to accept another copy of the same JWT until it expires, provided its signature remains valid.

### Root cause

Authentication uses stateless JWT sessions. Clearing a cookie removes the browser's copy of the token but does not provide a server-side mechanism for invalidating an already issued token.

### Trigger

The issue is triggered when a session token has been copied, stolen, or retained by another client before logout. That copy can continue accessing the application until the token's eight-hour expiration.

### Compatibility concern

Immediate revocation would require a stateful mechanism such as persisted session identifiers, a token denylist, or per-user token versions. Introducing one would change the authentication architecture and require decisions about existing tokens, session cleanup, database availability, and multi-device logout behavior.
