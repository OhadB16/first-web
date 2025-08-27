// server/routes/products.js
const express = require('express');

/**
 * Products Routes
 * ---------------
 * Provides endpoints for fetching, creating, and deleting/hiding products.
 *
 * @param {Function} loadJSON - Utility for loading JSON from disk.
 * @param {Function} saveJSON - Utility for saving JSON to disk.
 * @returns {express.Router} Router with product endpoints.
 *
 * Routes:
 * - GET    /api/products       → Returns list of products (base + admin-added, minus hidden).
 * - POST   /api/products       → Creates a new product (Admin only).
 * - DELETE /api/products/:id   → Deletes (if admin-added) or hides (if base product) a product (Admin only).
 * - DELETE /api/products       → Not allowed (405).
 */
module.exports = function productsRoutes(loadJSON, saveJSON) {
  const router = express.Router();

  /**
   * Checks if the requester is an admin.
   * Looks at `X-Username` header or `skyUser` cookie.
   */
  const isAdmin = (req) => {
    const h = String(req.header('X-Username') || '').toLowerCase();
    const c = String((req.cookies && req.cookies.skyUser) || '').toLowerCase();
    return h === 'admin' || c === 'admin';
  };

  /**
   * GET /api/products
   * -----------------
   * Returns combined product list:
   * - Base products (`jets.json`)
   * - Extra/admin products (`products.json`)
   * - Excludes products listed in `hides.json`.
   */
  router.get('/', async (req, res) => {
    try {
      const base  = await loadJSON('jets.json');
      const extra = await loadJSON('products.json');
      const hides = await loadJSON('hides.json');

      const hiddenIds = new Set((Array.isArray(hides) ? hides : []).map(String));

      const list = [
        ...(Array.isArray(base)  ? base  : []),
        ...(Array.isArray(extra) ? extra : []),
      ].filter(p => !hiddenIds.has(String(p.id)));

      return res.json(list);
    } catch (err) {
      console.error('GET /api/products error:', err);
      return res.json([]); // Return empty list instead of crashing server
    }
  });

  /**
   * POST /api/products
   * ------------------
   * Creates a new product (Admin only).
   * - Expects { name, title, description, imageUrl, price }.
   * - Generates an id: "p" + timestamp.
   */
  router.post('/', async (req, res) => {
    try {
      if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });

      const { name, title, description, imageUrl, price } = req.body || {};

      const clean = {
        id: 'p' + Date.now(),
        name: String(name || title || '').trim().slice(0, 120),
        title: String(title || name || '').trim().slice(0, 120),
        // Do not slice description/imageUrl (important for base64 image)
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

  /**
   * DELETE /api/products/:id
   * ------------------------
   * Deletes or hides a product (Admin only).
   * - If product id starts with "p": remove from `products.json`.
   * - Else: add id to `hides.json` to hide base product.
   */
  router.delete('/:id', async (req, res) => {
    try {
      if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });

      const id = String(req.params.id || '');

      if (id.startsWith('p')) {
        // Admin-added product: delete from products.json
        const products = await loadJSON('products.json');
        const before = products.length;
        const after  = products.filter(p => String(p.id) !== id);

        if (after.length === before) {
          return res.status(404).json({ error: 'Not found' });
        }

        await saveJSON('products.json', after);
        return res.json({ ok: true, removedFrom: 'products.json', id });
      }

      // Base product: hide instead of delete
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

  /**
   * DELETE /api/products
   * --------------------
   * Collection-level DELETE is not allowed.
   */
  router.delete('/', (req, res) => {
    res.set('Allow', 'GET, POST'); // Hint to client about allowed methods
    return res.status(405).json({ error: 'Method Not Allowed' });
  });

  return router;
};
