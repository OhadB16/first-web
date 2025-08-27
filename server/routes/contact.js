// server/routes/contact.js
// Contact / Inbox API
//
// Endpoints:
//   GET    /api/contact                -> [ADMIN ONLY] list messages (newest first)
//            Optional: ?limit=50&offset=0  (non-breaking enhancement)
//   POST   /api/contact                -> submit a contact message (guest or logged-in)
//   DELETE /api/contact/:id            -> [ADMIN ONLY] delete a message by id
//
// Notes:
// • Contract is unchanged; pagination params are optional sugar.
// • Inputs are normalized and length-limited to prevent oversized payloads.
// • Timestamps use ISO-8601 so sorting/analytics are consistent.
// • ID generation is collision-resistant without extra deps.

const express = require('express');

module.exports = function contactRoutes(loadJSON, saveJSON) {
  const router = express.Router();

  /* ------------------------------ Helpers ------------------------------- */

  const MAX = {
    fullName: 120,
    company: 120,
    email: 160,
    phone: 60,
    preferred: 40,
    budget: 40,
    subject: 180,
    message: 4000,
  };

  const emailRegex =
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i; // very lenient; just a sanity check

  const toIso = () => new Date().toISOString();

  const genId = () => `m${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  /**
   * Normalize a string input:
   * - Coerces to string, trims outer spaces
   * - Optionally preserves newlines; otherwise collapses them
   * - Clamps to a max length
   */
  const norm = (val, maxLen, { allowNewlines = false } = {}) => {
    let s = String(val ?? '').trim();
    // Normalize line endings
    s = s.replace(/\r\n?/g, '\n');
    if (!allowNewlines) s = s.replace(/\n+/g, ' ');
    // Collapse internal whitespace runs
    s = s.replace(/\s{2,}/g, ' ');
    // Clamp length
    if (typeof maxLen === 'number' && maxLen > 0 && s.length > maxLen) {
      s = s.slice(0, maxLen);
    }
    return s;
  };

  const isAdmin = (req) => {
    const who = String(req.header('X-Username') || req.query.who || '').toLowerCase();
    const c = String((req.cookies && req.cookies.skyUser) || '').toLowerCase();
    return who === 'admin' || c === 'admin';
  };

  /* -------------------------------- Routes ------------------------------ */

  // 📨 Admin: list all messages (newest first)
  router.get('/', async (req, res) => {
    try {
      if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });

      const limit = Math.max(0, Math.min(500, parseInt(req.query.limit, 10) || 0)); // 0 = no limit
      const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);

      const all = await loadJSON('messages.json', []);
      // Sort newest -> oldest by ISO timestamp
      all.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

      const total = all.length;
      const rows = limit ? all.slice(offset, offset + limit) : all;

      res.set('X-Total-Count', String(total));
      return res.json(rows);
    } catch (err) {
      console.error('GET /api/contact error:', err);
      return res.status(500).json({ error: 'Failed to load messages' });
    }
  });

  // ✉️ Public/Logged-in: submit a message
  router.post('/', async (req, res) => {
    try {
      const loggedInUser = norm(req.cookies?.skyUser, 120);
      const isLoggedIn = !!loggedInUser;

      const body = req.body || {};
      const fullName = norm(isLoggedIn ? (body.fullName || loggedInUser) : body.fullName, MAX.fullName);
      const company = norm(body.company, MAX.company);
      const emailRaw = isLoggedIn ? (body.email || `${loggedInUser}@example.com`) : body.email;
      const email = norm(emailRaw, MAX.email);
      const phone = norm(body.phone, MAX.phone);
      const preferred = norm(body.preferred, MAX.preferred);
      const budget = norm(body.budget, MAX.budget);
      const subject = norm(body.subject || '', MAX.subject);
      const message = norm(body.message, MAX.message, { allowNewlines: true });

      // Validation rules
      if (!isLoggedIn) {
        if (!fullName || !email || !message) {
          return res.status(400).json({ error: 'Full name, email and message are required.' });
        }
        if (!emailRegex.test(email)) {
          return res.status(400).json({ error: 'Invalid email address.' });
        }
      } else {
        if (!message) {
          return res.status(400).json({ error: 'Message is required.' });
        }
        // If logged-in provided an email, sanity check it (optional)
        if (email && !emailRegex.test(email)) {
          return res.status(400).json({ error: 'Invalid email address.' });
        }
      }

      const clean = {
        id: genId(),
        fullName,
        company,
        email,
        phone,
        preferred,
        budget,
        subject,
        message,
        createdAt: toIso(),
        byUser: isLoggedIn ? loggedInUser : null,
      };

      const all = await loadJSON('messages.json', []);
      all.push(clean);
      await saveJSON('messages.json', all);

      return res.status(201).json(clean);
    } catch (err) {
      console.error('POST /api/contact error:', err);
      return res.status(500).json({ error: 'Failed to send message' });
    }
  });

  // 🗑️ Admin: delete a message
  router.delete('/:id', async (req, res) => {
    try {
      if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });

      const id = norm(req.params.id, 200);
      const all = await loadJSON('messages.json', []);
      const next = all.filter((m) => String(m.id) !== id);

      if (next.length === all.length) {
        return res.status(404).json({ error: 'Not found' });
      }

      await saveJSON('messages.json', next);
      return res.json({ ok: true });
    } catch (err) {
      console.error('DELETE /api/contact/:id error:', err);
      return res.status(500).json({ error: 'Failed to delete message' });
    }
  });

  return router;
};
