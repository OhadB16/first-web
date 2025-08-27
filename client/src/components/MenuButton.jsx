// src/components/MenuButton.jsx
import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import './MenuButton.css';

/**
 * MenuButton
 *
 * A responsive menu launcher with an accessible dropdown.
 *
 * Props:
 * - user: { username?: string }
 * - onNavigate(view: string): void  -> navigate to app "view"
 * - onLogout(): void                 -> log out
 * - theme?: 'light' | 'dark'         -> current theme label for toggle UI
 * - onToggleTheme?: () => void       -> toggles theme (optional)
 *
 * A11y:
 * - Button advertises a popup menu (aria-haspopup="menu") and its state (aria-expanded).
 * - Menu is labelled by the trigger and supports keyboard navigation:
 *     Esc closes; ArrowUp/ArrowDown cycle items; Home/End jump; Enter/Space activate.
 * - Focus moves into the menu on open; returns to the trigger on close.
 */
function MenuButton({
  user,
  onNavigate,
  onLogout,
  theme = 'light',
  onToggleTheme = () => {},
}) {
  const [open, setOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);

  // IDs for aria-controls / aria-labelledby
  const btnId = useId();
  const menuId = useId();

  // Refs for focus + outside-click detection
  const wrapperRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const itemRefs = useRef([]);

  // Build the menu items. Keep your original order/labels.
  const items = [
    { key: 'store',   label: '🏪 Store',   onClick: () => onNavigate('store') },
    { key: 'cart',    label: '🛒 Cart',    onClick: () => onNavigate('cart') },
    { key: 'myItems', label: '🧾 My Items',onClick: () => onNavigate('myItems') },
    { key: 'about',   label: 'ℹ️ About',   onClick: () => onNavigate('about') },
    { key: 'reviews', label: '⭐ Reviews',  onClick: () => onNavigate('reviews') },
    { key: 'faq',     label: '❓ FAQ',     onClick: () => onNavigate('faq') },
    { key: 'contact', label: '✉️ Contact', onClick: () => onNavigate('contact') },
    { key: 'readme',  label: '📄 README',  onClick: () => window.open('http://localhost:3001/readme.html', '_blank') },
    { key: 'llm',     label: '🤖 LLM Code',onClick: () => window.open('http://localhost:3001/llm.html', '_blank') },
    ...(user?.username === 'admin'
      ? [{ key: 'admin', label: '🧑‍💻 Admin', onClick: () => onNavigate('admin') }]
      : []),
    { key: 'logout',  label: '🚪 Logout',  onClick: onLogout, className: 'logout' },
  ];

  // Open/close helpers
  const closeMenu = useCallback(() => {
    setOpen(false);
    setFocusIndex(0);
    // Return focus to trigger for good keyboard hygiene
    buttonRef.current?.focus();
  }, []);

  const openMenu = useCallback(() => {
    setOpen(true);
  }, []);

  // Focus first item when opening
  useEffect(() => {
    if (open) {
      // small delay to ensure DOM is painted
      const id = setTimeout(() => {
        itemRefs.current[0]?.focus();
      }, 0);
      return () => clearTimeout(id);
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDocPointerDown = (e) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target)) closeMenu();
    };
    document.addEventListener('pointerdown', onDocPointerDown);
    return () => document.removeEventListener('pointerdown', onDocPointerDown);
  }, [open, closeMenu]);

  // Keyboard navigation within the menu
  const onMenuKeyDown = (e) => {
    if (!open) return;

    const max = items.length - 1;
    const move = (next) => {
      const clamped = (next + items.length) % items.length;
      setFocusIndex(clamped);
      itemRefs.current[clamped]?.focus();
    };

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        closeMenu();
        break;
      case 'ArrowDown':
        e.preventDefault();
        move(focusIndex + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        move(focusIndex - 1);
        break;
      case 'Home':
        e.preventDefault();
        setFocusIndex(0);
        itemRefs.current[0]?.focus();
        break;
      case 'End':
        e.preventDefault();
        setFocusIndex(max);
        itemRefs.current[max]?.focus();
        break;
      case 'Tab':
        // allow default tab behavior but close menu for simplicity
        setOpen(false);
        break;
      default:
        break;
    }
  };

  const onItemActivate = (handler) => {
    handler();
    setOpen(false);
  };

  return (
    <div className="menu-button-wrapper" ref={wrapperRef}>
      {/* Theme toggle (optional) */}
      <button
        type="button"
        className="theme-toggle"
        onClick={onToggleTheme}
        aria-pressed={theme === 'dark'}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
      </button>

      {/* Menu trigger */}
      <button
        type="button"
        ref={buttonRef}
        id={btnId}
        className="hamburger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => (open ? closeMenu() : openMenu())}
      >
        ☰ Menu
      </button>

      {/* Popup menu */}
      {open && (
        <div
          id={menuId}
          className="dropdown-menu"
          role="menu"
          aria-labelledby={btnId}
          ref={menuRef}
          onKeyDown={onMenuKeyDown}
        >
          {items.map((it, idx) => (
            <button
              key={it.key}
              type="button"
              role="menuitem"
              className={it.className ? it.className : undefined}
              ref={(el) => (itemRefs.current[idx] = el)}
              tabIndex={idx === focusIndex ? 0 : -1}
              onClick={() => onItemActivate(it.onClick)}
              onMouseEnter={() => setFocusIndex(idx)}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default MenuButton;
