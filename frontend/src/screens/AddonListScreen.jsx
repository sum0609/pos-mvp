import { useState, useEffect } from 'react';
import { api, toCents, fromCents } from '../api';

export default function AddonListScreen() {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [activeCat, setActiveCat] = useState('');
  // Added 'id' and 'is_active' to the base form state
  const [form, setForm] = useState({ id: null, name: '', price: '', is_active: 1 });

  useEffect(() => {
    api.getAddonCategories().then(setCategories);
    api.getAddonItems().then(setItems);
  }, []);

  const filteredItems = items.filter(i => i.category_id === activeCat);

  const handleEdit = (item) => {
    setForm({
      id: item.id,
      name: item.name,
      price: fromCents(item.price_cents),
      is_active: item.is_active
    });
  };

  const resetForm = () => {
    setForm({ id: null, name: '', price: '', is_active: 1 });
  };

  const saveItem = async (e) => {
    e.preventDefault();
    if (!activeCat) return alert("Select a category first");

    // Prepare the payload for the backend (converting price to cents)
    const payload = { 
      category_id: activeCat,
      name: form.name, 
      price_cents: toCents(form.price),
      is_active: form.is_active 
    };

    try {
      if (form.id) {
        // Update existing item
        await api.updateAddonItem(form.id, payload);
      } else {
        // Create new item
        await api.createAddonItem(payload);
      }
      
      resetForm();
      const freshItems = await api.getAddonItems();
      setItems(freshItems);
    } catch (err) {
      alert("Error saving item: " + err.message);
    }
  };

  return (
    <div className="split-grid">
      <div className="card">
        <h3>{form.id ? 'Edit Add-on Item' : 'Add-on Items'}</h3>

        <label className="muted">Add-On Category</label>
        <select className="input" value={activeCat} onChange={e => setActiveCat(e.target.value)}>
          <option value="">-- Select Category --</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        
        <form className="form" onSubmit={saveItem}>
          <label className="muted">Add-On Item</label>
          <input className="input" placeholder="Item Name" 
            value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
        
          <label className="muted">Price (£)</label>
          <input className="input" type="number" step="0.01" placeholder="0.00" 
            value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
          
          <label className="muted" style={{ fontSize: '12px' }}>Status</label>
          <label className="flex-row items-center gap-2 mt-2">
            {/* <input 
              type="checkbox" 
              checked={form.is_active === 1} 
              onChange={e => setForm({...form, is_active: e.target.checked ? 1 : 0})} 
            /> */}
           
          <select
            className='input'
            value={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: Number(e.target.value) })}
          >
            <option value={1}>Active (Visible in POS)</option>
            <option value={0}>Inactive (Hidden)</option>
          </select>
          </label>
          <div className="flex-row gap-2 mt-4">
            <button className="btn primary flex-1" type="submit">
              {form.id ? 'Update' : 'Add to List'}
            </button>
            {form.id && <button className="btn" type="button" onClick={resetForm}>Cancel</button>}
          </div>
        </form>
      </div>

      <div className="card">
        <h4>Items in {categories.find(c => c.id === activeCat)?.name || '...'}</h4>
        <div className="simple-list">
          {filteredItems.map(item => (
            <div 
              key={item.id} 
              className={`held-row ${form.id === item.id ? 'active-edit' : ''}`} 
              onClick={() => handleEdit(item)}
              style={{ cursor: 'pointer' }}
            >
              <span>{item.name}</span>
              <strong>+ £{fromCents(item.price_cents)}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}