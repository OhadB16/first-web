// src/components/ThemeToggle.jsx
import React, { useEffect, useState } from 'react';

export default function ThemeToggle({ onToggle }) {
  // קרא מצב נוכחי מה-HTML או מה-localStorage
  const initial =
    document.documentElement.getAttribute('data-theme') ||
    localStorage.getItem('ui.theme') ||
    'light';

  const [mode, setMode] = useState(initial);

  // עדכון ה-attr וה-localStorage בכל שינוי
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
    localStorage.setItem('ui.theme', mode);
  }, [mode]);

  const handleClick = () => {
    const next = mode === 'light' ? 'dark' : 'light';
    setMode(next);
    if (typeof onToggle === 'function') onToggle(next); // אופציונלי
  };

  return (
    <button
      type="button"
      className="theme-toggle-btn"
      onClick={handleClick}
      aria-label={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}
      title={mode === 'light' ? 'Dark mode' : 'Light mode'}
    >
      {mode === 'light' ? '🌙' : '☀️'}
    </button>
  );
}
