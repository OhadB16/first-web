// server/routes/products.js
const express = require('express');

/**
 * Products API
 *
 * - GET    /api/products          → merged list: jets.json + products.json minus hides.json
 * - POST   /api/products          → (admin) create a product, id = 'p' + timestamp
 * - DELETE /api/products/:id      → (admin) if 'p*' → remove from products.json; else → add to hides.json
 * - DELETE /api/products          → 405 (collection delete not allowed)
 * - OPTIONS/HEAD supported
 *
 * Trust model for admin:
 *   Prefer the httpOnly cookie `username` if present (set by /api/login).
 *   Fallback to `skyUser` (UI cookie) only if the httpOnly cookie is absent.
 *   Header is the weakest and only used when no cookies exist.
 */
module.exports = function productsRoutes(loadJSON, saveJSON) {
  const router = express.Router();

  const isAdmin = (req) => {
    const cookieStrong = String(req.cookies?.username || '').toLowerCase();  // httpOnly
    const cookieUi     = String(req.cookies?.skyUser  || '').toLowerCase();  // UI cookie
    const hdr          = String(req.header('X-Username') || '').toLowerCase();

    // trust order: httpOnly cookie → UI cookie → header
    const ident = cookieStrong || cookieUi || hdr;
    return ident === 'admin';
  };

  // Utility: safe read of array JSON
  const readArray = async (file) => {
    const v = await loadJSON(file, []);
    return Array.isArray(v) ? v : [];
  };

  // HEAD/OPTIONS for nicer clients
  router.head('/', (_req, res) => res.status(200).end());
  router.options('/', (_req, res) => res.set('Allow', 'GET, POST, OPTIONS, HEAD').status(204).end());

  // GET /api/products — base + admin extras minus hides
  router.get('/', async (_req, res) => {
    try {
      const base  = await readArray('jets.json');
      const extra = await readArray('products.json');
      const hides = await readArray('hides.json');

      const hiddenIds = new Set(hides.map(String));
      const list = [...base, ...extra].filter(p => !hiddenIds.has(String(p.id)));

      return res.json(list);
    } catch (err) {
      console.error('GET /api/products error:', err);
      return res.json([]); // do not crash the app
    }
  });

  // POST /api/products — create (Admin only)
  router.post('/', async (req, res) => {
    try {
      if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });

      const { name, title, description, imageUrl, price } = req.body || {};

      // Minimal normalization/validation (server.js enforces body size)
      const clean = {
        id: 'p' + Date.now().toString(36), // compact & unique-enough
        name: String(name || title || '').trim().slice(0, 120),
        title: String(title || name || '').trim().slice(0, 120),
        description: String(description || '').trim(),  // keep full text (no slice on base64 comment)
        imageUrl: String(imageUrl || '').trim(),
        price: Number.isFinite(Number(price)) ? Number(price) : 0,
      };

      if (!clean.title) {
        return res.status(400).json({ error: 'title/name required' });
      }

      const products = await readArray('products.json');
      products.push(clean);
      await saveJSON('products.json', products);

      return res.status(201).json(clean);
    } catch (err) {
      console.error('POST /api/products error:', err);
      return res.status(500).json({ error: 'Failed to save product' });
    }
  });

  // DELETE /api/products/:id — delete (admin product) or hide (base product)
  router.delete('/:id', async (req, res) => {
    try {
      if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });

      const id = String(req.params.id || '');

      if (id.startsWith('p')) {
        // Admin-created → remove from products.json
        const products = await readArray('products.json');
        const after = products.filter(p => String(p.id) !== id);
        if (after.length === products.length) {
          return res.status(404).json({ error: 'Not found' });
        }
        await saveJSON('products.json', after);
        return res.json({ ok: true, removedFrom: 'products.json', id });
      }

      // Base product → add to hides.json
      const hides = await readArray('hides.json');
      const set = new Set(hides.map(String));
      set.add(id);
      await saveJSON('hides.json', Array.from(set));
      return res.json({ ok: true, hiddenIn: 'hides.json', id });
    } catch (err) {
      console.error('DELETE /api/products/:id error:', err);
      return res.status(500).json({ error: 'Failed to delete/hide product' });
    }
  });

  // DELETE /api/products — 405 for collection-level delete (single definition)
  router.delete('/', (req, res) => {
    res.set('Allow', 'GET, POST, OPTIONS, HEAD');
    return res.status(405).json({ error: 'Method Not Allowed' });
  });

  return router;
};
