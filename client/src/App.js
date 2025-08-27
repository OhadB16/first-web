// src/App.js
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import './index.css';
import './theme-over.css';
import './theme.css';

// Pages
import Register from './pages/register';
import AlreadyReg from './pages/AlreadyReg';
import StoreScreen from './pages/StoreScreen';
import CartPage from './pages/CartPage';
import PayScreen from './pages/PayScreen';
import ThankYouPage from './pages/ThankYouPage';
import MyItemsPage from './pages/MyItemsPage';
import AdminPage from './pages/AdminPage';
import AboutPage from './pages/AboutPage';
import ReviewsPage from './pages/ReviewsPage';
import ContactPage from './pages/ContactPage';
import FAQPage from './pages/FAQPage';
import ThemeToggle from './components/ThemeToggle';

// Components
import MenuButton from './components/MenuButton';

// Jet images
import falcon from './assets/jets/Falcon.png';
import skyLiner200 from './assets/jets/SkyLiner200.png';
import aeroSwift from './assets/jets/AeroSwift.png';
import cloudCruiser from './assets/jets/CloudCruiser.png';
import jetStream500 from './assets/jets/JetStream500.png';
import eagleEye from './assets/jets/EagleEye.png';
import skyDancer from './assets/jets/SkyDancer.png';
import nimbus300 from './assets/jets/Nimbus300.png';
import horizon700 from './assets/jets/Horizon700.png';
import phoenixGT from './assets/jets/PhoeniGT.png';

/**
 * App
 * ---
 * Main application component.
 *
 * State:
 * - user: current logged-in user or null.
 * - view: current page to render.
 * - cart: array of items in cart.
 * - purchasedItems: array of purchased products.
 * - activityLog: local activity logs.
 * - theme: current theme ("light" or "dark").
 *
 * Behavior:
 * - Handles routing between pages based on state.
 * - Manages login, logout, cart, checkout, purchases, and theme toggle.
 * - Fetches store items and user data from server.
 */
function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('register');
  const [cart, setCart] = useState([]);
  const [purchasedItems, setPurchasedItems] = useState([]);
  const [, setActivityLog] = useState([]);

  // ---------- THEME ----------
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('ui.theme');
    if (saved) return saved;
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;
    return prefersDark ? 'dark' : 'light';
  });

  // Fetch current user on load
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('http://localhost:3001/api/me', {
          credentials: 'include',
        });
        if (res.ok) {
          const u = await res.json();
          setUser(u);
          setView('store'); // default view for logged-in user
        }
      } catch {}
    })();
  }, []);

  // Save theme to localStorage + HTML attribute
  useEffect(() => {
    localStorage.setItem('ui.theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  const toggleTheme = () => setTheme(t => (t === 'light' ? 'dark' : 'light'));

  // ---------- DATA ----------
  const jets = useMemo(() => [
    { id: 1,  name: 'Falcon',        price: 2500000, imageUrl: falcon,       description: 'High-speed private jet.' },
    { id: 2,  name: 'SkyLiner 200',  price: 1800000, imageUrl: skyLiner200,  description: 'Luxurious comfort in the skies.' },
    { id: 3,  name: 'AeroSwift',     price: 3200000, imageUrl: aeroSwift,    description: 'Cutting-edge design and performance.' },
    { id: 4,  name: 'CloudCruiser',  price: 2100000, imageUrl: cloudCruiser, description: 'Smooth flight guaranteed.' },
    { id: 5,  name: 'JetStream 500', price: 2900000, imageUrl: jetStream500, description: 'State-of-the-art avionics.' },
    { id: 6,  name: 'Eagle Eye',     price: 2300000, imageUrl: eagleEye,     description: 'Premium surveillance jet.' },
    { id: 7,  name: 'SkyDancer',     price: 2750000, imageUrl: skyDancer,    description: 'Elegant and efficient.' },
    { id: 8,  name: 'Nimbus 300',    price: 1950000, imageUrl: nimbus300,    description: 'Compact business jet.' },
    { id: 9,  name: 'Horizon 700',   price: 3500000, imageUrl: horizon700,   description: 'Long-range luxury.' },
    { id: 10, name: 'Phoenix GT',    price: 2600000, imageUrl: phoenixGT,    description: 'Performance and style.' },
  ], []);
  const [storeItems, setStoreItems] = useState(jets);

  // ---------- HELPERS ----------
  /**
   * logActivity
   * -----------
   * Adds a local activity record (client-side only).
   * @param {string} username
   * @param {string} activity
   */
  const logActivity = (username, activity) => {
    const timestamp = new Date().toLocaleString();
    setActivityLog(prev => [...prev, { datetime: timestamp, username, activity }]);
  };

  /**
   * fetchPurchasesForUser
   * ---------------------
   * Loads all purchased items for a given user from the server.
   * @param {string} username
   * @returns {Promise<Array>} items array
   */
  const fetchPurchasesForUser = async (username) => {
    try {
      const res = await fetch(`http://localhost:3001/api/purchase/${username}`);
      if (!res.ok) throw new Error('Failed to load purchases');
      const purchaseRecords = await res.json();
      return purchaseRecords.flatMap(record => record.items || []);
    } catch (err) {
      console.error('❌ Error fetching purchases:', err);
      return [];
    }
  };

  /**
   * handleLogin
   * -----------
   * Sets user state, logs activity, fetches purchases, and navigates to store.
   * @param {{username:string,email:string}} userData
   */
  const handleLogin = async (userData) => {
    setUser(userData);
    logActivity(userData.username, 'login');
    const loadedItems = await fetchPurchasesForUser(userData.username);
    setPurchasedItems(loadedItems);
    setView('store');
  };

  /**
   * handleLogout
   * ------------
   * Calls the server to clear auth cookies, then clears local state and routes to register.
   */
  const handleLogout = async () => {
    try {
      await fetch('http://localhost:3001/api/logout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-Username': user?.username || '' },
        body: JSON.stringify({ username: user?.username || '' })
      });
    } catch (e) {
      // Non-fatal: proceed with client-side cleanup regardless
    } finally {
      if (user) logActivity(user.username, 'logout');
      setUser(null);
      setCart([]);
      setPurchasedItems([]);
      setView('register');
    }
  };

  /**
   * handleAddToCart
   * ---------------
   * Adds a jet to the cart and logs activity for authenticated users.
   * @param {Object} jet
   */
  const handleAddToCart = (jet) => {
    if (user) logActivity(user.username, `add-to-cart: ${jet.name}`);
    setCart(prev => [...prev, jet]);
  };

  /**
   * handleRemoveFromCart
   * --------------------
   * Removes a single instance of a jet (by id) from the cart.
   * @param {number|string} jetId
   */
  const handleRemoveFromCart = (jetId) => {
    setCart(prev => {
      const index = prev.findIndex(jet => jet.id === jetId);
      if (index === -1) return prev;
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
  };

  /**
   * handleConfirmCheckout
   * ---------------------
   * After payment succeeds, refreshes purchased items from the server,
   * clears cart, and navigates to the Thank You page.
   */
  const handleConfirmCheckout = async () => {
    if (!user?.username) return;
    try {
      const updatedRes = await fetch(`http://localhost:3001/api/purchase/${user.username}`);
      const updated = await updatedRes.json();
      const allItems = updated.flatMap(record => record.items || []);
      setPurchasedItems(allItems);
      setCart([]);
      setView('thankyou');
    } catch (err) {
      console.error('❌ Error updating purchased items after payment:', err);
      alert('✅ Payment was successful, but failed to update your items.');
    }
  };

  /**
   * refreshStoreItems
   * -----------------
   * Fetches additional products from the server and merges with base jets.
   */
  const refreshStoreItems = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:3001/api/products');
      const backendJets = await res.json();
      setStoreItems([...jets, ...backendJets]);
    } catch (err) {
      console.error('❌ Failed to refresh store items:', err);
    }
  }, [jets]);

  useEffect(() => { refreshStoreItems(); }, [refreshStoreItems]);

  // ---------- LAYOUT WRAPPER ----------
  /**
   * renderPage
   * ----------
   * Renders a page component with the theme toggle and (optionally) the menu.
   * @param {React.ComponentType<any>} Component
   * @param {Object} props
   * @param {boolean} withMenu
   * @returns {JSX.Element}
   */
  const renderPage = (Component, props, withMenu = true) => (
    <>
      <div className="theme-toggle-anchor">
        <ThemeToggle onToggle={toggleTheme} />
      </div>
      {withMenu && (
        <MenuButton user={user} onNavigate={setView} onLogout={handleLogout} />
      )}
      <Component {...props} />
    </>
  );

  // ---------- ROUTING ----------
  if (!user && view === 'login') {
    return renderPage(AlreadyReg, {
      onLogin: handleLogin,
      onBackToRegister: () => setView('register')
    }, /* withMenu */ false);
  }

  if (!user && view === 'register') {
    return renderPage(Register, {
      onLogin: handleLogin,
      onShowLogin: () => setView('login')
    }, /* withMenu */ false);
  }

  if (user && view === 'store') {
    return renderPage(StoreScreen, {
      user,
      cart,
      onAddToCart: handleAddToCart,
      onShowCart: () => setView('cart'),
      onLogout: handleLogout,
      setView,
      storeItems
    });
  }

  if (user && view === 'cart') {
    return renderPage(CartPage, {
      cart,
      onBack: () => setView('store'),
      onRemove: handleRemoveFromCart,
      onCheckout: () => setView('pay')
    });
  }

  if (user && view === 'pay') {
    return renderPage(PayScreen, {
      total: cart.reduce((sum, item) => sum + item.price, 0),
      cart,
      user,
      onBack: () => setView('cart'),
      onConfirm: handleConfirmCheckout,
      onClearCart: () => setCart([]),
      setPurchasedItems
    });
  }

  if (user && view === 'thankyou') {
    return renderPage(ThankYouPage, { onGoToStore: () => setView('store') });
  }

  if (user && view === 'myItems') {
    return renderPage(MyItemsPage, {
      purchasedItems,
      onBackToStore: () => setView('store')
    });
  }

  if (user && view === 'about') {
    return renderPage(AboutPage, { onBackToStore: () => setView('store') });
  }

  if (user && view === 'reviews') {
    return renderPage(ReviewsPage, { user, onBackToStore: () => setView('store') });
  }

  if (user?.username === 'admin' && view === 'admin') {
    return renderPage(AdminPage, {
      user,
      storeItems,
      setStoreItems,
      onBackToStore: async () => { await refreshStoreItems(); setView('store'); }
    });
  }

  if (user && view === 'faq') {
    return renderPage(FAQPage, { onBackToStore: () => setView('store') });
  }

  if (user && view === 'contact') {
    return renderPage(ContactPage, { user, onBackToStore: () => setView('store') });
  }

  return null;
}

export default App;
