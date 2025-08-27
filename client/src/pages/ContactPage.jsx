// src/pages/ContactPage.jsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import './ContactPage.css';
import Logo from '../components/Logo';

const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_API_BASE_URL) ||
  (typeof process !== 'undefined' && process?.env?.REACT_APP_API_BASE_URL) ||
  'http://localhost:3001';

export default function ContactPage({ user, onBackToStore }) {
  const isAdmin = (user?.username || '').toLowerCase() === 'admin';

  // --- Admin inbox state ---
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(isAdmin);
  const [error, setError] = useState('');

  // --- Form state (regular user) ---
  const [form, setForm] = useState({
    fullName: '',
    company: '',
    email: '',
    phone: '',
    preferred: 'Email',
    budget: 'Undisclosed',
    subject: '',
    message: '',
  });
  const [sending, setSending] = useState(false);
  const [sentNotice, setSentNotice] = useState('');

  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  // =========================
  // Admin: Load inbox
  // =========================
  const loadInbox = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError('');
    const ctrl = new AbortController();
    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
        headers: { 'X-Username': user?.username || '' },
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error('Load failed');
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (e) {
      if (mounted.current) setError('Load failed');
    } finally {
      if (mounted.current) setLoading(false);
    }
    return () => ctrl.abort();
  }, [API_BASE, isAdmin, user?.username]);

  useEffect(() => { loadInbox(); }, [loadInbox]);

  // =========================
  // Admin: Delete/mark handled
  // =========================
  const handleDelete = useCallback(async (id) => {
    if (!id) return;
    if (!window.confirm('Mark as handled and remove this message?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/contact/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'X-Username': user?.username || '' },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Delete failed');
      }
      setMessages(prev => prev.filter(m => m.id !== id));
    } catch (e) {
      setError(e.message || 'Delete failed');
    }
  }, [API_BASE, user?.username]);

  // =========================
  // User: Send message
  // =========================
  const handleSend = async (e) => {
    e.preventDefault();
    setError('');
    setSentNotice('');
    // Basic client-side guard
    if (!form.fullName || !form.email || !form.message) {
      setError('Please complete required fields.');
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Send failed');
      }
      setForm({
        fullName: '', company: '', email: '', phone: '',
        preferred: 'Email', budget: 'Undisclosed', subject: '', message: '',
      });
      setSentNotice('Message sent. We will reply shortly.');
    } catch (e2) {
      setError(e2.message || 'Send failed');
    } finally {
      if (mounted.current) setSending(false);
    }
  };

  // =========================
  // UI
  // =========================
  return (
    <div className="contact-page">
      <Logo />
      <header className="contact-hero">
        <h1>Contact Us</h1>
        <p>Private aviation requires precision and discretion. Tell us how we can help.</p>
      </header>

      {isAdmin ? (
        <section className="_container" aria-label="Inbox">
          <div className="admin-toolbar">
            <h3 style={{ margin: 0 }}>Messages</h3>
            <button className="refresh" type="button" onClick={loadInbox} disabled={loading}>
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          {loading ? (
            <div className="loading" role="status" aria-live="polite">Loading…</div>
          ) : messages.length === 0 ? (
            <div className="empty" role="status" aria-live="polite">No messages.</div>
          ) : (
            <ul className="message-list">
              {messages.map(m => (
                <li key={m.id} className="message-item">
                  <div className="meta">
                    <strong>{m.fullName || '—'}</strong>
                    {m.company ? <span> • {m.company}</span> : null}
                    <span className="date">
                      {m.createdAt || m.date
                        ? new Date(m.createdAt || m.date).toLocaleString()
                        : ''}
                    </span>
                  </div>

                  <div className="subject">{m.subject || '(No subject)'}</div>

                  <div className="body">{m.message}</div>

                  <div className="row-actions">
                    <button
                      className="btn-ok"
                      type="button"
                      onClick={() => handleDelete(m.id)}
                    >
                      Mark as handled
                    </button>
                  </div>

                  <div className="meta" style={{ marginTop: 8 }}>
                    <div><b>Email:</b> {m.email || '—'}</div>
                    {m.phone && <div><b>Phone:</b> {m.phone}</div>}
                    {m.preferred && <div><b>Preferred:</b> {m.preferred}</div>}
                    {m.budget && <div><b>Budget:</b> {m.budget}</div>}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {error && <div className="empty" role="alert">{error}</div>}

          <div className="actions" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
            <button className="back-btn" onClick={onBackToStore} type="button">← Back to Store</button>
          </div>
        </section>
      ) : (
        <form className="_container" onSubmit={handleSend} noValidate>
          <div className="grid-2">
            <label className="field">
              <span>Full Name *</span>
              <input
                required
                value={form.fullName}
                onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                autoComplete="name"
              />
            </label>
            <label className="field">
              <span>Company</span>
              <input
                value={form.company}
                onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                autoComplete="organization"
              />
            </label>
          </div>

          <div className="grid-2">
            <label className="field">
              <span>Email *</span>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                autoComplete="email"
              />
            </label>
            <label className="field">
              <span>Phone</span>
              <input
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                autoComplete="tel"
              />
            </label>
          </div>

          <div className="grid-2">
            <label className="field">
              <span>Preferred Contact</span>
              <select
                value={form.preferred}
                onChange={e => setForm(f => ({ ...f, preferred: e.target.value }))}
              >
                <option>Email</option>
                <option>Phone</option>
                <option>SMS</option>
                <option>WhatsApp</option>
              </select>
            </label>
            <label className="field">
              <span>Budget</span>
              <select
                value={form.budget}
                onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
              >
                <option>Undisclosed</option>
                <option>$1–3M</option>
                <option>$3–7M</option>
                <option>$7–15M</option>
                <option>$15M+</option>
              </select>
            </label>
          </div>

          <label className="field">
            <span>Subject</span>
            <input
              value={form.subject}
              onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
            />
          </label>

          <label className="field">
            <span>Message *</span>
            <textarea
              required
              rows={6}
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
            />
          </label>

          {/* Notices */}
          {error && (
            <div className="empty" role="alert" aria-live="polite">{error}</div>
          )}
          {sentNotice && (
            <div className="empty" role="status" aria-live="polite">{sentNotice}</div>
          )}

          <div className="actions form-actions">
            <button className="btn-ok" type="submit" disabled={sending}>
              {sending ? 'Sending…' : 'Send Message'}
            </button>
            <button className="back-btn" type="button" onClick={onBackToStore}>
              ← Back to Store
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
