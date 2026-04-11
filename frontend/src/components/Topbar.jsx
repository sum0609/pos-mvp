 import React, { useState } from 'react';

export default function Topbar({ 
  screen, 
  user, 
  availableMenus, 
  activeMenu, 
  setActiveMenu, 
  setScreen, 
  onLogout 
}) {
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
  <header className="topbar">
    {/* TOP LEFT: Breadcrumb/Brand (Optional) */}
    <div className="topbar-left">
    <span className="screen-title">{screen.toUpperCase()}</span>
    </div>

    {/* TOP CENTER: Menu Selection (Moved here from the body) */}
    {screen === 'pos' && (
    <div className="pos-menu-tabs">
        {availableMenus.map((m) => (
        <button
            key={m.id}
            className={`menu-tab ${activeMenu === m.id ? 'active' : ''}`}
            onClick={() => setActiveMenu(m.id)}
        >
            {m.name}
        </button>
        ))}
    </div>
    )}

    {/* TOP RIGHT: User Profile with Dropdown */}
    <div className="topbar-right">
    <div className="user-profile-wrap">
        <button 
        className="profile-trigger" 
        onClick={() => setShowUserMenu(!showUserMenu)}
        >
        <div className="user-info">
            <strong>{user.first_name}</strong>
            <span className="muted">{user.role}</span>
        </div>
        <div className="avatar">
            {user.first_name[0]}{user.last_name[0]}
        </div>
        </button>

        {showUserMenu && (
        <div className="user-dropdown">
            <div className="dropdown-header">
            <strong>{user.first_name} {user.last_name}</strong>
            <div className="muted">{user.email || user.role}</div>
            </div>
            <hr />
            <button className="dropdown-item" onClick={() => setScreen('staff')}>Profile Settings</button>
            <button className="dropdown-item logout" onClick={() => setUser(null)}>
            Logout
            </button>
        </div>
        )}
    </div>
    </div>
</header>
);
}