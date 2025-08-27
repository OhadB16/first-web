// server/tests/test.js  (או server/test.js)
/* eslint-disable no-console */

/**
 * node-fetch v3 (ESM) dynamic load under CommonJS.
 * Keeping it inline here avoids switching your whole test file to ESM.
 */
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

/** Base URL for the running API server. */
const BASE = process.env.BASE_URL || 'http://localhost:3001';

/* ──────────────────────────────────────────────────────────────────────────
   Cookie jar (simple, string-based)
   - Captures one or multiple Set-Cookie headers
   - Avoids duplicates when the same cookie name is reset
   ────────────────────────────────────────────────────────────────────────── */

let cookieJar = '';

/**
 * Extracts one or more Set-Cookie headers from a node-fetch Response.
 * Works across node-fetch versions:
 *  - node-fetch: res.headers.raw()['set-cookie'] → string[]
 *  - standard:   res.headers.get('set-cookie')   → string | null
 */
function getSetCookieArray(res) {
  try {
    if (typeof res.headers.raw === 'function') {
      const raw = res.headers.raw()['set-cookie'];
      if (Array.isArray(raw)) return raw;
    }
  } catch {}
  const single = res.headers.get('set-cookie');
  return single ? [single] : [];
}

/**
 * Merge Set-Cookie headers into our simple jar string,
 * replacing existing cookies with the same name.
 */
function setCookieFromResponse(res) {
  const setCookies = getSetCookieArray(res);
  if (!setCookies.length) return;

  // Convert the existing jar ("k=v; x=y") to a Map for easy replace
  const map = new Map(
    cookieJar
      .split(';')
      .map(s => s.trim())
      .filter(Boolean)
      .map(pair => {
        const [k, v] = pair.split('=');
        return [k, v];
      })
  );

  for (const line of setCookies) {
    const [pair] = String(line).split(';'); // only "k=v"
    const [k, v] = pair.split('=');
    if (k) map.set(k.trim(), (v ?? '').trim());
  }

  cookieJar = Array.from(map.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

/**
 * Wrapper around fetch that automatically sends cookies and
 * captures Set-Cookie on the response.
 */
async function doFetch(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (cookieJar) headers.cookie = cookieJar;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  setCookieFromResponse(res);
  return res;
}

/* ──────────────────────────────────────────────────────────────────────────
   Tiny expect helper for readable console output
   ────────────────────────────────────────────────────────────────────────── */

/**
 * Runs an async predicate; logs PASS/FAIL with a label.
 * Return true from predicate → PASS
 * Return a string → FAIL (string is the reason)
 * Throw → FAIL (message is reason)
 */
async function expect(predicate, label) {
  try {
    const ok = await predicate();
    if (ok === true) {
      console.log(`✅ PASS: ${label}`);
      return true;
    }
    console.log(`❌ FAIL: ${label} — ${ok || 'not ok'}`);
    return false;
  } catch (e) {
    console.log(`❌ FAIL: ${label} — ${e.message}`);
    return false;
  }
}

/** Random user generator for isolation between test runs. */
function randUser() {
  const n = Math.floor(Math.random() * 1e6);
  return { username: `user_${n}`, password: `P${n}a!`, email: `u${n}@mail.com` };
}

/**
 * Waits briefly for the server to become responsive.
 * Success if /api/me returns 200/401/403 (any means "server is up").
 */
async function waitForServerReady(timeoutMs = 3000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE}/api/me`);
      if ([200, 401, 403].includes(res.status)) return;
    } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('Server did not become ready in time');
}

/* ──────────────────────────────────────────────────────────────────────────
   Test run
   ────────────────────────────────────────────────────────────────────────── */

(async function run() {
  console.log(`\n🔎 Testing server at ${BASE}\n`);
  await waitForServerReady();

  const u = randUser();

  // 1) Register
  await expect(async () => {
    const res = await doFetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(u),
    });
    if (!res.ok) return `status ${res.status}`;
    const j = await res.json();
    return !!j && !!j.username;
  }, 'POST /api/register creates a user');

  // 2) Login (user)
  await expect(async () => {
    const res = await doFetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u.username, password: u.password }),
    });
    if (!res.ok) return `status ${res.status}`;
    const j = await res.json();
    return j?.username?.toLowerCase() === u.username.toLowerCase();
  }, 'POST /api/login authenticates user and sets cookie');

  // 3) /api/me with cookie
  await expect(async () => {
    const res = await doFetch('/api/me');
    if (!res.ok) return `status ${res.status}`;
    const j = await res.json();
    return j?.username?.toLowerCase() === u.username.toLowerCase();
  }, 'GET /api/me returns the current user (via cookie)');

  // 4) GET products
  await expect(async () => {
    const res = await doFetch('/api/products');
    if (!res.ok) return `status ${res.status}`;
    const j = await res.json();
    return Array.isArray(j);
  }, 'GET /api/products returns an array');

  // 5) Contact – create public message
  const contactSubject = 'Test from test.js ' + Date.now();
  const contactMessage = 'Hello from automated tests';
  await expect(async () => {
    const res = await doFetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Router allows logged-in users to send message-only, but including fields is fine.
      body: JSON.stringify({
        fullName: 'Test Runner',
        email: 'runner@example.com',
        message: contactMessage,
        subject: contactSubject,
        preferred: 'Email',
        budget: 'N/A',
        company: 'QA Inc.',
        phone: '050-0000000',
      }),
    });
    if (res.status !== 201) return `status ${res.status}`;
    const j = await res.json();
    return j && j.id && j.message === contactMessage ? true : 'missing id/message';
  }, 'POST /api/contact creates a message');

  // 6) Login as admin (to list & delete contact)
  await expect(async () => {
    const res = await doFetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin' }),
    });
    if (!res.ok) return `status ${res.status}`;
    const j = await res.json();
    return j?.username?.toLowerCase() === 'admin';
  }, 'POST /api/login authenticates admin');

  // 7) Admin lists contact messages
  let createdMessageId = null;
  await expect(async () => {
    const res = await doFetch('/api/contact', {
      headers: { 'X-Username': 'admin' },
    });
    if (!res.ok) return `status ${res.status}`;
    const list = await res.json();
    if (!Array.isArray(list)) return 'not array';
    const found = list.find(m => m.subject === contactSubject);
    if (found) createdMessageId = found.id;
    return true;
  }, 'GET /api/contact?who=admin lists messages');

  // 8) Admin deletes that message
  await expect(async () => {
    if (!createdMessageId) return 'no message created';
    const res = await doFetch(`/api/contact/${createdMessageId}`, {
      method: 'DELETE',
      headers: { 'X-Username': 'admin' },
    });
    if (!res.ok) return `status ${res.status}`;
    const j = await res.json();
    return j?.ok === true;
  }, 'DELETE /api/contact/:id removes a message (admin)');

  // 9) Reviews – create
  let createdReviewId = null;
  const reviewTitle = 'Review from test.js ' + Date.now();
  await expect(async () => {
    const res = await doFetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        author: u.username,
        rating: 5,
        aspect: 'Service',
        title: reviewTitle,
        text: 'Automated test review',
        source: 'ask-the-aspects',
      }),
    });
    if (res.status !== 201) return `status ${res.status}`;
    const j = await res.json();
    createdReviewId = j?.id;
    return !!createdReviewId;
  }, 'POST /api/reviews creates a review');

  // 10) Reviews – list
  await expect(async () => {
    const res = await doFetch('/api/reviews?source=ask-the-aspects');
    if (!res.ok) return `status ${res.status}`;
    const list = await res.json();
    return Array.isArray(list);
  }, 'GET /api/reviews?source=ask-the-aspects lists reviews');

  // 11) Reviews – delete (admin)
  await expect(async () => {
    if (!createdReviewId) return 'no review created';
    const res = await doFetch(`/api/reviews/${createdReviewId}`, {
      method: 'DELETE',
      headers: { 'X-Username': 'admin' },
    });
    if (!res.ok) return `status ${res.status}`;
    const j = await res.json();
    return j?.ok === true;
  }, 'DELETE /api/reviews/:id removes a review (admin)');

  // 12) Purchases – get (sanity)
  await expect(async () => {
    const res = await doFetch(`/api/purchase/${u.username}`);
    if (!res.ok) return `status ${res.status}`;
    const list = await res.json();
    return Array.isArray(list);
  }, 'GET /api/purchase/:username returns an array');

  // 13) Logout route exists
  await expect(async () => {
    const res = await doFetch('/api/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u.username }),
    });
    return res.ok;
  }, 'Logout route exists (POST)');

  // 14) Products admin CRUD — create then delete (cleanup)
  let createdProductId = null;
  await expect(async () => {
    const res = await doFetch('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Username': 'admin',
      },
      body: JSON.stringify({
        title: 'Test Jet from tests',
        description: 'created by automated test',
        price: 999,
        imageUrl: '',
      }),
    });
    if (res.status !== 201) return `status ${res.status}`;
    const j = await res.json();
    createdProductId = j?.id;
    return !!createdProductId;
  }, 'Products admin CRUD — create');

  await expect(async () => {
    if (!createdProductId) return 'no product created';
    const res = await doFetch(`/api/products/${encodeURIComponent(createdProductId)}`, {
      method: 'DELETE',
      headers: { 'X-Username': 'admin' },
    });
    if (!res.ok) return `status ${res.status}`;
    return true;
  }, 'Products admin CRUD — delete (cleanup)');

  console.log('\n✅ Done.\n');
})();
