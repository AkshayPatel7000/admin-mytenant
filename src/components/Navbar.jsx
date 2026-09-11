import React from 'react';
import { Search, Bell, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar = ({ title, searchTerm, setSearchTerm }) => {
  const { currentUser } = useAuth();

  return (
    <header className="navbar">
      <div className="page-title">
        <h2>{title || 'Dashboard'}</h2>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {setSearchTerm !== undefined && (
          <div className="search-box">
            <Search className="search-icon" size={16} />
            <input 
              type="text" 
              placeholder="Search records..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="badge badge-info" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Shield size={14} /> Live Firebase
          </span>
        </div>
      </div>
    </header>
  );
};
