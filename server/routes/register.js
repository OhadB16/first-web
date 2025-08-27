// ✅ register.js (server/routes/register.js)
const express = require('express');

/**
 * Register Routes
 * ---------------
 * Handles user registration.
 *
 * @param {Array} users - In-memory store of user accounts.
 * @param {Array} activityLog - Activity log for tracking events.
 * @param {Function} saveAllData - Persists all in-memory data to disk.
 * @returns {express.Router} Express router with register endpoint.
 *
 * Routes:
 * - POST /api/register → Register a new user, log the activity, and set a cookie.
 */
module.exports = (users, activityLog, saveAllData) => {
  const router = express.Router();

  /**
   * POST /api/register
   * ------------------
   * Registers a new user account.
   * - Requires `username`, `password`, and `email`.
   * - Prevents reserved username "admin".
   * - Rejects duplicate usernames.
   * - Adds the new user to `users` and logs the activity.
   * - Persists changes using `saveAllData`.
   * - Sets a cookie `skyUser` (7-day lifetime).
   * - Returns the new user object without the password.
   */
  router.post('/', async (req, res) => {
    const { username, password, email } = req.body;

    // Required fields check
    if (!username || !password || !email) {
      return res.status(400).json({ error: 'Username, password, and email are required' });
    }

    const normalizedUsername = username.toLowerCase().trim();
    console.log('Trying to register:', normalizedUsername);
    console.log('Current users:', users.map(u => u.username));

    // Prevent reserved "admin"
    if (normalizedUsername === 'admin') {
      return res.status(403).json({ error: 'The username "admin" is reserved' });
    }

    // Prevent duplicate users
    if (users.find(u => u.username.toLowerCase().trim() === normalizedUsername)) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Create new user record
    const newUser = {
      username: normalizedUsername,
      password,
      email: email.trim()
    };

    users.push(newUser);

    // Log registration activity
    activityLog.push({
      username: normalizedUsername,
      activity: 'register',
      datetime: new Date().toISOString()
    });

    await saveAllData();

    // Set cookie with username (7 days lifetime)
    res.cookie('skyUser', normalizedUsername, {
      httpOnly: false,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'Lax'
    });

    // Return user object without password
    const userWithoutPassword = { ...newUser };
    delete userWithoutPassword.password;
    res.status(201).json(userWithoutPassword);
  });

  return router;
};
