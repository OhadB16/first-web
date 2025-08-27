import React, { useState } from 'react';
import './AlreadyReg.css';
import Logo from '../components/Logo';

/**
 * DEV_ADMIN
 * ---------
 * Development-only fallback admin credentials (used if backend is unavailable).
 */
const DEV_ADMIN = {
  username: 'admin',
  email: 'admin@example.com',
  password: 'admin',
};

/**
 * AlreadyReg
 * ----------
 * Login page for already registered users.
 *
 * Props:
 * @param {(user: {username: string, email: string}) => void} onLogin - Callback on successful login.
 * @param {() => void} onBackToRegister - Callback to go back to registration page.
 *
 * Features:
 * - Accepts username/email and password for login.
 * - Supports "remember me" (cookie lifetime).
 * - Connects to backend `/api/login`.
 * - Displays error messages without revealing which field failed.
 * - Provides a dev-only fallback login if the backend is unreachable.
 */
function AlreadyReg({ onLogin, onBackToRegister }) {
  // --- State ---
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Handlers ---
  /**
   * handleChange
   * ------------
   * Updates form state and handles the "remember me" checkbox.
   */
  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    if (name === 'rememberMe' && type === 'checkbox') {
      setRememberMe(checked);
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
    if (error) setError('');
  };

  /**
   * adminDevFallback
   * ----------------
   * Local dev-only login fallback if backend is down.
   * Sets a cookie with admin credentials for testing.
   */
  const adminDevFallback = () => {
    const expires = new Date();
    if (rememberMe) expires.setDate(expires.getDate() + 12); // 12 days
    else expires.setTime(expires.getTime() + 30 * 60000);    // 30 minutes
    document.cookie = `skyUser=${encodeURIComponent(
      DEV_ADMIN.username
    )}; expires=${expires.toUTCString()}; path=/`;

    onLogin({ username: DEV_ADMIN.username, email: DEV_ADMIN.email });
  };

  /**
   * handleSubmit
   * ------------
   * Attempts to log in the user by posting to the server.
   * Falls back to dev credentials if the server is unreachable.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const { identifier, password } = form;

    if (!identifier || !password) {
      setError('Both fields are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('http://localhost:3001/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // required for cookies
        body: JSON.stringify({ username: identifier, password, rememberMe }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // Generic error message (do not expose which field is wrong)
        setError(data.error || 'Login failed');
        return;
      }

      // Server already sets cookie skyUser + username
      onLogin({ username: data.username, email: data.email });
    } catch (err) {
      console.error('Login network error:', err);

      // Dev-only fallback if server is down
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
