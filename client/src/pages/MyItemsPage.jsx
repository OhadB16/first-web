// src/pages/MyItemsPage.jsx
import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import './MyItemsPage.css';
import Logo from '../components/Logo';

// Currency formatter (switch "USD" if needed)
const currency = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

function MyItemsPage({ purchasedItems = [], onBackToStore }) {
  // Normalize list to avoid surprises (e.g., nulls)
  const items = useMemo(
    () => (Array.isArray(purchasedItems) ? purchasedItems.filter(Boolean) : []),
    [purchasedItems]
  );

  return (
    <div className="items-page-container">
      <Logo />

      <header className="items-header" aria-label="My items header">
        <button className="back-btn" type="button" onClick={onBackToStore}>
          ← Back to Store
        </button>
      </header>

      <h2>My Jets</h2>

      {items.length === 0 ? (
        <p className="empty-message" role="status" aria-live="polite">
          You haven’t bought any jets yet.
        </p>
      ) : (
        <div className="items-grid">
          {items.map((item, i) => {
            const id = String(item.id ?? i);
            const name = item.name || 'Unnamed Jet';
            const priceNum = Number(item.price ?? NaN);
            const priceLabel = Number.isFinite(priceNum) ? currency.format(priceNum) : 'N/A';
            const src = item.imageUrl || item.image || '/fallback.jpg';

            return (
              <div key={id} className="item-card">
                <img
                  src={src}
                  alt={name}
                  className="item-image"
                  loading="lazy"
                />
                <div className="item-info">
                  <h3 title={name}>{name}</h3>
                  <p className="price">{priceLabel}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

MyItemsPage.propTypes = {
  purchasedItems: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      name: PropTypes.string,
      price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      imageUrl: PropTypes.string,
      image: PropTypes.string,
    })
  ),
  onBackToStore: PropTypes.func.isRequired,
};

export default MyItemsPage;
