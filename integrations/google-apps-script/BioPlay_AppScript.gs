/*********************************
 * BioPlay - Room-Based Backend + Scoring
 * Google Apps Script Web App
 * גרסה מעודכנת – כוללת gameStatus, gameJoin, gameScore
 *
 * חובה תפעולי: אחרי כל עדכון לקובץ יש לבצע Deploy מחדש ל-Web App
 * (פריסה > ניהול פריסות > ערוך > גרסה חדשה) — פירוט: DEPLOY.md
 *********************************/

const SHEET_NAME            = 'rooms';
const AUDIT_SHEET_NAME      = 'audit_log';
const ROOM_NAMES_SHEET_NAME = 'room_names';
const SCORES_SHEET_NAME     = 'scores';

const DEFAULT_STATUS      = 'waiting';
const DEFAULT_DOORS_COUNT = 5;
const AUTO_RESET_MINUTES  = 30;

const WEB_APP_URL           = 'https://script.google.com/macros/s/AKfycbyb0n7HMDLAJih6De3NJ7xLcq9Vi4hQZNnBQsKNWolhYHZba3cxJTifi_cnNstGdKoOFA/exec';
const DOOR_IDS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
  31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
  41, 42, 43, 44, 45
];

const STUDENT_BASE_URL = 'https://YOUR_DOMAIN/index.html';
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
      const effStatus = normalize_(eff.status);
      return jsonOutput_({
        ok:            true,
        roomId:        roomId,
        status:        effStatus === 'started' ? 'active' : (effStatus === 'ended' ? 'ended' : 'waiting'),
        doorsCount:    toNumberSafe_(eff.doorsCount, DEFAULT_DOORS_COUNT),
        selectedDoors: parseSelectedDoors_(eff.selectedDoors),
        enabledSteps:  parseEnabledSteps_(eff.enabledSteps),
        startedAtMs:   Number(eff.startedAt || '') || 0
      });
    }

    /* ── gameScores: כל הניקודים של חדר (נשלח מ-admin.html) — חובה roomId, בלי ערבוב חדרים ── */
    if (action === 'gamescores') {
      const roomId = requireRoomId_(params);
      const rows   = getScoresForRoom_(roomId);
      return jsonOutput_({
        ok: true,
        roomId,
        scores: rows,
        ranking: rows.map(r => ({ name: r.name, rank: r.rank, finishRank: r.finishRank, completedAt: r.completedAt }))
      });
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
        selectedDoors: parseSelectedDoors_(effectiveRoom.selectedDoors),
        enabledSteps:  parseEnabledSteps_(effectiveRoom.enabledSteps)
      });
    }

    /* ── list_room_names ── */
    if (action === 'list_room_names') {
      return jsonOutput_({ ok: true, roomNames: getAvailableRoomNames_() });
    }

    if (action === 'storage_info') {
      return jsonOutput_({ ok: true, storage: getStorageInfo_() });
    }

    if (action === 'schema_info') {
      return jsonOutput_({ ok: true, schema: getSchemaInfo_() });
    }

    if (action === 'dependency_report') {
      return jsonOutput_({ ok: true, dependencies: getDependencyReport_() });
    }

    if (action === 'migration_report') {
      return jsonOutput_({ ok: true, report: getMigrationReport_() });
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
      const roomId        = requireRoomId_(params);
      const participantId = normalize_(params.participantId || '');
      const name          = normalize_(params.name || '');
      const door          = normalize_(params.door || '');
      if (!participantId) throw new Error('Missing participantId');
      if (!name) throw new Error('Missing name');
      const room = getRoomOrThrow_(roomId);
      const eff = getEffectiveRoomState_(room);
      if (normalize_(eff.status) !== 'started') throw new Error('Room is not active');

      upsertScore_(roomId, participantId, name, 0, 'joined', false, door, 0);
      logAuditSafe_({ roomId, action: 'gameJoin', actor: name, result: 'success', details: '' });
      return jsonOutput_({ ok: true });
    }

    /* ── gameScore: עדכון ניקוד תלמיד ── */
    if (action === 'gamescore') {
      const roomId        = requireRoomId_(params);
      const participantId = normalize_(params.participantId || '');
      const name          = normalize_(params.name || '');
      const score         = toNumberSafe_(params.score, 0);
      const step          = normalize_(params.step || '');
      const door          = normalize_(params.door || '');
      const completed     = normalize_(params.completed || '') === 'true';
      const hintsUsed     = toNumberSafe_(params.hintsUsed, 0);

      if (!participantId) throw new Error('Missing participantId');
      if (!name) throw new Error('Missing name');
      const room = getRoomOrThrow_(roomId);
      const eff = getEffectiveRoomState_(room);
      if (normalize_(eff.status) !== 'started') throw new Error('Room is closed for score updates');

      upsertScore_(roomId, participantId, name, score, step, completed, door, hintsUsed);
      logAuditSafe_({
        roomId, action: 'gameScore', actor: name,
        result: 'success', details: `pid=${participantId} step=${step} score=${score} door=${door} hints=${hintsUsed} completed=${completed}`
      });
      return jsonOutput_({ ok: true });
    }

    /* ── create_room ── */
    if (action === 'create_room') {
      const teacherName        = normalize_(params.teacherName || '');
      const requestedRoomName  = normalize_(params.roomName || '');
      const doorsCount         = sanitizeDoorsCount_(params.doorsCountDefault || params.doorsCount);
      const enabledSteps       = parseEnabledSteps_(params.enabledSteps);

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
        enabledSteps: JSON.stringify(enabledSteps),
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
        enabledSteps,
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
      const enabledSteps  = parseEnabledSteps_(params.enabledSteps || room.enabledSteps);
      const nowIso        = new Date().toISOString();
      const nowMs         = String(Date.now());

      // Fresh-run policy: starting a new game in an existing room must clear
      // previous room scores so admin leaderboard does not carry old points.
      deleteScoresForRoom_(roomId);

      const updatedRoom = {
        ...room, status: 'started', doorsCount,
        selectedDoors: JSON.stringify(selectedDoors),
        enabledSteps: JSON.stringify(enabledSteps),
        startedAt: nowMs, updatedAt: nowIso
      };

      updateRoom_(updatedRoom);
      logAuditSafe_({ roomId, action: 'start', actor: 'teacher', result: 'success', details: `doorsCount=${doorsCount}` });

      return jsonOutput_({
        ok: true, roomId,
        roomName:     normalize_(updatedRoom.roomName || ''),
        status:       'started',
        doorsCount,
        selectedDoors,
        enabledSteps
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
      deleteScoresForRoom_(roomId);
      logAuditSafe_({ roomId, action: 'reset', actor: 'teacher', result: 'success', details: 'room+scores' });

      return jsonOutput_({
        ok: true, roomId,
        roomName: normalize_(updatedRoom.roomName || ''),
        status: DEFAULT_STATUS
      });
    }

    /* ── end ── */
    if (action === 'end') {
      const roomId       = requireRoomId_(params);
      const teacherToken = requireParam_(params, 'teacherToken');
      const room         = getRoomOrThrow_(roomId);

      assertTeacherToken_(room, teacherToken);

      const nowIso = new Date().toISOString();
      const updatedRoom = {
        ...room,
        status: 'ended',
        updatedAt: nowIso
      };
      updateRoom_(updatedRoom);
      logAuditSafe_({ roomId, action: 'end', actor: 'teacher', result: 'success', details: '' });
      return jsonOutput_({
        ok: true, roomId,
        roomName: normalize_(updatedRoom.roomName || ''),
        status: 'ended'
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
  return ['roomId', 'participantId', 'name', 'score', 'lastStep', 'door', 'hintsUsed', 'completed', 'completedAt', 'updatedAt', 'startTime'];
}

function upsertScore_(roomId, participantId, name, score, step, completed, door, hintsUsed) {
  const ss    = getSpreadsheet_();
  let sheet   = ss.getSheetByName(SCORES_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SCORES_SHEET_NAME);
    sheet.appendRow(getRequiredScoresHeaders_());
  }

  const headerMap  = getHeaderMap_(sheet);
  const lastRow    = sheet.getLastRow();
  const nowIso     = new Date().toISOString();
  const nowMs      = Date.now();
  const hintsNum   = Number(hintsUsed) || 0;
  const isHintStep = step === 'hint_used';

  if (lastRow >= 2) {
    const values = sheet.getRange(2, 1, lastRow, sheet.getLastColumn()).getValues();
    for (let i = 0; i < values.length; i++) {
      const rowRoomId = String(values[i][headerMap.roomId - 1]).trim();
      const rowParticipantId = String(values[i][headerMap.participantId - 1]).trim();
      if (rowRoomId === roomId && rowParticipantId === participantId) {
        const rowNum = i + 2;
        const wasCompleted = String(values[i][headerMap.completed - 1]).trim() === 'true';
        const existingCompletedAt = headerMap.completedAt ? String(values[i][headerMap.completedAt - 1] || '').trim() : '';
        const nowCompleted = completed || wasCompleted;
        const completedAt = (!existingCompletedAt && nowCompleted) ? nowIso : existingCompletedAt;
        if (!isHintStep) {
          sheet.getRange(rowNum, headerMap.score,    1, 1).setValue(score);
          sheet.getRange(rowNum, headerMap.lastStep, 1, 1).setValue(step);
        }
        if (headerMap.door && door) sheet.getRange(rowNum, headerMap.door, 1, 1).setValue(door);
        if (headerMap.name) sheet.getRange(rowNum, headerMap.name, 1, 1).setValue(name);
        if (headerMap.hintsUsed && hintsNum > 0) {
          const existingHints = Number(values[i][headerMap.hintsUsed - 1]) || 0;
          sheet.getRange(rowNum, headerMap.hintsUsed, 1, 1).setValue(Math.max(existingHints, hintsNum));
        }
        if (!isHintStep) {
          sheet.getRange(rowNum, headerMap.completed, 1, 1).setValue(nowCompleted ? 'true' : 'false');
          if (headerMap.completedAt) sheet.getRange(rowNum, headerMap.completedAt, 1, 1).setValue(completedAt);
        }
        sheet.getRange(rowNum, headerMap.updatedAt, 1, 1).setValue(nowIso);
        if (headerMap.startTime) {
          const prevSt = sheet.getRange(rowNum, headerMap.startTime, 1, 1).getValue();
          if (!prevSt && step === 'joined') {
            sheet.getRange(rowNum, headerMap.startTime, 1, 1).setValue(nowMs);
          }
        }
        return;
      }
    }
  }

  const completedAt = completed ? nowIso : '';
  const numCols = sheet.getLastColumn();
  const rowArr = new Array(Math.max(numCols, Object.keys(headerMap).length)).fill('');
  const setCell = (key, val) => {
    const c = headerMap[key];
    if (c) rowArr[c - 1] = val;
  };
  setCell('roomId', roomId);
  setCell('participantId', participantId);
  setCell('name', name);
  setCell('score', score);
  setCell('lastStep', isHintStep ? '' : step);
  setCell('door', door || '');
  setCell('hintsUsed', hintsNum || 0);
  setCell('completed', completed ? 'true' : 'false');
  setCell('completedAt', completedAt);
  setCell('updatedAt', nowIso);
  if (headerMap.startTime) setCell('startTime', step === 'joined' ? nowMs : '');
  sheet.appendRow(rowArr);
}

function getScoresForRoom_(roomId) {
  const rid = normalize_(roomId);
  if (!rid) return [];

  const ss    = getSpreadsheet_();
  const sheet = ss.getSheetByName(SCORES_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) return [];

  const headerMap = getHeaderMap_(sheet);
  const values    = sheet.getRange(2, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();

  const rows = values
    .filter(row => String(row[headerMap.roomId - 1]).trim() === rid)
    .map(row => ({
      roomId:    String(row[headerMap.roomId    - 1]).trim(),
      participantId: headerMap.participantId ? String(row[headerMap.participantId - 1]).trim() : '',
      name:      String(row[headerMap.name      - 1]).trim(),
      score:     toNumberSafe_(row[headerMap.score - 1], 0),
      lastStep:  String(row[headerMap.lastStep  - 1]).trim(),
      door:      headerMap.door ? String(row[headerMap.door - 1]).trim() : '',
      hintsUsed: headerMap.hintsUsed ? (Number(row[headerMap.hintsUsed - 1]) || 0) : 0,
      completed: String(row[headerMap.completed - 1]).trim() === 'true',
      completedAt: headerMap.completedAt ? String(row[headerMap.completedAt - 1]).trim() : '',
      updatedAt: String(row[headerMap.updatedAt - 1]).trim(),
      startTime: headerMap.startTime ? String(row[headerMap.startTime - 1] || '').trim() : '',
    }));

  const rankedRows = rows
    .map(row => {
      const score = toNumberSafe_(row.score, 0);
      const startTimeMs = Number(row.startTime || '') || 0;
      const completedAtMs = Date.parse(row.completedAt || '') || 0;
      const elapsedMs = (startTimeMs && completedAtMs && completedAtMs >= startTimeMs)
        ? (completedAtMs - startTimeMs)
        : Number.MAX_SAFE_INTEGER;
      return {
        ...row,
        score,
        elapsedMs,
        completedAtMs: completedAtMs || Number.MAX_SAFE_INTEGER,
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.elapsedMs !== b.elapsedMs) return a.elapsedMs - b.elapsedMs;
      if (a.completedAtMs !== b.completedAtMs) return a.completedAtMs - b.completedAtMs;
      return String(a.name || '').localeCompare(String(b.name || ''), 'he');
    });

  return rankedRows.map((row, index) => ({
    ...row,
    finishTime: row.completedAt || '',
    finishRank: index + 1,
    rank: index + 1,
    elapsedMs: row.elapsedMs === Number.MAX_SAFE_INTEGER ? '' : row.elapsedMs,
  }));
}

/** מוחק את כל שורות הניקוד של אותו roomId בלבד (לא מושפע מחדרים אחרים בגיליון) */
function deleteScoresForRoom_(roomId) {
  const rid = normalize_(roomId);
  if (!rid) return;

  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName(SCORES_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) return;
  const headerMap = getHeaderMap_(sheet);
  const colRoom = headerMap.roomId;
  if (!colRoom) return;
  const last = sheet.getLastRow();
  for (let r = last; r >= 2; r--) {
    const v = String(sheet.getRange(r, colRoom, 1, 1).getValue()).trim();
    if (v === rid) sheet.deleteRow(r);
  }
}

/* =========================
   Core room logic
========================= */

function getEffectiveRoomState_(room) {
  const status = normalize_(room.status) || DEFAULT_STATUS;

  if (status === 'ended') return { ...room, status: 'ended' };
  if (status !== 'started') return { ...room, status: DEFAULT_STATUS };

  const startedAt = Number(room.startedAt || '');
  const now       = Date.now();
  const maxAgeMs  = AUTO_RESET_MINUTES * 60 * 1000;

  if (!Number.isFinite(startedAt) || now - startedAt >= maxAgeMs) {
    deleteScoresForRoom_(room.roomId);
    const resetRoom = {
      ...room, status: DEFAULT_STATUS,
      selectedDoors: '[]', startedAt: '',
      updatedAt: new Date().toISOString()
    };
    updateRoom_(resetRoom);
    logAuditSafe_({ roomId: room.roomId, action: 'auto_reset', actor: 'system', result: 'success', details: 'expired+scores_cleared' });
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
    appendMissingHeaders_(roomsSheet, getRequiredRoomHeaders_());
  }

  const auditSheet = getSpreadsheet_().getSheetByName(AUDIT_SHEET_NAME);
  if (auditSheet) {
    if (auditSheet.getLastRow() === 0) {
      auditSheet.appendRow(getRequiredAuditHeaders_());
    } else {
      const missing = getRequiredAuditHeaders_().filter(h => !getHeaderMap_(auditSheet)[h]);
      if (missing.length) throw new Error(`Missing columns in "${AUDIT_SHEET_NAME}": ${missing.join(', ')}`);
    }
  }

  const roomNamesSheet = getSpreadsheet_().getSheetByName(ROOM_NAMES_SHEET_NAME);
  if (roomNamesSheet) {
    if (roomNamesSheet.getLastRow() === 0) {
      roomNamesSheet.appendRow(getRequiredRoomNamesHeaders_());
    } else {
      const missing = getRequiredRoomNamesHeaders_().filter(h => !getHeaderMap_(roomNamesSheet)[h]);
      if (missing.length) throw new Error(`Missing columns in "${ROOM_NAMES_SHEET_NAME}": ${missing.join(', ')}`);
    }
  }

  const scoresSheet = getSpreadsheet_().getSheetByName(SCORES_SHEET_NAME);
  if (scoresSheet) {
    if (scoresSheet.getLastRow() === 0) {
      scoresSheet.appendRow(getRequiredScoresHeaders_());
    } else {
      appendMissingHeaders_(scoresSheet, getRequiredScoresHeaders_());
    }
  }
}

function appendMissingHeaders_(sheet, requiredHeaders) {
  const headerMap = getHeaderMap_(sheet);
  const missing = requiredHeaders.filter(h => !headerMap[h]);
  if (!missing.length) return;
  const startCol = sheet.getLastColumn() + 1;
  sheet.getRange(1, startCol, 1, missing.length).setValues([missing]);
}

function getSheetByNameOrThrow_(name) {
  const sheet = getSpreadsheet_().getSheetByName(name);
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
  return ['roomId','roomName','teacherTokenHash','status','doorsCount','selectedDoors','enabledSteps','createdAt','updatedAt','startedAt','teacherName'];
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
  const sheet = getSpreadsheet_().getSheetByName(ROOM_NAMES_SHEET_NAME);
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
    const sheet = getSpreadsheet_().getSheetByName(AUDIT_SHEET_NAME);
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

function parseEnabledSteps_(raw) {
  const allowed = new Set([1, 2, 3, 4, 5, 6]);
  let values = [];

  if (Array.isArray(raw)) {
    values = raw;
  } else if (typeof raw === 'string' && raw) {
    const text = raw.trim();
    if (text.startsWith('[')) {
      try { values = JSON.parse(text); } catch { values = text.split(','); }
    } else {
      values = text.split(',');
    }
  } else if (raw != null && raw !== '') {
    values = [raw];
  }

  const normalized = values
    .map(v => Number(v))
    .filter(v => Number.isFinite(v) && allowed.has(v));

  normalized.push(1, 6);
  return [...new Set(normalized)].sort((a, b) => a - b);
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

function getSpreadsheet_() {
  const targetId = normalize_(PropertiesService.getScriptProperties().getProperty('TARGET_SPREADSHEET_ID'));
  if (targetId) return SpreadsheetApp.openById(targetId);

  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) throw new Error('No active spreadsheet and TARGET_SPREADSHEET_ID is not configured');
  return active;
}

function getStorageInfo_() {
  const configuredId = normalize_(PropertiesService.getScriptProperties().getProperty('TARGET_SPREADSHEET_ID'));
  const active = SpreadsheetApp.getActiveSpreadsheet();
  const activeId = active ? normalize_(active.getId()) : '';

  const ss = getSpreadsheet_();
  return {
    bindingMode: active ? 'bound' : 'standalone',
    configuredSpreadsheetId: configuredId || null,
    activeSpreadsheetId: activeId || null,
    effectiveSpreadsheetId: ss.getId(),
    effectiveSpreadsheetUrl: ss.getUrl(),
    usingOverride: !!configuredId && configuredId !== activeId,
    sheets: ss.getSheets().map(sh => sh.getName())
  };
}

function getSchemaInfo_() {
  const ss = getSpreadsheet_();
  const required = {
    rooms: getRequiredRoomHeaders_(),
    scores: getRequiredScoresHeaders_(),
    audit_log: getRequiredAuditHeaders_(),
    room_names: getRequiredRoomNamesHeaders_(),
  };

  const existing = {};
  ss.getSheets().forEach(sheet => {
    const lastCol = sheet.getLastColumn();
    existing[sheet.getName()] = lastCol > 0
      ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim())
      : [];
  });

  return {
    required,
    existing,
    requiredOptionality: {
      rooms: 'required',
      scores: 'optional_auto_create',
      audit_log: 'optional_no_auto_create',
      room_names: 'optional_no_auto_create'
    }
  };
}

function getDependencyReport_() {
  const ss = getSpreadsheet_();

  const triggers = ScriptApp.getProjectTriggers().map(trigger => ({
    handlerFunction: trigger.getHandlerFunction(),
    eventType: String(trigger.getEventType()),
    triggerSource: String(trigger.getTriggerSource())
  }));

  const namedRanges = ss.getNamedRanges().map(namedRange => {
    const range = namedRange.getRange();
    return {
      name: namedRange.getName(),
      sheet: range ? range.getSheet().getName() : '',
      a1Notation: range ? range.getA1Notation() : ''
    };
  });

  const formulas = {};
  const formulaRisks = [];

  ss.getSheets().forEach(sheet => {
    const dataRange = sheet.getDataRange();
    const formulaGrid = dataRange.getFormulas();
    let formulaCells = 0;
    let hasImportrange = false;
    let hasCrossSheetRefs = false;

    formulaGrid.forEach(row => {
      row.forEach(formula => {
        const f = normalize_(formula);
        if (!f) return;
        formulaCells += 1;
        if (/IMPORTRANGE\s*\(/i.test(f)) {
          hasImportrange = true;
          formulaRisks.push({ sheet: sheet.getName(), type: 'importrange', formula: f.slice(0, 180) });
        }
        if (/![A-Z]/.test(f) || /'[^']+'!/.test(f)) {
          hasCrossSheetRefs = true;
        }
      });
    });

    formulas[sheet.getName()] = {
      formulaCells,
      hasImportrange,
      hasCrossSheetRefs,
    };
  });

  return {
    triggerCount: triggers.length,
    triggers,
    namedRangeCount: namedRanges.length,
    namedRanges,
    formulas,
    formulaRisks,
    historicalDataDependency: {
      rooms: 'needed for roomId uniqueness check and ongoing room state',
      scores: 'used for ranking/finishRank/completedAt inside each room',
      audit_log: 'optional operational history only',
      room_names: 'optional allow-list for room names'
    }
  };
}

function getMigrationReport_() {
  return {
    storage: getStorageInfo_(),
    schema: getSchemaInfo_(),
    dependencies: getDependencyReport_(),
    autoStructureBehavior: {
      autoCreateSheetsIfMissing: ['scores'],
      autoAppendMissingHeaders: ['rooms', 'scores'],
      strictHeaderValidationIfSheetExists: ['audit_log', 'room_names']
    }
  };
}

function buildStudentUrl_(roomId) {
  if (STUDENT_BASE_URL && STUDENT_BASE_URL.indexOf('YOUR_DOMAIN') === -1) return `${STUDENT_BASE_URL}?room=${encodeURIComponent(roomId)}`;
  return `index.html?room=${encodeURIComponent(roomId)}`;
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

function parseUrlEncodedBody_(body) {
  if (!body) return {};
  return Object.fromEntries(
    body.split('&').filter(Boolean)
      .map(pair => {
        const eq = pair.indexOf('=');
        const k = eq >= 0 ? pair.slice(0, eq) : pair;
        const v = eq >= 0 ? pair.slice(eq + 1) : '';
        return [
          decodeURIComponent((k || '').replace(/\+/g, ' ')),
          decodeURIComponent((v || '').replace(/\+/g, ' ')),
        ];
      })
  );
}

function getParams_(e) {
  if (!e) return {};
  const fromQuery = e.parameter && Object.keys(e.parameter).length ? { ...e.parameter } : {};
  if (e.postData && e.postData.contents) {
    const body = e.postData.contents;
    const type = String(e.postData.type || '').toLowerCase();
    if (type.indexOf('application/json') !== -1) {
      try {
        const parsed = JSON.parse(body);
        return typeof parsed === 'object' && parsed !== null ? { ...fromQuery, ...parsed } : parsed;
      } catch {
        throw new Error('Invalid JSON body');
      }
    }
    const fromBody = parseUrlEncodedBody_(body);
    return { ...fromQuery, ...fromBody };
  }
  return fromQuery;
}

function jsonOutput_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
