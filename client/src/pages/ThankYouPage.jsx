// src/pages/ThankYouPage.jsx
import React from 'react';
import './ThankYouPage.css';
import Logo from '../components/Logo';

function ThankYouPage({ onGoToStore }) {
  return (
    <div className="thank-you-container">
      <Logo></Logo>
      <h1>🎉 Thank You for Your Purchase!</h1>
      <p>Your order has been processed. Enjoy your new jet!</p>
      <button className="store-btn" onClick={onGoToStore}>
        Back to Store
      </button>
    </div>
  );
}

export default ThankYouPage;
