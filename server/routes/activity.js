// server/routes/activity.js
// Admin-only activity endpoints.
// - GET /api/admin/activity
// - GET /api/admin/activity/sales?bucket=day|week|month|year
//
// Notes:
// • Admin check looks for username "admin" either in the X-Username header or in the "skyUser" cookie.
// • Sorting and bucketing use UTC to avoid timezone surprises.
// • Optional ?from=YYYY-MM-DD and ?to=YYYY-MM-DD filters are supported (non-breaking).

const express = require('express');

/**
 * Factory: provide routes with a data loader (DI for testability).
 * @param {(file: string, def?: any) => Promise<any>} loadJSON
 */
module.exports = function activityRoutes(loadJSON) {
  const router = express.Router();

  /* ------------------------------ Helpers ------------------------------- */

  /** Is the requester an admin? (relies on cookie-parser to read req.cookies) */
  const isAdmin = (req) => {
    const h = String(req.header('X-Username') || '').trim().toLowerCase();
    const c = String((req.cookies && req.cookies.skyUser) || '').trim().toLowerCase();
    return h === 'admin' || c === 'admin';
  };

  /** Small middleware to block non-admins up front. */
  const adminGate = (req, res, next) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };

  /** Parse an ISO-ish date string (YYYY-MM-DD or full ISO). Returns ms or null. */
  const parseDateMs = (v) => {
    if (!v) return null;
    const ms = Date.parse(v);
    return Number.isFinite(ms) ? ms : null;
  };

  /** Safely get ms from a record field; returns null if invalid. */
  const getRecordTimeMs = (value) => {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : null;
  };

  /** Inclusive range filter by ms (null means "no bound"). */
  const inRange = (ms, fromMs, toMs) => {
    if (ms == null) return true; // if record has no date, do not exclude it
    if (fromMs != null && ms < fromMs) return false;
    if (toMs != null && ms > toMs) return false;
    return true;
  };

  /** Format key for sales aggregation in UTC. */
  const formatBucketKeyUTC = (date, bucket) => {
    const d = new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      0, 0, 0, 0
    ));
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');

    if (bucket === 'year')  return `${y}`;
    if (bucket === 'month') return `${y}-${m}`;
    if (bucket === 'week') {
      // ISO week (UTC)
      const tmp = new Date(d);
      const dayNum = (tmp.getUTCDay() + 6) % 7 + 1; // 1..7 (Mon..Sun)
      tmp.setUTCDate(tmp.getUTCDate() + (4 - dayNum)); // go to Thu of this week
      const wy = tmp.getUTCFullYear();
      const start = new Date(Date.UTC(wy, 0, 1));
      const week = Math.ceil((((tmp - start) / 86400000) + 1) / 7);
      return `${wy}-W${String(week).padStart(2, '0')}`;
    }
    // day (default)
    return `${y}-${m}-${dd}`;
  };

  /* -------------------------------- Routes ------------------------------ */

  // GET /api/admin/activity
  // Returns the activity log sorted by datetime (ascending by default).
  // Optional query:
  //   from=YYYY-MM-DD | ISO date
  //   to=YYYY-MM-DD   | ISO date
  //   order=asc|desc  (default: asc)
  router.get('/', adminGate, async (req, res) => {
    try {
      const fromMs = parseDateMs(req.query.from);
      const toMs   = parseDateMs(req.query.to);
      const order  = (String(req.query.order || 'asc').toLowerCase() === 'desc') ? 'desc' : 'asc';

      const logs = await loadJSON('activity.json', []);

      // Filter by date range if provided (uses record.datetime when parsable)
      const filtered = logs.filter((r) => {
        const ms = getRecordTimeMs(r.datetime);
        return inRange(ms, fromMs, toMs);
      });

      // Robust sort by actual time; fallback to string compare if no date available
      filtered.sort((a, b) => {
        const ams = getRecordTimeMs(a.datetime);
        const bms = getRecordTimeMs(b.datetime);
        if (ams != null && bms != null) return ams - bms;
        return String(a.datetime || '').localeCompare(String(b.datetime || ''));
      });

      if (order === 'desc') filtered.reverse();

      res.json(filtered);
    } catch (err) {
      console.error('GET /api/admin/activity error:', err);
      res.status(500).json({ error: 'Failed to load activity' });
    }
  });

  // GET /api/admin/activity/sales?bucket=day|week|month|year
  // Response shape: { rows: [{ bucket, units }, ...] }
  // Optional query:
  //   from=YYYY-MM-DD | ISO date
  //   to=YYYY-MM-DD   | ISO date
  router.get('/sales', adminGate, async (req, res) => {
    try {
      const bucket = String(req.query.bucket || 'day').toLowerCase();
      const allowed = new Set(['day', 'week', 'month', 'year']);
      const mode = allowed.has(bucket) ? bucket : 'day';

      const fromMs = parseDateMs(req.query.from);
      const toMs   = parseDateMs(req.query.to);

      const purchases = await loadJSON('purchases.json', []);

      const counts = new Map(); // bucket -> total units
      for (const rec of purchases) {
        // Respect optional date range
        const whenMs = getRecordTimeMs(rec.datetime) ?? Date.now();
        if (!inRange(whenMs, fromMs, toMs)) continue;

        const when = new Date(whenMs);
        const key = formatBucketKeyUTC(when, mode);

        const units = Array.isArray(rec.items) ? rec.items.length : 0;
        counts.set(key, (counts.get(key) || 0) + units);
      }

      const rows = Array.from(counts.entries())
        .sort((a, b) => a[0].localeCompare(b[0])) // keys are YYYY, YYYY-MM, YYYY-MM-DD, or YYYY-W##
        .map(([bucketLabel, units]) => ({ bucket: bucketLabel, units }));

      res.json({ rows });
    } catch (err) {
      console.error('GET /api/admin/activity/sales error:', err);
      res.status(500).json({ error: 'Failed to compute sales' });
    }
  });

  return router;
};
