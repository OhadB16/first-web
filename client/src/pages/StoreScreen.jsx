// src/pages/StoreScreen.jsx
import React, { useMemo, useState, useId } from 'react';
import ProductCard from '../components/ProductCard';
import './StoreScreen.css';
import Logo from '../components/Logo';

/* =========================================================================
   StoreScreen — Catalog page
   -------------------------------------------------------------------------
   Props:
   - user:          current user object or null
   - cart:          array of jets currently in the cart
   - onAddToCart:   (jet) => void
   - onShowCart:    () => void
   - setView:       (viewName) => void  // used to send guests to login
   - storeItems:    array of jets to render
   -------------------------------------------------------------------------
   State:
   - searchTerm:    text used to filter jets by name
   -------------------------------------------------------------------------
   Derived:
   - cartCounts:    { [id]: quantity } for quick per-card counts
   - filteredJets:  storeItems filtered by normalized search
   -------------------------------------------------------------------------
   UX/A11y:
   - Search has aria-label; Escape clears the field
   - Buttons keep your existing visual styles
=========================================================================== */

function StoreScreen({ user, cart, onAddToCart, onShowCart, setView, storeItems }) {
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputId = useId();

  /* Guard against undefined props so the page never crashes */
  const items = Array.isArray(storeItems) ? storeItems : [];
  const cartArray = Array.isArray(cart) ? cart : [];

  /* Build a quick lookup of quantities per product (O(n) once) */
  const cartCounts = useMemo(() => {
    const counts = Object.create(null);
    for (const it of cartArray) {
      const k = String(it?.id);
      counts[k] = (counts[k] || 0) + 1;
    }
    return counts;
  }, [cartArray]);

  /* Normalized search term (trim + lowercase) */
  const normalizedQuery = useMemo(
    () => searchTerm.trim().toLowerCase(),
    [searchTerm]
  );

  /* Filter items by name (case-insensitive). Safe for missing names. */
  const filteredJets = useMemo(() => {
    if (!normalizedQuery) return items;
    return items.filter(jet =>
      String(jet?.name || '').toLowerCase().includes(normalizedQuery)
    );
  }, [items, normalizedQuery]);

  /* Add with login gate */
  const handleAddToCart = (jet) => {
    if (!user) {
      alert('Please log in to add items to your cart.');
      setView?.('login');
      return;
    }
    onAddToCart?.(jet);
  };

  /* Keyboard nicety: ESC clears search */
  const onSearchKeyDown = (e) => {
    if (e.key === 'Escape' && searchTerm) {
      setSearchTerm('');
      e.currentTarget.blur(); // optional: close virtual keyboard on mobile
    }
  };

  return (
    <div className="store-screen-page">
      {/* Top navigation / brand */}
      <nav className="navbar">
        <Logo />
      </nav>

      {/* Header: search + cart button */}
      <header className="store-header">
        <div className="header-controls">
          {/* Using aria-label for a11y without changing layout */}
          <input
            id={searchInputId}
            type="text"
            placeholder="Search jets..."
            className="search-input"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={onSearchKeyDown}
            aria-label="Search jets by name"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
          />

          <button
            className="cart-button"
            onClick={onShowCart}
            title={`View cart (${cartArray.length} item${cartArray.length === 1 ? '' : 's'})`}
            type="button"
          >
            🛒 View Cart ({cartArray.length})
          </button>
        </div>
      </header>

      {/* Catalog grid */}
      <section className="products-grid">
        {filteredJets.length > 0 ? (
          filteredJets.map(jet => (
            <ProductCard
              key={jet.id}
              jet={jet}
              onAddToCart={() => handleAddToCart(jet)}
              /* O(1) lookup instead of cart.filter(...) per row */
              countInCart={cartCounts[String(jet.id)] || 0}
            />
          ))
        ) : (
          <p className="empty-message" aria-live="polite">
            No jets match your search.
          </p>
        )}
      </section>
    </div>
  );
}

export default StoreScreen;
