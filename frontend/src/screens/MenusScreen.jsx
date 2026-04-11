import { useState, useMemo } from 'react';
import { api } from '../api';

export default function MenusScreen({ menus, refreshMenus }) {
  const [form, setForm] = useState({ id: null, name: '', is_active: 1, is_discountable: 1 });

  async function save(e) {
    e.preventDefault();
    if (form.id) await api.updateMenu(form.id, form);
    else await api.createMenu(form);
    setForm({ id: null, name: '', is_active: 1, is_discountable: 1 });
    refreshMenus();
  }

  return (
    <div className="split-grid">
      <div className="card">
        <h3>{form.id ? 'Edit Menu' : 'Add Menu'}</h3>
        <form className="form" onSubmit={save}>
          <input className="input" placeholder="Menu Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          <select className="input" value={form.is_active} onChange={e => setForm({...form, is_active: Number(e.target.value)})}>
            <option value={1}>Active</option>
            <option value={0}>Inactive</option>
          </select>
          <label className="checkbox-container">
            <input 
              type="checkbox" 
              checked={form.is_discountable === 0} 
              onChange={e => setForm({...form, is_discountable: e.target.checked ? 0 : 1})} 
            />
            <span>Exclude from Discounts</span>
          </label>


          <button className="btn primary">{form.id ? 'Update' : 'Save'}</button>
          {form.id && (
            <button type="button" className="btn" onClick={() => setForm({id: null, name: '', is_active: 1, is_discountable: 1})}
            >
              Cancel
            </button>
          )}
        </form>
      </div>
      <div className="card">
        <h3>Current Menus</h3>
        <div className="simple-list">
          {menus.map(m => (
            <div key={m.id} className="held-row" onClick={() => setForm(m)} style={{cursor:'pointer'}}>
              <div style={{display:'flex', flexDirection:'column'}}>
                <strong>{m.name}</strong>
                {/* 3. Visual indicator in the list */}
                {!m.is_discountable && <small className="text-danger">No Discounts</small>}
              </div>
              <span className={m.is_active ? 'text-success' : 'muted'}>{m.is_active ? '● Active' : '○ Inactive'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
