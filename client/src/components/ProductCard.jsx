import React from 'react';
import './ProductCard.css';

store under componentes/Product/
  the product logic and add type script for the projext and use .tsx and index.ts file for every componentes

/**
 * ProductCard
 * ------------
 * Displays information about a single jet product, including image, name, description,
 * price, and controls to add or remove from cart.
 *
 * Props:
 * @param {Object}   props
 * @param {Object}   props.jet - Jet product object.
 * @param {string}   props.jet.name - Name of the jet.
 * @param {string}   props.jet.description - Description of the jet.
 * @param {number}   props.jet.price - Price of the jet.
 * @param {string}   [props.jet.imageUrl] - Optional image URL.
 * @param {string}   [props.jet.image] - Optional alternative image source.
 * @param {(jet: Object) => void} props.onAddToCart - Callback to add this jet to the cart.
 * @param {(jet: Object) => void} [props.onRemoveFromCart] - (Currently unused in this component) Callback to remove from cart.
 * @param {number}   props.countInCart - Number of this jet already in the cart.
 *
 * Behavior:
 * - Always displays product image, name, description, and price.
 * - Shows an "Add to Cart" button.
 * - If `countInCart > 0`, displays a counter for how many of this product are in the cart.
 */
function ProductCard({ jet, onAddToCart, onRemoveFromCart, countInCart }) {
  return (
    <div className="product-card">
      <img
        src={jet.imageUrl || jet.image}
        alt={jet.name}
        className="product-image"
      />
      <h3>{jet.name}</h3>
      <p>{jet.description}</p>

      store the img h3 and p logic in sepearte component

      <div className="product-footer">
        <span className="price">${jet.price.toLocaleString()}</span>

        {/* Add-to-cart button triggers callback with product */}
        <button onClick={() => onAddToCart(jet)}>
          Add to Cart
        </button>

        read the const from var

        {/* Show count if product is already in the cart */}
        {countInCart > 0 && (
          <>
            <div className="in-cart-count">
              add index to the div for better rendering 
              In Cart: {countInCart} {countInCart === 1 ? 'item' : 'items'}
            </div>
          </>
        )}
        can be store also in seperte componentes ChartList.tsx
      </div>
    </div>
  );
}

export default ProductCard;
