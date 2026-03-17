/*********************************
 * BioPlay - Room-Based Backend + Scoring
 * Google Apps Script Web App
 * גרסה מעודכנת – כוללת gameStatus, gameJoin, gameScore
 *********************************/

const SHEET_NAME            = 'rooms';
const AUDIT_SHEET_NAME      = 'audit_log';
const ROOM_NAMES_SHEET_NAME = 'room_names';
const SCORES_SHEET_NAME     = 'scores';

const DEFAULT_STATUS      = 'waiting';
const DEFAULT_DOORS_COUNT = 5;
const AUTO_RESET_MINUTES  = 30;

const DOOR_IDS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27, 28, 29, 30
];

const STUDENT_BASE_URL = 'https://YOUR_DOMAIN/bioroom.html';
const ADMIN_BASE_URL   = 'https://YOUR_DOMAIN/admin.html';

/* =========================
   Entry points
========================= */

function doGet(e) {
  try {
    ensureSheetHeaders_();
    const params = getParams_(e);
    const action = normalize_(params.action);

    /* ── gameStatus: האם החדר פעיל? (נשלח מ-bioroom.html) ── */
    if (action === 'gamestatus') {
      const roomId = requireRoomId_(params);
      const room   = getRoomOrThrow_(roomId);
      const eff    = getEffectiveRoomState_(room);
      return jsonOutput_({
        ok:     true,
        roomId: roomId,
        status: normalize_(eff.status) === 'started' ? 'active' : 'waiting'
      });
    }

    /* ── gameScores: כל הניקודים של חדר (נשלח מ-admin.html) ── */
    if (action === 'gamescores') {
      const roomId = normalize_(params.roomId || params.room_id || '');
      const rows   = getScoresForRoom_(roomId);
      return jsonOutput_({ ok: true, scores: rows });
    }

    /* ── status: בדיקת חדר (נשלח מ-admin.html) ── */
    if (action === 'status') {
      const roomId      = requireRoomId_(params);
      const room        = getRoomOrThrow_(roomId);
      const effectiveRoom = getEffectiveRoomState_(room);
      logAuditSafe_({ roomId, action: 'status', actor: 'system', result: 'success', details: '' });
      return jsonOutput_({
        ok:            true,
        roomId:        effectiveRoom.roomId,
        roomName:      normalize_(effectiveRoom.roomName || ''),
        status:        normalize_(effectiveRoom.status) || DEFAULT_STATUS,
        doorsCount:    toNumberSafe_(effectiveRoom.doorsCount, DEFAULT_DOORS_COUNT),
        selectedDoors: parseSelectedDoors_(effectiveRoom.selectedDoors)
      });
    }

    /* ── list_room_names ── */
    if (action === 'list_room_names') {
      return jsonOutput_({ ok: true, roomNames: getAvailableRoomNames_() });
    }

    return jsonOutput_({ ok: false, error: 'Unknown GET action' });
  } catch (err) {
    return jsonOutput_({ ok: false, error: err.message || String(err) });
  }
}

function doPost(e) {
  try {
    ensureSheetHeaders_();
    const params = getParams_(e);
    const action = normalize_(params.action);

    /* ── gameJoin: תלמיד נכנס לחדר ── */
    if (action === 'gamejoin') {
      const roomId = requireRoomId_(params);
      const name   = normalize_(params.name || '');
      if (!name) throw new Error('Missing name');

      upsertScore_(roomId, name, 0, 'joined', false);
      logAuditSafe_({ roomId, action: 'gameJoin', actor: name, result: 'success', details: '' });
      return jsonOutput_({ ok: true });
    }

    /* ── gameScore: עדכון ניקוד תלמיד ── */
    if (action === 'gamescore') {
      const roomId    = requireRoomId_(params);
      const name      = normalize_(params.name || '');
      const score     = toNumberSafe_(params.score, 0);
      const step      = normalize_(params.step || '');
      const completed = normalize_(params.completed || '') === 'true';

      if (!name) throw new Error('Missing name');

      upsertScore_(roomId, name, score, step, completed);
      logAuditSafe_({
        roomId, action: 'gameScore', actor: name,
        result: 'success', details: `step=${step} score=${score} completed=${completed}`
      });
      return jsonOutput_({ ok: true });
    }

    /* ── create_room ── */
    if (action === 'create_room') {
      const teacherName        = normalize_(params.teacherName || '');
      const requestedRoomName  = normalize_(params.roomName || '');
      const doorsCount         = sanitizeDoorsCount_(params.doorsCountDefault || params.doorsCount);

      let roomName = requestedRoomName;
      if (roomName) assertRoomNameAllowed_(roomName);

      const roomId          = generateRoomId_();
      const teacherToken    = generateTeacherToken_();
      const teacherTokenHash = hashToken_(teacherToken);
      const nowIso          = new Date().toISOString();

      const row = {
        roomId, roomName, teacherTokenHash,
        status: DEFAULT_STATUS,
        doorsCount, selectedDoors: '[]',
        createdAt: nowIso, updatedAt: nowIso,
        startedAt: '', teacherName
      };

      insertRoom_(row);
      logAuditSafe_({
        roomId, action: 'create_room', actor: 'system',
        result: 'success', details: buildCreateRoomAuditDetails_(teacherName, roomName)
      });

      return jsonOutput_({
        ok: true, roomId, roomName,
        teacherToken,
        studentUrl: buildStudentUrl_(roomId),
        adminUrl:   buildAdminUrl_(roomId)
      });
    }

    /* ── start ── */
    if (action === 'start') {
      const roomId       = requireRoomId_(params);
      const teacherToken = requireParam_(params, 'teacherToken');
      const room         = getRoomOrThrow_(roomId);

      assertTeacherToken_(room, teacherToken);

      const doorsCount    = sanitizeDoorsCount_(params.doorsCount || room.doorsCount);
      const selectedDoors = pickRandomDoors_(DOOR_IDS, doorsCount);
      const nowIso        = new Date().toISOString();
      const nowMs         = String(Date.now());

      const updatedRoom = {
        ...room, status: 'started', doorsCount,
        selectedDoors: JSON.stringify(selectedDoors),
        startedAt: nowMs, updatedAt: nowIso
      };

      updateRoom_(updatedRoom);
      logAuditSafe_({ roomId, action: 'start', actor: 'teacher', result: 'success', details: `doorsCount=${doorsCount}` });

      return jsonOutput_({
        ok: true, roomId,
        roomName:     normalize_(updatedRoom.roomName || ''),
        status:       'started',
        doorsCount,
        selectedDoors
      });
    }

    /* ── reset ── */
    if (action === 'reset') {
      const roomId       = requireRoomId_(params);
      const teacherToken = requireParam_(params, 'teacherToken');
      const room         = getRoomOrThrow_(roomId);

      assertTeacherToken_(room, teacherToken);

      const nowIso = new Date().toISOString();
      const updatedRoom = {
        ...room, status: DEFAULT_STATUS,
        selectedDoors: '[]', startedAt: '', updatedAt: nowIso
      };

      updateRoom_(updatedRoom);
      logAuditSafe_({ roomId, action: 'reset', actor: 'teacher', result: 'success', details: '' });

      return jsonOutput_({
        ok: true, roomId,
        roomName: normalize_(updatedRoom.roomName || ''),
        status: DEFAULT_STATUS
      });
    }

    return jsonOutput_({ ok: false, error: 'Unknown POST action' });
  } catch (err) {
    return jsonOutput_({ ok: false, error: err.message || String(err) });
  }
}

/* =========================
   Scores sheet
========================= */

function getRequiredScoresHeaders_() {
  return ['roomId', 'name', 'score', 'lastStep', 'completed', 'updatedAt'];
}

function upsertScore_(roomId, name, score, step, completed) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  let sheet   = ss.getSheetByName(SCORES_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SCORES_SHEET_NAME);
    sheet.appendRow(getRequiredScoresHeaders_());
  }

  const headerMap = getHeaderMap_(sheet);
  const lastRow   = sheet.getLastRow();
  const nowIso    = new Date().toISOString();

  if (lastRow >= 2) {
    const values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    for (let i = 0; i < values.length; i++) {
      const rowRoomId = String(values[i][headerMap.roomId - 1]).trim();
      const rowName   = String(values[i][headerMap.name   - 1]).trim();
      if (rowRoomId === roomId && rowName === name) {
        const rowNum = i + 2;
        sheet.getRange(rowNum, headerMap.score,     1, 1).setValue(score);
        sheet.getRange(rowNum, headerMap.lastStep,  1, 1).setValue(step);
        sheet.getRange(rowNum, headerMap.completed, 1, 1).setValue(completed ? 'true' : 'false');
        sheet.getRange(rowNum, headerMap.updatedAt, 1, 1).setValue(nowIso);
        return;
      }
    }
  }

  sheet.appendRow([roomId, name, score, step, completed ? 'true' : 'false', nowIso]);
}

function getScoresForRoom_(roomId) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SCORES_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) return [];

  const headerMap = getHeaderMap_(sheet);
  const values    = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();

  return values
    .filter(row => !roomId || String(row[headerMap.roomId - 1]).trim() === roomId)
    .map(row => ({
      roomId:    String(row[headerMap.roomId    - 1]).trim(),
      name:      String(row[headerMap.name      - 1]).trim(),
      score:     toNumberSafe_(row[headerMap.score - 1], 0),
      lastStep:  String(row[headerMap.lastStep  - 1]).trim(),
      completed: String(row[headerMap.completed - 1]).trim() === 'true',
      updatedAt: String(row[headerMap.updatedAt - 1]).trim(),
    }))
    .sort((a, b) => b.score - a.score);
}

/* =========================
   Core room logic
========================= */

function getEffectiveRoomState_(room) {
  const status = normalize_(room.status) || DEFAULT_STATUS;

  if (status !== 'started') return { ...room, status: DEFAULT_STATUS };

  const startedAt = Number(room.startedAt || '');
  const now       = Date.now();
  const maxAgeMs  = AUTO_RESET_MINUTES * 60 * 1000;

  if (!Number.isFinite(startedAt) || now - startedAt >= maxAgeMs) {
    const resetRoom = {
      ...room, status: DEFAULT_STATUS,
      selectedDoors: '[]', startedAt: '',
      updatedAt: new Date().toISOString()
    };
    updateRoom_(resetRoom);
    logAuditSafe_({ roomId: room.roomId, action: 'auto_reset', actor: 'system', result: 'success', details: 'expired' });
    return resetRoom;
  }

  return room;
}

function assertTeacherToken_(room, teacherToken) {
  const actualHash   = normalize_(room.teacherTokenHash);
  const providedHash = hashToken_(teacherToken);

  if (!actualHash || actualHash !== providedHash) {
    logAuditSafe_({ roomId: room.roomId || '', action: 'auth', actor: 'teacher', result: 'error', details: 'Invalid teacherToken' });
    throw new Error('Invalid teacherToken');
  }
}

/* =========================
   Sheet setup
========================= */

function ensureSheetHeaders_() {
  const roomsSheet = getSheetByNameOrThrow_(SHEET_NAME);

  if (roomsSheet.getLastRow() === 0) {
    roomsSheet.appendRow(getRequiredRoomHeaders_());
  } else {
    const missing = getRequiredRoomHeaders_().filter(h => !getHeaderMap_(roomsSheet)[h]);
    if (missing.length) throw new Error(`Missing columns in "${SHEET_NAME}": ${missing.join(', ')}`);
  }

  const auditSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(AUDIT_SHEET_NAME);
  if (auditSheet) {
    if (auditSheet.getLastRow() === 0) {
      auditSheet.appendRow(getRequiredAuditHeaders_());
    } else {
      const missing = getRequiredAuditHeaders_().filter(h => !getHeaderMap_(auditSheet)[h]);
      if (missing.length) throw new Error(`Missing columns in "${AUDIT_SHEET_NAME}": ${missing.join(', ')}`);
    }
  }

  const roomNamesSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ROOM_NAMES_SHEET_NAME);
  if (roomNamesSheet) {
    if (roomNamesSheet.getLastRow() === 0) {
      roomNamesSheet.appendRow(getRequiredRoomNamesHeaders_());
    } else {
      const missing = getRequiredRoomNamesHeaders_().filter(h => !getHeaderMap_(roomNamesSheet)[h]);
      if (missing.length) throw new Error(`Missing columns in "${ROOM_NAMES_SHEET_NAME}": ${missing.join(', ')}`);
    }
  }
}

function getSheetByNameOrThrow_(name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error(`Missing sheet: ${name}`);
  return sheet;
}

function getHeaderMap_(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {};
  headers.forEach((name, index) => { map[String(name).trim()] = index + 1; });
  return map;
}

function getRequiredRoomHeaders_() {
  return ['roomId','roomName','teacherTokenHash','status','doorsCount','selectedDoors','createdAt','updatedAt','startedAt','teacherName'];
}

function getRequiredAuditHeaders_() {
  return ['timestamp','roomId','action','actor','result','details'];
}

function getRequiredRoomNamesHeaders_() {
  return ['roomName','isActive'];
}

/* =========================
   Room names
========================= */

function getAvailableRoomNames_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ROOM_NAMES_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const headerMap = getHeaderMap_(sheet);
  const values    = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  return values
    .map(row => ({ roomName: normalize_(row[headerMap.roomName - 1]), isActive: parseBooleanCell_(row[headerMap.isActive - 1]) }))
    .filter(item => item.roomName && item.isActive)
    .map(item => item.roomName);
}

function assertRoomNameAllowed_(roomName) {
  const allRoomNames = getAvailableRoomNames_();
  if (allRoomNames.length && !allRoomNames.includes(roomName)) throw new Error('Selected roomName is not allowed');
}

function parseBooleanCell_(value) {
  const raw = normalize_(value).toLowerCase();
  return raw === 'true' || raw === '1' || raw === 'yes' || raw === 'כן';
}

function buildCreateRoomAuditDetails_(teacherName, roomName) {
  const parts = [];
  if (teacherName) parts.push(`teacherName=${teacherName}`);
  if (roomName)    parts.push(`roomName=${roomName}`);
  return parts.join('; ');
}

/* =========================
   Room storage
========================= */

function getRoomOrThrow_(roomId) {
  const sheet     = getSheetByNameOrThrow_(SHEET_NAME);
  const headerMap = getHeaderMap_(sheet);
  const lastRow   = sheet.getLastRow();
  if (lastRow < 2) throw new Error('Room not found');

  const values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][headerMap.roomId - 1]).trim() === roomId) {
      return rowToObject_(values[i], headerMap, i + 2);
    }
  }
  throw new Error('Room not found');
}

function rowToObject_(row, headerMap, rowNumber) {
  const obj = { _rowNumber: rowNumber };
  Object.keys(headerMap).forEach(key => { obj[key] = row[headerMap[key] - 1]; });
  return obj;
}

function insertRoom_(roomObj) {
  const sheet     = getSheetByNameOrThrow_(SHEET_NAME);
  const headerMap = getHeaderMap_(sheet);
  const numCols   = sheet.getLastColumn();
  const rowValues = new Array(numCols).fill('');
  getRequiredRoomHeaders_().forEach(header => {
    const col = headerMap[header];
    if (col) rowValues[col - 1] = roomObj[header] !== undefined ? roomObj[header] : '';
  });
  sheet.appendRow(rowValues);
}

function updateRoom_(roomObj) {
  if (!roomObj._rowNumber) throw new Error('Cannot update room without row number');
  const sheet     = getSheetByNameOrThrow_(SHEET_NAME);
  const headerMap = getHeaderMap_(sheet);
  const numCols   = sheet.getLastColumn();
  const rowValues = sheet.getRange(roomObj._rowNumber, 1, 1, numCols).getValues()[0];
  getRequiredRoomHeaders_().forEach(header => {
    const col = headerMap[header];
    if (col && roomObj[header] !== undefined) rowValues[col - 1] = roomObj[header];
  });
  sheet.getRange(roomObj._rowNumber, 1, 1, numCols).setValues([rowValues]);
}

function roomExists_(roomId) {
  const sheet   = getSheetByNameOrThrow_(SHEET_NAME);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  const headerMap  = getHeaderMap_(sheet);
  const roomIdCol  = headerMap.roomId;
  const values     = sheet.getRange(2, roomIdCol, lastRow - 1, 1).getValues().flat();
  return values.some(v => String(v).trim() === roomId);
}

/* =========================
   Audit log
========================= */

function logAuditSafe_(entry) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(AUDIT_SHEET_NAME);
    if (!sheet) return;
    sheet.appendRow([new Date().toISOString(), entry.roomId||'', entry.action||'', entry.actor||'', entry.result||'', entry.details||'']);
  } catch (err) { /* לא מפילים את המערכת */ }
}

/* =========================
   Utilities
========================= */

function requireRoomId_(params) {
  const roomId = normalize_(params.roomId || params.room_id || params.game_id);
  if (!roomId) throw new Error('Missing roomId');
  return roomId;
}

function requireParam_(params, name) {
  const value = normalize_(params[name]);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function sanitizeDoorsCount_(value) {
  const n = toNumberSafe_(value, DEFAULT_DOORS_COUNT);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_DOORS_COUNT;
  if (n > DOOR_IDS.length) return DOOR_IDS.length;
  return Math.floor(n);
}

function parseSelectedDoors_(raw) {
  if (Array.isArray(raw)) return raw;
  if (!raw) return [];
  try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; }
}

function pickRandomDoors_(allDoorIds, count) {
  const arr = allDoorIds.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}

function generateRoomId_() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  do {
    id = '';
    for (let i = 0; i < 6; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
  } while (roomExists_(id));
  return id;
}

function generateTeacherToken_() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let token = 'TKN_';
  for (let i = 0; i < 12; i++) token += chars.charAt(Math.floor(Math.random() * chars.length));
  return token;
}

function hashToken_(token) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token, Utilities.Charset.UTF_8);
  return digest.map(byte => { const v = (byte < 0 ? byte + 256 : byte).toString(16); return v.length === 1 ? '0' + v : v; }).join('');
}

function buildStudentUrl_(roomId) {
  if (STUDENT_BASE_URL && STUDENT_BASE_URL.indexOf('YOUR_DOMAIN') === -1) return `${STUDENT_BASE_URL}?room=${encodeURIComponent(roomId)}`;
  return `bioroom.html?room=${encodeURIComponent(roomId)}`;
}

function buildAdminUrl_(roomId) {
  if (ADMIN_BASE_URL && ADMIN_BASE_URL.indexOf('YOUR_DOMAIN') === -1) return `${ADMIN_BASE_URL}?room=${encodeURIComponent(roomId)}`;
  return `admin.html?room=${encodeURIComponent(roomId)}`;
}

function normalize_(value) {
  return String(value == null ? '' : value).trim();
}

function toNumberSafe_(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getParams_(e) {
  if (!e) return {};
  if (e.parameter && Object.keys(e.parameter).length) return e.parameter;
  if (e.postData && e.postData.contents) {
    const body = e.postData.contents;
    const type = String(e.postData.type || '').toLowerCase();
    if (type.indexOf('application/json') !== -1) {
      try { return JSON.parse(body); } catch { throw new Error('Invalid JSON body'); }
    }
    return Object.fromEntries(
      body.split('&').filter(Boolean)
        .map(pair => pair.split('='))
        .map(([k, v]) => [decodeURIComponent((k||'').replace(/\+/g,' ')), decodeURIComponent((v||'').replace(/\+/g,' '))])
    );
  }
  return {};
}

function jsonOutput_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
