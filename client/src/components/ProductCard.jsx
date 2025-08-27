// src/components/ProductCard.jsx
import React from 'react';
import PropTypes from 'prop-types';
import './ProductCard.css';

/**
 * ProductCard — glassy card for a single jet.
 *
 * Props
 * - jet: {
 *     id: string|number (required),
 *     name?: string,
 *     price?: number|string,
 *     description?: string,
 *     imageUrl?: string,
 *     image?: string
 *   }
 * - onAddToCart(jet): void       → add this jet to the cart
 * - onRemoveFromCart?(id): void  → remove one unit (shown only if provided & countInCart>0)
 * - countInCart?: number         → how many of this jet are currently in the cart
 *
 * A11y / UX
 * - Image is lazy-loaded and has a descriptive alt.
 * - Buttons have explicit type + aria-labels.
 * - In-cart count is announced via aria-live="polite".
 */
function ProductCard({ jet, onAddToCart, onRemoveFromCart, countInCart = 0 }) {
  const title = jet?.name || 'Unnamed Jet';
  const price = Number(jet?.price) || 0;
  const description = jet?.description || '—';
  const imgSrc = jet?.imageUrl || jet?.image || '/fallback.jpg';

  const handleImgError = (e) => {
    // Swap to a lightweight local placeholder if the image fails
    if (!e.currentTarget.src.endsWith('/fallback.jpg')) {
      e.currentTarget.src = '/fallback.jpg';
    }
  };

  return (
    <div className="product-card">
      <img
        src={imgSrc}
        alt={`${title} image`}
        className="product-image"
        loading="lazy"
        decoding="async"
        onError={handleImgError}
      />

      <h3>{title}</h3>
      <p>{description}</p>

      <div className="product-footer">
        <span className="price">${price.toLocaleString()}</span>

        <button
          type="button"
          onClick={() => onAddToCart(jet)}
          aria-label={`Add ${title} to cart`}
        >
          Add to Cart
        </button>

        {countInCart > 0 && (
          <>
            {onRemoveFromCart && (
              <button
                type="button"
                onClick={() => onRemoveFromCart(jet.id)}
                aria-label={`Remove one ${title} from cart`}
              >
                Remove one
              </button>
            )}
            <div className="in-cart-count" aria-live="polite">
              In Cart: {countInCart} {countInCart === 1 ? 'item' : 'items'}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

ProductCard.propTypes = {
  jet: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string,
    price: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    description: PropTypes.string,
    imageUrl: PropTypes.string,
    image: PropTypes.string,
  }).isRequired,
  onAddToCart: PropTypes.func.isRequired,
  onRemoveFromCart: PropTypes.func,
  countInCart: PropTypes.number,
};

export default React.memo(ProductCard);
