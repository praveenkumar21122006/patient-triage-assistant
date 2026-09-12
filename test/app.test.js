import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';

const DB_PATH = path.join(os.tmpdir(), `triage-test-${process.pid}-${Date.now()}.db`);
process.env.DB_PATH = DB_PATH;
fs.rmSync(DB_PATH, { force: true });

const { initDb } = await import('../src/db.js');
const { createApp } = await import('../src/app.js');
const { ensureDefaultUser, DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_PASSWORD } = await import('../src/seed.js');

await initDb();
await ensureDefaultUser();
const app = createApp();
const agent = request.agent(app);

test('HTTP layer with authentication', async (t) => {
  await t.test('login page serves', async () => {
    const res = await request(app).get('/login').expect(200);
    assert.match(res.text, /Log in/);
  });

  await t.test('GET / redirects to login when unauthenticated', async () => {
    const res = await request(app).get('/').expect(303);
    assert.equal(res.headers.location, '/login');
  });

  await t.test('GET /intake/new redirects to login with next param', async () => {
    const res = await request(app).get('/intake/new').expect(303);
    assert.equal(res.headers.location, '/login?next=%2Fintake%2Fnew');
  });

  await t.test('API returns 401 when unauthenticated', async () => {
    const res = await request(app).get('/api/intakes').expect(401);
    assert.equal(res.body.error, 'Authentication required');
  });

  await t.test('API health is public', async () => {
    const res = await request(app).get('/api/health').expect(200);
    assert.equal(res.body.ok, true);
  });

  await t.test('wrong password is rejected', async () => {
    const res = await request(app)
      .post('/login')
      .type('form')
      .send({ username: DEFAULT_ADMIN_USERNAME, password: 'wrong-password' })
      .expect(401);
    assert.match(res.text, /Invalid username or password/);
  });

  await t.test('correct credentials log in', async () => {
    const res = await agent
      .post('/login')
      .type('form')
      .send({ username: DEFAULT_ADMIN_USERNAME, password: DEFAULT_ADMIN_PASSWORD })
      .expect(303);
    assert.equal(res.headers.location, '/');
  });

  await t.test('dashboard serves after login', async () => {
    const res = await agent.get('/').expect(200);
    assert.match(res.text, /Triage dashboard/);
    assert.match(res.text, /Log out/);
  });

  await t.test('intake form serves after login', async () => {
    const res = await agent.get('/intake/new').expect(200);
    assert.match(res.text, /New patient intake/);
    assert.match(res.text, /Chief complaint/);
  });

  await t.test('GET /api/health returns ok', async () => {
    const res = await agent.get('/api/health').expect(200);
    assert.equal(res.body.ok, true);
  });

  await t.test('POST /api/assess scores a chest pain case as emergent', async () => {
    const res = await agent
      .post('/api/assess')
      .send({ complaint: 'chest tightness', category: 'chest-pain', redFlags: ['cp-radiating'], vitals: { hr: 118 } })
      .expect(200);
    assert.equal(res.body.level, 2);
    assert.ok(res.body.reasons.some((r) => r.level === 2));
  });

  await t.test('POST /api/assess handles empty body', async () => {
    const res = await agent.post('/api/assess').send({}).expect(200);
    assert.equal(res.body.level, 5);
  });

  await t.test('POST /intake creates a patient, intakes, and redirects', async () => {
    const res = await agent
      .post('/intake')
      .type('form')
      .send({
        patient_id: 'new',
        name: 'Test Person',
        age: '45',
        sex: 'female',
        category: 'abdominal',
        complaint: 'Severe abdominal pain',
        pain: '8',
        duration: '3',
        red_flags: ['ab-blood'],
        free_text: '',
        temp: '',
        spo2: '97',
        hr: '90',
        rr: '16',
        sbp: '120',
        dbp: '80',
        conditions: ['diabetes'],
      })
      .expect(303);
    const location = res.headers.location;
    assert.match(location, /^\/patients\/\d+/);
    assert.match(location, /intake=\d+/);

    const page = await agent.get(location).expect(200);
    assert.match(page.text, /Test Person/);
    assert.match(page.text, /Level 2/);
  });

  await t.test('POST /intake with missing fields re-renders with errors', async () => {
    const res = await agent
      .post('/intake')
      .type('form')
      .send({ patient_id: 'new', name: '', category: '', complaint: '' })
      .expect(400);
    assert.match(res.text, /Please fix these issues/);
  });

  await t.test('GET /intake/new?patient= pre-fills a returning patient', async () => {
    const list = await agent.get('/api/intakes').expect(200);
    const someId = list.body[0]?.patient_id;
    assert.ok(someId, 'expected at least one intake');
    const res = await agent.get(`/intake/new?patient=${someId}`).expect(200);
    assert.ok(res.text.includes(String(someId)));
  });

  await t.test('unknown route returns 404 page', async () => {
    const res = await agent.get('/nope').expect(404);
    assert.match(res.text, /could not be served/);
  });

  await t.test('registration page serves', async () => {
    const res = await request(app).get('/register').expect(200);
    assert.match(res.text, /Create account/);
  });

  await t.test('login page links to registration', async () => {
    const res = await request(app).get('/login').expect(200);
    assert.match(res.text, /\/register/);
  });

  await t.test('weak password is rejected on registration', async () => {
    const res = await request(app)
      .post('/register')
      .type('form')
      .send({ username: 'nursejane', password: 'short', confirm: 'short' })
      .expect(400);
    assert.match(res.text, /at least 8 characters/);
  });

  await t.test('duplicate username is rejected on registration', async () => {
    const res = await request(app)
      .post('/register')
      .type('form')
      .send({ username: DEFAULT_ADMIN_USERNAME, password: 'longenough1', confirm: 'longenough1' })
      .expect(400);
    assert.match(res.text, /already taken/);
  });

  await t.test('valid registration logs the new user in', async () => {
    const fresh = request.agent(app);
    const res = await fresh
      .post('/register')
      .type('form')
      .send({ display_name: 'Nurse Jane', username: 'nursejane', password: 'longenough1', confirm: 'longenough1' })
      .expect(303);
    assert.equal(res.headers.location, '/');
    const page = await fresh.get('/').expect(200);
    assert.match(page.text, /Nurse Jane/);
  });

  await t.test('registered user can log in via /login', async () => {
    const res = await request(app)
      .post('/login')
      .type('form')
      .send({ username: 'nursejane', password: 'longenough1' })
      .expect(303);
    assert.equal(res.headers.location, '/');
  });

  await t.test('logout invalidates the session', async () => {
    const res = await agent.post('/logout').expect(303);
    assert.equal(res.headers.location, '/login');

    const after = await agent.get('/').expect(303);
    assert.equal(after.headers.location, '/login');
  });
});

after(() => {
  try {
    fs.rmSync(DB_PATH, { force: true });
  } catch {
    /* ignore */
  }
});