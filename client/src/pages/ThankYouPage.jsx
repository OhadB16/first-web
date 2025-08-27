// src/pages/ThankYouPage.jsx
import React from 'react';
import './ThankYouPage.css';
import Logo from '../components/Logo';

/**
 * ThankYouPage
 * -------------
 * Confirmation page shown after successful checkout.
 *
 * Props:
 * @param {() => void} onGoToStore - Callback to navigate back to the store.
 *
 * Behavior:
 * - Displays a thank-you message and order confirmation.
 * - Provides a button to return to the store.
 */
function ThankYouPage({ onGoToStore }) {
  return (
    <div className="thank-you-container">
      <Logo />
      <h1>🎉 Thank You for Your Purchase!</h1>
      <p>Your order has been processed. Enjoy your new jet!</p>
      <button className="store-btn" onClick={onGoToStore}>
        Back to Store
      </button>
    </div>
  );
}

export default ThankYouPage;
