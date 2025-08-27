// server/routes/me.js
// Returns the currently authenticated user (without the password).
//
// Source of identity (in order of trust):
//   1) Cookies:  `username` (server cookie) or `skyUser` (UI cookie)
//   2) Header:   `X-Username`
//   3) Query:    `?username=...`
// If multiple are present, the *first non-empty* source wins. We do not allow
// lower-trust sources to override cookies.
//
// Matching strategy:
//   • Case-insensitive compare against either `username` OR `email`
//     (useful when the client supplies an email via header/query)
//
// Response codes:
//   • 200 with the user object (minus `password`)
//   • 401 when no identity is present or no matching user is found
//   • 500 on unexpected errors
//
// Caching:
//   • `Cache-Control: no-store` to avoid any auth response caching

const express = require('express');

module.exports = (users = []) => {
  const router = express.Router();

  // Normalize a string: toString → trim → lower
  const norm = (v) => String(v ?? '').trim().toLowerCase();

  // Pick the most trusted identity available from the request
  const extractIdentity = (req) => {
    const cookieUser = norm(req.cookies?.username || req.cookies?.skyUser);
    if (cookieUser) return cookieUser;

    const headerUser = norm(req.header('X-Username'));
    if (headerUser) return headerUser;

    const qUser = norm(req.query?.username);
    if (qUser) return qUser;

    return '';
  };

  // Find by username OR email (case-insensitive)
  const findUser = (ident) => {
    if (!ident) return null;
    return users.find((u) => {
      const uname = norm(u.username);
      const email = norm(u.email);
      return ident === uname || ident === email;
    }) || null;
  };

  router.get('/', (req, res) => {
    try {
      const ident = extractIdentity(req);
      if (!ident) {
        res.set('Cache-Control', 'no-store');
        return res.status(401).json({ error: 'Not logged in' });
      }

      const user = findUser(ident);
      if (!user) {
        res.set('Cache-Control', 'no-store');
        return res.status(401).json({ error: 'Not logged in' });
      }

      const { password, ...safe } = user;
      res.set('Cache-Control', 'no-store');
      return res.json(safe);
    } catch (err) {
      console.error('GET /api/me error:', err);
      res.set('Cache-Control', 'no-store');
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
