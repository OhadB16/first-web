// server/routes/logout.js
const express = require('express');

/**
 * Logout Routes
 * -------------
 * Provides endpoints for logging out users.
 *
 * @param {Array} activityLog - Array to record logout events.
 * @returns {express.Router} Router with logout endpoints.
 *
 * Routes:
 * - POST /api/logout
 * - GET  /api/logout
 *   → Clears authentication cookies.
 *   → Records logout activity in the log.
 *   → Returns `{ ok: true }`.
 */
module.exports = function logoutRoutes(activityLog) {
  const router = express.Router();

  /**
   * Records a logout event in the activity log.
   * @param {string} username - The username of the logged-out user.
   */
  const log = (username) => {
    if (Array.isArray(activityLog) && username) {
      activityLog.push({
        datetime: new Date().toLocaleString(),
        username,
        activity: 'logout',
      });
    }
  };

  /**
   * Clears both authentication cookies (`skyUser` and `username`).
   */
  const clearAuthCookies = (res) => {
    res.clearCookie('skyUser',  { path: '/' });
    res.clearCookie('username', { path: '/' });
  };

  /**
   * Shared handler for GET/POST logout routes.
   * - Extracts username from cookies, headers, or body.
   * - Logs the logout event.
   * - Clears cookies.
   * - Responds with `{ ok: true }`.
   */
  const handleLogout = (req, res) => {
    const nameFromCookies =
      (req.cookies && (req.cookies.skyUser || req.cookies.username)) || '';
    const nameFromHeader = req.header('X-Username') || '';
    const nameFromBody   = (req.body && req.body.username) || '';
    const username = String(nameFromCookies || nameFromHeader || nameFromBody || '');

    log(username);
    clearAuthCookies(res);
    return res.status(200).json({ ok: true });
  };

  // Support both POST and GET for flexibility
  router.post('/', handleLogout);
  router.get('/', handleLogout);

  return router;
};
