// ✅ server/routes/purchase.js
const express = require('express');

/**
 * Purchase Routes
 * ---------------
 * Handles recording purchases and retrieving purchase history for users.
 *
 * @param {Array} purchases - In-memory store for purchase records.
 * @param {Array} carts - In-memory store for carts (to clear after purchase).
 * @param {Array} activityLog - Activity log array for tracking actions.
 * @param {Function} saveAllData - Function to persist all in-memory data to disk.
 * @returns {express.Router} Express router with purchase routes.
 *
 * Routes:
 * - POST /api/purchase/:username → Record a new purchase for a user, clear their cart, log activity.
 * - GET  /api/purchase/:username → Retrieve all purchase records for a user.
 */
function purchaseRoutes(purchases, carts, activityLog, saveAllData) {
  const router = express.Router();

  /**
   * POST /api/purchase/:username
   * ----------------------------
   * Record a new purchase for a given user.
   * - Validates `username` and `items` from the request.
   * - Cleans image URLs (removes `blob:` URLs).
   * - Saves purchase into `purchases`.
   * - Clears user’s cart.
   * - Logs the activity.
   */
  router.post('/:username', async (req, res, next) => {
    try {
      const rawUsername = req.params.username;
      const username = rawUsername?.toLowerCase().trim(); // normalize
      const items = req.body.items;

      if (!username || !Array.isArray(items)) {
        return res.status(400).json({ error: 'Invalid username or items' });
      }

      console.log('🧾 Recording purchase for user:', username);

      const cleanedItems = items.map(item => {
        const rawUrl = String(item.imageUrl || item.image || '');
        const imageUrl = rawUrl.startsWith('blob:') ? '' : rawUrl;

        return {
          id: item.id,
          name: item.name,
          price: item.price,
          imageUrl,
          description: item.description || 'No description available'
        };
      });

      console.log('🧾 Final cleaned items for purchase:', cleanedItems);

      // Save purchase record
      purchases.push({
        username,
        items: cleanedItems,
        timestamp: new Date().toISOString()
      });

      // Clear user's cart after purchase
      const userCartIndex = carts.findIndex(c => c.username.toLowerCase().trim() === username);
      if (userCartIndex !== -1) carts.splice(userCartIndex, 1);

      // Log activity
      activityLog.push({
        username,
        datetime: new Date().toLocaleString(),
        activity: `Completed purchase of ${cleanedItems.length} items`
      });

      await saveAllData();
      res.status(201).json({ message: 'Purchase recorded successfully' });
    } catch (err) {
      console.error('❌ Failed to record purchase:', err);
      next(err);
    }
  });

  /**
   * GET /api/purchase/:username
   * ---------------------------
   * Retrieve all purchase records for a given user.
   */
  router.get('/:username', (req, res) => {
    const rawUsername = req.params.username;
    const username = rawUsername?.toLowerCase().trim(); // normalize

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const userPurchases = purchases.filter(
      p => p.username.toLowerCase().trim() === username
    );

    res.status(200).json(userPurchases);
  });

  return router;
}

module.exports = purchaseRoutes;
