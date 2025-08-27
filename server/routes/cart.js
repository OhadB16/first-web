// server/routes/cart.js
// Cart API (per-user cart stored server-side)
//
// Endpoints:
//   POST   /api/cart/:username        -> replace entire cart for :username
//   GET    /api/cart/:username        -> fetch cart items for :username
//   DELETE /api/cart/:username/:jetId -> remove a single item (one unit) by id
//
// Notes:
// • Public contract unchanged.
// • Items are normalized (ids, price, imageUrl) to avoid bad inputs.
// • Activity entries use ISO time for reliable server-side parsing.

const express = require('express');

module.exports = (carts, activityLog, saveAllData) => {
  const router = express.Router();

  /* ------------------------------ Helpers ------------------------------- */

  const nowIso = () => new Date().toISOString();

  /** Return the user's cart entry, creating it if missing. */
  const getOrCreateCart = (username) => {
    let entry = carts.find((c) => c.username === username);
    if (!entry) {
      entry = { username, items: [] };
      carts.push(entry);
    }
    return entry;
  };

  /** Normalize/clean a single item coming from the client. */
  const normalizeItem = (item) => {
    const idNum = Number(item?.id);
    const id = Number.isFinite(idNum) ? idNum : String(item?.id ?? '').trim();

    const rawUrl = String(item?.imageUrl || item?.image || '').trim();
    const imageUrl =
      rawUrl.startsWith('blob:')
        ? '' // never persist blob: URLs
        : rawUrl.startsWith('data:image') || /^https?:\/\//i.test(rawUrl)
        ? rawUrl
        : '';

    const priceNum = Number(item?.price);

    return {
      id,
      name: String(item?.name ?? '').trim(),
      price: Number.isFinite(priceNum) ? priceNum : 0,
      imageUrl,
      description: String(item?.description ?? 'No description available').trim(),
    };
  };

  /* -------------------------------- Routes ------------------------------ */

  // POST: Save full cart (replace all items)
  router.post('/:username', async (req, res) => {
    const username = String(req.params.username || '').trim();
    const items = req.body?.items;

    if (!username || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Invalid input' });
    }

    const cleanedItems = items.map(normalizeItem);

    try {
      const entry = getOrCreateCart(username);
      entry.items = cleanedItems;

      // Optional activity line (ISO for easier parsing downstream)
      if (Array.isArray(activityLog)) {
        activityLog.push({
          datetime: nowIso(),
          username,
          activity: `Saved cart (${cleanedItems.length} item${cleanedItems.length === 1 ? '' : 's'})`,
        });
      }

      await saveAllData();
      return res.status(200).json({ message: 'Cart saved', items: entry.items });
    } catch (err) {
      console.error('POST /cart error:', err);
      return res.status(500).json({ error: 'Failed to save cart' });
    }
  });

  // GET: Fetch cart items for user
  router.get('/:username', (req, res) => {
    const username = String(req.params.username || '').trim();
    if (!username) return res.status(400).json({ error: 'Username required' });
    const cart = carts.find((c) => c.username === username);
    return res.status(200).json(cart?.items || []);
  });

  // DELETE: Remove a single item from user's cart
  router.delete('/:username/:jetId', async (req, res) => {
    const username = String(req.params.username || '').trim();
    const jetIdRaw = String(req.params.jetId || '').trim();

    if (!username || !jetIdRaw) {
      return res.status(400).json({ error: 'Username and jetId required' });
    }

    const cart = carts.find((c) => c.username === username);
    if (!cart) return res.status(404).json({ error: 'Cart not found' });

    // Compare as strings to tolerate numeric/string ids consistently
    const index = cart.items.findIndex((item) => String(item.id) === jetIdRaw);
    if (index === -1) return res.status(404).json({ error: 'Item not found in cart' });

    const [removed] = cart.items.splice(index, 1);

    try {
      if (Array.isArray(activityLog) && removed) {
        activityLog.push({
          datetime: nowIso(),
          username,
          activity: `Removed from cart: ${removed.name}`,
        });
      }
      await saveAllData();
      return res.status(200).json({ message: 'Item removed', updatedCart: cart.items });
    } catch (err) {
      console.error('DELETE /cart error:', err);
      return res.status(500).json({ error: 'Failed to persist changes' });
    }
  });

  return router;
};
