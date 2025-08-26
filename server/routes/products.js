// server/routes/products.js
const express = require('express');

module.exports = function productsRoutes(loadJSON, saveJSON) {
  const router = express.Router();

  const isAdmin = (req) => {
    const h = String(req.header('X-Username') || '').toLowerCase();
    const c = String((req.cookies && req.cookies.skyUser) || '').toLowerCase();
    return h === 'admin' || c === 'admin';
  };

  // GET /api/products — בסיס + תוספות אדמין פחות מוחבאים
  router.get('/', async (req, res) => {
    try {
      const base  = await loadJSON('jets.json');      // []
      const extra = await loadJSON('products.json');  // []
      const hides = await loadJSON('hides.json');     // [] (רשימת IDs)

      const hiddenIds = new Set((Array.isArray(hides) ? hides : []).map(String));

      const list = [
        ...(Array.isArray(base)  ? base  : []),
        ...(Array.isArray(extra) ? extra : []),
      ].filter(p => !hiddenIds.has(String(p.id)));

      return res.json(list);
    } catch (err) {
      console.error('GET /api/products error:', err);
      return res.json([]); // אל תפיל את השרת — החזר רשימה ריקה
    }
  });

  // POST /api/products — יצירת מוצר חדש (Admin בלבד)
  router.post('/', async (req, res) => {
    try {
      if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });

      const { name, title, description, imageUrl, price } = req.body || {};

      const clean = {
        id: 'p' + Date.now(),
        name: String(name || title || '').trim().slice(0, 120),
        title: String(title || name || '').trim().slice(0, 120),
        // בלי slice כדי לא לחתוך base64 ארוך — ההגבלה ברמת השרת (5MB) מטופלת ב-server.js
        description: String(description || '').trim(),
        imageUrl: String(imageUrl || '').trim(),
        price: Number.isFinite(Number(price)) ? Number(price) : 0
      };

      if (!clean.title) {
        return res.status(400).json({ error: 'title/name required' });
      }

      const existing = await loadJSON('products.json');
      existing.push(clean);
      await saveJSON('products.json', existing);

      return res.status(201).json(clean);
    } catch (err) {
      console.error('POST /api/products error:', err);
      return res.status(500).json({ error: 'Failed to save product' });
    }
  });

  // DELETE /api/products/:id — מחיקה (למוצר אדמין) או הסתרה (למוצרי בסיס)
  router.delete('/:id', async (req, res) => {
    try {
      if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });

      const id = String(req.params.id || '');

      if (id.startsWith('p')) {
        // מוצר שהאדמין הוסיף — מוחקים מ-products.json
        const products = await loadJSON('products.json');
        const before = products.length;
        const after  = products.filter(p => String(p.id) !== id);

        if (after.length === before) {
          return res.status(404).json({ error: 'Not found' });
        }

        await saveJSON('products.json', after);
        return res.json({ ok: true, removedFrom: 'products.json', id });
      }

      // מוצר בסיס — נוסיף ל-hides.json כדי להסתיר מהתצוגה
      const hides = await loadJSON('hides.json');
      const set   = new Set((Array.isArray(hides) ? hides : []).map(String));
      set.add(id);
      await saveJSON('hides.json', Array.from(set));

      return res.json({ ok: true, hiddenIn: 'hides.json', id });
    } catch (err) {
      console.error('DELETE /api/products/:id error:', err);
      return res.status(500).json({ error: 'Failed to delete/hide product' });
    }
  });

  // ❌ DELETE /api/products (ללא מזהה) — לא מותר: מחזירים 405
  router.delete('/', (req, res) => {
    return res.status(405).json({ error: 'Method Not Allowed' });
  });
  // ❌ Collection-level DELETE is not allowed (return 405)
router.delete('/', (req, res) => {
  res.set('Allow', 'GET, POST');           // רמז ללקוח אילו שיטות מותרות על האוסף
  return res.status(405).json({ error: 'Method Not Allowed' });
});


  return router;
};
