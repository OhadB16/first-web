// src/pages/AdminPage.jsx
// Admin dashboard: products CRUD, sales chart, and activity log.
// - Uses design tokens/classes from AdminPage.css
// - Adds a11y labels, safer fetch, better DnD, and small UX niceties

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import './AdminPage.css';
import Logo from '../components/Logo';
import {
  ResponsiveContainer,
  BarChart, Bar,
  CartesianGrid, XAxis, YAxis, Tooltip
} from 'recharts';

// -----------------------------
// Config & helpers
// -----------------------------
const API_BASE =
  (import.meta?.env?.VITE_API_BASE_URL) ||
  (process?.env?.REACT_APP_API_BASE_URL) ||
  'http://localhost:3001';

const numberFmt = new Intl.NumberFormat(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const formatCurrency = (n) => `$${numberFmt.format(Number(n || 0))}`;

// Convert File → base64 data URL
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// Safe JSON parse (returns {} on failure)
async function safeJson(res) {
  try { return await res.json(); } catch { return {}; }
}

// -----------------------------
// Component
// -----------------------------
function AdminPage({ user, storeItems = [], setStoreItems, onBackToStore }) {
  // ---------- Products form ----------
  const [newItem, setNewItem] = useState({ name: '', price: '', imageFile: null, image: '' });
  const fileInputRef = useRef(null);
  const [isSaving, setIsSaving] = useState(false);

  // Drag state for visual feedback
  const [isDragOver, setIsDragOver] = useState(false);

  // ---------- Activity & Sales ----------
  const [logs, setLogs] = useState([]);
  const [bucket, setBucket] = useState('day');
  const [salesRows, setSalesRows] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [loadingSales, setLoadingSales] = useState(false);

  // ---------- Filters ----------
  const [filters, setFilters] = useState({
    username: '',
    activity: '',
    from: '', // YYYY-MM-DD
    to: ''    // YYYY-MM-DD
  });

  // ====== Fetch Activity ======
  const fetchLogs = useCallback(async () => {
    const ctrl = new AbortController();
    setLoadingLogs(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/activity`, {
        headers: { 'X-Username': user?.username || '' },
        credentials: 'include',
        signal: ctrl.signal
      });
      if (!res.ok) throw new Error('Failed to load activity');
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('❌ fetchLogs error:', err);
    } finally {
      setLoadingLogs(false);
    }
    return () => ctrl.abort();
  }, [user?.username]);

  // ====== Fetch Sales (supports old/new payloads) ======
  const fetchSales = useCallback(async (b) => {
    const ctrl = new AbortController();
    setLoadingSales(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/activity/sales?bucket=${encodeURIComponent(b)}`, {
        headers: { 'X-Username': user?.username || '' },
        credentials: 'include',
        signal: ctrl.signal
      });
      if (!res.ok) throw new Error('Failed to load sales');
      const data = await res.json();

      let rows = [];
      if (Array.isArray(data)) {
        // old format: [{ date, count }]
        rows = data.map(r => ({ bucket: r.date, units: r.count }));
      } else if (Array.isArray(data.rows)) {
        // new format: { rows: [{ bucket, units }] }
        rows = data.rows;
      }
      setSalesRows(rows);
    } catch (err) {
      console.error('❌ fetchSales error:', err);
      setSalesRows([]);
    } finally {
      setLoadingSales(false);
    }
    return () => ctrl.abort();
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

      const fromOk = filters.from ? (t >= new Date(`${filters.from}T00:00:00`).getTime()) : true;
      const toOk   = filters.to   ? (t <= new Date(`${filters.to}T23:59:59`).getTime())   : true;

      return uOk && aOk && fromOk && toOk;
    });
  }, [logs, filters]);

  // =========================
  // Product: Create
  // =========================
  const handleAddItem = useCallback(async () => {
    const { name, price, imageFile } = newItem;

    const trimmed = (name || '').trim();
    const priceNum = Number(price);

    if (!trimmed || !price || Number.isNaN(priceNum) || priceNum <= 0 || !imageFile) {
      alert('Please provide a name, positive price, and an image.');
      return;
    }

    // Guard: image size/type
    if (!imageFile.type.startsWith('image/')) {
      alert('Please upload a valid image file.');
      return;
    }
    if (imageFile.size > 3 * 1024 * 1024) {
      alert('Image is too large (max 3MB). Please choose a smaller file.');
      return;
    }

    setIsSaving(true);
    try {
      const base64Image = await toBase64(imageFile);

      const res = await fetch(`${API_BASE}/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Username': user?.username || ''
        },
        credentials: 'include',
        body: JSON.stringify({
          title: trimmed,
          name: trimmed,
          description: 'Added via admin panel',
          price: priceNum,
          imageUrl: base64Image
        })
      });

      if (!res.ok) {
        const err = await safeJson(res);
        throw new Error(err.error || `Failed to save product (status ${res.status})`);
      }

      const created = await res.json();
      const normalized = {
        id: created.id ?? crypto.randomUUID?.() ?? `${Date.now()}`,
        name: created.name || created.title || trimmed,
        price: Number(created.price ?? priceNum) || 0,
        imageUrl: created.imageUrl || base64Image,
        description: created.description || 'Added via admin panel'
      };

      setStoreItems(prev => [...prev, normalized]);
      setNewItem({ name: '', price: '', imageFile: null, image: '' });
      if (fileInputRef.current) fileInputRef.current.value = null;
      console.log('✅ Product saved to server');
    } catch (err) {
      console.error('❌ Error saving product:', err);
      alert(err.message || 'Failed to save product.');
    } finally {
      setIsSaving(false);
    }
  }, [API_BASE, newItem, setStoreItems, user?.username]);

  // =========================
  // Product: Delete
  // =========================
  const handleRemove = useCallback(async (id) => {
    if (!id) return;
    const ok = window.confirm('Delete this product?');
    if (!ok) return;

    try {
      const res = await fetch(`${API_BASE}/api/products/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'X-Username': user?.username || '' },
        credentials: 'include'
      });
      if (!res.ok) {
        const err = await safeJson(res);
        throw new Error(err.error || `Failed to delete product (status ${res.status})`);
      }
      setStoreItems(prev => prev.filter(item => String(item.id) !== String(id)));
    } catch (err) {
      console.error('❌ Error deleting product:', err);
      alert(err.message || 'Failed to delete product.');
    }
  }, [API_BASE, setStoreItems, user?.username]);

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

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) handleImageUpload(f);
  };

  // DnD events
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleImageUpload(f);
  };
  const handleDragOver = (e) => { e.preventDefault(); };
  const handleDragEnter = (e) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = () => { setIsDragOver(false); };

  // =========================
  // UI
  // =========================
  return (
    <div className="admin-container">
      <Logo />

      {/* optional central wrapper (see CSS ._container) */}
      <div className="_container">

        {/* ===== Products management ===== */}
        <h2>Manage Products</h2>

        <label className="field">
          <span>Product name</span>
          <input
            type="text"
            placeholder="Name"
            value={newItem.name}
            onChange={e => setNewItem(prev => ({ ...prev, name: e.target.value }))}
          />
        </label>

        <label className="field">
          <span>Price</span>
          <input
            type="number"
            placeholder="Price"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={newItem.price}
            onChange={e => setNewItem(prev => ({ ...prev, price: e.target.value }))}
          />
        </label>

        <div
          className={`image-drop-area ${isDragOver ? 'is-dragover' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
          aria-label="Drag and drop an image here or press Enter to choose a file"
        >
          <p>Drag & drop an image or choose a file</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
          />
          {newItem.imageFile && typeof newItem.image === 'string' && newItem.image.startsWith('data:image') && (
            <div className="image-preview">
              <img src={newItem.image} alt="Preview" />
              <button
                className="remove-image"
                onClick={() => setNewItem(prev => ({ ...prev, imageFile: null, image: '' }))}
                aria-label="Remove selected image"
              >
                ❌
              </button>
            </div>
          )}
        </div>

        <button
          className="add-button"
          onClick={handleAddItem}
          disabled={isSaving || !newItem.name || !newItem.price || !newItem.imageFile}
        >
          {isSaving ? 'Saving…' : 'Add Product'}
        </button>

        <h3>Current Products:</h3>
        <div className="products-list">
          {storeItems.map(item => (
            <div key={item.id} className="product-row">
              {item.imageUrl ? (
                <img className="product-thumb" src={item.imageUrl} alt={item.name} loading="lazy" />
              ) : null}
              <div className="product-details">
                <strong>{item.name}</strong> — {formatCurrency(item.price)}
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
                  <Tooltip formatter={(v) => [`${v}`, 'Units']} />
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
            <label className="field">
              <span>Filter by username</span>
              <input
                value={filters.username}
                onChange={e => setFilters(f => ({ ...f, username: e.target.value }))}
                placeholder="e.g. alon"
              />
            </label>
            <label className="field">
              <span>Filter by activity text</span>
              <input
                value={filters.activity}
                onChange={e => setFilters(f => ({ ...f, activity: e.target.value }))}
                placeholder="e.g. completed purchase"
              />
            </label>
            <label className="field">
              <span>From date</span>
              <input
                type="date"
                value={filters.from}
                onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
              />
            </label>
            <label className="field">
              <span>To date</span>
              <input
                type="date"
                value={filters.to}
                onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
              />
            </label>
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
                  <tr key={log.id || idx}>
                    <td>{log.datetime ? new Date(log.datetime).toLocaleString() : '-'}</td>
                    <td>{log.username || '-'}</td>
                    <td>{log.activity || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <button className="back-btn mt" onClick={onBackToStore}>← Back to Store</button>
      </div>
    </div>
  );
}

export default AdminPage;
