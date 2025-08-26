// src/App.js
import React, { useState, useMemo, useCallback } from 'react';
import { useEffect } from 'react';

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

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('register');
  const [cart, setCart] = useState([]);
  const [purchasedItems, setPurchasedItems] = useState([]);
  const [, setActivityLog] = useState([]);
  const [theme, setTheme] = useState(() => localStorage.getItem('ui.theme') || 'light');
  <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>
  Toggle Theme
</button>


  const jets = useMemo(() => [
    { id: 1, name: 'Falcon',       price: 2500000, imageUrl: falcon,       description: 'High-speed private jet.' },
    { id: 2, name: 'SkyLiner 200', price: 1800000, imageUrl: skyLiner200,  description: 'Luxurious comfort in the skies.' },
    { id: 3, name: 'AeroSwift',    price: 3200000, imageUrl: aeroSwift,    description: 'Cutting-edge design and performance.' },
    { id: 4, name: 'CloudCruiser', price: 2100000, imageUrl: cloudCruiser, description: 'Smooth flight guaranteed.' },
    { id: 5, name: 'JetStream 500',price: 2900000, imageUrl: jetStream500, description: 'State-of-the-art avionics.' },
    { id: 6, name: 'Eagle Eye',    price: 2300000, imageUrl: eagleEye,     description: 'Premium surveillance jet.' },
    { id: 7, name: 'SkyDancer',    price: 2750000, imageUrl: skyDancer,    description: 'Elegant and efficient.' },
    { id: 8, name: 'Nimbus 300',   price: 1950000, imageUrl: nimbus300,    description: 'Compact business jet.' },
    { id: 9, name: 'Horizon 700',  price: 3500000, imageUrl: horizon700,   description: 'Long-range luxury.' },
    { id: 10, name: 'Phoenix GT',  price: 2600000, imageUrl: phoenixGT,    description: 'Performance and style.' },
  ], []);

  useEffect(() => {
  localStorage.setItem('ui.theme', theme);
  document.documentElement.dataset.theme = theme; // מחבר ל-CSS
}, [theme]);

  const [storeItems, setStoreItems] = useState(jets);

  const logActivity = (username, activity) => {
    const timestamp = new Date().toLocaleString();
    setActivityLog(prev => [...prev, { datetime: timestamp, username, activity }]);
  };

  const handleLogin = async (userData) => {
    console.log('👤 Logged in as:', userData);
    setUser(userData);
    console.log('👤 Logged in as:', userData);
    logActivity(userData.username, 'login');
    const loadedItems = await fetchPurchasesForUser(userData.username);
    setPurchasedItems(loadedItems);
    setView('store');
  };

  const handleLogout = () => {
    if (user) logActivity(user.username, 'logout');
    setUser(null);
    setCart([]);
    setPurchasedItems([]);
    setView('register');
  };

  const handleAddToCart = (jet) => {
    if (user) logActivity(user.username, `add-to-cart: ${jet.name}`);
    setCart(prev => [...prev, jet]);
  };

  const handleRemoveFromCart = (jetId) => {
    setCart(prev => {
      const index = prev.findIndex(jet => jet.id === jetId);
      if (index === -1) return prev;
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleConfirmCheckout = async () => {
    if (!user?.username) {
      console.error('❌ No logged-in user found');
      return;
    }

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

  const refreshStoreItems = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:3001/api/products');
      const backendJets = await res.json();
      setStoreItems([...jets, ...backendJets]);
    } catch (err) {
      console.error('❌ Failed to refresh store items:', err);
    }
  }, [jets]);

  useEffect(() => {
    refreshStoreItems();
  }, [refreshStoreItems]);

  const renderWithMenu = (Component, props) => (
    <>
      <MenuButton user={user} onNavigate={setView} onLogout={handleLogout} />
      <Component {...props} />
    </>
  );

  if (!user && view === 'login') {
    return <AlreadyReg onLogin={handleLogin} onBackToRegister={() => setView('register')} />;
  }

  if (!user && view === 'register') {
    return <Register onLogin={handleLogin} onShowLogin={() => setView('login')} />;
  }

  if (user && view === 'store') {
    return renderWithMenu(StoreScreen, {
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
    return renderWithMenu(CartPage, {
      cart,
      onBack: () => setView('store'),
      onRemove: handleRemoveFromCart,
      onCheckout: () => setView('pay')
    });
  }

  if (user && view === 'pay') {
    return renderWithMenu(PayScreen, {
      total: cart.reduce((sum, item) => sum + item.price, 0),
      cart,
      user,
      onBack: () => setView('cart'),
      onConfirm: handleConfirmCheckout,
      onClearCart: () => setCart([]),
      setPurchasedItems,
    });
  }

  if (user && view === 'thankyou') {
    return renderWithMenu(ThankYouPage, {
      onGoToStore: () => setView('store')
    });
  }

  if (user && view === 'myItems') {
    return renderWithMenu(MyItemsPage, {
      purchasedItems,
      onBackToStore: () => setView('store')
    });
  }
  if (user && view === 'about') {
  return renderWithMenu(AboutPage, {
    onBackToStore: () => setView('store')
  });
}
if (user && view === 'reviews') {
  return renderWithMenu(ReviewsPage, {
    user,                    // ✅ pass user so we can set author automatically
    onBackToStore: () => setView('store')
  });
}

  if (user?.username === 'admin' && view === 'admin') {
    return renderWithMenu(AdminPage, {
      user,
      storeItems,
      setStoreItems,
      onBackToStore: async () => {
        await refreshStoreItems(); // 🆕 רענון אחרי הוספת מוצרים
        setView('store');
      }
    });
  }
if (user && view === 'faq') {
  return renderWithMenu(FAQPage, {
    onBackToStore: () => setView('store'),
  });
}

if (user && view === 'contact') {
  return renderWithMenu(ContactPage, {
    user,
    onBackToStore: () => setView('store'),
  });
}


  return null;
}

export default App;