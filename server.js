'use strict';
/*
 * Mwalimu Planner pilot server.
 * - Serves the web app in ./public
 * - Signs teachers in with phone number + access code (issued on the admin page)
 * - Builds the prompts, calls the Claude API with the secret key, returns cleaned drafts
 * - Enforces a draft allowance per teacher and a daily cap, and logs usage and feedback
 * No dependencies: needs Node.js 20 or newer.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const C = require('./public/core.js');

const PORT = +process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const API_KEY = process.env.ANTHROPIC_API_KEY || '';
const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-5-5';
const BASE = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const MOCK = process.env.MOCK === '1';
const DEFAULT_QUOTA = +process.env.DEFAULT_QUOTA || 30;
const MAX_DAILY_DRAFTS = +process.env.MAX_DAILY_DRAFTS || 300;
const PUBLIC = path.join(__dirname, 'public');

/* ---------------- storage: one JSON file, written atomically ---------------- */
fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_FILE = path.join(DATA_DIR, 'data.json');
let db = { teachers: {}, sessions: {}, usage: [], feedback: [] };
try { db = Object.assign(db, JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))); } catch (e) { /* first run */ }
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const tmp = DB_FILE + '.tmp';
    fs.writeFile(tmp, JSON.stringify(db), err => { if (!err) fs.rename(tmp, DB_FILE, () => {}); else console.error('save failed', err.message); });
  }, 200);
}
function saveNow() { clearTimeout(saveTimer); fs.writeFileSync(DB_FILE + '.tmp', JSON.stringify(db)); fs.renameSync(DB_FILE + '.tmp', DB_FILE); }
process.on('SIGTERM', () => { saveNow(); process.exit(0); });
process.on('SIGINT', () => { saveNow(); process.exit(0); });

/* ---------------- helpers ---------------- */
const jobs = new Map();      // scheme-of-work jobs in progress: id -> {phone, left, exp}
const attempts = new Map();  // sign-in attempts: key -> {n, exp}
const inflight = new Set();  // phones with a draft in progress
const sleep = ms => new Promise(r => setTimeout(r, ms));
const today = () => new Date().toISOString().slice(0, 10);
const S = (v, n) => String(v == null ? '' : v).slice(0, n);
const I = (v, lo, hi, d) => { const x = parseInt(v, 10); return isNaN(x) ? d : Math.max(lo, Math.min(hi, x)); };
function fail(code, status) { const e = new Error(code); e.code = code; e.status = status || 400; return e; }
function normPhone(p) {
  let d = String(p || '').replace(/\D/g, '');
  if (d.startsWith('0')) d = '255' + d.slice(1);
  if (d.length === 9) d = '255' + d;
  return d;
}
function safeEqual(a, b) {
  const x = crypto.createHash('sha256').update(String(a)).digest(), y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}
function tooMany(key, max) {
  const now = Date.now(), a = attempts.get(key);
  if (!a || a.exp < now) { attempts.set(key, { n: 1, exp: now + 15 * 60000 }); return false; }
  a.n++; return a.n > max;
}
function draftsToday() { const d = today(); return db.usage.filter(u => u.at.slice(0, 10) === d && u.charged).length; }

function cleanMeta(m) {
  m = m || {};
  return {
    school: S(m.school, 120), teacher: S(m.teacher, 80), subject: S(m.subject, 90) || 'Mathematics',
    class: C.CLASSES.includes(m.class) ? m.class : 'Standard IV',
    year: I(m.year, 2024, 2040, new Date().getFullYear()), term: m.term === 'II' ? 'II' : 'I',
    month: C.MONTHS.includes(m.month) ? m.month : 'January',
    weeks: I(m.weeks, 2, 24, 20), ppw: I(m.ppw, 1, 12, 5),
    syll: S(m.syll, 6000), ctx: S(m.ctx, 300),
    fmt: m.fmt === 'old' ? 'old' : 'new', lang: m.lang === 'sw' ? 'sw' : 'en',
    dur: I(m.dur, 20, 180, 40), girls: I(m.girls, 0, 500, 0), boys: I(m.boys, 0, 500, 0),
    topic: S(m.topic, 300), date: S(m.date, 20), period: S(m.period, 20), time: S(m.time, 30)
  };
}

/* ---------------- Claude ---------------- */
function mock(prompt) {
  if (/SCHEME OF WORK in/.test(prompt) || /"rows"/.test(prompt.slice(-600))) {
    return { rows: [{ main_competence: 'Sample competence (mock mode)', specific_competence: 'Sample specific competence', main_activity: 'Sample activity', specific_activity: 'Sample specific activity ' + Math.floor(Math.random() * 1000), month: 'January', week: '1-2', periods: '10', methods: 'Group work', resources: 'Real objects', assessment_tools: 'Exercise', references: 'TIE syllabus', competence: 'Sample', objectives: 'Sample', main_topic: 'Sample', sub_topic: 'Sample ' + Math.floor(Math.random() * 1000) }], check: 'Mock mode: no AI was used.' };
  }
  const stages = ['introduction', 'competence_development', 'design', 'realisation', 'new_knowledge', 'reinforcement', 'reflection', 'consolidation'];
  return { fields: { main_competence: 'Sample competence (mock mode)', specific_competence: 'Sample', main_activity: 'Sample', specific_activity: 'Sample', resources: 'Real objects', references: 'TIE syllabus', competence: 'Sample' }, stages: stages.map(k => ({ key: k, time: 10, teaching: 'Teacher guides.', learning: 'Pupils work in groups.', assessment: 'Pupils answer correctly.' })), exercise: [{ q: '1 + 1', a: '2' }], homework: 'Sample homework.' };
}
async function claude(prompt) {
  if (MOCK) { await sleep(300); return mock(prompt); }
  if (!API_KEY) throw fail('server', 500);
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 110000);
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      let r;
      try {
        r = await fetch(BASE + '/v1/messages', {
          method: 'POST', signal: ctl.signal,
          headers: { 'content-type': 'application/json', 'x-api-key': API_KEY, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({ model: MODEL, max_tokens: 4096, messages: [{ role: 'user', content: prompt }] })
        });
      } catch (e) { throw fail('busy', 503); }
      if (r.status === 429 || r.status >= 500) { if (attempt === 0) { await sleep(2000); continue; } throw fail('busy', 503); }
      if (!r.ok) { console.error('Claude API error', r.status, (await r.text()).slice(0, 300)); throw fail('server', 502); }
      const j = await r.json();
      const text = (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
      try { return C.parseJSON(text); } catch (e) { throw fail('incomplete', 502); }
    }
  } finally { clearTimeout(timer); }
}

/* ---------------- API handlers ---------------- */
function auth(req) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
  const s = m && db.sessions[m[1]];
  const t = s && db.teachers[s.phone];
  if (!t || t.disabled) throw fail('auth', 401);
  return t;
}
const left = t => Math.max(0, t.quota - t.used);
function log(t, kind, m, charged) {
  db.usage.push({ at: new Date().toISOString(), phone: t.phone, kind, subject: m.subject, class: m.class, fmt: m.fmt, lang: m.lang, topic: S(m.topic, 120), charged: !!charged });
  if (db.usage.length > 20000) db.usage = db.usage.slice(-20000);
  save();
}
async function charged(t, fn) {
  if (left(t) <= 0) throw fail('quota', 402);
  if (draftsToday() >= MAX_DAILY_DRAFTS) throw fail('daily', 429);
  t.used++; save();
  try { return await fn(); } catch (e) { t.used = Math.max(0, t.used - 1); save(); throw e; }
}
async function oneAtATime(t, fn) {
  if (inflight.has(t.phone)) throw fail('slow', 429);
  inflight.add(t.phone);
  try { return await fn(); } finally { inflight.delete(t.phone); }
}

const routes = {
  async 'POST /api/login'(req, body, ip) {
    const phone = normPhone(body.phone), code = String(body.code || '').replace(/\D/g, '');
    if (tooMany('ip:' + ip, 20) || tooMany('ph:' + phone, 8)) throw fail('slow', 429);
    const t = db.teachers[phone];
    if (!t || t.disabled || !code || !safeEqual(t.code, code)) throw fail('auth', 401);
    const token = crypto.randomBytes(24).toString('hex');
    db.sessions[token] = { phone, at: Date.now() };
    t.lastLogin = new Date().toISOString(); save();
    return { token, name: t.name, school: t.school, left: left(t) };
  },

  async 'POST /api/draft'(req, body) {
    const t = auth(req), m = cleanMeta(body.m);
    return oneAtATime(t, async () => {
      if (body.type === 'lp') {
        if (!m.topic) throw fail('bad', 400);
        const o = await charged(t, () => claude(C.lpPrompt(m)));
        log(t, 'lesson plan', m, true);
        return { data: C.cleanLp(o, m.fmt), left: left(t) };
      }
      if (body.type === 'sow') {
        const p = body.part || {}, n = Math.ceil(m.weeks / 7);
        const part = { i: I(p.i, 1, n, 1), n, from: I(p.from, 1, m.weeks, 1), to: I(p.to, 1, m.weeks, m.weeks) };
        const prev = (Array.isArray(body.prev) ? body.prev : []).slice(0, 60).map(x => S(x, 200));
        const run = async () => {
          const o = await claude(C.sowPrompt(m, part, prev));
          const rows = C.cleanSow(o, m.fmt);
          if (!rows.length) throw fail('incomplete', 502);
          return { rows, check: S(o.check, 300) };
        };
        let job = S(body.job, 40), data;
        if (part.i === 1) {
          data = await charged(t, run);
          job = crypto.randomBytes(8).toString('hex');
          jobs.set(job, { phone: t.phone, left: n - 1, exp: Date.now() + 20 * 60000 });
          log(t, 'scheme of work', m, true);
        } else {
          const j = jobs.get(job);
          if (!j || j.phone !== t.phone || j.left <= 0 || j.exp < Date.now()) throw fail('bad', 400);
          j.left--;
          try { data = await run(); } catch (e) { j.left++; throw e; }
        }
        return { data, job, left: left(t) };
      }
      throw fail('bad', 400);
    });
  },

  async 'POST /api/refine'(req, body) {
    const t = auth(req), d = body.doc || {}, ask = S(body.ask, 300).trim();
    if (!ask || (d.type !== 'sow' && d.type !== 'lp')) throw fail('bad', 400);
    const m = cleanMeta(d.meta);
    const doc = { type: d.type, fmt: m.fmt, lang: m.lang, meta: m, data: d.type === 'sow' ? { rows: C.cleanSow(d.data, m.fmt).slice(0, 60) } : C.cleanLp(d.data, m.fmt) };
    return oneAtATime(t, async () => {
      const o = await charged(t, () => claude(C.refinePrompt(doc, ask)));
      log(t, 'rewrite', m, true);
      return { data: d.type === 'sow' ? { rows: C.cleanSow(o, m.fmt) } : C.cleanLp(o, m.fmt), left: left(t) };
    });
  },

  async 'POST /api/feedback'(req, body) {
    const t = auth(req);
    db.feedback.push({ at: new Date().toISOString(), phone: t.phone, name: t.name, rating: ['good', 'edit', 'bad'].includes(body.rating) ? body.rating : 'edit', comment: S(body.comment, 600), type: S(body.type, 5), subject: S(body.subject, 90), class: S(body.class, 20), fmt: S(body.fmt, 5), lang: S(body.lang, 3) });
    save();
    return { ok: true };
  },

  /* ----- admin ----- */
  async 'POST /api/admin/state'(req) {
    admin(req);
    const teachers = Object.values(db.teachers).map(t => {
      const u = db.usage.filter(x => x.phone === t.phone);
      return { phone: t.phone, name: t.name, school: t.school, code: t.code, quota: t.quota, used: t.used, disabled: !!t.disabled, lastLogin: t.lastLogin || '', schemes: u.filter(x => x.kind === 'scheme of work').length, lessons: u.filter(x => x.kind === 'lesson plan').length, rewrites: u.filter(x => x.kind === 'rewrite').length };
    });
    return { teachers, usage: db.usage.slice(-200).reverse(), feedback: db.feedback.slice(-200).reverse(), today: draftsToday(), dailyCap: MAX_DAILY_DRAFTS, model: MOCK ? 'mock mode (no AI)' : MODEL, keySet: !!API_KEY };
  },
  async 'POST /api/admin/teacher'(req, body) {
    admin(req);
    const phone = normPhone(body.phone);
    if (phone.length < 11 || phone.length > 13) throw fail('phone', 400);
    const t = db.teachers[phone] || { phone, code: String(crypto.randomInt(100000, 1000000)), used: 0, created: new Date().toISOString() };
    t.name = S(body.name, 80) || t.name || 'Teacher'; t.school = S(body.school, 120) || t.school || '';
    t.quota = I(body.quota, 0, 100000, t.quota || DEFAULT_QUOTA);
    if (body.disabled != null) t.disabled = !!body.disabled;
    if (body.newCode) { t.code = String(crypto.randomInt(100000, 1000000)); for (const k of Object.keys(db.sessions)) if (db.sessions[k].phone === phone) delete db.sessions[k]; }
    db.teachers[phone] = t; save();
    return { phone, code: t.code };
  },
  async 'POST /api/admin/export'(req) {
    admin(req);
    return { teachers: Object.values(db.teachers).map(t => ({ ...t, code: undefined })), usage: db.usage, feedback: db.feedback };
  }
};
function admin(req) {
  if (!ADMIN_PASSWORD || !safeEqual(req.headers['x-admin-password'] || '', ADMIN_PASSWORD)) throw fail('auth', 401);
}

/* ---------------- HTTP ---------------- */
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
function send(res, status, obj) {
  const b = JSON.stringify(obj);
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', 'content-length': Buffer.byteLength(b) });
  res.end(b);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > 200000) { reject(fail('big', 413)); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch (e) { reject(fail('bad', 400)); } });
    req.on('error', reject);
  });
}
function serveStatic(req, res, urlPath) {
  if (urlPath === '/') urlPath = '/index.html';
  if (urlPath === '/admin') urlPath = '/admin.html';
  const file = path.normalize(path.join(PUBLIC, decodeURIComponent(urlPath)));
  if (!file.startsWith(PUBLIC + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('Not found'); }
    const ext = path.extname(file);
    res.writeHead(200, {
      'content-type': TYPES[ext] || 'application/octet-stream',
      'cache-control': /vendor|icons/.test(file) ? 'public, max-age=604800' : 'no-cache',
      'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', 'x-frame-options': 'DENY'
    });
    res.end(buf);
  });
}
const server = http.createServer(async (req, res) => {
  const urlPath = (req.url || '/').split('?')[0];
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  if (urlPath === '/healthz') return send(res, 200, { ok: true });
  if (!urlPath.startsWith('/api/')) {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
    return serveStatic(req, res, urlPath);
  }
  const handler = routes[req.method + ' ' + urlPath];
  if (!handler) return send(res, 404, { error: 'notfound' });
  try {
    const body = await readBody(req);
    send(res, 200, await handler(req, body, ip));
  } catch (e) {
    if (!e.code) console.error(e);
    send(res, e.status || 500, { error: e.code || 'server' });
  }
});
server.requestTimeout = 150000;
server.listen(PORT, () => {
  console.log('Mwalimu Planner pilot on port ' + PORT + ' | model: ' + (MOCK ? 'MOCK' : MODEL) + ' | data: ' + DB_FILE);
  if (!MOCK && !API_KEY) console.warn('WARNING: ANTHROPIC_API_KEY is not set. Drafting will fail.');
  if (!ADMIN_PASSWORD) console.warn('WARNING: ADMIN_PASSWORD is not set. The admin page is locked.');
});
