import React, { useState } from 'react';
import './AlreadyReg.css';
import Logo from '../components/Logo';

// (אופציונלי לפיתוח בלבד) — fallback כאשר השרת לא זמין
const DEV_ADMIN = {
  username: 'admin',
  email: 'admin@example.com',
  password: 'admin',
};

function AlreadyReg({ onLogin, onBackToRegister }) {
  // --- State ---
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Handlers ---
  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    if (name === 'rememberMe' && type === 'checkbox') {
      setRememberMe(checked);
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
    if (error) setError('');
  };

  const adminDevFallback = () => {
    // קיצור־דרך ל־dev בלבד אם ה־backend לא נגיש
    const expires = new Date();
    if (rememberMe) expires.setDate(expires.getDate() + 12); // 12 ימים
    else expires.setTime(expires.getTime() + 30 * 60000);    // 30 דק'
    document.cookie = `skyUser=${encodeURIComponent(
      DEV_ADMIN.username
    )}; expires=${expires.toUTCString()}; path=/`;

    onLogin({ username: DEV_ADMIN.username, email: DEV_ADMIN.email });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { identifier, password } = form;

    if (!identifier || !password) {
      setError('Both fields are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      // תמיד ניגשים לשרת — הוא כבר תומך בזיהוי לפי username או email
      const res = await fetch('http://localhost:3001/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // נחוץ לעוגיות
        body: JSON.stringify({ username: identifier, password, rememberMe }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // שגיאה כללית — אל תחשוף איזה שדה שגוי
        setError(data.error || 'Login failed');
        return;
      }

      // אין צורך לכתוב document.cookie ידנית — השרת כבר שם skyUser + username
      onLogin({ username: data.username, email: data.email });
    } catch (err) {
      console.error('Login network error:', err);

      // Fallback dev בלבד — במקרה שהשרת למטה ורוצים לבדוק לוקאלית
      const isAdminCreds =
        (form.identifier || '').toLowerCase().trim() === DEV_ADMIN.username &&
        form.password === DEV_ADMIN.password;

      if (isAdminCreds) {
        adminDevFallback();
      } else {
        setError('Network error. Try again later.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- UI ---
  return (
    <div className="alreadyreg-page">
      <div className="login-form">
        <Logo />
        <form onSubmit={handleSubmit} noValidate>
          {/* Identifier */}
          <div className="form-group">
            <label htmlFor="identifier">Username or Email</label>
            <input
              id="identifier"
              name="identifier"
              type="text"
              className="input"
              placeholder="admin or your email"
              value={form.identifier}
              onChange={handleChange}
              autoComplete="username email"
              autoCapitalize="none"
              autoCorrect="off"
              required
              autoFocus
              aria-invalid={!!error && !form.identifier}
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              className="input"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
              required
              aria-invalid={!!error && !form.password}
            />
          </div>

          {/* Remember Me */}
          <div className="form-group">
            <label className="checkbox-label">
              <input
                name="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={handleChange}
              />
              Remember me
            </label>
          </div>

          {/* Error */}
          {error && <p className="error" role="alert">{error}</p>}

          {/* Actions */}
          <button
            type="submit"
            className="primary-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Logging in…' : 'Log In'}
          </button>

          <p className="switch-link">
            Don’t have an account?{' '}
            <button
              type="button"
              className="link-button primary-button"
              onClick={onBackToRegister}
              disabled={isSubmitting}
            >
              Register here
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}

export default AlreadyReg;
