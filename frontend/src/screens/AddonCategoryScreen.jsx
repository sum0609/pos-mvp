import { useState, useEffect } from 'react';
import { api } from '../api';

export default function AddonCategoryScreen() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ id: null, name: '', selection_type: 'single' });

  const loadData = async () => {
    const data = await api.getAddonCategories();
    setCategories(data);
  };
  useEffect(() => { loadData(); }, []);

  const save = async (e) => {
    e.preventDefault();
    try {
      if (form.id) {
        // Edit existing
        await api.updateAddonCategory(form.id, form);
      } else {
        // Create new
        await api.createAddonCategory(form);
      }
      resetForm();
      loadData();
    } catch (err) {
      alert("Failed to save: " + err.message);
    }
  };


  const handleEdit = (cat) => {
    // Populate form with existing data
    setForm({
      id: cat.id,
      name: cat.name,
      selection_type: cat.selection_type || 'single',
      is_active: cat.is_active ?? 1
    });
  };

  const resetForm = () => {
    setForm({ id: null, name: '', selection_type: 'single', is_active: 1 });
  };

  return (
    <div className="split-grid">
      <div className="card">
        <h3>{form.id ? 'Edit Add-on Category' : 'New Add-on Category'}</h3>
        <form className="form" onSubmit={save}>
          <label className="muted text-sm">Category Name</label>
          <input 
            className="input" 
            placeholder="e.g. Extra Toppings" 
            value={form.name} 
            onChange={e => setForm({...form, name: e.target.value})} 
            required 
          />
          
          <label className="muted text-sm">Selection Logic</label>
          <select 
            className="input" 
            value={form.selection_type} 
            onChange={e => setForm({...form, selection_type: e.target.value})}
          >
            <option value="single">Single (Radio buttons)</option>
            <option value="multiple">Multiple (Checkboxes)</option>
          </select>

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
              {form.id ? 'Update' : 'Create'}
            </button>
            {form.id && (
              <button className="btn flex-1" type="button" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card">
        <h3>Existing Groups</h3>
        <div className="simple-list">
          {categories.map(c => (
            <div 
              key={c.id} 
              className={`held-row ${form.id === c.id ? 'active-edit' : ''}`} 
              onClick={() => handleEdit(c)}
              style={{ cursor: 'pointer' }}
            >
              <div>
                <strong>{c.name}</strong>
                <div className="muted text-xs">
                  {c.selection_type === 'single' ? 'Pick one' : 'Pick many'} • 
                  {c.is_active ? ' Active' : ' Inactive'}
                </div>
              </div>
              <span className="edit-indicator text-blue-500 text-sm">Edit</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}