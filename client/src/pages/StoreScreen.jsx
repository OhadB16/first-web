// src/pages/StoreScreen.jsx
import React, { useState, useMemo } from 'react';
import ProductCard from '../components/ProductCard';
import './StoreScreen.css';
import Logo from '../components/Logo';

/**
 * StoreScreen
 * ------------
 * Main product browsing page for jets.
 *
 * Props:
 * @param {{username?: string}} user - Current logged-in user (or null if guest).
 * @param {Array} cart - Array of items currently in the cart.
 * @param {(jet: Object) => void} onAddToCart - Callback to add a product to the cart.
 * @param {() => void} onShowCart - Callback to show the cart page.
 * @param {(view: string) => void} setView - Function to change the current view (e.g. login, cart).
 * @param {Array} storeItems - List of products (jets) available in the store.
 *
 * Behavior:
 * - Allows searching jets by name.
 * - If a guest (not logged in) tries to add to cart, alerts and redirects to login.
 * - Displays number of items in cart.
 */
function StoreScreen({ user, cart, onAddToCart, onShowCart, setView, storeItems }) {
  const [searchTerm, setSearchTerm] = useState('');

  /**
   * filteredJets
   * ------------
   * Filters jets based on search term (case-insensitive match by name).
   */
  const filteredJets = useMemo(
    () =>
      storeItems.filter(jet =>
        jet.name.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [storeItems, searchTerm]
  );

  /**
   * handleAddToCart
   * ---------------
   * Adds jet to cart if user is logged in,
   * otherwise redirects to login view.
   */
  const handleAddToCart = (jet) => {
    if (!user) {
      alert("Please log in to add items to your cart.");
      setView('login');
    } else {
      onAddToCart(jet);
    }
  };

  // --- UI ---
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
