import React, { useState, useRef, useEffect } from 'react';
import './AdminPage.css';
import Logo from '../components/Logo';

// Helper: Convert File to base64
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function AdminPage({ user, storeItems, setStoreItems, onBackToStore, activityLog = [], setActivityLog }) {
  const [newItem, setNewItem] = useState({
    name: '',
    price: '',
    imageFile: null,
    image: '' // base64 image (preview)
  });
  const fileInputRef = useRef(null);
  const [filterPrefix, setFilterPrefix] = useState('');

  // ---- NEW: activity from server ----
  const [serverActivity, setServerActivity] = useState([]);
  const [actLoading, setActLoading] = useState(false);
  const [actError, setActError] = useState('');

  const fetchActivity = async () => {
    if (user?.username !== 'admin') return;
    setActLoading(true);
    setActError('');
    try {
      const res = await fetch('http://localhost:3001/api/admin/activity', {
        headers: { 'X-Username': user?.username || '' },
        credentials: 'include'
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to load activity (status ${res.status})`);
      }
      const data = await res.json();
      setServerActivity(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('❌ Activity fetch error:', e);
      setActError(e.message || 'Failed to load activity');
      setServerActivity([]);
    } finally {
      setActLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.username]);

  // =========================
  // Create product (Admin)
  // =========================
  const handleAddItem = async () => {
    const { name, price, imageFile } = newItem;

    if (!name || !price || !imageFile) {
      alert('Please fill in all fields and add an image.');
      return;
    }

    try {
      const base64Image = await toBase64(imageFile);

      const res = await fetch('http://localhost:3001/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Username': user?.username || ''
        },
        credentials: 'include',
        body: JSON.stringify({
          title: name,
          name,
          description: 'Added via admin panel',
          price: Number(price),
          imageUrl: base64Image
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to save product to server (status ${res.status})`);
      }

      const created = await res.json();
      const normalized = {
        id: created.id,
        name: created.name || created.title || name,
        price: Number(created.price) || Number(price) || 0,
        imageUrl: created.imageUrl || base64Image,
        description: created.description || 'Added via admin panel'
      };

      setStoreItems(prev => [...prev, normalized]);
      console.log('✅ Product saved to server');

      // Reset UI
      setNewItem({ name: '', price: '', imageFile: null, image: '' });
      if (fileInputRef.current) fileInputRef.current.value = null;

      // Optional client-side activity append
      if (setActivityLog) {
        setActivityLog(prev => [
          ...prev,
          {
            datetime: new Date().toLocaleString(),
            username: 'admin',
            activity: `Added product: ${normalized.name}`
          }
        ]);
      }
      // Refresh server activity to reflect latest actions if you log them server-side
      fetchActivity();
    } catch (err) {
      console.error('❌ Error saving product to server:', err);
      alert(err.message || 'Failed to save product to server.');
    }
  };

  // =========================
  // Delete product
  // =========================
  const handleRemove = async (id) => {
    const isServerProduct = typeof id === 'string' && id.startsWith('p'); // products.json

    if (isServerProduct) {
      try {
        const res = await fetch(`http://localhost:3001/api/products/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: { 'X-Username': user?.username || '' },
          credentials: 'include'
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Failed to delete product (status ${res.status})`);
        }
      } catch (err) {
        console.error('❌ Error deleting product on server:', err);
        alert(err.message || 'Failed to delete product on server.');
        return; // do not remove locally if server failed
      }
    }

    const removedItem = storeItems.find(item => item.id === id);
    setStoreItems(prev => prev.filter(item => item.id !== id));

    if (setActivityLog && removedItem) {
      setActivityLog(prev => [
        ...prev,
        {
          datetime: new Date().toLocaleString(),
          username: 'admin',
          activity: `Deleted product: ${removedItem.name}`
        }
      ]);
    }
    fetchActivity();
  };

  // =========================
  // Image handlers
  // =========================
  const handleImageUpload = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please upload a valid image file.');
      return;
    }
    toBase64(file).then(base64 => {
      setNewItem(prev => ({
        ...prev,
        imageFile: file,
        image: base64
      }));
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageUpload(file);
  };

  const handleDragOver = (e) => e.preventDefault();

  // ---- filter the **server** activity by prefix
  const filteredActivity = (serverActivity || []).filter(log =>
    String(log.username || '')
      .toLowerCase()
      .startsWith(filterPrefix.toLowerCase())
  );

  // =========================
  // UI
  // =========================
  return (
    <div className="admin-container">
      <Logo />
      <h2>Manage Products</h2>

      <input
        type="text"
        placeholder="Name"
        value={newItem.name}
        onChange={e => setNewItem(prev => ({ ...prev, name: e.target.value }))}
      />
      <input
        type="number"
        placeholder="Price"
        value={newItem.price}
        onChange={e => setNewItem(prev => ({ ...prev, price: e.target.value }))}
      />

      <div
        className="image-drop-area"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <p>Drag & drop an image or choose a file</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
        />

        {newItem.imageFile &&
          typeof newItem.image === 'string' &&
          newItem.image.startsWith('data:image') && (
            <div className="image-preview">
              <img src={newItem.image} alt="Preview" />
              <button
                className="remove-image"
                onClick={() =>
                  setNewItem(prev => ({ ...prev, imageFile: null, image: '' }))
                }
              >
                ❌
              </button>
            </div>
          )}
      </div>

      <button className="add-button" onClick={handleAddItem}>Add Product</button>

      <h3>Current Products:</h3>
      <div className="products-list">
        {storeItems.map(item => (
          <div key={item.id} className="product-row">
            <div className="product-details">
              <strong>{item.name}</strong> — ${Number(item.price).toLocaleString()}
            </div>
            <button className="delete-button" onClick={() => handleRemove(item.id)}>
              Delete
            </button>
          </div>
        ))}
      </div>

      <h3>Activity Log</h3>

      <div className="admin-toolbar">
        <input
          type="text"
          placeholder="Filter by username prefix"
          value={filterPrefix}
          onChange={e => setFilterPrefix(e.target.value)}
          className="filter-input"
        />
        <button className="refresh" onClick={fetchActivity} disabled={actLoading}>
          {actLoading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {actError && <div className="form-note err">{actError}</div>}

      <table className="activity-table">
        <thead>
          <tr>
            <th>DateTime</th>
            <th>Username</th>
            <th>Activity</th>
          </tr>
        </thead>
        <tbody>
          {filteredActivity.length === 0 ? (
            <tr>
              <td colSpan="3" className="empty">No activity to show</td>
            </tr>
          ) : (
            filteredActivity.map((log, idx) => (
              <tr key={idx}>
                <td>{log.datetime}</td>
                <td>{log.username}</td>
                <td>{log.activity}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <button className="back-btn" onClick={onBackToStore}>← Back to Store</button>
    </div>
  );
}

export default AdminPage;
