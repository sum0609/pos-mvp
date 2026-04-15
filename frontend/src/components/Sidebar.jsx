import React from 'react';

export default function Sidebar({ screen, setScreen, onLogout }) {
  // Helper to DRY (Don't Repeat Yourself) the button rendering
  const NavButton = ({ id, label }) => (
    <button 
      className={`side-btn ${screen === id ? 'active' : ''}`} 
      onClick={() => setScreen(id)}
    >
      {label}
    </button>
  );

  return (
  <aside className="sidebar">
    <h2 style={{ paddingLeft: '14px' }}>Merienda</h2>

    <button className={`side-btn ${screen === 'pos' ? 'active' : ''}`} onClick={() => setScreen('pos')}>POS</button>
    <button className={`side-btn ${screen === 'menus' ? 'active' : ''}`} onClick={() => setScreen('menus')}>Menu</button>         <button className={`side-btn ${screen === 'categories' ? 'active' : ''}`} onClick={() => setScreen('categories')}>Categories</button>
    <button className={`side-btn ${screen === 'products' ? 'active' : ''}`} onClick={() => setScreen('products')}>Products</button>
    <button className={`side-btn ${screen === 'tables' ? 'active' : ''}`} onClick={() => setScreen('tables')}>Tables</button>
    <button className={`side-btn ${screen === 'addon_categories' ? 'active' : ''}`} onClick={() => setScreen('addon_categories')}>Add-On Categories</button>
    <button className={`side-btn ${screen === 'addon_list' ? 'active' : ''}`} onClick={() => setScreen('addon_list')}>Add-On List</button>
    <button className={`side-btn ${screen === 'product_addon_map' ? 'active' : ''}`} onClick={() => setScreen('product_addon_map')}>Product Add-On Map</button>
    <button className={`side-btn ${screen === 'staff' ? 'active' : ''}`} onClick={() => setScreen('staff')}>Staff</button>
    <button className={`side-btn ${screen === 'reports' ? 'active' : ''}`} onClick={() => setScreen('reports')}>Reports</button>
    <button className={`side-btn ${screen === 'held' ? 'active' : ''}`} onClick={() => setScreen('held')}>Held Orders</button>
    <button className={`side-btn ${screen === 'cancelled' ? 'active' : ''}`} onClick={() => setScreen('cancelled')}>Cancelled</button>
    <button className="side-btn" onClick={() => setUser(null)}>Logout</button>
</aside>
);
}