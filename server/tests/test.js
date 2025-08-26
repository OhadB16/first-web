// server/test.js
/* eslint-disable no-console */

// node-fetch v3 (ESM) טעינה דינמית תחת CommonJS:
const fetch = (...args) =>
  import('node-fetch').then(({ default: f }) => f(...args));

const BASE = process.env.BASE_URL || 'http://localhost:3001';

// Cookie jar קטן – מספיק ל"skyUser"
let cookieJar = '';

function setCookieFromResponse(res) {
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) return;
  // שומר רק את שם העוגייה והערך (בלי מאפיינים נוספים)
  const parts = setCookie.split(';')[0];
  cookieJar = cookieJar ? `${cookieJar}; ${parts}` : parts;
}

async function doFetch(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  // מזריקים עוגיה אם יש
  if (cookieJar) headers['cookie'] = cookieJar;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  setCookieFromResponse(res);
  return res;
}

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

function randUser() {
  const n = Math.floor(Math.random() * 1e6);
  return { username: `user_${n}`, password: `P${n}a!`, email: `u${n}@mail.com` };
}

(async function run() {
  console.log(`\n🔎 Testing server at ${BASE}\n`);

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
  await expect(async () => {
    const res = await doFetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // שדות חובה לפי ה־router: fullName, email, message
      body: JSON.stringify({
        fullName: 'Test Runner',
        email: 'runner@example.com',
        message: 'Hello from automated tests',
        subject: contactSubject,
        preferred: 'Email',
        budget: 'N/A',
        company: 'QA Inc.',
        phone: '050-0000000',
      }),
    });
    if (res.status !== 201) return `status ${res.status}`;
    const j = await res.json();
    return j?.ok === true;
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
    // נחפש לפי ה־subject ששלחנו
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

  // 12) Purchases – get (will be empty array but should 200)
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
  }, 'Logout route exists (POST or GET)');

  // 14) Products admin CRUD – create
  let createdProductId = null;
  await expect(async () => {
    const res = await doFetch('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Username': 'admin', // ← חשוב!
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

  console.log('\n✅ Done.\n');
})();
