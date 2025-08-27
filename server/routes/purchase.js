// ✅ server/routes/purchase.js
const express = require('express');

function purchaseRoutes(purchases, carts, activityLog, saveAllData) {
  const router = express.Router();

  // Helper: is the path user the same as the logged-in user (or admin)?
  const isAuthorizedFor = (req, username) => {
    const httpOnlyUser = String(req.cookies?.username || '').toLowerCase();
    const uiUser       = String(req.cookies?.skyUser  || '').toLowerCase();
    const ident = httpOnlyUser || uiUser;
    return ident === 'admin' || ident === username;
  };

  // HEAD/OPTIONS (nice for clients & health checks)
  router.head('/:username', (_req, res) => res.status(200).end());
  router.options('/:username', (_req, res) =>
    res.set('Allow', 'GET, POST, OPTIONS, HEAD').status(204).end()
  );

  // POST /api/purchase/:username — Record a new purchase
  router.post('/:username', async (req, res, next) => {
    try {
      const username = String(req.params.username || '').toLowerCase().trim();
      const items = Array.isArray(req.body?.items) ? req.body.items : null;

      if (!username || !items) {
        return res.status(400).json({ error: 'Invalid username or items' });
      }
      if (!isAuthorizedFor(req, username)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      if (items.length === 0) {
        return res.status(400).json({ error: 'No items to purchase' });
      }

      // Normalize items
      const cleanedItems = items.map((item, idx) => {
        const rawUrl = String(item.imageUrl || item.image || '');
        const imageUrl = rawUrl.startsWith('blob:') ? '' : rawUrl;
        const priceNum = Number(item.price);
        return {
          id: item.id ?? idx,
          name: String(item.name || `Item #${idx + 1}`).trim().slice(0, 120),
          price: Number.isFinite(priceNum) && priceNum >= 0 ? priceNum : 0,
          imageUrl,
          description: String(item.description || '').trim().slice(0, 2000),
        };
      });

      const total = cleanedItems.reduce((s, it) => s + it.price, 0);
      const nowIso = new Date().toISOString();
      const purchaseId = 'ord_' + Date.now().toString(36);

      // ✅ Save purchase (write both datetime & timestamp for compatibility)
      const record = {
        id: purchaseId,
        username,
        items: cleanedItems,
        total,
        currency: 'USD',
        datetime: nowIso,            // ← matches /activity/sales expectation
        timestamp: nowIso,           // ← keep if any code reads 'timestamp'
      };
      purchases.push(record);

      // ✅ Clear user cart (case-insensitive)
      const userCartIndex = carts.findIndex(
        c => String(c.username || '').toLowerCase().trim() === username
      );
      if (userCartIndex !== -1) carts.splice(userCartIndex, 1);

      // ✅ Log activity (ISO for consistent sorting)
      activityLog.push({
        username,
        datetime: nowIso,
        activity: `Completed purchase of ${cleanedItems.length} item(s) — $${total.toLocaleString()}`,
      });

      await saveAllData();

      res
        .status(201)
        .set('Location', `/api/purchase/${encodeURIComponent(username)}#${purchaseId}`)
        .json(record);
    } catch (err) {
      console.error('❌ Failed to record purchase:', err);
      next(err);
    }
  });

  // GET /api/purchase/:username — fetch all purchases for a user (newest first)
  router.get('/:username', (req, res) => {
    const username = String(req.params.username || '').toLowerCase().trim();
    if (!username) return res.status(400).json({ error: 'Username is required' });

    // (Optional) you could enforce isAuthorizedFor here too, if needed:
    // if (!isAuthorizedFor(req, username)) return res.status(403).json({ error: 'Forbidden' });

    const userPurchases = purchases
      .filter(p => String(p.username || '').toLowerCase().trim() === username)
      .sort((a, b) => String(b.datetime || '').localeCompare(String(a.datetime || '')));

    res.status(200).json(userPurchases);
  });

  return router;
}

module.exports = purchaseRoutes;
