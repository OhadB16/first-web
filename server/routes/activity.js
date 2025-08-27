// server/routes/activity.js
const express = require('express');

/**
 * activityRoutes
 * --------------
 * Defines admin-only routes for retrieving activity logs and sales statistics.
 *
 * @param {Function} loadJSON - Helper function to load JSON data from disk.
 * @returns {express.Router} Router with activity endpoints.
 *
 * Routes:
 * - GET /api/activity
 *   → Returns full activity log (requires admin).
 * - GET /api/activity/sales?bucket=day|week|month|year
 *   → Returns aggregated sales counts grouped by time bucket.
 */
module.exports = function activityRoutes(loadJSON) {
  const router = express.Router();

  /**
   * Checks if the request is from an admin user.
   * Reads either `X-Username` header or `skyUser` cookie.
   */
  const isAdmin = (req) => {
    const h = String(req.header('X-Username') || '').toLowerCase();
    const c = String((req.cookies && req.cookies.skyUser) || '').toLowerCase();
    return h === 'admin' || c === 'admin';
  };

  /**
   * GET /api/activity
   * -----------------
   * Returns the sorted activity log for admin users.
   */
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

  /**
   * GET /api/activity/sales
   * -----------------------
   * Returns aggregated sales grouped by bucket (day, week, month, year).
   * Response format: { rows: [{ bucket, units }, ...] }
   */
  router.get('/sales', async (req, res) => {
    try {
      if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
      const bucket = String(req.query.bucket || 'day').toLowerCase(); // day|week|month|year
      const purchases = await loadJSON('purchases.json');

      /**
       * Formats a date into the proper bucket key.
       * @param {Date} d - Input date.
       * @returns {string} Bucket label (YYYY, YYYY-MM, YYYY-MM-DD, or ISO week).
       */
      const fmtKey = (d) => {
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(d.getUTCDate()).padStart(2, '0');

        if (bucket === 'year')  return `${y}`;
        if (bucket === 'month') return `${y}-${m}`;
        if (bucket === 'week') {
          // ISO week number
          const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
          const dayNum = (tmp.getUTCDay() + 6) % 7 + 1; // 1..7
          tmp.setUTCDate(tmp.getUTCDate() + (4 - dayNum));
          const wy = tmp.getUTCFullYear();
          const start = new Date(Date.UTC(wy, 0, 1));
          const week = Math.ceil((((tmp - start) / 86400000) + 1) / 7);
          return `${wy}-W${String(week).padStart(2, '0')}`;
        }
        // Default: day
        return `${y}-${m}-${dd}`;
      };

      // Aggregate counts per bucket
      const counts = new Map();
      for (const rec of purchases || []) {
        const when = new Date(rec.datetime || Date.now());
        const key = fmtKey(when);
        const units = Array.isArray(rec.items) ? rec.items.length : 0;
        counts.set(key, (counts.get(key) || 0) + units);
      }

      // Convert to sorted rows
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
