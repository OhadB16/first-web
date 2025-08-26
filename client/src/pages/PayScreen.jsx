import React, { useState } from 'react';
import './PayScreen.css';

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
  return null;
}

function PayScreen({ total, cart, user, onBack, onConfirm, onClearCart, setPurchasedItems }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cardNumber: '',
    expiry: '',
    cvv: '',
  });

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

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

  return (
    <div className="pay-screen">
      <div className="top-back-container">
        <button type="button" className="back-btn" onClick={onBack}>
          ← Back to Cart
        </button>
      </div>

      <form className="payment-form" onSubmit={handleSubmit}>
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
          <input name="cardNumber" type="text" maxLength={19} placeholder="1234 5678 9012 3456" value={formData.cardNumber} onChange={handleChange} required />
        </div>

        <div className="row">
          <div className="form-group half">
            <label>Expiry (MM/YY)</label>
            <input name="expiry" type="text" placeholder="08/26" value={formData.expiry} onChange={handleChange} required />
          </div>

          <div className="form-group half">
            <label>CVV</label>
            <input name="cvv" type="text" placeholder="123" maxLength={4} value={formData.cvv} onChange={handleChange} required />
          </div>
        </div>

        <div className="payment-buttons">
          <button type="submit" className="pay-button">
            Pay Now
          </button>
        </div>
      </form>
    </div>
  );
}

export default PayScreen;
