import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import './AdminPage.css';
import Logo from '../components/Logo';
import {
  ResponsiveContainer,
  BarChart, Bar,
  CartesianGrid, XAxis, YAxis, Tooltip
} from 'recharts';

// Helper: Convert File to base64
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function AdminPage({ user, storeItems, setStoreItems, onBackToStore }) {
  // ---------- Products form ----------
  const [newItem, setNewItem] = useState({ name: '', price: '', imageFile: null, image: '' });
  const fileInputRef = useRef(null);

  // ---------- Activity & Sales ----------
  const [logs, setLogs] = useState([]);
  const [bucket, setBucket] = useState('day');
  const [salesRows, setSalesRows] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [loadingSales, setLoadingSales] = useState(false);

  // ---------- Filters (per column) ----------
  const [filters, setFilters] = useState({
    username: '',
    activity: '',
    from: '', // YYYY-MM-DD
    to: ''    // YYYY-MM-DD
  });

  // ====== Fetch Activity ======
const fetchLogs = useCallback(async () => {
  setLoadingLogs(true);
  try {
    const res = await fetch('http://localhost:3001/api/admin/activity', {
      headers: { 'X-Username': user?.username || '' },
      credentials: 'include'
    });
    if (!res.ok) throw new Error('Failed to load activity');
    const data = await res.json();
    setLogs(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error('❌ fetchLogs error:', err);
  } finally {
    setLoadingLogs(false);
  }
}, [user?.username]);

// בתוך AdminPage.jsx – החלף את fetchSales
const fetchSales = useCallback(async (b) => {
  setLoadingSales(true);
  try {
    const res = await fetch(`http://localhost:3001/api/admin/activity/sales?bucket=${encodeURIComponent(b)}`, {
      headers: { 'X-Username': user?.username || '' },
      credentials: 'include'
    });
    if (!res.ok) throw new Error('Failed to load sales');
    const data = await res.json();

    // ✅ תמיכה גם בפורמט החדש וגם בישן
    let rows = [];
    if (Array.isArray(data)) {
      // פורמט ישן: [{ date, count }]
      rows = data.map(r => ({ bucket: r.date, units: r.count }));
    } else if (Array.isArray(data.rows)) {
      // פורמט חדש: { rows: [{ bucket, units }] }
      rows = data.rows;
    }
    setSalesRows(rows);
  } catch (err) {
    console.error('❌ fetchSales error:', err);
    setSalesRows([]);
  } finally {
    setLoadingSales(false);
  }
}, [user?.username]);

useEffect(() => { fetchLogs(); }, [fetchLogs]);
useEffect(() => { fetchSales(bucket); }, [fetchSales, bucket]);


  // ====== Filters ======
  const filteredLogs = useMemo(() => {
    return logs.filter(r => {
      const uname = String(r.username || '').toLowerCase();
      const act = String(r.activity || '').toLowerCase();
      const t = new Date(r.datetime).getTime();

      const uOk = filters.username ? uname.includes(filters.username.toLowerCase()) : true;
      const aOk = filters.activity ? act.includes(filters.activity.toLowerCase()) : true;

      const fromOk = filters.from ? (t >= new Date(filters.from + 'T00:00:00').getTime()) : true;
      const toOk = filters.to ? (t <= new Date(filters.to + 'T23:59:59').getTime()) : true;

      return uOk && aOk && fromOk && toOk;
    });
  }, [logs, filters]);

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

      setNewItem({ name: '', price: '', imageFile: null, image: '' });
      if (fileInputRef.current) fileInputRef.current.value = null;
    } catch (err) {
      console.error('❌ Error saving product to server:', err);
      alert(err.message || 'Failed to save product to server.');
    }
  };

  // =========================
  // Delete product
// ... בתוך AdminPage.jsx
const handleRemove = async (id) => {
  try {
    const res = await fetch(`http://localhost:3001/api/products/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'X-Username': user?.username || '' },
      credentials: 'include'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to delete/hide product (status ${res.status})`);
    }
    // מחיקה מקומית אחרי הצלחה מהשרת
    setStoreItems(prev => prev.filter(item => String(item.id) !== String(id)));
  } catch (err) {
    console.error('❌ Error deleting/hiding product:', err);
    alert(err.message || 'Failed to delete/hide product on server.');
  }
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
      setNewItem(prev => ({ ...prev, imageFile: file, image: base64 }));
    });
  };
  const handleFileChange = (e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); };
  const handleDrop = (e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleImageUpload(f); };
  const handleDragOver = (e) => e.preventDefault();

  // =========================
  // UI
  // =========================
  return (
    <div className="admin-container">
      <Logo />

      {/* ===== Products management ===== */}
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

      <div className="image-drop-area" onDrop={handleDrop} onDragOver={handleDragOver}>
        <p>Drag & drop an image or choose a file</p>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} />
        {newItem.imageFile && typeof newItem.image === 'string' && newItem.image.startsWith('data:image') && (
          <div className="image-preview">
            <img src={newItem.image} alt="Preview" />
            <button
              className="remove-image"
              onClick={() => setNewItem(prev => ({ ...prev, imageFile: null, image: '' }))}
            >❌</button>
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
            <button className="delete-button" onClick={() => handleRemove(item.id)}>Delete</button>
          </div>
        ))}
      </div>

      {/* ===== Sales chart ===== */}
      <div className="card mt">
        <div className="admin-toolbar">
          <h3>Sales (from activity log)</h3>
          <div className="tabs">
            {['day', 'week', 'month', 'year'].map(b => (
              <button
                key={b}
                className={`tab ${bucket === b ? 'active' : ''}`}
                onClick={() => setBucket(b)}
              >
                {b.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {loadingSales ? (
          <div className="loading">Loading chart…</div>
        ) : (
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={salesRows}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bucket" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="units" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ===== Activity table with per-column filters ===== */}
      <div className="card mt">
        <div className="admin-toolbar">
          <h3>Activity</h3>
          <button className="refresh" onClick={fetchLogs} disabled={loadingLogs}>
            {loadingLogs ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        <div className="grid-2 gap">
          <div className="field">
            <span>Filter by username</span>
            <input
              value={filters.username}
              onChange={e => setFilters(f => ({ ...f, username: e.target.value }))}
              placeholder="e.g. alon"
            />
          </div>
          <div className="field">
            <span>Filter by activity text</span>
            <input
              value={filters.activity}
              onChange={e => setFilters(f => ({ ...f, activity: e.target.value }))}
              placeholder="e.g. completed purchase"
            />
          </div>
          <div className="field">
            <span>From date</span>
            <input
              type="date"
              value={filters.from}
              onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
            />
          </div>
          <div className="field">
            <span>To date</span>
            <input
              type="date"
              value={filters.to}
              onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
            />
          </div>
        </div>

        {loadingLogs ? (
          <div className="loading">Loading activity…</div>
        ) : filteredLogs.length === 0 ? (
          <div className="empty">No activity found.</div>
        ) : (
          <table className="activity-table">
            <thead>
              <tr>
                <th>DateTime</th>
                <th>Username</th>
                <th>Activity</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, idx) => (
                <tr key={idx}>
                  <td>{log.datetime}</td>
                  <td>{log.username}</td>
                  <td>{log.activity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <button className="back-btn mt" onClick={onBackToStore}>← Back to Store</button>
    </div>
  );
}

export default AdminPage;