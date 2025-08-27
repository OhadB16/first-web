// src/pages/ReviewsPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import './ReviewsPage.css';
import Logo from '../components/Logo';

/* =========================================================================
   CONFIG
   - API base is env-configurable (Vite/CRA) with localhost fallback
   - SOURCE_TAG marks where reviews originate (useful for filtering server-side)
=========================================================================== */
const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_API_BASE_URL) ||
  (typeof process !== 'undefined' && process?.env?.REACT_APP_API_BASE_URL) ||
  'http://localhost:3001';

const SOURCE_TAG = 'ask-the-aspects';

/* =========================================================================
   FALLBACK DATA
   - Used when server is unavailable
=========================================================================== */
const FALLBACK_REVIEWS = [
  { id: 'r1', author: 'M. Cohen',  date: '2025-07-15', rating: 5, aspect: 'Service',    title: 'Concierge-level support', text: 'Every step from pre-buy to delivery was handled with precision and discretion.' },
  { id: 'r2', author: 'A. Levi',   date: '2025-07-03', rating: 4, aspect: 'Fleet',      title: 'Impressive selection',    text: 'We compared multiple airframes; their advice was data-driven and unbiased.' },
  { id: 'r3', author: 'N. Kaplan', date: '2025-06-22', rating: 5, aspect: 'After-sale', title: 'Maintenance planning',    text: 'Clear TCO, MRO scheduling, and crew recruitment made operations smooth.' },
  { id: 'r4', author: 'Global Holdings', date: '2025-06-05', rating: 4, aspect: 'Delivery', title: 'Seamless handover', text: 'Registration, escrow, and ferry flight executed without a single hiccup.' },
];

/* =========================================================================
   PRESENTATION: Stars
   - Simple, readable star renderer with accessible label
=========================================================================== */
function Stars({ value }) {
  const v = Math.max(0, Math.min(5, Number(value) || 0));
  return (
    <span className="stars" aria-label={`${v} out of 5`}>
      {'★★★★★'.slice(0, v)}
      <span className="stars-dim">{'★★★★★'.slice(v)}</span>
    </span>
  );
}

/* =========================================================================
   PAGE
   - Loads reviews (with abort on unmount)
   - Client-side filtering + search
   - Authenticated users can submit; admin can delete
=========================================================================== */
function ReviewsPage({ user, onBackToStore }) {
  /* --- Auth / Role ------------------------------------------------------ */
  const isAdmin = (user?.username || '').toLowerCase() === 'admin';

  /* --- Lists & Loading -------------------------------------------------- */
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  /* --- Filters / Search ------------------------------------------------- */
  const [aspectFilter, setAspectFilter] = useState('All');
  const [search, setSearch] = useState('');

  /* --- Submit Review Form ----------------------------------------------- */
  const [form, setForm] = useState({ rating: 5, aspect: 'Service', title: '', text: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  /* --- Load reviews (AbortController for cleanup) ----------------------- */
  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const url = `${API_BASE}/api/reviews?source=${encodeURIComponent(SOURCE_TAG)}`;
        const res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        setReviews(Array.isArray(data) ? data : FALLBACK_REVIEWS);
      } catch (err) {
        if (err?.name !== 'AbortError') setReviews(FALLBACK_REVIEWS);
      } finally {
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, []);

  /* --- Derived: aspect options (stable) --------------------------------- */
  const aspects = useMemo(
    () => ['All', ...Array.from(new Set(reviews.map(r => r.aspect).filter(Boolean)))],
    [reviews]
  );

  /* --- Derived: filtered list ------------------------------------------- */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reviews.filter(r => {
      const byAspect = aspectFilter === 'All' || r.aspect === aspectFilter;
      const byText =
        !q ||
        r.title?.toLowerCase().includes(q) ||
        r.text?.toLowerCase().includes(q) ||
        r.author?.toLowerCase().includes(q);
      return byAspect && byText;
    });
  }, [reviews, aspectFilter, search]);

  /* --- Derived: average rating (1-decimal) ------------------------------ */
  const avgRating = useMemo(() => {
    if (!filtered.length) return 0;
    const avg = filtered.reduce((s, r) => s + (Number(r.rating) || 0), 0) / filtered.length;
    return Math.round(avg * 10) / 10;
  }, [filtered]);

  /* --- Handlers: submit review ------------------------------------------ */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!user?.username) {
      setSubmitError('You must be logged in to submit a review.');
      return;
    }
    if (!form.title.trim() || !form.text.trim()) {
      setSubmitError('Title and review text are required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          author: user.username,
          rating: Number(form.rating),
          aspect: form.aspect,
          title: form.title,
          text: form.text,
          source: SOURCE_TAG,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to submit review.');
      }
      const created = await res.json();
      setReviews(prev => [created, ...prev]);
      setForm({ rating: 5, aspect: 'Service', title: '', text: '' });
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  /* --- Handlers: admin delete ------------------------------------------- */
  const handleDelete = async (id) => {
    if (!isAdmin) return;
    if (!window.confirm('Delete this review?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/reviews/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'X-Username': user?.username || '' },
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete review.');
      }
      setReviews(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      // Keep alert() here since it is admin-only and rare
      alert(e.message);
    }
  };

  /* --- Render ------------------------------------------------------------ */
  return (
    <div className="reviews-page">
      <Logo />

      {/* Hero */}
      <header className="reviews-hero">
        <h1>Client Reviews</h1>
        <p>
          Independent feedback sourced from <strong>Ask The Aspects</strong>. We value long-term relationships,
          transparent guidance, and flawless execution.
        </p>
      </header>

      {/* Post-a-Review form (signed-in users) */}
      {user && (
        <form className="review-form" onSubmit={handleSubmit} aria-busy={submitting}>
          <div className="form-row">
            <label>
              <span>Rating</span>
              <select
                value={form.rating}
                onChange={e => setForm(f => ({ ...f, rating: Number(e.target.value) }))}
              >
                {[5, 4, 3, 2, 1].map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Aspect</span>
              <select
                value={form.aspect}
                onChange={e => setForm(f => ({ ...f, aspect: e.target.value }))}
              >
                <option>Service</option><option>Fleet</option><option>Delivery</option>
                <option>After-sale</option><option>Maintenance</option><option>FBO</option>
                <option>Charter</option><option>Other</option>
              </select>
            </label>
          </div>

          <label className="full">
            <span>Title</span>
            <input
              type="text"
              placeholder="Concierge-level support"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              maxLength={120}
              required
            />
          </label>

          <label className="full">
            <span>Review</span>
            <textarea
              placeholder="Tell us about your experience…"
              value={form.text}
              onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
              rows={4}
              maxLength={1200}
              required
            />
          </label>

          {submitError && <div className="form-error" role="alert" aria-live="polite">{submitError}</div>}

          <div className="form-actions">
            <button className="btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Review'}
            </button>
          </div>
        </form>
      )}

      {/* Filter/search toolbar */}
      <section className="toolbar">
        <div className="toolbar-left">
          <label className="field">
            <span>Aspect</span>
            <select value={aspectFilter} onChange={e => setAspectFilter(e.target.value)}>
              {aspects.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Search</span>
            <input
              type="text"
              placeholder="Search title, text or author…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </label>
        </div>

        <div className="toolbar-right" aria-live="polite">
          <div className="kpi">
            <span className="kpi-label">Average</span>
            <div className="kpi-value">
              <Stars value={Math.round(avgRating)} /> <em>{avgRating.toFixed(1)}</em>
            </div>
          </div>
          <div className="kpi">
            <span className="kpi-label">Reviews</span>
            <div className="kpi-value">{filtered.length}</div>
          </div>
        </div>
      </section>

      {/* Reviews grid */}
      {loading ? (
        <div className="loading" aria-live="polite">Loading reviews…</div>
      ) : (
        <section className="reviews-grid">
          {filtered.map(r => (
            <article key={r.id} className="review-card">
              {isAdmin && (
                <button
                  type="button"
                  className="delete-btn"
                  title="Delete review"
                  aria-label="Delete review"
                  onClick={() => handleDelete(r.id)}
                >
                  🗑️
                </button>
              )}

              <header className="review-head">
                <Stars value={r.rating || 0} />
                <span className="review-aspect">{r.aspect}</span>
              </header>
              <h3 className="review-title">{r.title}</h3>
              <p className="review-text">{r.text}</p>
              <footer className="review-foot">
                <span className="author">— {r.author}</span>
                <time className="date">{r.date}</time>
              </footer>
            </article>
          ))}
          {!filtered.length && <div className="empty">No reviews match your filters.</div>}
        </section>
      )}

      {/* Footer actions */}
      <div className="footer-actions">
        <button className="back-btn" onClick={onBackToStore} type="button">← Back to Store</button>
      </div>
    </div>
  );
}

export default ReviewsPage;
