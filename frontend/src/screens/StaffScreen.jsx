import { useState, useEffect, useMemo } from 'react';
export default function StaffScreen() {
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState({ id: null, username: '', first_name: '', last_name: '', pin: '', role: 'staff', status: 'active' });

  const load = async () => setStaff(await api.getUsers());
  useEffect(() => { load(); }, []);

  async function save(e) {
    e.preventDefault();
    if (form.id) await api.updateUser(form.id, form);
    else await api.createUser(form);
    setForm({ id: null, username: '', first_name: '', last_name: '', pin: '', role: 'staff', status: 'active' });
    load();
  }

  return (
    <div className="split-grid">
      <div className="card">
        <h3>{form.id ? 'Edit Staff' : 'Add Staff'}</h3>
        <form className="form" onSubmit={save}>
          <input className="input" placeholder="Username" value={form.username} onChange={e => setForm({...form, username: e.target.value})} required />
          <div className="split-grid" style={{gridTemplateColumns: '1fr 1fr'}}>
             <input className="input" placeholder="First Name" value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} required />
             <input className="input" placeholder="Last Name" value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} required />
          </div>
          <input className="input" placeholder="PIN" type="password" maxLength={4} value={form.pin} onChange={e => setForm({...form, pin: e.target.value})} required />
          <select className="input" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
            <option value="staff">Staff</option>
            <option value="manager">Manager</option>
          </select>
          <button className="btn primary">Save Staff Member</button>
        </form>
      </div>
      <div className="card">
        <h3>Staff List</h3>
        <div className="simple-list">
          {staff.map(s => (
            <div key={s.id} className="held-row" onClick={() => setForm(s)} style={{cursor:'pointer'}}>
              <div><strong>{s.first_name} {s.last_name}</strong> <div className="muted">{s.role}</div></div>
              <span>{s.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}