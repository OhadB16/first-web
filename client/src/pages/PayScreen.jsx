// src/pages/PayScreen.jsx
import React, { useMemo, useState } from 'react';
import './PayScreen.css';

/* ---------- Config ---------- */
const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_API_BASE_URL) ||
  (typeof process !== 'undefined' && process?.env?.REACT_APP_API_BASE_URL) ||
  'http://localhost:3001';

const currency = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

/* ---------- Helpers ---------- */
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
  return null;
}
const onlyDigits = (str = '') => str.replace(/\D+/g, '');
const formatCardNumber = (val) =>
  onlyDigits(val).slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ').trim();
const formatExpiry = (val) => {
  const d = onlyDigits(val).slice(0, 4); // MMYY
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
};
const luhnValid = (num) => {
  const digits = onlyDigits(num);
  if (digits.length < 13) return false;
  let sum = 0, alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
};
const expiryValidAndFuture = (mmYY) => {
  const m = onlyDigits(mmYY);
  if (m.length !== 4) return false;
  const mm = Number(m.slice(0, 2));
  const yy = Number(m.slice(2)); // e.g., "26" -> 2026
  if (mm < 1 || mm > 12) return false;
  const year = 2000 + yy;
  const now = new Date();
  const endOfMonth = new Date(year, mm, 0, 23, 59, 59, 999); // last day of MM
  return endOfMonth >= now;
};

function PayScreen({ total = 0, cart = [], user, onBack, onConfirm, onClearCart, setPurchasedItems }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cardNumber: '',
    expiry: '',
    cvv: '',
  });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isCartEmpty = useMemo(() => !Array.isArray(cart) || cart.length === 0, [cart]);
  const totalLabel = useMemo(() => currency.format(Number(total) || 0), [total]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setError('');
    setNotice('');
    if (name === 'cardNumber') {
      setFormData(prev => ({ ...prev, cardNumber: formatCardNumber(value) }));
    } else if (name === 'expiry') {
      setFormData(prev => ({ ...prev, expiry: formatExpiry(value) }));
    } else if (name === 'cvv') {
      setFormData(prev => ({ ...prev, cvv: onlyDigits(value).slice(0, 4) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const fetchUpdatedPurchases = async (username) => {
    try {
      const res = await fetch(`${API_BASE}/api/purchase/${encodeURIComponent(username)}`);
      if (!res.ok) throw new Error('Failed to load purchases');
      const purchaseRecords = await res.json();
      const allItems = (purchaseRecords || []).flatMap(record => record.items || []);
      setPurchasedItems?.(allItems);
    } catch (err) {
      console.error('❌ Failed to fetch purchases:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');

    const usernameCookie = (getCookie('skyUser') || '').trim();
    const username = usernameCookie || (user?.username || '').trim();

    if (!username) {
      setError('You must be logged in to complete the purchase.');
      return;
    }
    if (isCartEmpty) {
      setError('Your cart is empty.');
      return;
    }
    if (!formData.name || !formData.email || !formData.cardNumber || !formData.expiry || !formData.cvv) {
      setError('Please complete all fields.');
      return;
    }
    if (!luhnValid(formData.cardNumber)) {
      setError('Please check your card number.');
      return;
    }
    if (!expiryValidAndFuture(formData.expiry)) {
      setError('Expiry date must be valid and in the future (MM/YY).');
      return;
    }
    if (formData.cvv.length < 3 || formData.cvv.length > 4) {
      setError('CVV must be 3–4 digits.');
      return;
    }

    setSubmitting(true);
    try {
      // Build lightweight payload for server (no raw PAN/CVV — keep PCI-safe)
      const cleanedCart = cart.map(item => {
        const imageUrl = item.imageUrl
          ? item.imageUrl
          : item.image?.startsWith?.('data:image')
            ? item.image
            : '';
        return {
          id: item.id,
          name: item.name,
          price: Number(item.price) || 0,
          imageUrl,
          description: item.description || 'No description available',
        };
      });

      const endpoint = `${API_BASE}/api/purchase/${encodeURIComponent(username)}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cleanedCart }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Purchase failed.');
      }

      // Success
      setNotice('Purchase successful! Your items are now available under “My Jets”.');
      await fetchUpdatedPurchases(username);
      onClearCart?.();
      onConfirm?.();

      // Clear sensitive fields
      setFormData(prev => ({ ...prev, cardNumber: '', expiry: '', cvv: '' }));
    } catch (err) {
      console.error('❌ Error during purchase:', err);
      setError(err.message || 'Could not complete purchase (network/server issue).');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pay-screen">
      <div className="top-back-container">
        <button type="button" className="back-btn" onClick={onBack}>
          ← Back to Cart
        </button>
      </div>

      <form className="payment-form" onSubmit={handleSubmit} noValidate aria-busy={submitting}>
        <h2 className="payment-title">Confirm Payment</h2>
        <p className="payment-total">
          Total: <strong>{totalLabel}</strong>
        </p>

        {/* Notices */}
        {error && (
          <div className="empty" role="alert" aria-live="polite" style={{ textAlign: 'center', marginBottom: 12 }}>
            {error}
          </div>
        )}
        {notice && (
          <div className="empty" role="status" aria-live="polite" style={{ textAlign: 'center', marginBottom: 12 }}>
            {notice}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="pay-name">Full Name</label>
          <input
            id="pay-name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            required
            autoComplete="name"
            disabled={submitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="pay-email">Email</label>
          <input
            id="pay-email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            autoComplete="email"
            disabled={submitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="pay-card">Card Number</label>
          <input
            id="pay-card"
            name="cardNumber"
            type="text"
            inputMode="numeric"
            placeholder="1234 5678 9012 3456"
            value={formData.cardNumber}
            onChange={handleChange}
            required
            autoComplete="cc-number"
            disabled={submitting}
            maxLength={23} /* allows spaces */
          />
        </div>

        <div className="row">
          <div className="form-group half">
            <label htmlFor="pay-exp">Expiry (MM/YY)</label>
            <input
              id="pay-exp"
              name="expiry"
              type="text"
              inputMode="numeric"
              placeholder="08/26"
              value={formData.expiry}
              onChange={handleChange}
              required
              autoComplete="cc-exp"
              disabled={submitting}
              maxLength={5}
            />
          </div>

          <div className="form-group half">
            <label htmlFor="pay-cvv">CVV</label>
            <input
              id="pay-cvv"
              name="cvv"
              type="password"
              inputMode="numeric"
              placeholder="123"
              value={formData.cvv}
              onChange={handleChange}
              required
              autoComplete="cc-csc"
              disabled={submitting}
              maxLength={4}
            />
          </div>
        </div>

        <div className="payment-buttons">
          <button
            type="submit"
            className="pay-button"
            disabled={submitting || isCartEmpty}
            aria-disabled={submitting || isCartEmpty}
          >
            {submitting ? 'Processing…' : 'Pay Now'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default PayScreen;
