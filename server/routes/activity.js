// server/routes/activity.js
const express = require('express');

module.exports = function activityRoutes(loadJSON) {
  const router = express.Router();

  const isAdmin = (req) => {
    const h = String(req.header('X-Username') || '').toLowerCase();
    const c = String((req.cookies && req.cookies.skyUser) || '').toLowerCase();
    return h === 'admin' || c === 'admin';
  };

  router.get('/', async (req, res) => {
    try {
      if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });

      const data = await loadJSON('activity.json'); // falls back to []
      // Sort newest first – supports ISO or locale strings
      const sorted = [...data].sort((a, b) => {
        const ta = Date.parse(a.datetime) || 0;
        const tb = Date.parse(b.datetime) || 0;
        return tb - ta;
      });

      res.json(sorted);
    } catch (err) {
      console.error('GET /api/admin/activity error:', err);
      res.status(500).json({ error: 'Failed to load activity' });
    }
  });

  return router;
};
