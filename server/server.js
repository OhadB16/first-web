// server/server.js
const path = require('path');
// Core libs
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

// Disk persistence helpers
const { loadJSON, saveJSON } = require('./helpers/persist_module');

// Modular routes
const loginRoutes     = require('./routes/login');
const registerRoutes  = require('./routes/register');
const cartRoutes      = require('./routes/cart');
const purchaseRoutes  = require('./routes/purchase');
const activityRoutes  = require('./routes/activity');
const productsRoutes  = require('./routes/products');
const meRoutes        = require('./routes/me');
const logoutRoutes    = require('./routes/logout');
const reviewsRoutes   = require('./routes/reviews');
const contactRoutes   = require('./routes/contact');

const PUBLIC_DIR = path.join(__dirname, 'public');

const app = express();

/* ──────────────────────────────────────────────────────────────────────────
   MIDDLEWARE
   - CORS for the React app
   - Basic rate limiting
   - JSON body parsing (with 5MB cap)
   - Cookies for auth/admin helpers
   - Static public pages (/public, /readme, /llm)
   ────────────────────────────────────────────────────────────────────────── */
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  allowedHeaders: ['Content-Type', 'X-Username']
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// ⛔️ 5MB payload limit so big bodies return 413
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

app.use('/public', express.static(PUBLIC_DIR, { index: false }));
app.get(['/readme', '/readme.html'], (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'readme.html')));
app.get(['/llm', '/llm.html'],       (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'llm.html')));

// Simple readiness probe for tests/ops
app.get('/health', (req, res) => res.json({ ok: true }));

/* ──────────────────────────────────────────────────────────────────────────
   IN-MEMORY STATE (hydrated from disk on boot)
   ────────────────────────────────────────────────────────────────────────── */
let users = [];
let carts = [];
let purchases = [];
let activityLog = [];

/* ──────────────────────────────────────────────────────────────────────────
   LOAD & SAVE (disk)
   ────────────────────────────────────────────────────────────────────────── */
const loadAllData = async () => {
  try {
    const loadedUsers = await loadJSON('users.json');
    users.splice(0, users.length, ...loadedUsers);

    // Ensure admin exists
    const adminUser = { username: 'admin', email: 'admin@example.com', password: 'admin' };
    const adminExists = users.some(u => u.username.toLowerCase() === 'admin');
    if (!adminExists) {
      users.push(adminUser);
      await saveJSON('users.json', users);
      console.log('👑 Admin user added to users.json');
    }

    const loadedCarts      = await loadJSON('carts.json');
    const loadedPurchases  = await loadJSON('purchases.json');
    const loadedActivity   = await loadJSON('activity.json');

    carts.splice(0, carts.length, ...loadedCarts);
    purchases.splice(0, purchases.length, ...loadedPurchases);
    activityLog.splice(0, activityLog.length, ...loadedActivity);

    console.log('✅ Loaded all data!');
  } catch (err) {
    console.error('Error loading data from disk:', err);
    process.exit(1);
  }
};

const saveAllData = async () => {
  try {
    await saveJSON('users.json', users);
    await saveJSON('carts.json', carts);
    await saveJSON('purchases.json', purchases);
    await saveJSON('activity.json', activityLog);
  } catch (err) {
    console.error('Error saving data to disk:', err);
  }
};

console.log('activityLog is:', typeof activityLog);

/* ──────────────────────────────────────────────────────────────────────────
   ROUTES
   ────────────────────────────────────────────────────────────────────────── */
try {
  // Auth
  app.use('/api/login',    loginRoutes(users, activityLog));
  app.use('/api/register', registerRoutes(users, activityLog, saveAllData));
  app.use('/api/logout',   logoutRoutes(activityLog));      // ✅ pass activityLog

  // Me
  app.use('/api/me', meRoutes(users));

  // Store & orders
  app.use('/api/products', productsRoutes(loadJSON, saveJSON));
  app.use('/api/cart',     cartRoutes(carts, activityLog, saveAllData)); // ✅ pass saveAllData
  app.use('/api/purchase', purchaseRoutes(purchases, carts, activityLog, saveAllData));

  // Content / comms
  app.use('/api/reviews',  reviewsRoutes(loadJSON, saveJSON));
  app.use('/api/contact',  contactRoutes(loadJSON, saveJSON));

  // Admin
  app.use('/api/admin/activity', activityRoutes(loadJSON));
} catch (err) {
  console.error('Error attaching routes:', err);
}

/* ──────────────────────────────────────────────────────────────────────────
   GLOBAL ERROR HANDLER
   - keeps 413 for large payloads
   ────────────────────────────────────────────────────────────────────────── */
app.use((err, req, res, next) => {
  if (err && (err.type === 'entity.too.large' || err.status === 413)) {
    return res.status(413).json({ error: 'Payload too large' });
  }
  const status = err?.status || err?.statusCode || 500;
  const message = status === 500 ? 'Internal server error' : (err.message || 'Error');
  res.status(status).json({ error: message });
});

// Optional fallback to detect mis-wiring of /api/register
app.post('/api/register', (req, res) => {
  console.log('⚠️ Fallback register route hit');
  res.status(500).json({ error: 'Fallback route used. Real route failed to load.' });
});

/* ──────────────────────────────────────────────────────────────────────────
   START + GRACEFUL SHUTDOWN
   ────────────────────────────────────────────────────────────────────────── */
loadAllData().then(() => {
  const server = app.listen(3001, () => {
    console.log('Server running on http://localhost:3001');
  });

  const shutdown = async (signal) => {
    try {
      console.log(`\n${signal} received. Saving data…`);
      await saveAllData();
    } catch (e) {
      console.error('Save on shutdown failed:', e);
    } finally {
      server.close(() => process.exit(0));
      // Force-exit if close hangs
      setTimeout(() => process.exit(0), 2000).unref();
    }
  };

  process.on('SIGINT',  () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}).catch(err => {
  console.error('Failed to start server:', err);
});
