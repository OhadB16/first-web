// ✅ login.js (server/routes/login.js)
const express = require('express');

module.exports = (users, activityLog) => {
  const router = express.Router();

  router.post('/', (req, res) => {
    const { username, password, rememberMe } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const normalized = String(username).toLowerCase().trim();

    // חיפוש משתמש תואם (שם משתמש לא רגיש לאותיות גדולות/קטנות)
    const user = users.find(
      u => String(u.username).toLowerCase().trim() === normalized && u.password === password
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // ✅ זמן חיים לעוגיות: 12 ימים אם rememberMe=true, אחרת 30 דקות
    const maxAge = rememberMe
      ? 12 * 24 * 60 * 60 * 1000   // 12 days
      : 30 * 60 * 1000;            // 30 minutes

    // ✅ שמירת עוגיות לזיהוי המשתמש:
    // skyUser — כפי שביקשת (lowercase, לא httpOnly כדי שה-frontend יקרא במקרה הצורך)
    res.cookie('skyUser', normalized, {
      httpOnly: false,
      sameSite: 'Lax',
      maxAge
    });

    // username — נוסיף גם עוגייה עם שם המשתמש המקורי (נוח לשרת/טסטים)
    res.cookie('username', user.username, {
      httpOnly: true,
      sameSite: 'Lax',
      maxAge
    });

    // ✅ לוג פעילות
    activityLog.push({
      username: user.username,
      activity: 'login',
      datetime: new Date().toISOString()
    });

    // ✅ מחזירים את המשתמש ללא הסיסמה
    const { password: _pw, ...safeUser } = user;
    return res.status(200).json(safeUser);
  });

  return router;
};
