const SHEET_ROOMS = 'rooms';
const SHEET_ROOM_NAMES = 'room_names';
const ROOM_NAME_COLUMN = 'roomName';
const HEADER = ['roomId', 'teacherTokenHash', 'status', 'doorsCount', 'selectedDoors', 'createdAt', 'updatedAt', 'roomName'];
const MIN_DOORS = 2;
const MAX_DOORS = 30;
const DEFAULT_DOORS = 5;

function doGet(e) {
  return route_(e, 'GET');
}

function doPost(e) {
  return route_(e, 'POST');
}

function route_(e, method) {
  try {
    const p = params_(e);
    const action = (p.action || '').trim();
    if (!action) return err_('MISSING_ACTION', 'Missing action');

    ensureRoomsSheet_();

    if (action === 'status' && method === 'GET') return status_(p);
    if (action === 'room_names' && method === 'GET') return roomNames_();
    if (action === 'create_room' && method === 'POST') return createRoom_(p);
    if (action === 'start' && method === 'POST') return startRoom_(p);
    if (action === 'reset' && method === 'POST') return resetRoom_(p);

    return err_('INVALID_ACTION', 'Unsupported action/method');
  } catch (error) {
    return err_('INTERNAL_ERROR', String(error && error.message || error));
  }
}

function createRoom_(p) {
  const doorsCount = parseDoorsCount_(p.doorsCount);
  if (!doorsCount) return err_('INVALID_DOORS_COUNT', 'doorsCount must be 2..30');
  const roomName = clean_(p.roomName);
  if (!roomName) return err_('MISSING_ROOM_NAME', 'roomName is required');

  const roomId = genRoomId_();
  const teacherToken = genTeacherToken_();
  const now = nowIso_();
  const row = [roomId, sha256_(teacherToken), 'waiting', doorsCount, '[]', now, now, roomName];

  sheet_().appendRow(row);
  return ok_({
    roomId,
    teacherToken,
    status: 'waiting',
    doorsCount,
    selectedDoors: [],
    roomName,
    createdAt: now,
    updatedAt: now
  });
}

function roomNames_() {
  const names = loadRoomNames_();
  return ok_({ roomNames: names });
}

function status_(p) {
  const roomId = clean_(p.roomId || p.game_id);
  if (!roomId) return err_('MISSING_ROOM_ID', 'roomId is required');

  const room = findRoom_(roomId);
  if (!room) return err_('ROOM_NOT_FOUND', 'Room does not exist');

  return ok_(publicRoom_(room));
}

function startRoom_(p) {
  const roomId = clean_(p.roomId || p.game_id);
  const teacherToken = clean_(p.teacherToken || p.code);
  if (!roomId) return err_('MISSING_ROOM_ID', 'roomId is required');
  if (!teacherToken) return err_('MISSING_TEACHER_TOKEN', 'teacherToken is required');

  const room = findRoom_(roomId);
  if (!room) return err_('ROOM_NOT_FOUND', 'Room does not exist');
  if (room.teacherTokenHash !== sha256_(teacherToken)) return err_('INVALID_TEACHER_TOKEN', 'Invalid teacher token');

  let doorsCount = room.doorsCount;
  if (typeof p.doorsCount !== 'undefined' && p.doorsCount !== '') {
    const parsed = parseDoorsCount_(p.doorsCount);
    if (!parsed) return err_('INVALID_DOORS_COUNT', 'doorsCount must be 2..30');
    doorsCount = parsed;
  }

  const allDoorIds = loadDoorIds_();
  const selectedDoors = shuffle_(allDoorIds).slice(0, Math.min(doorsCount, allDoorIds.length));
  const now = nowIso_();

  updateRoom_(room.rowIndex, {
    status: 'started',
    doorsCount,
    selectedDoors: JSON.stringify(selectedDoors),
    updatedAt: now
  });

  const updated = findRoom_(roomId);
  return ok_(publicRoom_(updated));
}

function resetRoom_(p) {
  const roomId = clean_(p.roomId || p.game_id);
  const teacherToken = clean_(p.teacherToken || p.code);
  if (!roomId) return err_('MISSING_ROOM_ID', 'roomId is required');
  if (!teacherToken) return err_('MISSING_TEACHER_TOKEN', 'teacherToken is required');

  const room = findRoom_(roomId);
  if (!room) return err_('ROOM_NOT_FOUND', 'Room does not exist');
  if (room.teacherTokenHash !== sha256_(teacherToken)) return err_('INVALID_TEACHER_TOKEN', 'Invalid teacher token');

  const now = nowIso_();
  updateRoom_(room.rowIndex, {
    status: 'waiting',
    selectedDoors: '[]',
    updatedAt: now
  });

  const updated = findRoom_(roomId);
  return ok_(publicRoom_(updated));
}

function publicRoom_(room) {
  return {
    roomId: room.roomId,
    status: room.status,
    doorsCount: room.doorsCount,
    selectedDoors: parseDoors_(room.selectedDoors),
    roomName: room.roomName || room.roomId,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt
  };
}

function loadRoomNames_() {
  const sh = roomNamesSheet_();
  const values = sh.getDataRange().getValues();
  if (!values.length) return [];

  const header = values[0].map(function(cell) { return clean_(cell).toLowerCase(); });
  const idx = header.indexOf(ROOM_NAME_COLUMN.toLowerCase());
  if (idx === -1) return [];

  var uniq = {};
  var names = [];
  for (var i = 1; i < values.length; i++) {
    var raw = clean_(values[i][idx]);
    if (!raw) continue;
    if (uniq[raw]) continue;
    uniq[raw] = true;
    names.push(raw);
  }
  return names;
}

function parseDoors_(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function parseDoorsCount_(raw) {
  const n = parseInt(raw || DEFAULT_DOORS, 10);
  if (!Number.isFinite(n) || n < MIN_DOORS || n > MAX_DOORS) return 0;
  return n;
}

function loadDoorIds_() {
  const raw = PropertiesService.getScriptProperties().getProperty('DOOR_IDS_JSON') || '[]';
  const ids = JSON.parse(raw);
  if (!Array.isArray(ids) || !ids.length) {
    throw new Error('Missing DOOR_IDS_JSON script property (e.g. [1,2,...,30])');
  }
  return ids.map(v => parseInt(v, 10)).filter(Number.isFinite);
}

function ensureRoomsSheet_() {
  const sh = sheet_();
  const firstRow = sh.getRange(1, 1, 1, HEADER.length).getValues()[0];
  const mismatch = HEADER.some((h, i) => String(firstRow[i] || '') !== h);
  if (mismatch) sh.getRange(1, 1, 1, HEADER.length).setValues([HEADER]);
}

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_ROOMS);
  if (!sh) sh = ss.insertSheet(SHEET_ROOMS);
  return sh;
}

function roomNamesSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_ROOM_NAMES);
  if (!sh) {
    sh = ss.insertSheet(SHEET_ROOM_NAMES);
    sh.getRange(1, 1).setValue(ROOM_NAME_COLUMN);
  }
  const firstHeader = clean_(sh.getRange(1, 1).getValue());
  if (!firstHeader) sh.getRange(1, 1).setValue(ROOM_NAME_COLUMN);
  return sh;
}

function findRoom_(roomId) {
  const values = sheet_().getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === roomId) {
      return {
        rowIndex: i + 1,
        roomId: String(values[i][0]),
        teacherTokenHash: String(values[i][1]),
        status: String(values[i][2] || 'waiting'),
        doorsCount: parseInt(values[i][3], 10) || DEFAULT_DOORS,
        selectedDoors: String(values[i][4] || '[]'),
        createdAt: String(values[i][5] || ''),
        updatedAt: String(values[i][6] || ''),
        roomName: String(values[i][7] || '')
      };
    }
  }
  return null;
}

function updateRoom_(rowIndex, patch) {
  const row = sheet_().getRange(rowIndex, 1, 1, HEADER.length).getValues()[0];
  const map = {
    roomId: 0,
    teacherTokenHash: 1,
    status: 2,
    doorsCount: 3,
    selectedDoors: 4,
    createdAt: 5,
    updatedAt: 6
  };
  Object.keys(patch).forEach((k) => {
    if (typeof map[k] !== 'undefined') row[map[k]] = patch[k];
  });
  sheet_().getRange(rowIndex, 1, 1, HEADER.length).setValues([row]);
}

function genRoomId_() {
  return Utilities.getUuid().replace(/-/g, '').slice(0, 8).toUpperCase();
}

function genTeacherToken_() {
  return Utilities.getUuid().replace(/-/g, '').slice(0, 12).toUpperCase();
}

function sha256_(value) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value);
  return bytes.map((b) => ('0' + ((b + 256) % 256).toString(16)).slice(-2)).join('');
}

function nowIso_() {
  return new Date().toISOString();
}

function params_(e) {
  const p = Object.assign({}, (e && e.parameter) || {});
  const body = (e && e.postData && e.postData.contents) || '';
  if (body) {
    body.split('&').forEach((pair) => {
      const [k, v] = pair.split('=');
      if (!k) return;
      p[decodeURIComponent(k)] = decodeURIComponent((v || '').replace(/\+/g, ' '));
    });
  }
  return p;
}

function clean_(s) {
  return String(s || '').trim();
}

function ok_(payload) {
  return out_(Object.assign({ ok: true }, payload || {}));
}

function err_(errorCode, message) {
  return out_({ ok: false, errorCode, message });
}

function out_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
