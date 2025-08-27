// server/routes/reviews.js
// Read + Write reviews persisted in server/data/reviews.json
const express = require('express');

module.exports = function reviewsRoutes(loadJSON, saveJSON) {
  const router = express.Router();

  // ---- helpers ------------------------------------------------------------
  const isAdmin = (req) => {
    const h = String(req.header('X-Username') || '').toLowerCase();
    const c = String((req.cookies && req.cookies.skyUser) || '').toLowerCase();
    return h === 'admin' || c === 'admin';
  };
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const stripTags = (s) => String(s || '').replace(/<[^>]*>/g, '');
  const asStr = (v) => String(v || '');

  // simple in-memory rate limit window (per ip+author)
  const LAST_POST = new Map();
  const RATE_WINDOW_MS = 15 * 1000;

  // ---- GET /api/reviews ---------------------------------------------------
  // Query:
  //   source=ask-the-aspects   (optional filter)
  //   limit=20&offset=0        (optional pagination)
  //   meta=1                   (optional -> { rows, meta })
  router.get('/', async (req, res) => {
    try {
      const source = asStr(req.query.source).toLowerCase();
      const limitQ = Number(req.query.limit);
      const offset = Math.max(Number(req.query.offset) || 0, 0);
      const withMeta = String(req.query.meta) === '1';

      // default behavior: no pagination if limit not provided
      const limit = Number.isFinite(limitQ) ? clamp(Math.floor(limitQ), 1, 100) : null;

      const all = await loadJSON('reviews.json', []);
      let list = Array.isArray(all) ? all : [];

      if (source) {
        list = list.filter(r => asStr(r.source).toLowerCase() === source);
      }

      // stable sort: most recent first by date (fallback to createdAt)
      list.sort((a, b) => asStr(b.date || b.createdAt || '').localeCompare(asStr(a.date || a.createdAt || '')));

      const total = list.length;
      const rows = limit == null ? list : list.slice(offset, offset + limit);

      if (!withMeta) return res.json(rows);

      const sum = list.reduce((s, r) => s + (Number(r.rating) || 0), 0);
      const avg = total ? Math.round((sum / total) * 10) / 10 : 0;

      const aspects = {};
      for (const r of list) {
        const k = r.aspect || 'General';
        aspects[k] = (aspects[k] || 0) + 1;
      }

      return res.json({ rows, meta: { total, average: avg, aspects } });
    } catch (err) {
      console.error('GET /api/reviews error:', err);
      return res.status(500).json({ error: 'Failed to load reviews' });
    }
  });

  // ---- POST /api/reviews --------------------------------------------------
  // Body: { author, rating(1..5), aspect, title, text, source }
  router.post('/', async (req, res) => {
    try {
      const cookieUser = asStr(req.cookies && req.cookies.skyUser).trim(); // prefer logged-in user
      const { author, rating, aspect, title, text, source } = req.body || {};

      const finalAuthor = (cookieUser || author || 'Anonymous').toString().trim().slice(0, 80);
      const ratingNum = clamp(Math.round(Number(rating) || 0), 1, 5);
      const aspectStr = stripTags(aspect).trim().slice(0, 60) || 'General';
      const titleStr  = stripTags(title).trim().slice(0, 120);
      const textStr   = stripTags(text).trim().slice(0, 1200);
      const srcStr    = asStr(source || 'ask-the-aspects').toLowerCase().slice(0, 80);

      if (!titleStr || !textStr) {
        return res.status(400).json({ error: 'Title and text are required.' });
      }

      // lightweight rate limit: 1 post / 15s per ip+author
      const key = `${req.ip}|${finalAuthor.toLowerCase()}`;
      const now = Date.now();
      const last = LAST_POST.get(key) || 0;
      if (now - last < RATE_WINDOW_MS) {
        const wait = Math.ceil((RATE_WINDOW_MS - (now - last)) / 1000);
        return res.status(429).json({ error: `Please wait ${wait}s before posting again.` });
      }
      LAST_POST.set(key, now);

      const all = await loadJSON('reviews.json', []);

      // simple de-dupe: same author+title+text existing
      const dup = all.find(r =>
        asStr(r.author).toLowerCase() === finalAuthor.toLowerCase() &&
        asStr(r.title).toLowerCase()  === titleStr.toLowerCase() &&
        asStr(r.text)                 === textStr
      );
      if (dup) {
        return res.status(409).json({ error: 'Duplicate review detected.', id: dup.id });
      }

      const today = new Date();
      const created = {
        id: 'r' + Date.now(),
        author: finalAuthor,
        date: today.toISOString().slice(0, 10),     // YYYY-MM-DD
        createdAt: today.toISOString(),             // full ISO for auditing
        rating: ratingNum,
        aspect: aspectStr,
        title: titleStr,
        text: textStr,
        source: srcStr
      };

      all.push(created);
      await saveJSON('reviews.json', all);
      console.log('✅ Review saved:', created.id);

      return res.status(201).json(created);
    } catch (err) {
      console.error('POST /api/reviews error:', err);
      return res.status(500).json({ error: 'Failed to save review' });
    }
  });

  // ---- DELETE /api/reviews/:id  (admin-only) -----------------------------
  router.delete('/:id', async (req, res) => {
    try {
      if (!isAdmin(req)) {
        return res.status(403).json({ error: 'Only admin can delete reviews.' });
      }
      const id = asStr(req.params.id);
      const all = await loadJSON('reviews.json', []);
      const idx = all.findIndex(r => asStr(r.id) === id);
      if (idx === -1) {
        return res.status(404).json({ error: 'Review not found.' });
      }
      const [removed] = all.splice(idx, 1);
      await saveJSON('reviews.json', all);
      return res.json({ ok: true, removed });
    } catch (err) {
      console.error('DELETE /api/reviews/:id error:', err);
      return res.status(500).json({ error: 'Failed to delete review.' });
    }
  });

  return router;
};
