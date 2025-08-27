// src/components/ThemeToggle.jsx
import React, { useEffect, useState } from 'react';

const STORAGE_KEY = 'ui.theme';
const ATTRIBUTE = 'data-theme';
const isValid = (v) => v === 'light' || v === 'dark';

/** Decide initial theme without touching DOM during SSR. */
function getInitialTheme() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return 'light';

  // 1) Saved preference
  const saved = localStorage.getItem(STORAGE_KEY);
  if (isValid(saved)) return saved;

  // 2) <html data-theme="...">
  const attr = document.documentElement.getAttribute(ATTRIBUTE);
  if (isValid(attr)) return attr;

  // 3) OS preference
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;
  return prefersDark ? 'dark' : 'light';
}

/**
 * Floating theme toggle button.
 * - Sets <html data-theme="light|dark"> and persists in localStorage.
 * - Calls onToggle(mode) whenever mode changes.
 */
export default function ThemeToggle({ onToggle, className = 'theme-toggle' }) {
  const [mode, setMode] = useState(getInitialTheme);

  // Apply to <html> + persist; notify parent.
  useEffect(() => {
    document.documentElement.setAttribute(ATTRIBUTE, mode);
    localStorage.setItem(STORAGE_KEY, mode);
    if (typeof onToggle === 'function') onToggle(mode);
  }, [mode, onToggle]);

  // Keep in sync across tabs/windows.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY && isValid(e.newValue) && e.newValue !== mode) {
        setMode(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [mode]);

  const toggle = () => setMode((m) => (m === 'light' ? 'dark' : 'light'));

  const next = mode === 'light' ? 'dark' : 'light';
  const icon = mode === 'light' ? '🌙' : '☀️';

  return (
    <button
      type="button"
      className={className}            // matches your .theme-toggle CSS
      onClick={toggle}
      aria-pressed={mode === 'dark'}   // communicates current state
      aria-label={`Switch to ${next} mode`}
      title={mode === 'light' ? 'Dark mode' : 'Light mode'}
    >
      {icon}
      <span className="sr-only">{`Switch to ${next} mode`}</span>
    </button>
  );
}
