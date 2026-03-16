# Live Verification Report (2026-03-15)

Scope: Focused deep-dive for `teacherToken` / `roomId` pairing, PLAY enablement, and RESET routing.

## Code-level root causes found
1. `roomId` was forcibly upper-cased in multiple places (`create_room` response parsing, action dispatch, and query-param bootstrap).
   - This could break strict `roomId + teacherToken` matching on backend flows when IDs are case-sensitive.
2. PLAY remained disabled after successful room creation because `syncDashboardMeta()` ran while `isCreatingRoom` was still `true` in the `createRoom()` `finally` block.
   - Result: UI got a success message but button state stayed stale/disabled.

## Fixes applied
- Removed forced `.toUpperCase()` normalization from:
  - create-room payload parsing,
  - action POST dispatch (`sendAction`),
  - initial `room` query-param bootstrap.
- Moved `isCreatingRoom = false` earlier in `createRoom()` `finally` so the subsequent dashboard sync enables PLAY/RESET correctly.

## Live browser verification attempts
- Started local static host (`python3 -m http.server 4173`) and opened `admin.html` via Playwright.
- Attempted full live flow against the production Apps Script endpoint.
- Environment network blocked calls to `script.google.com` with proxy tunnel `403` (`CONNECT tunnel failed`), so live backend verification of PLAY/RESET could not be completed in this runtime.

## What was still validated
- Frontend state transition logic now sets PLAY enabled after successful create completion path (post-`isCreatingRoom=false` sync).
- Storage/token code paths now preserve backend-returned `roomId` casing to avoid token mismatch caused by client-side mutation.

## Remaining required external validation (once backend is reachable)
1. create room
2. verify `roomId` + `teacherToken` returned
3. verify session/local storage values
4. PLAY enabled immediately
5. PLAY action succeeds
6. student sees started state
7. RESET succeeds
8. refresh
9. create second room
10. verify no token leakage across rooms
