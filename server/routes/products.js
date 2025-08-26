// server/routes/products.js
const express = require('express');

module.exports = function productsRoutes(loadJSON, saveJSON) {
  const router = express.Router();

  const isAdmin = (req) => {
    const h = String(req.header('X-Username') || '').toLowerCase();
    const c = String((req.cookies && req.cookies.skyUser) || '').toLowerCase();
    return h === 'admin' || c === 'admin';
  };

  router.get('/', async (req, res) => {
    try {
      const base = await loadJSON('jets.json');
      const extra = await loadJSON('products.json');
      const list = [
        ...(Array.isArray(base) ? base : []),
        ...(Array.isArray(extra) ? extra : []),
      ];
      res.json(list);
    } catch (err) {
      console.error('GET /api/products error:', err);
      res.json([]);
    }
  });

  router.post('/', async (req, res) => {
    try {
      if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });

      const { name, title, description, imageUrl, price } = req.body || {};
      const clean = {
        id: 'p' + Date.now(),
        name: String(name || title || '').trim().slice(0, 120),
        title: String(title || name || '').trim().slice(0, 120),
        description: String(description || '').trim().slice(0, 1000),
        imageUrl: String(imageUrl || '').trim().slice(0, 1000),
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

  // ✅ מחיקה מתמידה של מוצר שאדמין הוסיף (products.json)
  router.delete('/:id', async (req, res) => {
    try {
      if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });

      const id = String(req.params.id);
      const existing = await loadJSON('products.json');
      const idx = existing.findIndex(p => String(p.id) === id);
      if (idx === -1) return res.status(404).json({ error: 'Not found' });

      const [removed] = existing.splice(idx, 1);
      await saveJSON('products.json', existing);
      res.json({ ok: true, removed });
    } catch (err) {
      console.error('DELETE /api/products/:id error:', err);
      res.status(500).json({ error: 'Failed to delete product' });
    }
  });

  return router;
};
