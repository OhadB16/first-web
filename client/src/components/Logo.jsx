// src/components/Logo.jsx
import React from 'react';
import './Logo.css';

/**
 * Logo — gradient wordmark with a decorative plane glyph behind it.
 *
 * Responsibilities
 * - Render the brand text (default: "SKY")
 * - Optionally show a decorative airplane emoji behind the text
 *
 * Props
 * - text?: string | ReactNode   → Visible brand text (default: "SKY")
 * - showPlane?: boolean         → Toggle the background plane (default: true)
 * - plane?: string | ReactNode  → Plane glyph to render (default: "✈️")
 * - as?: keyof JSX.IntrinsicElements
 *     Heading/element for the wordmark (default: "h1").
 *     If you place multiple logos on one page, consider `as="div"` or `as="span"`
 *     to keep your document outline valid.
 * - className?: string          → Extra classes on the outer container
 * - ...rest                     → Spread onto the outer container <div>
 *
 * Accessibility
 * - The plane is marked aria-hidden (purely decorative).
 * - The brand text is real text (readable by screen readers).
 */
function Logo({
  text = 'SKY',
  showPlane = true,
  plane = '✈️',
  as: As = 'h1',
  className = '',
  ...rest
}) {
  const containerClass = ['logo-container', className].filter(Boolean).join(' ');

  return (
    <div className={containerClass} {...rest}>
      {showPlane && (
        <div className="logo-plane" aria-hidden="true">
          {plane}
        </div>
      )}
      <As className="logo-text">{text}</As>
    </div>
  );
}

export default React.memo(Logo);
