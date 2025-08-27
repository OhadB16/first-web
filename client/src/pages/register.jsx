import React, { useState } from 'react';
import './Register.css';
import Logo from '../components/Logo';

/**
 * Register
 * --------
 * Registration page that lets new users create an account.
 *
 * Props:
 * @param {(user: {username: string, email: string}) => void} onLogin - Callback triggered after successful registration + login.
 * @param {() => void} onShowLogin - Callback to switch to the login page.
 *
 * Behavior:
 * - Collects username, email, password, confirm password, and remember me.
 * - Validates input:
 *   - Username required, cannot be "admin".
 *   - Email required.
 *   - Password required, must be strong (≥8 chars, includes uppercase and number).
 *   - Passwords must match.
 * - Submits registration request to `/api/register`.
 * - If registration succeeds, immediately logs in the user via `/api/login` so that cookies are set.
 * - On success, calls onLogin with user info.
 */
function Register({ onLogin, onShowLogin }) {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * handleChange
   * ------------
   * Updates controlled form state and handles checkbox for rememberMe.
   */
  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    if (name === 'rememberMe' && type === 'checkbox') {
      setRememberMe(checked);
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
    if (Object.keys(errors).length) setErrors({});
  };

  /**
   * isPasswordStrong
   * ----------------
   * Simple password strength check.
   * @param {string} pass - Password candidate.
   * @returns {boolean} True if strong.
   */
  const isPasswordStrong = (pass) =>
    pass.length >= 8 && /[A-Z]/.test(pass) && /[0-9]/.test(pass);

  /**
   * validate
   * --------
   * Validates form inputs and sets error messages if invalid.
   * @returns {boolean} Whether the form is valid.
   */
  const validate = () => {
    const newErrors = {};

    if (!form.username) {
      newErrors.username = 'Username is required.';
    } else if (form.username.toLowerCase() === 'admin') {
      newErrors.username = 'Admin username is reserved.';
    }

    if (!form.email) {
      newErrors.email = 'Email is required.';
    }

    if (!form.password) {
      newErrors.password = 'Password is required.';
    } else if (!isPasswordStrong(form.password)) {
      newErrors.password =
        'Password must be ≥8 chars, include an uppercase letter & a number.';
    }

    if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * handleSubmit
   * ------------
   * Handles registration form submission:
   * 1. Registers the user.
   * 2. Logs in immediately to set cookies.
   * 3. Calls onLogin on success.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      // 1) Register
      const regRes = await fetch('http://localhost:3001/api/register', {
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
        alert('Registration failed: ' + (regData.error || 'Unknown error'));
        return;
      }

      // 2) Immediately login so the server sets cookies with proper maxAge
      const loginRes = await fetch('http://localhost:3001/api/login', {
        method: 'POST',
        credentials: 'include', // needed for cookies
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username, // server accepts "username" param for username or email
          password: form.password,
          rememberMe,              // apply remember-me option
        }),
      });

      const loginData = await loginRes.json().catch(() => ({}));
      if (!loginRes.ok) {
        alert('Login after registration failed: ' + (loginData.error || 'Unknown error'));
        return;
      }

      // 3) Success — no need to manually write cookies, server already did.
      onLogin({ username: loginData.username, email: loginData.email });
      alert('Registration successful!');
    } catch (err) {
      console.error('Registration error:', err);
      alert('Registration failed (network error)');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- UI ---
  return (
    <div className="register-page">
      <div className="register-form">
        <Logo />
        <h2>Create an Account</h2>
        <form onSubmit={handleSubmit} noValidate>
          {/* Username */}
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
            />
            {errors.username && <p className="error">{errors.username}</p>}
          </div>

          {/* Email */}
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
            />
            {errors.email && <p className="error">{errors.email}</p>}
          </div>

          {/* Password */}
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
            />
            {errors.password && <p className="error">{errors.password}</p>}
          </div>

          {/* Confirm Password */}
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
            />
            {errors.confirmPassword && (
              <p className="error">{errors.confirmPassword}</p>
            )}
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

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Registering…' : 'Register'}
          </button>

          {/* Switch to Login */}
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
