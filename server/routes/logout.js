// server/routes/logout.js
const express = require('express');

module.exports = function logoutRoutes(activityLog) {
  const router = express.Router();

  // tiny helper: record to activity log when possible
  const log = (username) => {
    if (Array.isArray(activityLog) && username) {
      activityLog.push({
        datetime: new Date().toLocaleString(),
        username,
        activity: 'logout',
      });
    }
  };

  // clear both cookie names we use in the app
  const clearAuthCookies = (res) => {
    res.clearCookie('skyUser',  { path: '/' });
    res.clearCookie('username', { path: '/' });
  };

  // shared handler for GET/POST
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

  router.post('/', handleLogout);
  router.get('/', handleLogout);

  return router;
};
