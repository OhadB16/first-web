// server/routes/me.js
const express = require('express');

module.exports = (users) => {
  const router = express.Router();

  router.get('/', (req, res) => {
    const cookieUser = (req.cookies?.username || req.cookies?.skyUser || '').toString();
    const headerUser = (req.header('X-Username') || '').toString();
    const qUser      = (req.query?.username || '').toString();

    const effective = cookieUser || headerUser || qUser;
    if (!effective) return res.status(401).json({ error: 'Not logged in' });

    const user = users.find(u =>
      String(u.username).toLowerCase() === effective.toLowerCase()
    );
    if (!user) return res.status(401).json({ error: 'Not logged in' });

    const { password, ...safe } = user;
    return res.json(safe);
  });

  return router;
};
