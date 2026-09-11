import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, LogOut, Building, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-badge">
          <Building size={22} />
        </div>
        <div className="logo-text">
          <h1>myTenant</h1>
          <span>ADMIN PORTAL</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <NavLink 
          to="/" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          end
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink 
          to="/users" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Users size={20} />
          <span>Landlords / Users</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="admin-card">
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
          }}>
            <ShieldCheck size={20} />
          </div>
          <div className="admin-info">
            <span className="admin-name">{currentUser?.email || 'System Admin'}</span>
            <span className="admin-role">Master Admin</span>
          </div>
          <button className="btn-icon" onClick={handleLogout} title="Sign Out">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
};
