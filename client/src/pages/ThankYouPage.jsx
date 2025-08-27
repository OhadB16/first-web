// src/pages/ThankYouPage.jsx
import React, { useEffect } from 'react';
import './ThankYouPage.css';
import Logo from '../components/Logo';

/**
 * ThankYouPage — post-purchase confirmation screen.
 *
 * Responsibilities
 * - Acknowledge successful payment
 * - Provide a single primary action to return to the store
 *
 * Props
 * - onGoToStore: () => void   // Navigate user back to the catalog
 */
function ThankYouPage({ onGoToStore }) {
  /* Set a concise document title while this view is active */
  useEffect(() => {
    const prev = document.title;
    document.title = 'Thank you — SKY';
    return () => { document.title = prev; };
  }, []);

  /* Local guard so missing props don't throw */
  const handleGoToStore = () => {
    if (typeof onGoToStore === 'function') onGoToStore();
  };

  return (
    <div
      className="thank-you-container"
      role="main"
      aria-labelledby="ty-heading"
      aria-describedby="ty-copy"
    >
      <Logo />

      <h1 id="ty-heading">
        <span role="img" aria-label="party popper">🎉</span>{' '}
        Thank You for Your Purchase!
      </h1>

      <p id="ty-copy" role="status" aria-live="polite">
        Your order has been processed. Enjoy your new jet!
      </p>

      <button
        className="store-btn"
        type="button"
        onClick={handleGoToStore}
        autoFocus
      >
        Back to Store
      </button>
    </div>
  );
}

export default ThankYouPage;
