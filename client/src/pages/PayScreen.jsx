import React, { useState } from 'react';
import './PayScreen.css';
import Logo from '../components/Logo';


/**
 * getCookie
 * ---------
 * Retrieves the value of a cookie by name.
 * @param {string} name - The cookie name.
 * @returns {string|null} - The cookie value, or null if not found.
 */
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
  return null;
}

/**
 * PayScreen
 * ---------
 * Payment confirmation screen where user enters payment info and finalizes purchase.
 *
 * Props:
 * @param {number} total - Total price of items in the cart.
 * @param {Array} cart - Items currently in the cart.
 * @param {Object} user - Logged-in user info (used for cookie validation).
 * @param {() => void} onBack - Callback to navigate back to the cart.
 * @param {() => void} onConfirm - Callback when purchase is confirmed.
 * @param {() => void} onClearCart - Callback to clear cart after successful purchase.
 * @param {(items: Array) => void} setPurchasedItems - Setter to update purchased items after purchase.
 *
 * Behavior:
 * - Requires user login (cookie "skyUser").
 * - Prevents purchase if cart is empty.
 * - Cleans up cart items (ensures imageUrl is safe).
 * - Posts purchase to server, updates purchases list, clears cart, and confirms checkout.
 */
function PayScreen({ total, cart, user, onBack, onConfirm, onClearCart, setPurchasedItems }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cardNumber: '',
    expiry: '',
    cvv: '',
  });

  /**
   * handleChange
   * ------------
   * Updates controlled input state in payment form.
   */
  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  /**
   * fetchUpdatedPurchases
   * ---------------------
   * Refreshes user's purchased items from server.
   * @param {string} username - Current username.
   */
  const fetchUpdatedPurchases = async (username) => {
    try {
      const res = await fetch(`http://localhost:3001/api/purchase/${username}`);
      if (!res.ok) throw new Error('Failed to load purchases');
      const purchaseRecords = await res.json();
      const allItems = purchaseRecords.flatMap(record => record.items || []);
      setPurchasedItems(allItems);
    } catch (err) {
      console.error('❌ Failed to fetch purchases:', err);
    }
  };

  /**
   * handleSubmit
   * ------------
   * Submits the payment form, validates login & cart,
   * sends purchase to server, and updates purchased items.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    const usernameRaw = getCookie('skyUser');
    const username = usernameRaw ? usernameRaw.trim() : null;

    console.log('🧪 Cookie:', document.cookie);
    console.log('🧪 Username from cookie:', username);

    if (!username) {
      alert('⚠️ You must be logged in to complete the purchase');
      return;
    }

    if (!cart || cart.length === 0) {
      alert('🛒 Your cart is empty!');
      return;
    }

    try {
      // Ensure each cart item has consistent imageUrl
      const cleanedCart = cart.map(item => {
        const imageUrl = item.imageUrl
          ? item.imageUrl
          : item.image?.startsWith('data:image')
            ? item.image
            : '';

        return {
          id: item.id,
          name: item.name,
          price: item.price,
          imageUrl,
          description: item.description || 'No description available'
        };
      });

      const endpoint = `http://localhost:3001/api/purchase/${username}`;
      console.log('📤 Sending POST to:', endpoint);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cleanedCart }),
      });

      if (res.ok) {
        alert('✅ Purchase successful!');
        await fetchUpdatedPurchases(username);
        if (onClearCart) onClearCart();
        onConfirm();
      } else {
        const data = await res.json();
        alert(`❌ Purchase failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('❌ Error during purchase:', err);
      alert('⚠️ Could not complete purchase (network/server issue)');
    }
  };

  // --- UI ---
  return (
    <div className="pay-screen">
      <form className="payment-form" onSubmit={handleSubmit}>
        <Logo />
        <h2 className="payment-title">Confirm Payment</h2>
        <p className="payment-total">
          Total: <strong>${total.toLocaleString()}</strong>
        </p>

        <div className="form-group">
          <label>Full Name</label>
          <input name="name" type="text" value={formData.name} onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label>Email</label>
          <input name="email" type="email" value={formData.email} onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label>Card Number</label>
          <input
            name="cardNumber"
            type="text"
            maxLength={19}
            placeholder="1234 5678 9012 3456"
            value={formData.cardNumber}
            onChange={handleChange}
            required
          />
        </div>

        <div className="row">
          <div className="form-group half">
            <label>Expiry (MM/YY)</label>
            <input
              name="expiry"
              type="text"
              placeholder="08/26"
              value={formData.expiry}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group half">
            <label>CVV</label>
            <input
              name="cvv"
              type="text"
              placeholder="123"
              maxLength={4}
              value={formData.cvv}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="payment-buttons">
          <button type="submit" className="pay-button">
            Pay Now
          </button>
        </div>
        <div className="back-btn-container">
  <button type="button" className="back-btn" onClick={onBack}>
    ← Back to Cart
  </button>
</div>
      </form>
    </div>
  );
}

export default PayScreen;
