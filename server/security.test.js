// security.test.js
/* eslint-disable no-console */
const BASE = process.env.BASE || 'http://localhost:3001';

let passed = 0;
let failed = 0;

const ok = (msg) => { passed++; console.log(`✅ PASS: ${msg}`); };
const notok = (msg) => { failed++; console.log(`❌ FAIL: ${msg}`); };

// Node 18+ already has global fetch. We rely on it.

(async () => {
  console.log(`\n🔐 Security testing ${BASE}\n`);

  // 0) PING
  try {
    const r = await fetch(`${BASE}/api/products`);
    if (r.ok) ok('Server reachable via GET /api/products');
    else notok('Server reachable via GET /api/products');
  } catch {
    notok('Server reachable via GET /api/products');
  }

  // Random user
  const rnd = Math.floor(Math.random() * 1e6);
  const username = `user_${Date.now()}_${rnd}`;
  const email = `${username}@example.com`;
  const password = 'P@ssw0rd!';

  // 1) Register normal user
  try {
    const r = await fetch(`${BASE}/api/register`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      credentials: 'include',
      body: JSON.stringify({ username, email, password })
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j && j.username) ok('Register normal user');
    else notok('Register normal user');
  } catch {
    notok('Register normal user');
  }

  // 2) Login sets cookie
  let cookie = '';
  try {
    const r = await fetch(`${BASE}/api/login`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      credentials: 'include',
      body: JSON.stringify({ username, password, rememberMe: true })
    });
    const setCookie = r.headers.get('set-cookie') || '';
    cookie = setCookie;
    if (r.ok && /skyUser=/i.test(setCookie)) ok('Login sets skyUser cookie');
    else notok('Login sets skyUser cookie');
  } catch {
    notok('Login sets skyUser cookie');
  }

  // 3) /api/me without cookie -> 401
  try {
    const r = await fetch(`${BASE}/api/me`);
    if (r.status === 401) ok('/api/me without cookie → 401');
    else notok('/api/me without cookie → 401');
  } catch {
    notok('/api/me without cookie → 401');
  }

  // 4) /api/me with cookie -> user sans password
  try {
    const r = await fetch(`${BASE}/api/me`, { headers: { cookie } });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j && j.username && !('password' in j)) ok('/api/me with cookie returns user without password');
    else notok('/api/me with cookie returns user without password');
  } catch {
    notok('/api/me with cookie returns user without password');
  }

  // 5) CORS (allowed)
  try {
    const r1 = await fetch(`${BASE}/api/products`, { headers: { Origin: 'http://localhost:3000' } });
    const allowed = r1.headers.get('access-control-allow-origin');
    const creds   = r1.headers.get('access-control-allow-credentials');
    if (allowed === 'http://localhost:3000' && (creds === 'true' || creds === 'True')) {
      ok('CORS allows only http://localhost:3000 with credentials');
    } else {
      notok('CORS allows only http://localhost:3000 with credentials');
    }

    const r2 = await fetch(`${BASE}/api/products`, { headers: { Origin: 'https://evil.example' } });
    const reflected = r2.headers.get('access-control-allow-origin');
    if (!reflected || reflected === 'http://localhost:3000') ok('CORS not reflecting untrusted Origin');
    else notok('CORS not reflecting untrusted Origin');
  } catch {
    notok('CORS allows only http://localhost:3000 with credentials');
    notok('CORS not reflecting untrusted Origin');
  }

  // 6) Products admin guard: non-admin forbidden
  try {
    const r = await fetch(`${BASE}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Hack', price: 1 })
    });
    if (r.status === 403) ok('POST /api/products forbidden for non-admin');
    else notok('POST /api/products forbidden for non-admin');
  } catch {
    notok('POST /api/products forbidden for non-admin');
  }

  // 7) Admin can create product
  let createdId = null;
  try {
    const r = await fetch(`${BASE}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Username': 'admin'
      },
      body: JSON.stringify({
        title: 'SecTest Jet',
        description: 'created by security test',
        imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB',
        price: 123
      })
    });
    const j = await r.json().catch(() => ({}));
    if (r.status === 201 && j && j.id) {
      createdId = j.id;
      ok('POST /api/products succeeds for admin');
    } else {
      notok('POST /api/products succeeds for admin');
    }
  } catch {
    notok('POST /api/products succeeds for admin');
  }

  // 8) GET /api/contact forbidden for non-admin
  try {
    const r = await fetch(`${BASE}/api/contact`, { headers: { 'X-Username': 'notadmin' } });
    if (r.status === 403) ok('GET /api/contact forbidden for non-admin');
    else notok('GET /api/contact forbidden for non-admin');
  } catch {
    notok('GET /api/contact forbidden for non-admin');
  }

  // 9) Oversized contact body -> 413
  try {
    const big = 'A'.repeat(6 * 1024 * 1024); // ~6MB
    const r = await fetch(`${BASE}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: 'X', email: 'x@example.com', message: big })
    });
    if (r.status === 413) ok('POST /api/contact >5MB → 413');
    else notok('POST /api/contact >5MB → 413');
  } catch {
    notok('POST /api/contact >5MB → 413');
  }

  // 10) DELETE /api/products (collection) must NOT be allowed (404/405)
  try {
    const r = await fetch(`${BASE}/api/products`, { method: 'DELETE' });
    if ([404, 405].includes(r.status)) ok('DELETE /api/products is not allowed');
    else notok(`DELETE /api/products is not allowed`);
  } catch {
    notok('DELETE /api/products is not allowed');
  }

  // 11) Static traversal/server files blocked
  try {
    const r = await fetch(`${BASE}/server.js`);
    if (r.status >= 400) ok('Static traversal/server files blocked');
    else notok('Static traversal/server files blocked');
  } catch {
    ok('Static traversal/server files blocked');
  }

  // 12) Wrong password → 401 with generic error (flexible)
  try {
    const r = await fetch(`${BASE}/api/login`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ username, password: 'WRONG' })
    });
    const j = await r.json().catch(() => ({}));
    const generic = r.status === 401 && j && typeof j.error === 'string' && /invalid/i.test(j.error);
    if (generic) ok('Wrong password → 401 with generic error');
    else notok('Wrong password → 401 with generic error');
  } catch {
    notok('Wrong password → 401 with generic error');
  }

  // 13) Rate-limit (LAST so it לא יפריע לשאר)
  try {
    let seen429 = false;
    for (let i = 0; i < 120; i++) {
      const r = await fetch(`${BASE}/api/products`);
      if (r.status === 429) { seen429 = true; break; }
      await new Promise(rsv => setTimeout(rsv, 30));
    }
    if (seen429) ok('Rate limit triggers 429 after many requests');
    else notok('Rate limit triggers 429 after many requests');
  } catch {
    notok('Rate limit triggers 429 after many requests');
  }

  console.log(`\n✅ Passed: ${passed}   ❌ Failed: ${failed}   ⚠️ Warnings: 0\n`);
})();
