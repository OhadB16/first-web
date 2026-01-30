import React from 'react';
import './Logo.css'; // Import shared styles

very nice comp ! short and code - you can create another folder call Logo above this 
jsx and css file to maitatin better architecture .
Also consider to use css library like tailwind css / style comp. for better tech stuck

/**
 * Logo
 * ----
 * Simple brand logo component.
 *
 * Behavior:
 * - Displays a plane emoji as the logo symbol.
 * - Shows the text "SKY" as the brand name.
 * - Uses styles from Logo.css for layout and presentation.
 */
function Logo() {
  return (
    <div className="logo-container">
      <div className="logo-plane">✈️</div>
      <h1 className="logo-text">SKY</h1>
    </div>
  );
}

export default Logo;
