// src/pages/StoreScreen.jsx
import React, { useState, useMemo } from 'react';
import ProductCard from '../components/ProductCard';
import './StoreScreen.css';
import Logo from '../components/Logo';

function StoreScreen({ user, cart, onAddToCart, onShowCart, setView, storeItems }) {
  const [searchTerm, setSearchTerm] = useState('');

  // חיפוש ג'טים לפי שם
  const filteredJets = useMemo(
    () =>
      storeItems.filter(jet =>
        jet.name.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [storeItems, searchTerm]
  );

  // הוספה לעגלה עם בדיקת משתמש
  const handleAddToCart = (jet) => {
    if (!user) {
      alert("Please log in to add items to your cart.");
      setView('login');
    } else {
      onAddToCart(jet);
    }
  };

  return (
    <div className="store-screen-page">
      <nav className="navbar">
        <Logo />
      </nav>
      <header className="store-header">
        <div className="header-controls">
          <input
          type="text"
          placeholder="Search jets..."
          className="search-input"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <button className="cart-button" onClick={onShowCart}>
          🛒 View Cart ({cart.length})
        </button>
        </div>
      </header>

      <section className="products-grid">
        {filteredJets.length > 0 ? (
          filteredJets.map(jet => (
          <ProductCard
            key={jet.id}
            jet={jet}
            onAddToCart={() => handleAddToCart(jet)}
            countInCart={cart.filter(item => item.id === jet.id).length}
          />
          ))
        ) : (
          <p className="empty-message">No jets match your search.</p>
        )}
      </section>
    </div>
  );
}

export default StoreScreen;