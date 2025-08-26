// server/routes/login.js
const express = require('express');

module.exports = (users, activityLog) => {
  const router = express.Router();

  router.post('/', (req, res) => {
    try {
      const { username, password, rememberMe } = req.body || {};

      // validate input
      if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      const ident = username.trim().toLowerCase();

      // find by username OR email (case-insensitive)
      const user = users.find(u => {
        const uname = String(u.username || '').trim().toLowerCase();
        const email = String(u.email || '').trim().toLowerCase();
        return (uname === ident || email === ident) && String(u.password) === String(password);
      });

      if (!user) {
        // generic error - do not reveal which field is wrong
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      // cookie lifetime
      const maxAge = rememberMe ? 12 * 24 * 60 * 60 * 1000 : 30 * 60 * 1000; // 12d / 30m

      // expose theme/session-friendly cookie for client code (not httpOnly by design)
      res.cookie('skyUser', String(user.username).toLowerCase(), {
        httpOnly: false,
        sameSite: 'Lax',
        maxAge,
        path: '/'
      });

      // server-only convenience cookie
      res.cookie('username', user.username, {
        httpOnly: true,
        sameSite: 'Lax',
        maxAge,
        path: '/'
      });

      // activity log
      activityLog.push({
        username: user.username,
        activity: 'login',
        datetime: new Date().toISOString()
      });

      // avoid caching auth responses
      res.set('Cache-Control', 'no-store');

      // return user without password
      const { password: _pw, ...safeUser } = user;
      return res.status(200).json(safeUser);
    } catch (err) {
      console.error('POST /api/login error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
