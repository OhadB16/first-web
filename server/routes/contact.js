// server/routes/contact.js
const express = require('express');

/**
 * contactRoutes
 * -------------
 * Defines routes for sending and managing contact messages.
 *
 * @param {Function} loadJSON - Async helper to load JSON data from disk.
 * @param {Function} saveJSON - Async helper to save JSON data to disk.
 * @returns {express.Router} Router with contact endpoints.
 *
 * Routes:
 * - GET /api/contact (admin only)
 *   → Returns all messages sorted from newest to oldest.
 * - POST /api/contact (public or logged-in)
 *   → Submits a new message (with different requirements for guests vs logged-in users).
 * - DELETE /api/contact/:id (admin only)
 *   → Deletes a message by ID.
 */
module.exports = function contactRoutes(loadJSON, saveJSON) {
  const router = express.Router();

  /**
   * Checks if request comes from an admin.
   * Looks at the `X-Username` header, query param `who`, or `skyUser` cookie.
   */
  const isAdmin = (req) => {
    const who = String(req.header('X-Username') || req.query.who || '').toLowerCase();
    const c = String((req.cookies && req.cookies.skyUser) || '').toLowerCase();
    return who === 'admin' || c === 'admin';
  };

  /**
   * GET /api/contact
   * ----------------
   * Admin: fetch all messages, sorted newest to oldest.
   */
  router.get('/', async (req, res) => {
    try {
      if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
      const all = await loadJSON('messages.json'); // returns [] if not found
      all.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
      return res.json(all);
    } catch (err) {
      console.error('GET /api/contact error:', err);
      return res.status(500).json({ error: 'Failed to load messages' });
    }
  });

  /**
   * POST /api/contact
   * -----------------
   * Public or logged-in: submit a message.
   * Validation rules:
   * - Guest: must provide fullName, email, and message.
   * - Logged-in: must provide at least message; fullName/email are auto-filled if missing.
   */
  router.post('/', async (req, res) => {
    try {
      const loggedInUser = String((req.cookies && req.cookies.skyUser) || '').trim();
      const { fullName, company, email, phone, preferred, budget, subject, message } = req.body || {};

      const isLoggedIn = !!loggedInUser;

      if (!isLoggedIn) {
        if (!String(fullName || '').trim() || !String(email || '').trim() || !String(message || '').trim()) {
          return res.status(400).json({ error: 'Full name, email and message are required.' });
        }
      } else {
        if (!String(message || '').trim()) {
          return res.status(400).json({ error: 'Message is required.' });
        }
      }

      const clean = {
        id: 'm' + Date.now(),
        fullName: String((isLoggedIn ? (fullName || loggedInUser) : fullName) || '').trim().slice(0, 120),
        company: String(company || '').trim().slice(0, 120),
        email: String((isLoggedIn ? (email || `${loggedInUser}@example.com`) : email) || '').trim().slice(0, 160),
        phone: String(phone || '').trim().slice(0, 60),
        preferred: String(preferred || '').trim().slice(0, 40),
        budget: String(budget || '').trim().slice(0, 40),
        subject: String(subject || '').trim().slice(0, 180),
        message: String(message || '').trim().slice(0, 4000),
        createdAt: new Date().toISOString(),
        byUser: loggedInUser || null
      };

      const all = await loadJSON('messages.json');
      all.push(clean);
      await saveJSON('messages.json', all);

      // Return full object so frontend can delete by id later
      return res.status(201).json(clean);
    } catch (err) {
      console.error('POST /api/contact error:', err);
      return res.status(500).json({ error: 'Failed to send message' });
    }
  });

  /**
   * DELETE /api/contact/:id
   * -----------------------
   * Admin: delete a message by its ID.
   */
  router.delete('/:id', async (req, res) => {
    try {
      if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });

      const id = String(req.params.id || '');
      const all = await loadJSON('messages.json');
      const next = all.filter(m => String(m.id) !== id);
      if (next.length === all.length) return res.status(404).json({ error: 'Not found' });

      await saveJSON('messages.json', next);
      return res.json({ ok: true });
    } catch (err) {
      console.error('DELETE /api/contact/:id error:', err);
      return res.status(500).json({ error: 'Failed to delete message' });
    }
  });

  return router;
};
