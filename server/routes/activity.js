// server/routes/activity.js
const express = require('express');

module.exports = function activityRoutes(loadJSON) {
  const router = express.Router();

  const isAdmin = (req) => {
    const h = String(req.header('X-Username') || '').toLowerCase();
    const c = String((req.cookies && req.cookies.skyUser) || '').toLowerCase();
    return h === 'admin' || c === 'admin';
  };

  // 📜 כל הלוגים (אדמין בלבד)
  router.get('/', async (req, res) => {
    try {
      if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
      const logs = await loadJSON('activity.json'); // []
      // אין צורך למיין – אבל אם רוצים:
      logs.sort((a, b) => String(a.datetime || '').localeCompare(String(b.datetime || '')));
      res.json(logs);
    } catch (err) {
      console.error('GET /api/activity error:', err);
      res.status(500).json({ error: 'Failed to load activity' });
    }
  });

  // 📈 מכירות ליום (אדמין בלבד) – על בסיס purchases.json
  router.get('/sales', async (req, res) => {
    try {
      if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
      const purchases = await loadJSON('purchases.json'); // [{username, items:[...], datetime?...}]
      const counts = new Map(); // key: YYYY-MM-DD, value: totalItems

      for (const rec of (purchases || [])) {
        const when = new Date(rec.datetime || Date.now());
        const key = when.toISOString().slice(0, 10); // YYYY-MM-DD
        const itemsCount = Array.isArray(rec.items) ? rec.items.length : 0;
        counts.set(key, (counts.get(key) || 0) + itemsCount);
      }

      const series = Array.from(counts.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, count]) => ({ date, count }));

      res.json(series);
    } catch (err) {
      console.error('GET /api/activity/sales error:', err);
      res.status(500).json({ error: 'Failed to compute sales' });
    }
  });

  return router;
};
