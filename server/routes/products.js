// server/routes/products.js
const express = require('express');

module.exports = function productsRoutes(loadJSON, saveJSON) {
  const router = express.Router();

  const isAdmin = (req) => {
    const h = String(req.header('X-Username') || '').toLowerCase();
    const c = String((req.cookies && req.cookies.skyUser) || '').toLowerCase();
    return h === 'admin' || c === 'admin';
  };

  // GET /api/products — בסיס + תוספות אדמין פחות חבויים
  router.get('/', async (req, res) => {
    try {
      const base   = await loadJSON('jets.json');       // []
      const extra  = await loadJSON('products.json');   // []
      const hides  = await loadJSON('hides.json');      // [] של IDs שמוחבאים

      const hiddenIds = new Set((Array.isArray(hides) ? hides : []).map(String));
      const list = [
        ...(Array.isArray(base) ? base : []),
        ...(Array.isArray(extra) ? extra : []),
      ].filter(p => !hiddenIds.has(String(p.id)));

      res.json(list);
    } catch (err) {
      console.error('GET /api/products error:', err);
      res.json([]);
    }
  });

  // POST /api/products — יצירת מוצר חדש (אדמין)
  router.post('/', async (req, res) => {
    try {
      if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });

      const { name, title, description, imageUrl, price } = req.body || {};
      const clean = {
        id: 'p' + Date.now(),
        name: String(name || title || '').trim().slice(0, 120),
        title: String(title || name || '').trim().slice(0, 120),
        description: String(description || '').trim(),     // ❌ בלי slice
        imageUrl: String(imageUrl || '').trim(),          // ❌ בלי slice — חשוב לתמונה!
        price: Number(price) || 0
      };
      if (!clean.title) return res.status(400).json({ error: 'title/name required' });

      const existing = await loadJSON('products.json');
      existing.push(clean);
      await saveJSON('products.json', existing);

      res.status(201).json(clean);
    } catch (err) {
      console.error('POST /api/products error:', err);
      res.status(500).json({ error: 'Failed to save product' });
    }
  });

  // DELETE /api/products/:id — מוחק מוצר אדמין או “מחביא” מוצר בסיס
  router.delete('/:id', async (req, res) => {
    try {
      if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });

      const id = String(req.params.id);
      if (id.startsWith('p')) {
        // מוצר אדמין – מחיקה מ־products.json
        const products = await loadJSON('products.json');
        const before = products.length;
        const after = products.filter(p => String(p.id) !== id);
        if (after.length === before) return res.status(404).json({ error: 'Not found' });
        await saveJSON('products.json', after);
        return res.json({ ok: true, removedFrom: 'products.json', id });
      } else {
        // מוצר בסיס – הוספה ל־hides.json
        const hides = await loadJSON('hides.json');
        const set = new Set((Array.isArray(hides) ? hides : []).map(String));
        set.add(id);
        await saveJSON('hides.json', Array.from(set));
        return res.json({ ok: true, hiddenIn: 'hides.json', id });
      }
    } catch (err) {
      console.error('DELETE /api/products/:id error:', err);
      res.status(500).json({ error: 'Failed to delete/hide product' });
    }
  });

  return router;
};
