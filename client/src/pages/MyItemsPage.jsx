// src/pages/MyItemsPage.jsx
import React from 'react';
import './MyItemsPage.css';
import Logo from '../components/Logo';

/**
 * MyItemsPage
 * ------------
 * Displays a list of items purchased by the logged-in user.
 *
 * Props:
 * @param {Array} purchasedItems - List of purchased jets (each object includes name, price, imageUrl/image).
 * @param {() => void} onBackToStore - Callback to return to the store page.
 *
 * Behavior:
 * - If no purchased items, displays an empty state message.
 * - Otherwise, shows a grid of purchased jets with image, name, and price.
 * - Provides a back button to navigate to the store.
 */
function MyItemsPage({ purchasedItems, onBackToStore }) {
  return (
    <div className="items-page-container">
      <Logo />
      <header className="items-header">
        <button className="back-btn" onClick={onBackToStore}>← Back to Store</button>
      </header>
      <h2>MY Jets</h2>

      {(!purchasedItems || purchasedItems.length === 0) ? (
        <p className="empty-message">You haven’t bought any jets yet.</p>
      ) : (
        <div className="items-grid">
          {purchasedItems.map((item, index) => (
            <div key={index} className="item-card">
              <img
                src={item.imageUrl || item.image || '/fallback.jpg'}
                alt={item.name || 'Unnamed Jet'}
                className="cart-item-image"
              />
              <div className="item-info">
                <h3>{item.name || 'Unnamed Jet'}</h3>
                <p>Price: ${item.price?.toLocaleString?.() || 'N/A'}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyItemsPage;
