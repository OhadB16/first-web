// src/pages/CartPage.jsx
import React, { useMemo } from 'react';
import './CartPage.css';
import Logo from '../components/Logo';

// Currency formatter (change USD if needed)
const currency = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

function CartPage({ cart = [], onBack, onRemove, onCheckout }) {
  // Group identical items and count quantity
  const items = useMemo(() => {
    const map = new Map();
    for (const jet of cart) {
      const id = String(jet.id);
      if (!map.has(id)) {
        map.set(id, {
          ...jet,
          id,
          price: Number(jet.price) || 0,
          quantity: 0,
        });
      }
      map.get(id).quantity += 1;
    }
    return Array.from(map.values());
  }, [cart]);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  return (
    <div className="cart-page-container">
      <Logo />

      <header className="cart-header" aria-label="Cart header">
        <button
          className="back-btn"
          type="button"
          onClick={onBack}
          aria-label="Back to Store"
        >
          ← Back to Store
        </button>
        {/* spacer to keep layout balanced */}
        <div aria-hidden="true" />
      </header>

      <h2>My Cart</h2>

      <div className="cart-content">
        {items.length === 0 ? (
          <div className="empty-cart" role="status" aria-live="polite">
            Your cart is empty.
          </div>
        ) : (
          <div className="cart-items-grid">
            {items.map((item) => {
              const subtotal = item.price * item.quantity;
              return (
                <div className="cart-item-card" key={item.id}>
                  {(item.imageUrl || item.image) && (
                    <img
                      src={item.imageUrl || item.image}
                      alt={item.name}
                      className="cart-item-image"
                      loading="lazy"
                    />
                  )}

                  <div className="cart-item-details">
                    <h3 className="cart-item-name" title={item.name}>
                      {item.name}
                    </h3>
                    <p className="cart-item-price">{currency.format(item.price)}</p>
                    <p className="cart-item-quantity">Quantity: {item.quantity}</p>
                    <p className="cart-item-subtotal">
                      Subtotal: {currency.format(subtotal)}
                    </p>

                    <button
                      type="button"
                      className="remove-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        onRemove?.(item.id); // parent decides remove-one vs remove-all
                      }}
                      aria-label={`Remove ${item.name} from cart`}
                    >
                      🗑 Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {items.length > 0 && (
          <>
            <div className="cart-total" aria-live="polite">
              <span>Total</span>
              <span>{currency.format(total)}</span>
            </div>

            <button
              className="pay-button"
              type="button"
              onClick={onCheckout}
            >
              Proceed to Payment
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default CartPage;
