// src/pages/Register.jsx
import React, { useMemo, useState } from 'react';
import './Register.css';
import Logo from '../components/Logo';

/**
 * API base URL:
 * - Prefer Vite's VITE_API_BASE_URL or CRA's REACT_APP_API_BASE_URL
 * - Fallback to localhost for local dev
 */
const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_API_BASE_URL) ||
  (typeof process !== 'undefined' && process?.env?.REACT_APP_API_BASE_URL) ||
  'http://localhost:3001';

/**
 * Minimal email format check. (Server still validates!)
 */
const isEmailLike = (v) => /\S+@\S+\.\S+/.test(String(v || '').trim());

/**
 * Password strength guard:
 * - at least 8 chars
 * - at least one uppercase
 * - at least one digit
 * (You can expand this to include symbols if desired)
 */
const isPasswordStrong = (pass) =>
  String(pass || '').length >= 8 && /[A-Z]/.test(pass) && /[0-9]/.test(pass);

/**
 * Reserved usernames you don't want users to pick.
 * You can expand this list as your app grows.
 */
const RESERVED_USERNAMES = new Set(['admin']);

/**
 * Register component
 * - Handles client-side validation
 * - Calls /api/register then /api/login (to set proper cookies)
 * - Emits onLogin on success
 */
function Register({ onLogin, onShowLogin }) {
  // --- State ---------------------------------------------------------------
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({});     // field-specific errors
  const [formError, setFormError] = useState(''); // top-level (non-field) error
  const [notice, setNotice] = useState('');     // success message
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derived hint: show password strength feedback while typing
  const pwdStrengthHint = useMemo(() => {
    if (!form.password) return '';
    return isPasswordStrong(form.password)
      ? 'Strong password ✓'
      : 'Must be ≥8 chars, include an uppercase & a number';
  }, [form.password]);

  // --- Handlers ------------------------------------------------------------

  /**
   * Unified change handler for inputs & checkbox.
   * Clears inline errors as the user edits.
   */
  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;

    if (name === 'rememberMe' && type === 'checkbox') {
      setRememberMe(checked);
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }

    if (Object.keys(errors).length) setErrors({});
    if (formError) setFormError('');
    if (notice) setNotice('');
  };

  /**
   * Client-side validation
   * Returns true when valid; sets `errors` otherwise.
   */
  const validate = () => {
    const v = {
      username: String(form.username || '').trim(),
      email: String(form.email || '').trim(),
      password: String(form.password || ''),
      confirmPassword: String(form.confirmPassword || ''),
    };

    const newErrors = {};

    if (!v.username) {
      newErrors.username = 'Username is required.';
    } else if (RESERVED_USERNAMES.has(v.username.toLowerCase())) {
      newErrors.username = 'This username is reserved.';
    }

    if (!v.email) {
      newErrors.email = 'Email is required.';
    } else if (!isEmailLike(v.email)) {
      newErrors.email = 'Please enter a valid email.';
    }

    if (!v.password) {
      newErrors.password = 'Password is required.';
    } else if (!isPasswordStrong(v.password)) {
      newErrors.password =
        'Password must be ≥8 chars, include an uppercase letter & a number.';
    }

    if (v.password !== v.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Submit:
   * 1) Register user
   * 2) Immediately login (to set cookies with proper maxAge / rememberMe)
   * 3) Emit onLogin
   * Notes:
   * - We show inline messages instead of alert() for better UX & a11y.
   * - Server remains the source of truth for validation & auth.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setNotice('');

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      // (1) Register
      const regRes = await fetch(`${API_BASE}/api/register`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username,
          password: form.password,
          email: form.email,
        }),
      });
      const regData = await regRes.json().catch(() => ({}));
      if (!regRes.ok) {
        setFormError(regData.error || 'Registration failed.');
        return;
      }

      // (2) Login to set cookies (honoring rememberMe)
      const loginRes = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        credentials: 'include', // required for cookie handling
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username, // server API accepts username or email via "username"
          password: form.password,
          rememberMe,
        }),
      });
      const loginData = await loginRes.json().catch(() => ({}));
      if (!loginRes.ok) {
        setFormError(loginData.error || 'Login after registration failed.');
        return;
      }

      // (3) Success — server already set cookies.
      onLogin?.({ username: loginData.username, email: loginData.email });
      setNotice('Registration successful! You are now logged in.');
      // Optionally clear sensitive fields (keep username/email visible)
      setForm((prev) => ({ ...prev, password: '', confirmPassword: '' }));
    } catch (err) {
      console.error('Registration error:', err);
      setFormError('Registration failed (network error).');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Render --------------------------------------------------------------
  return (
    <div className="register-page">
      <div className="register-form">
        <Logo />
        <h2>Create an Account</h2>

        {/* Top-level notices */}
        {formError && (
          <p
            className="error"
            role="alert"
            aria-live="polite"
            style={{ textAlign: 'center', marginBottom: 12 }}
          >
            {formError}
          </p>
        )}
        {notice && (
          <p
            role="status"
            aria-live="polite"
            style={{ textAlign: 'center', marginBottom: 12, color: '#16a34a' }}
          >
            {notice}
          </p>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Username -------------------------------------------------------- */}
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              value={form.username}
              onChange={handleChange}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              required
              aria-invalid={!!errors.username}
              aria-describedby={errors.username ? 'err-username' : undefined}
            />
            {errors.username && (
              <p id="err-username" className="error">{errors.username}</p>
            )}
          </div>

          {/* Email ----------------------------------------------------------- */}
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              required
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'err-email' : undefined}
            />
            {errors.email && (
              <p id="err-email" className="error">{errors.email}</p>
            )}
          </div>

          {/* Password -------------------------------------------------------- */}
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
              required
              aria-invalid={!!errors.password}
              aria-describedby={
                errors.password
                  ? 'err-password'
                  : pwdStrengthHint ? 'hint-password' : undefined
              }
            />
            {errors.password ? (
              <p id="err-password" className="error">{errors.password}</p>
            ) : pwdStrengthHint ? (
              <p id="hint-password" style={{ fontSize: 12, color: '#555' }}>
                {pwdStrengthHint}
              </p>
            ) : null}
          </div>

          {/* Confirm Password ------------------------------------------------ */}
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
              required
              aria-invalid={!!errors.confirmPassword}
              aria-describedby={errors.confirmPassword ? 'err-confirm' : undefined}
            />
            {errors.confirmPassword && (
              <p id="err-confirm" className="error">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Remember Me ----------------------------------------------------- */}
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

          {/* Actions --------------------------------------------------------- */}
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Registering…' : 'Register'}
          </button>

          {/* Switch to Login ------------------------------------------------- */}
          <p className="switch-link">
            Already have an account?{' '}
            <button
              type="button"
              className="link-button"
              onClick={onShowLogin}
              disabled={isSubmitting}
            >
              Login here
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Register;
