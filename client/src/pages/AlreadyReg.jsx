// src/pages/AlreadyReg.jsx
// Login (AlreadyReg) — dev-friendly, a11y-focused, matches AlreadyReg.css tokens.

import React, { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import './AlreadyReg.css';
import Logo from '../components/Logo';

// -----------------------------
// Config & helpers
// -----------------------------
const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_API_BASE_URL) ||
  (typeof process !== 'undefined' && process?.env?.REACT_APP_API_BASE_URL) ||
  'http://localhost:3001';

const IS_DEV =
  ((typeof import.meta !== 'undefined' && import.meta?.env?.MODE) ||
    (typeof process !== 'undefined' && process?.env?.NODE_ENV) ||
    'production') !== 'production';

// Dev-only fallback (if backend is down)
const DEV_ADMIN = { username: 'admin', email: 'admin@example.com', password: 'admin' };

function AlreadyReg({ onLogin, onBackToRegister }) {
  // --- State ---
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refs for focus management
  const idRef = useRef(null);
  const passRef = useRef(null);
  const mounted = useRef(true);

  useEffect(() => () => { mounted.current = false; }, []);

  // --- Handlers ---
  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    if (name === 'rememberMe' && type === 'checkbox') {
      setRememberMe(checked);
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
    if (error) setError('');
  };

  const adminDevFallback = useCallback(() => {
    if (!IS_DEV) return;
    // Short cookie for dev UX; server sets real cookie in prod.
    const expires = new Date();
    if (rememberMe) expires.setDate(expires.getDate() + 12); // 12 days
    else expires.setTime(expires.getTime() + 30 * 60000);    // 30 min
    document.cookie = [
      `skyUser=${encodeURIComponent(DEV_ADMIN.username)}`,
      `expires=${expires.toUTCString()}`,
      'path=/',
      'SameSite=Lax',
    ].join('; ');
    onLogin({ username: DEV_ADMIN.username, email: DEV_ADMIN.email });
  }, [rememberMe, onLogin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const identifier = form.identifier.trim();
    const password = form.password;

    if (!identifier || !password) {
      setError('Both fields are required.');
      // Focus first missing field
      if (!identifier) idRef.current?.focus();
      else passRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    setError('');

    const ctrl = new AbortController();
    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // server manages cookies
        body: JSON.stringify({ username: identifier, password, rememberMe }),
        signal: ctrl.signal,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || 'Login failed');
        // Focus the identifier so users can fix it quickly
        idRef.current?.focus();
        return;
      }

      // Success — server already set cookie; notify app
      onLogin({ username: data.username, email: data.email });
      setForm({ identifier: '', password: '' });
      setRememberMe(false);
    } catch (err) {
      console.error('Login network error:', err);

      // Dev-only local bypass when backend is down
      const isAdminCreds =
        IS_DEV &&
        identifier.toLowerCase() === DEV_ADMIN.username &&
        password === DEV_ADMIN.password;

      if (isAdminCreds) {
        adminDevFallback();
      } else {
        setError('Network error. Try again later.');
      }
    } finally {
      if (mounted.current) setIsSubmitting(false);
    }
    return () => ctrl.abort();
  };

  // Autofocus identifier on mount
  useEffect(() => { idRef.current?.focus(); }, []);

  // --- UI ---
  return (
    <div className="alreadyreg-page">
      <div className="login-form" role="region" aria-labelledby="login-title">
        <Logo />
        <h2 id="login-title">Log In</h2>

        <form onSubmit={handleSubmit} noValidate aria-busy={isSubmitting}>
          {/* Identifier */}
          <div className="form-group">
            <label htmlFor="identifier">Username or Email</label>
            <input
              id="identifier"
              name="identifier"
              ref={idRef}
              type="text"
              className="input"
              placeholder="admin or your email"
              value={form.identifier}
              onChange={handleChange}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              required
              aria-invalid={!!error && !form.identifier}
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              ref={passRef}
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
              {' '}Remember me
            </label>
          </div>

          {/* Error (announce politely) */}
          {error && (
            <p className="error" role="alert" aria-live="polite">
              {error}
            </p>
          )}

          {/* Actions */}
          <button
            type="submit"
            className="primary-button"
            disabled={isSubmitting || !form.identifier || !form.password}
          >
            {isSubmitting ? 'Logging in…' : 'Log In'}
          </button>

          <p className="switch-link">
            Don’t have an account?{' '}
            <button
              type="button"
              className="link-button"
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

AlreadyReg.propTypes = {
  onLogin: PropTypes.func.isRequired,
  onBackToRegister: PropTypes.func.isRequired,
};

export default AlreadyReg;
