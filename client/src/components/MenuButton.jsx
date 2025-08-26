// src/components/MenuButton.jsx
import React, { useState } from 'react';
import './MenuButton.css';

function MenuButton({ user, onNavigate, onLogout, theme = 'light', onToggleTheme = () => {} }) {
  const [open, setOpen] = useState(false);

  const handleClick = (target) => {
    onNavigate(target);
    setOpen(false);
  };

  return (
    <div className="menu-button-wrapper">
      {/* כפתור תפריט */}
      <button type="button" className="hamburger" onClick={() => setOpen(!open)}>
        ☰ Menu
      </button>

      {open && (
        <div className="dropdown-menu" role="menu">
          <button type="button" onClick={() => handleClick('store')}>🏪 Store</button>
          <button type="button" onClick={() => handleClick('cart')}>🛒 Cart</button>
          <button type="button" onClick={() => handleClick('myItems')}>🧾 My Items</button>
          <button type="button" onClick={() => handleClick('about')}>ℹ️ About</button>
          <button type="button" onClick={() => handleClick('reviews')}>⭐ Reviews</button>
          <button type="button" onClick={() => handleClick('faq')} role="menuitem">❓ FAQ</button>
          <button type="button" onClick={() => handleClick('contact')} role="menuitem">✉️ Contact</button>
          <button type="button" onClick={() => window.open('http://localhost:3001/readme.html', '_blank')}>📄 README</button>
          <button type="button" onClick={() => window.open('http://localhost:3001/llm.html', '_blank')}>🤖 LLM Code</button>

          {/* ✅ רק לאדמין */}
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
