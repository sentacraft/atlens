# API

Generated from the JSDoc on each route handler by `scripts/api-docs.mts`. Do not edit by hand:
change the JSDoc, then run `node --experimental-strip-types scripts/api-docs.mts --write`.

| Path | Method | Description |
|---|---|---|
| `/api/askiris-fixtures` | GET | Lists the saved Ask Iris replay fixtures. Development only: 404 in production. |
| `/api/askiris-fixtures` | POST | Saves or deletes an Ask Iris replay fixture for the Test Hook. Development only: 404 in production. |
| `/api/askiris/chat-data` | GET | Returns what an embedded Ask Iris chat needs to render links and the gear card. Public, read-only; 400 for an unknown locale. |
| `/api/askiris/conversations` | GET | Lists the caller's Ask Iris conversations, newest first. Any session, guests included; 401 without one. |
| `/api/askiris/conversations/[conversationId]` | GET | Returns one conversation's stored messages. Any session, guests included; 401 without one, 404 when missing or not the caller's. |
| `/api/askiris/conversations/[conversationId]` | PATCH | Renames one of the caller's conversations. Any session, guests included; 401 without one, 400 for an empty or overlong title, 404 when missing or not the caller's. |
| `/api/askiris/conversations/[conversationId]` | DELETE | Deletes one of the caller's conversations and its messages. Any session, guests included; 401 without one, 404 when missing or not the caller's. |
| `/api/askiris/feedback` | POST | Saves or replaces the caller's rating of one Iris response. Any session, guests included; 401 without one, 404 when the response is not the caller's, 429 when rate limited. |
| `/api/askiris/feedback/[responseMessageId]` | DELETE | Withdraws the caller's rating of one Iris response. Any session, guests included; 401 without one, 404 when the response is not the caller's, 429 when rate limited. |
| `/api/auth/[...all]` | GET, POST, PATCH, PUT, DELETE | Better Auth: sign-in, email codes, session, sign-out, account deletion. See https://www.better-auth.com/docs/concepts/api |
| `/api/chat` | POST | Runs one Ask Iris turn and streams the reply, saving it to the conversation. Any session, guests included; 401 without one, 429 when over the rate limit or a daily or global usage quota. |
| `/api/feedback` | GET | Reports whether site feedback is configured (GitHub token and repository). Public. |
| `/api/feedback` | POST | Files site feedback as a GitHub issue. Public; 400 with the failing rule as the error code, 429 when rate limited. |
| `/api/lenses` | GET | Filters, sorts and pages one mount's lens catalog. No consumers: 404 in production. |
| `/api/lenses/[id]/reviews` | GET | Review findings for one catalogue lens, in the requested locale; empty when it has none. Public; a guest gets only the collapsed findings; 400 for a bad locale, 404 for an unknown lens, 429 past the per-IP rate, 503 without the review store. |
| `/api/lenses/search` | GET | Ranks one mount's lenses against a search query. No consumers (search runs in the browser): 404 in production. |
| `/api/me/favorites` | GET | Lists the caller's favorite lenses, newest first. Accounts only; 401 for guests. |
| `/api/me/favorites` | POST | Adds a catalog lens to the caller's favorites; repeating it is a no-op. Accounts only; 400 for an unknown lens, 409 past 500 favorites. |
| `/api/me/favorites/[lensId]` | DELETE | Removes a lens from the caller's favorites; always 204. Accounts only; 401 for guests. |
| `/api/me/gear` | GET | Lists the caller's bodies and lenses, oldest first. Accounts only; 401 for guests. |
| `/api/me/gear` | POST | Adds a catalog body or lens, or a manual lens entry; re-adding a catalog item returns the existing one. Accounts only; 400 for an invalid entry or unknown catalog id, 409 past 200 items. |
| `/api/me/gear/[gearId]` | DELETE | Removes one of the caller's gear items. Accounts only; 404 when missing or not the caller's. |
| `/api/me/settings` | GET | Returns the caller's settings, or the defaults when none are saved. Accounts only; 401 for guests. |
| `/api/me/settings` | PATCH | Updates the given settings and returns them all. Accounts only; 400 for an empty patch or a value outside the allowed set. |
| `/api/telemetry` | POST | Logs a browser asset failure or slow asset load to Workers Logs. Public. |
| `/api/track` | POST | Records one product analytics event and sets the anonymous visitor cookie. Public; 400 on a malformed event, 413 on an oversized body. |
