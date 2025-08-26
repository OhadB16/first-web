// server/routes/activity.js
const express = require('express');

module.exports = function activityRoutes(loadJSON) {
  const router = express.Router();

  const isAdmin = (req) => {
    const h = String(req.header('X-Username') || '').toLowerCase();
    const c = String((req.cookies && req.cookies.skyUser) || '').toLowerCase();
    return h === 'admin' || c === 'admin';
  };

  // כל הלוגים (מסודרים מהחדש לישן)
  router.get('/', async (req, res) => {
    try {
      if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });

      const all = await loadJSON('activity.json');
      const arr = (Array.isArray(all) ? all : []).slice().sort((a, b) => {
        const da = new Date(a.datetime || 0).getTime();
        const db = new Date(b.datetime || 0).getTime();
        return db - da;
      });
      res.json(arr);
    } catch (err) {
      console.error('GET /api/admin/activity error:', err);
      res.status(500).json({ error: 'Failed to load activity' });
    }
  });

  // אגרגציית מכירות: ?bucket=day|week|month|year
  router.get('/sales', async (req, res) => {
    try {
      if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });

      const bucket = String(req.query.bucket || 'day').toLowerCase();
      const valid = new Set(['day', 'week', 'month', 'year']);
      const chosen = valid.has(bucket) ? bucket : 'day';

      const rows = await loadJSON('activity.json');
      const reg = /Completed purchase of\s+(\d+)\s+items/i;
      const agg = {};

      for (const r of (Array.isArray(rows) ? rows : [])) {
        const m = reg.exec(String(r.activity || ''));
        if (!m) continue;

        const qty = parseInt(m[1], 10) || 0;
        let d = new Date(r.datetime);
        if (isNaN(d)) {
          const ts = Date.parse(String(r.datetime));
          if (!isNaN(ts)) d = new Date(ts);
        }
        if (isNaN(d)) continue;

        const key = keyFor(d, chosen);
        agg[key] = (agg[key] || 0) + qty;
      }

      const out = Object.keys(agg).sort().map(k => ({ bucket: k, units: agg[k] }));
      res.json({ bucket: chosen, rows: out });
    } catch (err) {
      console.error('GET /api/admin/activity/sales error:', err);
      res.status(500).json({ error: 'Failed to build sales aggregation' });
    }
  });

  function pad(n) { return String(n).padStart(2, '0'); }
  function keyFor(d, bucket) {
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    if (bucket === 'day') return `${y}-${m}-${day}`;
    if (bucket === 'month') return `${y}-${m}`;
    if (bucket === 'year') return `${y}`;
    // week (ISO week number)
    const w = isoWeek(d);
    return `${y}-W${pad(w)}`;
  }
  function isoWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  return router;
};
