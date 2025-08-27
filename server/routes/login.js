// server/routes/login.js
const express = require('express');

/**
 * Login Routes
 * ------------
 * Provides authentication endpoint for logging in users.
 *
 * @param {Array} users - Array of user objects { username, email, password, ... }.
 * @param {Array} activityLog - Array for recording user activity.
 * @returns {express.Router} Router with login endpoint.
 *
 * Routes:
 * - POST /api/login
 *   → Validates user credentials (username/email + password).
 *   → Sets cookies for session handling.
 *   → Logs login activity.
 *   → Returns user object (excluding password).
 */
module.exports = (users, activityLog) => {
  const router = express.Router();

  /**
   * POST /api/login
   * ----------------
   * Authenticate user using username or email.
   * Sets cookies:
   * - `skyUser`: Lowercased username, accessible to client JS (not httpOnly).
   * - `username`: Full username, httpOnly (server-only convenience).
   *
   * Supports "rememberMe" flag:
   * - true: 12 days
   * - false: 30 minutes
   */
  router.post('/', (req, res) => {
    try {
      const { username, password, rememberMe } = req.body || {};

      // Validate input
      if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      const ident = username.trim().toLowerCase();

      // Match by username OR email (case-insensitive)
      const user = users.find(u => {
        const uname = String(u.username || '').trim().toLowerCase();
        const email = String(u.email || '').trim().toLowerCase();
        return (uname === ident || email === ident) && String(u.password) === String(password);
      });

      if (!user) {
        // Generic error: do not reveal which field is wrong
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      // Cookie lifetime (12 days or 30 minutes)
      const maxAge = rememberMe ? 12 * 24 * 60 * 60 * 1000 : 30 * 60 * 1000;

      // Public cookie (used by client JS)
      res.cookie('skyUser', String(user.username).toLowerCase(), {
        httpOnly: false,
        sameSite: 'Lax',
        maxAge,
        path: '/'
      });

      // Secure httpOnly cookie (server convenience)
      res.cookie('username', user.username, {
        httpOnly: true,
        sameSite: 'Lax',
        maxAge,
        path: '/'
      });

      // Log activity
      activityLog.push({
        username: user.username,
        activity: 'login',
        datetime: new Date().toISOString()
      });

      // Avoid caching
      res.set('Cache-Control', 'no-store');

      // Exclude password from response
      const { password: _pw, ...safeUser } = user;
      return res.status(200).json(safeUser);
    } catch (err) {
      console.error('POST /api/login error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
