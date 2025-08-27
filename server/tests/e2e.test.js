// server/tests/e2e.test.js
// Run with:  npm run test:e2e
//
// This suite hits the real server (port 3001) with fetch and verifies the
// happy-path end-to-end flows:
//
//  - Register → Login → /me
//  - Admin can create & delete a product
//  - Contact form (logged-in + guest), admin lists & deletes
//  - Reviews: post, list (with meta), admin delete
//  - Cart: save, read, delete item
//  - Purchase: record, clears cart, visible via /purchase
//  - Admin activity & sales aggregation
//
// Notes:
//  • Tests are nested under a single parent test to preserve order.
//  • Minimal cookie-jar captures Set-Cookie for subsequent requests.
//  • Keep base URL in one place; waits for server readiness once.

const test = require('node:test');
const assert = require('node:assert/strict');

// Boot the server (server.js does the listen)
require('../server.js');

const BASE = process.env.E2E_BASE || 'http://localhost:3001';

/** Simple helper to create a random username per run. */
function randUser() {
  return 'user_' + Math.floor(Math.random() * 1e9);
}

/**
 * Minimal Set-Cookie jar so we can reuse session/cs cookies across requests.
 * - absorb(): parse one or many Set-Cookie headers and store k=v.
 * - header(): return { Cookie: 'k=v; k2=v2' } for fetch headers.
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
      if (k) this.map.set(k.trim(), (v ?? '').trim());
    }
  }
  header() {
    if (!this.map.size) return {};
    const cookie = Array.from(this.map.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
    return { Cookie: cookie };
  }
}

/** Utility: make a fetch with JSON body/response and optional cookie jar. */
async function jfetch(path, { method = 'GET', headers = {}, body, jar } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers, ...(jar ? jar.header() : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });

  // Node 20+: Response.headers.getSetCookie(); fallback for older versions.
  let setCookie = [];
  if (typeof res.headers.getSetCookie === 'function') setCookie = res.headers.getSetCookie();
  else {
    const first = res.headers.get('set-cookie');
    if (first) setCookie = [first];
  }
  if (jar) jar.absorb(setCookie);

  let json;
  try { json = await res.json(); } catch { json = undefined; }
  return { res, json };
}

/** Waits for the server to respond at a known endpoint (up to ~3s). */
async function waitForServer() {
  const start = Date.now();
  while (Date.now() - start < 3000) {
    try {
      const r = await fetch(`${BASE}/api/me`);
      // 401 is fine (means server is up)
      if (r.status === 200 || r.status === 401 || r.status === 403) return;
    } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('Server did not become ready in time');
}

test('E2E suite (sequential)', async (t) => {
  await waitForServer();

  const jar = new CookieJar();
  const username = randUser();
  let createdProductId = null;
  let guestMessageId = null;
  let reviewId = null;

  // ---- Auth flow ---------------------------------------------------------
  await t.test('register user', async () => {
    const { res, json } = await jfetch('/api/register', {
      method: 'POST',
      body: { username, password: 'pw123', email: `${username}@ex.com` },
      jar, // register sets a cookie too (short-lived), keep it
    });
    assert.equal(res.status, 201);
    assert.equal(json.username, username);
  });

  await t.test('login user & capture cookies', async () => {
    const { res, json } = await jfetch('/api/login', {
      method: 'POST',
      body: { username, password: 'pw123' },
      jar,
    });
    assert.equal(res.status, 200);
    assert.equal(json.username, username);

    // sanity: skyUser cookie should exist (lowercased server-side)
    const skyUser = jar.map.get('skyUser');
    assert.ok(typeof skyUser === 'string');
    assert.equal(skyUser, username.toLowerCase());
  });

  await t.test('GET /api/me uses cookie', async () => {
    const { res, json } = await jfetch('/api/me', { jar });
    assert.equal(res.status, 200);
    assert.equal(json.username.toLowerCase(), username.toLowerCase());
  });

  // ---- Products (admin) --------------------------------------------------
  await t.test('admin can create a product', async () => {
    const { res, json } = await jfetch('/api/products', {
      method: 'POST',
      headers: { 'X-Username': 'admin' },
      body: { title: 'Test Jet', price: 123 },
    });
    assert.equal(res.status, 201);
    assert.ok(json.id && String(json.id).startsWith('p'));
    createdProductId = json.id;
  });

  await t.test('product appears in GET /api/products, then can be deleted', async () => {
    // Confirm it lists
    {
      const { res, json } = await jfetch('/api/products');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(json));
      assert.ok(json.some(p => p.id === createdProductId));
    }
    // Delete it
    {
      const { res } = await jfetch(`/api/products/${encodeURIComponent(createdProductId)}`, {
        method: 'DELETE',
        headers: { 'X-Username': 'admin' },
      });
      assert.equal(res.status, 200);
    }
    // No longer listed
    {
      const { res, json } = await jfetch('/api/products');
      assert.equal(res.status, 200);
      assert.ok(!json.some(p => p.id === createdProductId));
    }
  });

  // ---- Contact flow ------------------------------------------------------
  await t.test('logged-in contact: message only is enough', async () => {
    const { res, json } = await jfetch('/api/contact', {
      method: 'POST',
      body: { message: 'Hello from logged-in test' },
      jar,
    });
    assert.equal(res.status, 201);
    assert.ok(json.id && json.message);
  });

  await t.test('guest contact: missing required fields -> 400', async () => {
    const { res } = await jfetch('/api/contact', {
      method: 'POST',
      body: { message: 'no email/fullName' },
    });
    assert.equal(res.status, 400);
  });

  await t.test('guest contact: valid', async () => {
    const { res, json } = await jfetch('/api/contact', {
      method: 'POST',
      body: { fullName: 'Guest User', email: 'guest@example.com', message: 'guest valid message' },
    });
    assert.equal(res.status, 201);
    guestMessageId = json.id;
    assert.ok(guestMessageId);
  });

  await t.test('admin lists and deletes the guest message', async () => {
    // list
    const list1 = await jfetch('/api/contact?who=admin', { headers: { 'X-Username': 'admin' } });
    assert.equal(list1.res.status, 200);
    assert.ok(list1.json.some(m => m.id === guestMessageId));

    // delete
    const del = await jfetch(`/api/contact/${encodeURIComponent(guestMessageId)}`, {
      method: 'DELETE', headers: { 'X-Username': 'admin' },
    });
    assert.equal(del.res.status, 200);

    // list again
    const list2 = await jfetch('/api/contact?who=admin', { headers: { 'X-Username': 'admin' } });
    assert.equal(list2.res.status, 200);
    assert.ok(!list2.json.some(m => m.id === guestMessageId));
  });

  // ---- Reviews flow ------------------------------------------------------
  await t.test('post review (as logged-in user)', async () => {
    const body = {
      author: username, // server prefers cookie, but sending is fine
      rating: 5,
      aspect: 'Service',
      title: 'Concierge-level support',
      text: 'Every step was handled perfectly.',
      source: 'ask-the-aspects',
    };
    const { res, json } = await jfetch('/api/reviews', { method: 'POST', body, jar });
    assert.equal(res.status, 201);
    assert.ok(json.id);
    reviewId = json.id;
  });

  await t.test('list reviews (meta + pagination)', async () => {
    const { res, json } = await jfetch('/api/reviews?source=ask-the-aspects&limit=20&offset=0&meta=1');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(json.rows));
    assert.ok(json.meta && typeof json.meta.total === 'number');
    assert.ok(json.rows.some(r => r.id === reviewId));
  });

  await t.test('admin deletes the review', async () => {
    const { res } = await jfetch(`/api/reviews/${encodeURIComponent(reviewId)}`, {
      method: 'DELETE', headers: { 'X-Username': 'admin' },
    });
    assert.equal(res.status, 200);
  });

  // ---- Cart flow ---------------------------------------------------------
  await t.test('save cart (replace all items), read back, delete single item', async () => {
    const items = [
      { id: 101, name: 'Demo Jet A', price: 1111111, imageUrl: '', description: 'A' },
      { id: 102, name: 'Demo Jet B', price: 2222222, imageUrl: '', description: 'B' },
    ];

    // save
    {
      const { res } = await jfetch(`/api/cart/${username}`, {
        method: 'POST', body: { items },
      });
      assert.equal(res.status, 200);
    }

    // read
    {
      const { res, json } = await jfetch(`/api/cart/${username}`);
      assert.equal(res.status, 200);
      assert.equal(json.length, 2);
    }

    // delete one
    {
      const { res, json } = await jfetch(`/api/cart/${username}/101`, { method: 'DELETE' });
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(json.updatedCart));
      assert.equal(json.updatedCart.length, 1);
      assert.equal(json.updatedCart[0].id, 102);
    }
  });

  // ---- Purchase flow + activity/sales -----------------------------------
  await t.test('purchase records items, clears cart, appears in user purchases', async () => {
    // put two items into cart again so we can purchase them
    const items = [
      { id: 201, name: 'Buy Jet 1', price: 1230000, imageUrl: '', description: 'X' },
      { id: 202, name: 'Buy Jet 2', price: 2340000, imageUrl: '', description: 'Y' },
    ];
    await jfetch(`/api/cart/${username}`, { method: 'POST', body: { items } });

    // purchase
    {
      const { res } = await jfetch(`/api/purchase/${username}`, {
        method: 'POST', body: { items },
      });
      assert.equal(res.status, 201);
    }

    // purchases visible
    {
      const { res, json } = await jfetch(`/api/purchase/${username}`);
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(json));
      assert.ok(json.some(p => Array.isArray(p.items) && p.items.length >= 2));
    }

    // cart cleared
    {
      const { res, json } = await jfetch(`/api/cart/${username}`);
      assert.equal(res.status, 200);
      assert.equal(json.length, 0);
    }
  });

  await t.test('admin activity & sales endpoints respond', async () => {
    // activity list (requires admin)
    {
      const { res, json } = await jfetch('/api/admin/activity', { headers: { 'X-Username': 'admin' } });
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(json));
      // should contain at least one "Completed purchase..." record
      assert.ok(json.some(a => /Completed purchase/i.test(String(a.activity))));
    }
    // sales aggregation
    {
      const { res, json } = await jfetch('/api/admin/activity/sales?bucket=day', { headers: { 'X-Username': 'admin' } });
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(json.rows));
    }
  });

  // ---- Logout (optional) -------------------------------------------------
  await t.test('logout clears cookies', async () => {
    const { res } = await jfetch('/api/logout', { method: 'POST', jar });
    assert.equal(res.status, 200);
  });
});
