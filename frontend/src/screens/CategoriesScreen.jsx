import { useState, useEffect } from 'react';
import { api } from '../api';
export default function CategoriesScreen({ 
    categories = [], 
    menus = [], 
    activeMenu, 
    setActiveMenu, 
    refreshCategories 
}) {

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    id: null,
    menu_id: activeMenu || '',
    name: '',
    color: '#d1fae5',
    sort_order: 0,
    is_active: 1,
    is_discountable: 1,
    available_from: '00:00',
    available_to: '23:59',
    category_type: 0
  });

  // Filter list based on selected menu in the sidebar/top
  const filteredCategories = activeMenu
    ? categories.filter(cat => cat.menu_id === activeMenu)
    : categories;

  // Helper to find the next sort order
  const getNextSortOrder = (menuId) => {
    const menuCategories = categories.filter(c => c.menu_id === menuId);
    if (menuCategories.length === 0) return 0;
    return Math.max(...menuCategories.map(c => c.sort_order || 0)) + 1;
  };

  // 1. Update form when global activeMenu changes OR when starting a new entry
  useEffect(() => {
    if (!isEditing) {
      setForm(prev => ({ 
        ...prev, 
        menu_id: activeMenu || '',
        sort_order: getNextSortOrder(activeMenu) // Auto-calculate here
      }));
    }
  }, [activeMenu, isEditing, categories]); // Re-run if categories list changes

  function handleEdit(cat) {
    setForm({
      id: cat.id,
      menu_id: cat.menu_id,
      name: cat.name,
      color: cat.color,
      sort_order: cat.sort_order,
      is_active: cat.is_active,
      is_discountable: cat.is_discountable,
      available_from: cat.available_from || '00:00',
      available_to: cat.available_to || '23:59',
      category_type: cat.category_type || 0
    });
    setIsEditing(true);
  }

  // 2. Update sort order if the user changes the menu dropdown inside the form
  const handleMenuChange = (e) => {
    const newMenuId = e.target.value;
    setForm({
      ...form,
      menu_id: newMenuId,
      sort_order: getNextSortOrder(newMenuId) // Recalculate for the new parent
    });
  };

  function resetForm() {
    setForm({
      id: null,
      menu_id: activeMenu || '',
      name: '',
      color: '#d1fae5',
      sort_order: getNextSortOrder(activeMenu), // Fresh calculation
      is_active: 1,
      is_discountable: 1,
      available_from: '00:00',
      available_to: '23:59',
      category_type: 0
    });
    setIsEditing(false);
  }

  async function save(e) {
    e.preventDefault();
    
    // Ensure we have a menu_id before saving
    if (!form.menu_id) {
      alert("Please select a menu for this category.");
      return;
    }

    try {
      if (isEditing) {
        await api.updateCategory(form.id, form);
      } else {
        await api.createCategory(form);
      }
      resetForm();
      refreshCategories();
    } catch (err) {
      alert("Failed to save category: " + err.message);
    }
  }

  return (
    <div className="split-grid">
      {/* Left: Form */}
      <div className="card">
        <h3>{isEditing ? 'Edit Category' : 'Add New Category'}</h3>

        <form className="form" onSubmit={save}>
          <label className="muted" style={{ fontSize: '12px' }}>Parent Menu</label>
          <select
            className="input"
            value={form.menu_id}
            onChange={handleMenuChange}
            required
          >
            <option value="">-- Select a Menu --</option>
            {menus.map(menu => (
              <option key={menu.id} value={menu.id}>{menu.name}</option>
            ))}
          </select>

          <label className="muted" style={{ fontSize: '12px' }}>Category Name</label>
          <input
            className='input'
            placeholder='e.g. Hot Drinks, Main Course'
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ flex: 1 }}>
              <label className="muted" style={{ fontSize: '12px' }}>Button Color</label>
              <input
                className='input'
                type='color'
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="muted" style={{ fontSize: '11px' }}>
                Sort Order (Auto-set)
              </label>
              <input
                className='input'
                type='number'
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              />
            </div>
          </div>

          <label className="muted" style={{ fontSize: '12px' }}>Status</label>
          <select
            className='input'
            value={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: Number(e.target.value) })}
          >
            <option value={1}>Active (Visible in POS)</option>
            <option value={0}>Inactive (Hidden)</option>
          </select>


          <label className="muted" style={{ fontSize: '12px' }}>Category Type</label>
          <select
            className='input'
            value={form.category_type}
            onChange={(e) => setForm({ ...form, category_type: Number(e.target.value) })}
          >
            <option value={0}>Strater</option>
            <option value={1}>Main</option>
            <option value={2}>Dessert</option>
            <option value={3}>Drinks</option>
          </select>


          <div className="form-group">
            <label>Daily Availability</label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '5px' }}>
              <input 
                type="time" 
                className="input"
                value={form.available_from}
                onChange={e => setForm({...form, available_from: e.target.value})}
              />
              <span>to</span>
              <input 
                type="time" 
                className="input"
                value={form.available_to}
                onChange={e => setForm({...form, available_to: e.target.value})}
              />
            </div>
            <small className="muted">Category will be hidden outside these times.</small>
          </div>

          <label className="checkbox-container">
            <input 
              type="checkbox" 
              checked={form.is_discountable === 0} 
              onChange={e => setForm({...form, is_discountable: e.target.checked ? 0 : 1})} 
            />
            <span>Exclude from Discounts</span>
          </label>

          <button className='btn primary' type="submit">
            {isEditing ? 'Update Category' : 'Create Category'}
          </button>

          {isEditing && (
            <button type="button" className='btn' onClick={resetForm} style={{ marginTop: '8px' }}>
              Cancel
            </button>
          )}
        </form>
      </div>

      {/* Right: List */}
      <div className='card'>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3>Categories</h3>
          {/* Quick filter for the list view */}
          <select 
            className="input" 
            style={{ width: 'auto', marginBottom: 0 }}
            value={activeMenu} 
            onChange={(e) => setActiveMenu(e.target.value)}
          >
            <option value="">All Menus</option>
            {menus.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>

        <div className='simple-list'>
          {filteredCategories.length === 0 && <div className="empty">No categories found for this menu.</div>}
          {filteredCategories.map((cat) => (
            <div
              key={cat.id}
              className='held-row'
              onClick={() => handleEdit(cat)}
              style={{ 
                cursor: 'pointer', 
                borderLeft: `5px solid ${cat.color}`,
                paddingLeft: '12px'
              }}
            >
              <div>
                <strong>{cat.name}</strong>
                {!cat.is_discountable && <small className="text-danger">No Discounts</small>}
                <div className="muted" style={{ fontSize: '11px' }}>
                  {cat.is_active ? 'Active' : 'Inactive'} · 
                  Type: {['Starter', 'Main', 'Dessert', 'Drinks'][cat.category_type]} · 
                  Order: {cat.sort_order}
                </div>
              </div>
              <button className="btn" style={{ padding: '4px 8px' }}>Edit</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}