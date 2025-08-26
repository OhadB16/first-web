// server/server.js
const path = require('path');
// Load core libraries
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

// Custom helper functions to persist data to disk
const { loadJSON, saveJSON } = require('./helpers/persist_module');

// Import modular routes — each returns an Express Router
const loginRoutes = require('./routes/login');
const registerRoutes = require('./routes/register');
const cartRoutes = require('./routes/cart');
const purchaseRoutes = require('./routes/purchase');
const activityRoutes = require('./routes/activity');
const productsRoutes = require('./routes/products');
const meRoutes = require('./routes/me');
const logoutRoutes = require('./routes/logout');
const reviewsRoutes = require('./routes/reviews');
const contactRoutes = require('./routes/contact');

const PUBLIC_DIR = path.join(__dirname, 'public');

const app = express();

// ======================
// 🛡️ MIDDLEWARE SETUP
// ======================
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

// serve everything in /server/public at /public/*
app.use('/public', express.static(PUBLIC_DIR, { index: false }));

app.get(['/readme', '/readme.html'], (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'readme.html'));
});

app.get(['/llm', '/llm.html'], (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'llm.html'));
});

// ======================
// 📦 IN-MEMORY DATA STORE
// ======================
let users = [];
let carts = [];
let purchases = [];
let activityLog = [];

// ======================
// 💾 LOAD DATA FROM DISK
// ======================
const loadAllData = async () => {
  try {
    const loadedUsers = await loadJSON('users.json');
    users.splice(0, users.length, ...loadedUsers);

    // Ensure 'admin' user exists
    const adminUser = { username: 'admin', email: 'admin@example.com', password: 'admin' };
    const adminExists = users.some(u => u.username.toLowerCase() === adminUser.username);
    if (!adminExists) {
      users.push(adminUser);
      console.log('👑 Admin user added to users.json');
      await saveJSON('users.json', users);
    }

    const loadedCarts = await loadJSON('carts.json');
    carts.splice(0, carts.length, ...loadedCarts);

    const loadedPurchases = await loadJSON('purchases.json');
    purchases.splice(0, purchases.length, ...loadedPurchases);

    const loadedActivity = await loadJSON('activity.json');
    activityLog.splice(0, activityLog.length, ...loadedActivity);

    console.log('✅ Loaded all data!');
  } catch (err) {
    console.error('Error loading data from disk:', err);
    process.exit(1);
  }
};

// ======================
// 💾 SAVE DATA TO DISK
// ======================
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

// ======================
// 🛣️ ATTACH ROUTES
// ======================
try {
  app.use('/api/login',     loginRoutes(users, activityLog));
  app.use('/api/register',  registerRoutes(users, activityLog, saveAllData));
  app.use('/api/cart',      cartRoutes(carts, activityLog));
  app.use('/api/purchase',  purchaseRoutes(purchases, carts, activityLog, saveAllData));
  app.use('/api/products',  productsRoutes(loadJSON, saveJSON)); // includes 405 for DELETE /
  app.use('/api/admin/activity', activityRoutes(loadJSON));
  app.use('/api/me',        meRoutes(users));
  app.use('/api/logout',    logoutRoutes());
  app.use('/api/reviews',   reviewsRoutes(loadJSON, saveJSON));
  app.use('/api/contact',   contactRoutes(loadJSON, saveJSON));
} catch (err) {
  console.error('Error attaching routes:', err);
}

// ======================
// ⚠️ GLOBAL ERROR HANDLER
// ======================
// keep original status codes (e.g., 413 for too large bodies)
app.use((err, req, res, next) => {
  if (err && (err.type === 'entity.too.large' || err.status === 413)) {
    return res.status(413).json({ error: 'Payload too large' });
  }
  const status = err?.status || err?.statusCode || 500;
  const message = status === 500 ? 'Internal server error' : (err.message || 'Error');
  res.status(status).json({ error: message });
});

// (Optional) legacy fallback to catch mis-wiring of /api/register:
app.post('/api/register', (req, res) => {
  console.log('⚠️ Fallback register route hit');
  res.status(500).json({ error: 'Fallback route used. Real route failed to load.' });
});

// ======================
// 🚀 START SERVER
// ======================
loadAllData().then(() => {
  app.listen(3001, () => {
    console.log('Server running on http://localhost:3001');
  });
}).catch(err => {
  console.error('Failed to start server:', err);
});
