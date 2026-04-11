import { useState, useEffect } from 'react';
import { api } from '../api';

export default function TableSettingsScreen() {
  const [tables, setTables] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ id: null, name: '', capacity: 2, is_active: 1 });

  useEffect(() => { loadTables(); }, []);

  async function loadTables() {
    const data = await api.getTables();
    setTables(data);
  }

  async function save(e) {
    e.preventDefault();
    try {
      if (isEditing) {
        await api.updateTable(form.id, form);
      } else {
        await api.createTable(form);
      }
      resetForm();
      loadTables();
    } catch (err) { alert(err.message); }
  }

  function handleEdit(table) {
    setForm(table);
    setIsEditing(true);
  }

  function resetForm() {
    setForm({ id: null, name: '', capacity: 2, is_active: 1 });
    setIsEditing(false);
  }

  return (
    <div className="split-grid">
      <div className="card">
        <h3>{isEditing ? 'Edit Table' : 'Add New Table'}</h3>
        <form className="form" onSubmit={save}>
          <label className="muted">Table Name / Number</label>
          <input 
            className="input" 
            value={form.name} 
            onChange={e => setForm({...form, name: e.target.value})} 
            placeholder="e.g. Table 5 or Window Booth"
            required 
          />
          
          <label className="muted">Capacity (Seats)</label>
          <input 
            type="number" 
            className="input" 
            value={form.capacity} 
            onChange={e => setForm({...form, capacity: Number(e.target.value)})} 
          />
          <select
            className='input'
            value={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: Number(e.target.value) })}
          >
            <option value={1}>Active (Visible in POS)</option>
            <option value={0}>Inactive (Hidden)</option>
          </select>

          <button className="btn primary" type="submit">
            {isEditing ? 'Update Table' : 'Create Table'}
          </button>
          {isEditing && <button className="btn" onClick={resetForm}>Cancel</button>}
        </form>
      </div>

      <div className="card">
        <h3>Current Tables</h3>
        <div className="simple-list">
          {tables.map(t => (
            <div key={t.id} className="held-row" onClick={() => handleEdit(t)}>
              <div>
                <strong>{t.name}</strong>
                <div className="muted">{t.capacity} Seats</div>
              </div>
              <button className="btn">Edit</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}