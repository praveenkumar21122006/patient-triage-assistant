import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(process.cwd(), 'data', 'triage.db');
const DATA_DIR = path.dirname(DB_PATH);

let db = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS patients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  age INTEGER,
  sex TEXT,
  phone TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS intakes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  complaint TEXT NOT NULL,
  category TEXT NOT NULL,
  duration_hours REAL,
  pain_level INTEGER,
  free_text TEXT,
  vitals JSON,
  red_flags JSON,
  conditions JSON,
  allergies JSON,
  medications TEXT,
  triage_level INTEGER NOT NULL,
  triage_color TEXT NOT NULL,
  triage_label TEXT NOT NULL,
  wait_recommendation TEXT,
  requires_immediate INTEGER NOT NULL DEFAULT 0,
  reasons JSON,
  vitals_flags JSON,
  recommendations JSON,
  assessed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_intakes_patient ON intakes(patient_id);
CREATE INDEX IF NOT EXISTS idx_intakes_time ON intakes(assessed_at);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

async function initDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const wasmPath = path.join(path.dirname(require.resolve('sql.js')), 'sql-wasm.wasm');
  const initSqlJs = (await import('sql.js')).default;
  const SQL = await initSqlJs({ locateFile: () => wasmPath });

  const file = fs.existsSync(DB_PATH) ? fs.readFileSync(DB_PATH) : undefined;
  db = new SQL.Database(file);
  db.run(SCHEMA);
  persist();
}

function persist() {
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

function normalize(params = []) {
  return params.map((p) => (p === undefined ? null : p));
}

function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(normalize(params));
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function get(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(normalize(params));
  const row = stmt.step() ? stmt.getAsObject() : undefined;
  stmt.free();
  return row;
}

function run(sql, params = []) {
  db.run(sql, normalize(params));
  const id = get('SELECT last_insert_rowid() AS id').id;
  if (/^(INSERT|UPDATE|DELETE|CREATE)/i.test(sql)) persist();
  return id;
}

export function listPatients() {
  return all(`SELECT * FROM patients ORDER BY created_at DESC`);
}

export function getPatient(id) {
  return get('SELECT * FROM patients WHERE id = ?', [id]);
}

export function createPatient({ name, age, sex, phone, notes = '' }) {
  return run(
    `INSERT INTO patients (name, age, sex, phone, notes) VALUES (?, ?, ?, ?, ?)`,
    [name, age, sex, phone, notes]
  );
}

export function listIntakes({ limit = 50, level = null, patientId = null } = {}) {
  let sql = `SELECT i.*, p.name AS patient_name, p.age AS patient_age, p.sex AS patient_sex
             FROM intakes i JOIN patients p ON p.id = i.patient_id`;
  const where = [];
  const params = [];
  if (level) {
    where.push('i.triage_level = ?');
    params.push(level);
  }
  if (patientId) {
    where.push('i.patient_id = ?');
    params.push(patientId);
  }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY i.assessed_at DESC, i.id DESC LIMIT ?';
  params.push(limit);
  return all(sql, params);
}

export function getIntake(id) {
  return get(
    `SELECT i.*, p.name AS patient_name, p.age AS patient_age, p.sex AS patient_sex
     FROM intakes i JOIN patients p ON p.id = i.patient_id WHERE i.id = ?`,
    [id]
  );
}

export function createIntake(input) {
  return run(
    `INSERT INTO intakes (
       patient_id, complaint, category, duration_hours, pain_level, free_text,
       vitals, red_flags, conditions, allergies, medications,
       triage_level, triage_color, triage_label, wait_recommendation, requires_immediate,
       reasons, vitals_flags, recommendations
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.patientId,
      input.complaint,
      input.category,
      input.durationHours,
      input.painLevel,
      input.freeText,
      JSON.stringify(input.vitals ?? {}),
      JSON.stringify(input.redFlags ?? []),
      JSON.stringify(input.conditions ?? []),
      JSON.stringify(input.allergies ?? []),
      input.medications ?? '',
      input.assessment.level,
      input.assessment.color,
      input.assessment.label,
      input.assessment.wait,
      input.assessment.level <= 2 ? 1 : 0,
      JSON.stringify(input.assessment.reasons ?? []),
      JSON.stringify(input.assessment.vitalsFlags ?? []),
      JSON.stringify(input.assessment.recommendations ?? []),
    ]
  );
}

export function parseRow(row) {
  if (!row) return row;
  for (const key of ['vitals', 'red_flags', 'conditions', 'allergies', 'reasons', 'vitals_flags', 'recommendations']) {
    if (row[key]) {
      try {
        row[key] = JSON.parse(row[key]);
      } catch {
        row[key] = [];
      }
    }
  }
  return row;
}

export function intakeCounts() {
  const rows = all('SELECT triage_level, COUNT(*) AS n FROM intakes GROUP BY triage_level');
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of rows) counts[r.triage_level] = r.n;
  return counts;
}

export function todayCount() {
  return get(`SELECT COUNT(*) AS n, MIN(assessed_at) AS first, MAX(assessed_at) AS last
              FROM intakes WHERE date(assessed_at) = date('now')`).n || 0;
}

export function totalCount() {
  return get('SELECT COUNT(*) AS n FROM intakes').n || 0;
}

export function createUser({ username, passwordHash, displayName = null }) {
  return run(`INSERT INTO users (username, password_hash, display_name) VALUES (?, ?, ?)`, [
    username.toLowerCase(),
    passwordHash,
    displayName,
  ]);
}

export function findUserByName(username) {
  return get('SELECT * FROM users WHERE username = ?', [username.toLowerCase()]);
}

export function findUserById(id) {
  return get('SELECT * FROM users WHERE id = ?', [id]);
}

export function createSession({ tokenHash, userId, expiresAtMs }) {
  return run(`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)`, [
    tokenHash,
    userId,
    expiresAtMs,
  ]);
}

export function findSession(tokenHash) {
  return get('SELECT * FROM sessions WHERE token_hash = ?', [tokenHash]);
}

export function deleteSession(id) {
  return run('DELETE FROM sessions WHERE id = ?', [id]);
}

export function deleteExpiredSessions(nowMs = Date.now()) {
  return run('DELETE FROM sessions WHERE expires_at < ?', [nowMs]);
}

export { DATA_DIR, DB_PATH, initDb };