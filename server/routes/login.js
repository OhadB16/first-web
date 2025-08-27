// server/routes/login.js
// Authentication: username/email + password -> cookie-based session
//
// POST /api/login
// Body:
//   {
//     "username": "<username OR email>",   // alias: "identifier" also accepted
//     "password": "<password>",
//     "rememberMe": true | false            // optional; default false
//   }
//
// Behaviour:
//   • Finds a user by *username OR email* (case-insensitive); compares plaintext password (demo only).
//   • Sets two cookies (same lifetimes):
//       - skyUser  (not httpOnly, for client UI to read; lowercase username, as your UI expects)
//       - username (httpOnly, for server convenience)
//   • `rememberMe` => 12 days, else 30 minutes
//   • Adds a row to activityLog and returns the user object without `password`.
//
// Notes:
//   • This module intentionally keeps plaintext compare (matches your current approach).
//   • Cookie `secure` is enabled automatically when behind HTTPS (req.secure or X-Forwarded-Proto).
//   • Response headers disable caching.
//
// Tip (future): swap to hashed passwords (bcrypt/argon2) and timing-safe compare.

const express = require('express');

module.exports = (users = [], activityLog = []) => {
  const router = express.Router();

  /* ----------------------------- Utilities ------------------------------ */

  // Normalize, clamp, and trim any string-ish input
  const norm = (v, max = 256) => String(v ?? '').trim().slice(0, max);

  // Boolean-ish coercion that tolerates strings ('true'/'1')
  const toBool = (v) => v === true || v === 'true' || v === '1';

  // Detect HTTPS even behind a proxy (Heroku/NGINX/etc.)
  const isHttps = (req) =>
    req.secure || String(req.get('x-forwarded-proto') || '').toLowerCase() === 'https';

  router.post('/', (req, res) => {
    try {
      // Body can use "username" (your current clients) or "identifier" (friendlier name)
      const rawIdentifier = req.body?.username ?? req.body?.identifier;
      const rawPassword = req.body?.password;

      const identifier = norm(rawIdentifier);
      const password = String(rawPassword ?? '');

      if (!identifier || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      // Case-insensitive match by username OR email
      const ident = identifier.toLowerCase();
      const user = (Array.isArray(users) ? users : []).find((u) => {
        const uname = norm(u?.username).toLowerCase();
        const email = norm(u?.email).toLowerCase();
        // Plaintext compare — matches your current storage model
        const passOK = String(u?.password) === password;
        return passOK && (uname === ident || email === ident);
      });

      if (!user) {
        // Generic message: don't disclose which field failed
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      // Cookie lifetime (12d vs 30m)
      const rememberMe = toBool(req.body?.rememberMe);
      const maxAge = rememberMe ? 12 * 24 * 60 * 60 * 1000 : 30 * 60 * 1000; // ms

      // Auto-secure cookies when HTTPS
      const secureCookie = isHttps(req);

      // UI-facing cookie (intentionally not httpOnly; your client reads it)
      res.cookie('skyUser', String(user.username).toLowerCase(), {
        httpOnly: false,
        sameSite: 'Lax',
        secure: secureCookie,
        maxAge,
        path: '/',
      });

      // Server-only convenience cookie
      res.cookie('username', user.username, {
        httpOnly: true,
        sameSite: 'Lax',
        secure: secureCookie,
        maxAge,
        path: '/',
      });

      // Activity log (ISO timestamp for consistent ordering)
      activityLog.push({
        username: user.username,
        activity: 'login',
        datetime: new Date().toISOString(),
      });

      // Strengthen no-cache semantics for auth responses
      res.set({
        'Cache-Control': 'no-store',
        Pragma: 'no-cache',
        Expires: '0',
      });

      // Return user without password
      const { password: _pw, ...safeUser } = user;
      return res.status(200).json(safeUser);
    } catch (err) {
      console.error('POST /api/login error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
