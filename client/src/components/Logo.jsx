import React from 'react';
import './Logo.css'; // Import shared styles

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
