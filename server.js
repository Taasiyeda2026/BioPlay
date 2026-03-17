const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT       = 5000;
const ROOT       = __dirname;
const ADMIN_CODE = 'BIO2026';
const AUTO_CLEAR_MS = 15 * 60 * 1000; /* 15 דקות לאחר סיום משחק */

/* ============================================================
   IN-MEMORY GAME STORE
   ============================================================ */
const store = {
  status:      'waiting', /* waiting | active | ended */
  players:     {},        /* { [name]: { score, steps, joinedAt, completedAt } } */
  gameEndedAt: null,      /* timestamp ms – מתי הסתיים המשחק */
  _clearTimer: null,      /* setTimeout handle למחיקה אוטומטית */
};

function jsonRes(res, data, code = 200) {
  const body = JSON.stringify(data);
  res.writeHead(code, {
    'Content-Type':                'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control':               'no-store',
  });
  res.end(body);
}

function parseBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(raw)); } catch { resolve({}); }
    });
  });
}

function checkAdmin(body) {
  return body && body.adminCode === ADMIN_CODE;
}

function scheduleClear() {
  if (store._clearTimer) clearTimeout(store._clearTimer);
  store._clearTimer = setTimeout(() => {
    store.status      = 'waiting';
    store.players     = {};
    store.gameEndedAt = null;
    store._clearTimer = null;
    console.log('[BioPlay] תוצאות נמחקו אוטומטית לאחר 15 דקות.');
  }, AUTO_CLEAR_MS);
}

/* ============================================================
   HTTP SERVER
   ============================================================ */
const MIME_TYPES = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.ico':  'image/x-icon',
  '.mp4':  'video/mp4',
  '.m4a':  'audio/mp4',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.csv':  'text/csv',
};

const server = http.createServer(async (req, res) => {
  const method  = req.method.toUpperCase();
  const urlPath = req.url.split('?')[0];

  /* ---------- CORS pre-flight ---------- */
  if (method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST', 'Access-Control-Allow-Headers': 'Content-Type' });
    return res.end();
  }

  /* ============================================================
     API ROUTES
     ============================================================ */

  /* GET /api/status → current game status */
  if (method === 'GET' && urlPath === '/api/status') {
    return jsonRes(res, { status: store.status });
  }

  /* GET /api/scores → full player list (admin) */
  if (method === 'GET' && urlPath === '/api/scores') {
    const list = Object.entries(store.players).map(([name, p]) => ({
      name,
      score:       p.score,
      steps:       p.steps,
      joinedAt:    p.joinedAt,
      completedAt: p.completedAt || null,
    })).sort((a, b) => b.score - a.score);
    const clearAt = store.gameEndedAt ? store.gameEndedAt + AUTO_CLEAR_MS : null;
    return jsonRes(res, { status: store.status, players: list, clearAt });
  }

  /* POST /api/start → admin starts game (requires adminCode) */
  if (method === 'POST' && urlPath === '/api/start') {
    const body = await parseBody(req);
    if (!checkAdmin(body)) return jsonRes(res, { ok: false, error: 'קוד מדריך שגוי' }, 403);
    store.status      = 'active';
    store.gameEndedAt = null;
    if (store._clearTimer) { clearTimeout(store._clearTimer); store._clearTimer = null; }
    console.log('[BioPlay] המשחק התחיל.');
    return jsonRes(res, { ok: true, status: store.status });
  }

  /* POST /api/end → admin ends game (requires adminCode) */
  if (method === 'POST' && urlPath === '/api/end') {
    const body = await parseBody(req);
    if (!checkAdmin(body)) return jsonRes(res, { ok: false, error: 'קוד מדריך שגוי' }, 403);
    store.status      = 'ended';
    store.gameEndedAt = Date.now();
    scheduleClear();
    console.log('[BioPlay] המשחק הסתיים – תוצאות יימחקו בעוד 15 דקות.');
    return jsonRes(res, { ok: true, status: store.status, clearAt: store.gameEndedAt + AUTO_CLEAR_MS });
  }

  /* POST /api/reset → admin resets everything (requires adminCode) */
  if (method === 'POST' && urlPath === '/api/reset') {
    const body = await parseBody(req);
    if (!checkAdmin(body)) return jsonRes(res, { ok: false, error: 'קוד מדריך שגוי' }, 403);
    if (store._clearTimer) { clearTimeout(store._clearTimer); store._clearTimer = null; }
    store.status      = 'waiting';
    store.players     = {};
    store.gameEndedAt = null;
    console.log('[BioPlay] המשחק אופס.');
    return jsonRes(res, { ok: true });
  }

  /* POST /api/join → player registers {name} */
  if (method === 'POST' && urlPath === '/api/join') {
    const body = await parseBody(req);
    const name = String(body.name || '').trim().slice(0, 40);
    if (!name) return jsonRes(res, { ok: false, error: 'שם ריק' }, 400);
    if (!store.players[name]) {
      store.players[name] = { score: 0, steps: [], joinedAt: new Date().toISOString(), completedAt: null };
    }
    return jsonRes(res, { ok: true, name, status: store.status });
  }

  /* POST /api/score → update player score {name, score, step, completed} */
  if (method === 'POST' && urlPath === '/api/score') {
    const body  = await parseBody(req);
    const name  = String(body.name  || '').trim();
    const score = Number(body.score || 0);
    const step  = String(body.step  || '');
    if (!name || !store.players[name]) return jsonRes(res, { ok: false, error: 'שחקן לא קיים' }, 404);
    const p = store.players[name];
    p.score = score;
    if (step && !p.steps.includes(step)) p.steps.push(step);
    if (body.completed) p.completedAt = new Date().toISOString();
    return jsonRes(res, { ok: true });
  }

  /* ============================================================
     STATIC FILE SERVING
     ============================================================ */
  let filePath = path.join(ROOT, urlPath === '/' ? '/bioroom.html' : urlPath);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found');
    }
    const ext         = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[BioPlay] Server running at http://0.0.0.0:${PORT}`);
});
