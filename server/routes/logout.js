// server/routes/logout.js
// Logout route: clears client/session cookies and records an activity entry.
//
// Endpoints:
//   • POST /api/logout
//   • GET  /api/logout
//
// Behaviour:
//   • Attempts to infer the username from cookies, header, or body.
//   • Logs a `logout` event with an ISO timestamp (stable for sorting).
//   • Clears both cookie names used by the app: `skyUser` (UI) and `username` (server).
//   • Returns { ok: true } and sets Cache-Control: no-store.

const express = require('express');

module.exports = function logoutRoutes(activityLog = []) {
  const router = express.Router();

  /* ----------------------------- utils --------------------------------- */

  // Append a logout line to the in-memory activity log (if provided)
  const log = (username) => {
    if (!Array.isArray(activityLog)) return;
    if (!username) return;
    activityLog.push({
      datetime: new Date().toISOString(), // ISO for reliable lexicographic sort
      username,
      activity: 'logout',
    });
  };

  // In practice, browsers can be finicky about how cookies were set.
  // We clear with a couple of variants to cover secure/non-secure combos.
  const clearAuthCookies = (req, res) => {
    const common = { path: '/', sameSite: 'Lax' };
    // Clear cookies that might have been set without `secure`
    res.clearCookie('skyUser',  common);
    res.clearCookie('username', common);
    // And also try clearing a `secure` variant (if it was set that way)
    res.clearCookie('skyUser',  { ...common, secure: true });
    res.clearCookie('username', { ...common, secure: true });
  };

  // Extract a best-effort username for logging
  const extractUsername = (req) => {
    const fromCookies = String(
      (req.cookies && (req.cookies.skyUser || req.cookies.username)) || ''
    ).trim();

    const fromHeader = String(req.header('X-Username') || '').trim();
    const fromBody   = String((req.body && req.body.username) || '').trim();

    return fromCookies || fromHeader || fromBody || '';
  };

  // Shared handler
  const handleLogout = (req, res) => {
    try {
      const username = extractUsername(req);
      log(username);
      clearAuthCookies(req, res);

      // Avoid caching of auth responses
      res.set({
        'Cache-Control': 'no-store',
        Pragma: 'no-cache',
        Expires: '0',
      });

      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  router.post('/', handleLogout);
  router.get('/', handleLogout);

  return router;
};
