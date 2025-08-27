// server/routes/me.js
const express = require('express');

/**
 * "Me" Routes
 * -----------
 * Provides an endpoint for fetching the currently logged-in user.
 *
 * @param {Array} users - Array of user objects.
 * @returns {express.Router} Router with "me" endpoint.
 *
 * Routes:
 * - GET /api/me
 *   → Determines the effective username from cookies, headers, or query.
 *   → Returns the user object (without password) if logged in.
 *   → Returns 401 if no valid user is found.
 */
module.exports = (users) => {
  const router = express.Router();

  /**
   * GET /api/me
   * -----------
   * Fetch the logged-in user's profile.
   *
   * Sources for identifying the user (in order of priority):
   * - Cookie: `username` (httpOnly, set by server)
   * - Cookie: `skyUser` (public, set by server)
   * - Header: `X-Username`
   * - Query: `username`
   *
   * Responds:
   * - 200 + user object (excluding password) if found.
   * - 401 if not logged in or user not found.
   */
  router.get('/', (req, res) => {
    const cookieUser = (req.cookies?.username || req.cookies?.skyUser || '').toString();
    const headerUser = (req.header('X-Username') || '').toString();
    const qUser      = (req.query?.username || '').toString();

    const effective = cookieUser || headerUser || qUser;
    if (!effective) return res.status(401).json({ error: 'Not logged in' });

    const user = users.find(u =>
      String(u.username).toLowerCase() === effective.toLowerCase()
    );
    if (!user) return res.status(401).json({ error: 'Not logged in' });

    const { password, ...safe } = user;
    return res.json(safe);
  });

  return router;
};
