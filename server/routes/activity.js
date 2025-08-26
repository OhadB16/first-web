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
      const logs = await loadJSON('activity.json');
      logs.sort((a, b) => String(a.datetime || '').localeCompare(String(b.datetime || '')));
      res.json(logs);
    } catch (err) {
      console.error('GET /api/activity error:', err);
      res.status(500).json({ error: 'Failed to load activity' });
    }
  });

  // ✅ מכירות לפי bucket – מחזיר { rows: [{ bucket, units }, ...] }
  router.get('/sales', async (req, res) => {
    try {
      if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
      const bucket = String(req.query.bucket || 'day').toLowerCase(); // day|week|month|year
      const purchases = await loadJSON('purchases.json');

      const fmtKey = (d) => {
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(d.getUTCDate()).padStart(2, '0');

        if (bucket === 'year')  return `${y}`;
        if (bucket === 'month') return `${y}-${m}`;
        if (bucket === 'week') {
          // ISO week
          const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
          const dayNum = (tmp.getUTCDay() + 6) % 7 + 1; // 1..7
          tmp.setUTCDate(tmp.getUTCDate() + (4 - dayNum));
          const wy = tmp.getUTCFullYear();
          const start = new Date(Date.UTC(wy, 0, 1));
          const week = Math.ceil((((tmp - start) / 86400000) + 1) / 7);
          return `${wy}-W${String(week).padStart(2, '0')}`;
        }
        // day
        return `${y}-${m}-${dd}`;
      };

      const counts = new Map(); // key: bucketLabel, value: total units (items count)
      for (const rec of purchases || []) {
        const when = new Date(rec.datetime || Date.now());
        const key = fmtKey(when);
        const units = Array.isArray(rec.items) ? rec.items.length : 0;
        counts.set(key, (counts.get(key) || 0) + units);
      }

      const rows = Array.from(counts.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([bucketLabel, units]) => ({ bucket: bucketLabel, units }));

      res.json({ rows });
    } catch (err) {
      console.error('GET /api/activity/sales error:', err);
      res.status(500).json({ error: 'Failed to compute sales' });
    }
  });

  return router;
};
