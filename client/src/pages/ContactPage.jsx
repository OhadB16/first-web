import React, { useEffect, useState } from 'react';
import './ContactPage.css';
import Logo from '../components/Logo';

/**
 * ContactPage
 * ------------
 * Contact form for regular users and inbox management for admins.
 *
 * Props:
 * @param {{username?: string}} user - Current logged-in user.
 * @param {() => void} onBackToStore - Callback to navigate back to the store page.
 *
 * Behavior:
 * - If user is **admin**:
 *   - Fetches messages from server (`/api/contact`).
 *   - Displays messages in a grid with metadata (sender, company, email, phone, etc.).
 *   - Allows admin to mark messages as handled (deletes them).
 * - If user is **not admin**:
 *   - Displays contact form (name, company, email, phone, preferences, budget, subject, message).
 *   - On submit, posts form data to `/api/contact`.
 *   - Displays error messages when send fails.
 */
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
    message: ''
  });
  const [sending, setSending] = useState(false);

  /**
   * Load inbox for admin
   * --------------------
   * Fetches all messages when the user is admin.
   */
  useEffect(() => {
    if (!isAdmin) return;
    let cancel = false;
    (async () => {
      try {
        const res = await fetch('http://localhost:3001/api/contact', {
          headers: { 'X-Username': user.username }
        });
        if (!res.ok) throw new Error('Load failed');
        const data = await res.json();
        if (!cancel) setMessages(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancel) setError('Load failed');
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [isAdmin, user?.username]);

  /**
   * handleSend
   * ----------
   * Sends the contact form (regular user).
   */
  const handleSend = async (e) => {
    e.preventDefault();
    setError('');
    setSending(true);
    try {
      const res = await fetch('http://localhost:3001/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Send failed');
      }
      setForm({
        fullName: '', company: '', email: '', phone: '',
        preferred: 'Email', budget: 'Undisclosed', subject: '', message: ''
      });
      alert('Message sent. We will reply shortly.');
    } catch (e) {
      setError(e.message || 'Send failed');
    } finally {
      setSending(false);
    }
  };

  /**
   * handleDelete
   * ------------
   * Marks a message as handled (admin only).
   * Deletes message from server and removes from local state.
   * @param {string|number} id - Message ID.
   */
  const handleDelete = async (id) => {
    if (!window.confirm('Mark as handled and remove this message?')) return;
    try {
      const res = await fetch(`http://localhost:3001/api/contact/${id}`, {
        method: 'DELETE',
        headers: { 'X-Username': user.username }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Delete failed');
      }
      setMessages(prev => prev.filter(m => m.id !== id));
    } catch (e) {
      alert(e.message);
    }
  };

  // --- UI ---
  return (
    <div className="contact-page">
      <Logo />
      <header className="contact-hero">
        <h1>Contact Us</h1>
        <p>Private aviation requires precision and discretion. Tell us how we can help.</p>
      </header>

      {isAdmin ? (
        <section className="inbox-wrap">
          {loading ? (
            <div className="loading">Loading…</div>
          ) : (
            <>
              {!messages.length && <div className="empty">No messages.</div>}
              <div className="inbox-grid">
                {messages.map(m => (
                  <article key={m.id} className="msg-card">
                    <header className="msg-head">
                      <div className="row">
                        <strong>{m.fullName || '—'}</strong>
                        {m.company ? <span className="muted"> • {m.company}</span> : null}
                      </div>
                      <time>{new Date(m.createdAt || m.date || '').toLocaleString()}</time>
                    </header>

                    <div className="msg-meta">
                      <div><b>Email:</b> {m.email || '—'}</div>
                      {m.phone && <div><b>Phone:</b> {m.phone}</div>}
                      {m.preferred && <div><b>Preferred:</b> {m.preferred}</div>}
                      {m.budget && <div><b>Budget:</b> {m.budget}</div>}
                      {m.subject && <div><b>Subject:</b> {m.subject}</div>}
                    </div>

                    <p className="msg-body">{m.message}</p>

                    <div className="msg-actions">
                      <button className="delete-button" onClick={() => handleDelete(m.id)}>
                        Mark as handled
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
          {error && <div className="form-error">{error}</div>}
          <div className="footer-actions">
            <button className="back-btn" onClick={onBackToStore} type="button">← Back to Store</button>
          </div>
        </section>
      ) : (
        <form className="contact-form" onSubmit={handleSend}>
          <div className="two">
            <label><span>Full Name *</span>
              <input required value={form.fullName}
                     onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}/>
            </label>
            <label><span>Company</span>
              <input value={form.company}
                     onChange={e => setForm(f => ({ ...f, company: e.target.value }))}/>
            </label>
          </div>

          <div className="two">
            <label><span>Email *</span>
              <input type="email" required value={form.email}
                     onChange={e => setForm(f => ({ ...f, email: e.target.value }))}/>
            </label>
            <label><span>Phone</span>
              <input value={form.phone}
                     onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}/>
            </label>
          </div>

          <div className="two">
            <label><span>Preferred Contact</span>
              <select value={form.preferred}
                      onChange={e => setForm(f => ({ ...f, preferred: e.target.value }))}>
                <option>Email</option><option>Phone</option><option>SMS</option><option>WhatsApp</option>
              </select>
            </label>
            <label><span>Budget</span>
              <select value={form.budget}
                      onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}>
                <option>Undisclosed</option>
                <option>$1–3M</option><option>$3–7M</option><option>$7–15M</option><option>$15M+</option>
              </select>
            </label>
          </div>

          <label className="full"><span>Subject</span>
            <input value={form.subject}
                   onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}/>
          </label>

          <label className="full"><span>Message *</span>
            <textarea required rows={6} value={form.message}
                      onChange={e => setForm(f => ({ ...f, message: e.target.value }))}/>
          </label>

          {error && <div className="form-error">{error}</div>}

          <div className="form-actions">
            <button className="btn-primary" type="submit" disabled={sending}>
              {sending ? 'Sending…' : 'Send Message'}
            </button>
            <button className="back-btn" type="button" onClick={onBackToStore}>← Back to Store</button>
          </div>
        </form>
      )}
    </div>
  );
}
