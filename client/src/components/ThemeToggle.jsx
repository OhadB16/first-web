// src/components/ThemeToggle.jsx
import React, { useEffect, useState } from 'react';

/**
 * ThemeToggle
 * ------------
 * A button component for toggling between light and dark UI themes.
 *
 * Props:
 * @param {(mode: 'light'|'dark') => void} [onToggle] - Optional callback called whenever theme changes.
 *
 * Behavior:
 * - Reads initial theme from the `<html>` `data-theme` attribute or from `localStorage` (`ui.theme` key).
 * - Falls back to "light" if nothing is set.
 * - Whenever the mode changes, updates both the `data-theme` attribute and `localStorage`.
 * - Clicking the button toggles the mode between light and dark.
 * - Provides accessible labels and titles for screen readers and tooltips.
 */
export default function ThemeToggle({ onToggle }) {
  // Read initial state from HTML attribute or localStorage
  const initial =
    document.documentElement.getAttribute('data-theme') ||
    localStorage.getItem('ui.theme') ||
    'light';

  const [mode, setMode] = useState(initial);

  // Update attribute and localStorage whenever mode changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
    localStorage.setItem('ui.theme', mode);
  }, [mode]);

  create custom hook for this mode and set mode use effect and store in the right place path
  reuse consts 

  /**
   * handleClick
   * ------------
   * Switches between light and dark mode, updating state and calling onToggle.
   */
  const handleClick = () => {
    const next = mode === 'light' ? 'dark' : 'light';
    setMode(next);
    if (typeof onToggle === 'function') onToggle(next); // optional callback
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
