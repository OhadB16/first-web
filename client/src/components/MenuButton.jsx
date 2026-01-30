// src/components/MenuButton.jsx
import React, { useState } from 'react';
import './MenuButton.css';

/**
 * MenuButton
 * -----------
 * A compact hamburger menu component that opens a dropdown with navigation actions.
 *
 * Props:
 * @param {Object}   props
 * @param {{username?: string}} [props.user] - Current logged-in user; when `username === 'admin'` an Admin entry is shown.
 * @param {(target: string) => void} props.onNavigate - Callback invoked with a target route key (e.g., 'store', 'cart').
 * @param {() => void} props.onLogout - Callback to perform logout.
 * @param {'light'|'dark'} [props.theme='light'] - Optional UI theme flag (currently unused in this component).
 * @param {() => void} [props.onToggleTheme=() => {}] - Optional theme toggle handler (currently unused in this component).
 *
 * Behavior:
 * - Clicking the hamburger toggles a dropdown.
 * - Selecting a menu item calls `onNavigate(target)` and closes the dropdown.
 * - External links (README / LLM Code) open in a new tab.
 * - Shows an extra "Admin" entry when the user is an admin.
 */
function MenuButton({ user, onNavigate, onLogout, theme = 'light', onToggleTheme = () => {} }) {
  const [open, setOpen] = useState(false); // Tracks whether the dropdown is visible

  /**
   * handleClick
   * -----------
   * Navigate to a target and close the menu.
   * @param {string} target - Route key to navigate to (e.g., 'store', 'cart', 'admin').
   */
  const handleClick = (target) => {
    onNavigate(target); // Delegate routing to parent
    setOpen(false);     // Close the dropdown after navigation
  };
  use custom hook for this open state and handle click and store in under hooks/menu/useOpenNavigate hook.

  return (
    <div className="menu-button-wrapper">
      {/* Menu button */}
      <button type="button" className="hamburger" onClick={() => setOpen(!open)}>
        ☰ Menu
      </button>

      {open && (
        <div className="dropdown-menu" role="menu">
          
          reuse this button comp in render method and store the consts in src/constants/mentu/index.ts 
          const renderButton = () =>
          add also type script for this project and use types 
          
          <button type="button" onClick={() => handleClick('store')}>🏪 Store</button>
          <button type="button" onClick={() => handleClick('cart')}>🛒 Cart</button>
          <button type="button" onClick={() => handleClick('myItems')}>🧾 My Items</button>
          <button type="button" onClick={() => handleClick('about')}>ℹ️ About</button>
          <button type="button" onClick={() => handleClick('reviews')}>⭐ Reviews</button>
          <button type="button" onClick={() => handleClick('faq')} role="menuitem">❓ FAQ</button>
          <button type="button" onClick={() => handleClick('contact')} role="menuitem">✉️ Contact</button>

          store this const in  also
          <button type="button" onClick={() => window.open('http://localhost:3001/readme.html', '_blank')}>📄 README</button>
          <button type="button" onClick={() => window.open('http://localhost:3001/llm.html', '_blank')}>🤖 LLM Code</button>

          {/* ✅ Admin only */}
          // store 'admin' in const and reuse
          {user?.username === 'admin' && (
            <button type="button" onClick={() => handleClick('admin')}>🧑‍💻 Admin</button>
          )}

          <button type="button" className="logout" onClick={onLogout}>🚪 Logout</button>
        </div>
      )}
    </div>
  );
}

export default MenuButton;
