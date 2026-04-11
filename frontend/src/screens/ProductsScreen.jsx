import { useState, useEffect, useMemo } from 'react';
import { api, toCents, fromCents } from '../api';

export default function ProductsScreen({ menus, categories, activeMenu, setActiveMenu, refreshProducts }) {
  const [products, setProducts] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  const [form, setForm] = useState({
    id: null,
    category_id: '',
    name: '',
    price: '', 
    vat_percent: 20,
    barcode: '',
    color: '#ffffff',
    is_active: 1
  });

  const loadProducts = async () => {
    const data = await api.getProducts();
    setProducts(data);
  };

  useEffect(() => { loadProducts(); }, []);

  // 1. Filter Categories based on the GLOBAL activeMenu
  const filteredCategories = useMemo(() => {
    return activeMenu 
      ? categories.filter(c => c.menu_id === activeMenu)
      : categories;
  }, [activeMenu, categories]);

  // 2. Keep Category Selection in sync with Menu changes
  useEffect(() => {
    if (!isEditing) {
      if (filteredCategories.length > 0) {
        // If the current selection isn't in the new list, pick the first one
        const isValid = filteredCategories.some(c => c.id === selectedCategoryId);
        if (!isValid) {
          const firstId = filteredCategories[0].id;
          setSelectedCategoryId(firstId);
          setForm(prev => ({ ...prev, category_id: firstId }));
        }
      } else {
        setSelectedCategoryId('');
        setForm(prev => ({ ...prev, category_id: '' }));
      }
    }
  }, [filteredCategories, isEditing, selectedCategoryId]);

  // 3. Filter Products for the Right List
  const filteredProducts = useMemo(() => {
    return selectedCategoryId
      ? products.filter(p => p.category_id === selectedCategoryId)
      : products;
  }, [selectedCategoryId, products]);

  function handleEdit(p) {
    // Find which menu this product belongs to through its category
    const parentCat = categories.find(c => c.id === p.category_id);
    if (parentCat) {
      setActiveMenu(parentCat.menu_id); // This updates the global filter
    }

    setSelectedCategoryId(p.category_id);
    setForm({
      id: p.id,
      category_id: p.category_id,
      name: p.name,
      price: fromCents(p.price_cents),
      vat_percent: p.vat_percent,
      barcode: p.barcode || '',
      color: p.color || '#ffffff',
      is_active: p.is_active
    });
    setIsEditing(true);
  }

  function resetForm() {
    setForm({
      id: null,
      category_id: selectedCategoryId || (filteredCategories[0]?.id || ''),
      name: '',
      price: '',
      vat_percent: 20,
      barcode: '',
      color: '#ffffff',
      is_active: 1
    });
    setIsEditing(false);
  }

  async function save(e) {
    e.preventDefault();
    const payload = { ...form, price_cents: toCents(form.price) };

    if (isEditing) await api.updateProduct(form.id, payload);
    else await api.createProduct(payload);

    resetForm();
    loadProducts();
    if (refreshProducts) refreshProducts();
  }

  return (
    <div className="split-grid">
      <div className="card">
        <h3>{isEditing ? 'Edit Product' : 'Add New Product'}</h3>
        <form className="form" onSubmit={save}>
          
          <label className="muted">Menu (Global Filter)</label>
          <select 
            className="input" 
            value={activeMenu} 
            onChange={(e) => setActiveMenu(e.target.value)} // Updates App.jsx state
          >
            <option value="">-- All Menus --</option>
            {menus.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>

          <label className="muted">Category</label>
          <select 
            className="input" 
            value={form.category_id} 
            onChange={(e) => {
              setForm({...form, category_id: e.target.value});
              setSelectedCategoryId(e.target.value);
            }}
            required
          >
            <option value="">-- Select Category --</option>
            {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <label className="muted">Product Name</label>
          <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />

          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <label className="muted">Price (£)</label>
              <input className="input" type="number" step="0.01" value={form.price} onChange={e => setForm({...form, price: e.target.value})} required />
            </div>
            <div style={{ flex: 1 }}>
              <label className="muted">VAT %</label>
              <input className="input" type="number" value={form.vat_percent} onChange={e => setForm({...form, vat_percent: Number(e.target.value)})} />
            </div>
          </div>

          <label className="muted">Color</label>
          <input className="input" type="color" value={form.color} onChange={e => setForm({...form, color: e.target.value})} />

          <button className="btn primary">{isEditing ? 'Update Product' : 'Save Product'}</button>
          {isEditing && <button type="button" className="btn" onClick={resetForm}>Cancel</button>}
        </form>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <h3>Products</h3>
          <select 
            className="input" 
            style={{ width: 'auto' }} 
            value={selectedCategoryId} 
            onChange={e => setSelectedCategoryId(e.target.value)}
          >
            <option value="">All Categories in {menus.find(m => m.id === activeMenu)?.name || 'Menu'}</option>
            {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="simple-list">
          {filteredProducts.map(p => (
            <div key={p.id} className="held-row" onClick={() => handleEdit(p)} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: p.color }}></div>
                <div>
                  <strong>{p.name}</strong>
                  <div className="muted">{fromCents(p.price_cents)} · {p.vat_percent}% VAT</div>
                </div>
              </div>
              <button className="btn">Edit</button>
            </div>
          ))}
          {filteredProducts.length === 0 && <div className="empty">No products found.</div>}
        </div>
      </div>
    </div>
  );
}