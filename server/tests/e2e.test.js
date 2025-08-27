// server/tests/e2e.test.js
// Run with: npm run test:e2e
// End-to-end tests covering registration, login, current user, products (admin),
// contact (guest + logged-in), and admin message management.

const test = require('node:test');
const assert = require('node:assert/strict');

// Boots the server (server.js performs the listen)
require('../server.js');

const BASE = 'http://localhost:3001';

/**
 * randUser
 * --------
 * Generates a pseudo-random username for test isolation.
 * @returns {string}
 */
function randUser() {
  return 'user_' + Math.floor(Math.random() * 1e6);
}

/**
 * CookieJar
 * ---------
 * Minimal cookie jar to persist `skyUser` (and others) between requests.
 * - absorb(): collect Set-Cookie headers from a response
 * - header(): produce "Cookie" header for the next request
 */
class CookieJar {
  constructor() { this.map = new Map(); }
  absorb(setCookieHeaders) {
    const arr = Array.isArray(setCookieHeaders)
      ? setCookieHeaders
      : (setCookieHeaders ? [setCookieHeaders] : []);
    for (const line of arr) {
      const [pair] = String(line).split(';');
      const [k, v] = pair.split('=');
      if (k && v) this.map.set(k.trim(), v.trim());
    }
  }
  header() {
    if (!this.map.size) return {};
    const cookie = Array.from(this.map.entries())
      .map(([k, v]) => `${k}=${v}`).join('; ');
    return { Cookie: cookie };
  }
}

const jar = new CookieJar();

test('POST /api/register creates user', async () => {
  const username = randUser();
  const res = await fetch(`${BASE}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: 'pw123', email: `${username}@ex.com` })
  });
  assert.equal(res.status, 201);
  const json = await res.json();
  assert.equal(json.username, username);
});

test('POST /api/login sets cookie', async () => {
  const username = randUser();
  // create first
  await fetch(`${BASE}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: 'pw123', email: `${username}@ex.com` })
  });

  const res = await fetch(`${BASE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: 'pw123' })
  });
  assert.equal(res.status, 200);

  // Compatibility for different Node versions:
  let setCookie = [];
  if (typeof res.headers.getSetCookie === 'function') {
    setCookie = res.headers.getSetCookie();
  } else {
    const first = res.headers.get('set-cookie');
    if (first) setCookie = [first];
  }
  jar.absorb(setCookie);
});

test('GET /api/me returns current user from cookie', async () => {
  const res = await fetch(`${BASE}/api/me`, { headers: { ...jar.header() } });
  assert.equal(res.status, 200);
  const me = await res.json();
  assert.ok(me.username);
});

test('POST /api/products creates a product (admin)', async () => {
  const res = await fetch(`${BASE}/api/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Username': 'admin' },
    body: JSON.stringify({ title: 'Test Jet', price: 123 })
  });
  assert.equal(res.status, 201);
  const p = await res.json();
  assert.ok(p.id && String(p.id).startsWith('p'));
});

// ---- Contact suite ----
test('POST /api/contact creates message (logged-in)', async () => {
  // Logged-in user: message is sufficient
  const res = await fetch(`${BASE}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...jar.header() },
    body: JSON.stringify({ message: 'Hello from logged-in test' })
  });
  assert.equal(res.status, 201);
  const msg = await res.json();
  assert.ok(msg.id && msg.message);
});

test('POST /api/contact as guest: missing fields => 400', async () => {
  const res = await fetch(`${BASE}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'guest without email/fullName' })
  });
  assert.equal(res.status, 400);
});

test('POST /api/contact as guest: valid => 201', async () => {
  const res = await fetch(`${BASE}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Guest User',
      email: 'guest@example.com',
      message: 'guest valid message'
    })
  });
  assert.equal(res.status, 201);
  const created = await res.json();
  assert.ok(created.id);
  global.__lastGuestMsgId = created.id;
});

test('Admin GET /api/contact lists messages and includes the created guest message', async () => {
  const res = await fetch(`${BASE}/api/contact?who=admin`, { headers: { 'X-Username': 'admin' } });
  assert.equal(res.status, 200);
  const list = await res.json();
  assert.ok(Array.isArray(list));
  assert.ok(list.length >= 1);
  if (global.__lastGuestMsgId) {
    assert.ok(list.some(m => m.id === global.__lastGuestMsgId));
  }
});

test('Admin DELETE /api/contact/:id removes a message', async () => {
  const id = global.__lastGuestMsgId;
  assert.ok(id, 'expected a message id to delete');
  const del = await fetch(`${BASE}/api/contact/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { 'X-Username': 'admin' }
  });
  assert.equal(del.status, 200);
  const again = await fetch(`${BASE}/api/contact?who=admin`, { headers: { 'X-Username': 'admin' } });
  const list = await again.json();
  assert.ok(!list.some(m => m.id === id));
});
