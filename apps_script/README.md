# Phase-1 Apps Script backend (Room-Based)

This folder contains a reference Google Apps Script implementation for BioPlay phase 1.

## Deploy prerequisites
1. Bind the script to a Google Spreadsheet.
2. Ensure sheet `rooms` exists (or let script create it).
3. Add sheet `room_names` with a header `roomName` (first row) and one room name per row.
4. Set Script Property `DOOR_IDS_JSON` with all available door IDs, e.g.:
   - `[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30]`
5. Deploy as Web App (execute as you, access: anyone with link).

## Stored columns (sheet: rooms)
`roomId | teacherTokenHash | status | doorsCount | selectedDoors | createdAt | updatedAt | roomName`

## Endpoints
- `GET action=room_names`
- `POST action=create_room` (+ `roomName`, optional `doorsCount`)
- `GET action=status&roomId=...`
- `POST action=start` (+ `roomId`, `teacherToken`, optional `doorsCount`)
- `POST action=reset` (+ `roomId`, `teacherToken`)

## Notes
- `selectedDoors` is generated on `start` only.
- `teacherToken` is never stored as plain text, only hash.
