// server/routes/reviews.js
// Read + Write reviews persisted in server/data/reviews.json

const express = require('express');

/**
 * Reviews Routes
 * --------------
 * Provides CRUD operations for reviews.
 *
 * @param {Function} loadJSON - Utility to read persisted JSON data from disk.
 * @param {Function} saveJSON - Utility to write JSON data back to disk.
 * @returns {express.Router} Express router for reviews API.
 *
 * Routes:
 * - GET    /api/reviews?source=ask-the-aspects → Fetch reviews (optionally filter by source).
 * - POST   /api/reviews → Add a new review (requires title, text, and valid rating).
 * - DELETE /api/reviews/:id → Delete a review (admin-only).
 */
module.exports = function reviewsRoutes(loadJSON, saveJSON) {
  const router = express.Router();

  /**
   * GET /api/reviews
   * ----------------
   * Fetch reviews.
   * - Optional query param `source` to filter reviews by their source.
   * - Reviews are sorted by `date` (newest first).
   */
  router.get('/', async (req, res) => {
    try {
      const source = (req.query.source || '').toLowerCase();
      const all = await loadJSON('reviews.json'); // expects array
      const filtered = source
        ? all.filter(r => (r.source || '').toLowerCase() === source)
        : all;

      filtered.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      return res.json(filtered);
    } catch (err) {
      console.error('GET /api/reviews error:', err);
      return res.status(500).json({ error: 'Failed to load reviews' });
    }
  });

  /**
   * POST /api/reviews
   * -----------------
   * Create a new review.
   * - Body: { author, rating (1–5), aspect, title, text, source }
   * - Title and text are required.
   * - Rating must be between 1 and 5.
   * - Review is persisted with a generated `id` and current date (YYYY-MM-DD).
   */
  router.post('/', async (req, res) => {
    try {
      const { author, rating, aspect, title, text, source } = req.body || {};
      const clean = {
        author: String(author || 'Anonymous').trim().slice(0, 80),
        rating: Number(rating),
        aspect: String(aspect || 'General').trim().slice(0, 60),
        title: String(title || '').trim().slice(0, 120),
        text: String(text || '').trim().slice(0, 1200),
        source: String(source || 'ask-the-aspects').trim().toLowerCase().slice(0, 80)
      };

      if (!clean.title || !clean.text) {
        return res.status(400).json({ error: 'Title and text are required.' });
      }
      if (!Number.isFinite(clean.rating) || clean.rating < 1 || clean.rating > 5) {
        return res.status(400).json({ error: 'Rating must be 1–5.' });
      }

      const all = await loadJSON('reviews.json');
      const nowISO = new Date().toISOString().slice(0, 10);
      const created = {
        id: 'r' + Date.now(),
        author: clean.author,
        date: nowISO,
        rating: Math.round(clean.rating),
        aspect: clean.aspect,
        title: clean.title,
        text: clean.text,
        source: clean.source
      };

      all.push(created);
      await saveJSON('reviews.json', all);
      console.log('✅ Review saved:', created);
      return res.status(201).json(created);
    } catch (err) {
      console.error('POST /api/reviews error:', err);
      return res.status(500).json({ error: 'Failed to save review' });
    }
  });

  /**
   * DELETE /api/reviews/:id
   * -----------------------
   * Delete a review by ID.
   * - Only allowed if `X-Username: admin` header is provided.
   */
  router.delete('/:id', async (req, res) => {
    try {
      const who = String(req.header('X-Username') || '').toLowerCase();
      if (who !== 'admin') {
        return res.status(403).json({ error: 'Only admin can delete reviews.' });
      }

      const id = String(req.params.id);
      const all = await loadJSON('reviews.json');
      const idx = all.findIndex(r => String(r.id) === id);
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
