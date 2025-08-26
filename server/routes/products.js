const express = require('express');

module.exports = function productsRoutes(loadJSON, saveJSON) {
  const router = express.Router();

  const isAdmin = (req) => {
    const h = String(req.header('X-Username') || '').toLowerCase();
    const c = String((req.cookies && req.cookies.skyUser) || '').toLowerCase();
    return h === 'admin' || c === 'admin';
  };

  // helper: השוואת מזהים כטקסט כדי לתפוס גם 123 וגם "123"
  const sameId = (a, b) => String(a) === String(b);

  /**
   * GET /api/products
   * מקור אמת יחיד: products.json
   * אם ריק/לא קיים – נזריע (seed) מתוך jets.json פעם אחת ונשמור ל-products.json
   */
  router.get('/', async (req, res) => {
    try {
      let products = await loadJSON('products.json');
      if (!Array.isArray(products) || products.length === 0) {
        const seed = await loadJSON('jets.json'); // יכול להיות []
        products = Array.isArray(seed) ? seed : [];
        await saveJSON('products.json', products);
      }
      res.json(products);
    } catch (err) {
      console.error('GET /api/products error:', err);
      res.json([]); // לא להפיל את האפליקציה
    }
  });

  /**
   * POST /api/products  (אדמין)
   */
  router.post('/', async (req, res) => {
    try {
      if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });

      const { name, title, description, imageUrl, price } = req.body || {};
      const clean = {
        id: 'p' + Date.now(),
        name: String(name || title || '').trim().slice(0, 120),
        title: String(title || name || '').trim().slice(0, 120),
        description: String(description || '').trim().slice(0, 1000),
        imageUrl: String(imageUrl || '').trim().slice(0, 2000),
        price: Number(price) || 0
      };
      if (!clean.title) return res.status(400).json({ error: 'title/name required' });

      const list = await loadJSON('products.json');
      list.push(clean);
      await saveJSON('products.json', list);

      res.status(201).json(clean);
    } catch (err) {
      console.error('POST /api/products error:', err);
      res.status(500).json({ error: 'Failed to save product' });
    }
  });

  /**
   * DELETE /api/products/:id  (אדמין)
   * מוחק מכל הרשימה היחידה שלנו (products.json)
   */
  router.delete('/:id', async (req, res) => {
    try {
      if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });

      const id = req.params.id;
      const list = await loadJSON('products.json');
      const before = list.length;
      const afterList = list.filter(p => !sameId(p.id, id));

      if (afterList.length === before) {
        // לא נמצא – 404 כדי להיות שקופים
        return res.status(404).json({ error: 'Not found' });
      }

      await saveJSON('products.json', afterList);
      res.status(204).end();
    } catch (err) {
      console.error('DELETE /api/products/:id error:', err);
      res.status(500).json({ error: 'Failed to delete product' });
    }
  });

  return router;
};