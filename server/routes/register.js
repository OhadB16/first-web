// server/routes/register.js
const express = require('express');
const bcrypt = require('bcryptjs'); // npm i bcryptjs

module.exports = (users, activityLog, saveAllData) => {
  const router = express.Router();

  // small helpers
  const isValidUsername = (u) => /^[a-z0-9._-]{3,32}$/.test(u);  // 3–32, ascii, ., _, -
  const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const isStrongPassword = (p) =>
    typeof p === 'string' && p.length >= 8 && /[A-Z]/.test(p) && /\d/.test(p);

  const RESERVED = new Set(['admin', 'root', 'system', 'support', 'postmaster']);

  router.post('/', async (req, res) => {
    try {
      const { username, password, email } = req.body || {};

      // required
      if (!username || !password || !email) {
        return res.status(400).json({ error: 'Username, password, and email are required' });
      }

      // normalize
      const uname = String(username).trim().toLowerCase();
      const mail  = String(email).trim().toLowerCase();

      // validations
      if (!isValidUsername(uname)) {
        return res.status(400).json({ error: 'Username must be 3–32 chars (a–z, 0–9, . _ -)' });
      }
      if (RESERVED.has(uname)) {
        return res.status(403).json({ error: 'This username is reserved' });
      }
      if (!isValidEmail(mail)) {
        return res.status(400).json({ error: 'Invalid email address' });
      }
      if (!isStrongPassword(password)) {
        return res.status(400).json({
          error: 'Password must be ≥8 chars and include an uppercase letter and a number'
        });
      }

      // duplicates
      if (users.some(u => String(u.username).toLowerCase().trim() === uname)) {
        return res.status(409).json({ error: 'Username already exists' });
      }
      if (users.some(u => String(u.email || '').toLowerCase().trim() === mail)) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      // hash password
      const hash = await bcrypt.hash(String(password), 10);

      // persist
      const newUser = { username: uname, email: mail, password: hash };
      users.push(newUser);

      activityLog.push({
        username: uname,
        activity: 'register',
        datetime: new Date().toISOString()
      });

      await saveAllData();

      // Important: don't set cookies here—/login will do it properly.
      res
        .status(201)
        .set('Location', `/api/users/${encodeURIComponent(uname)}`)
        .json({ username: uname, email: mail });
    } catch (err) {
      console.error('POST /api/register error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
