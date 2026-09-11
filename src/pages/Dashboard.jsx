import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchAllUsers } from '../firebase';
import { StatCard } from '../components/StatCard';
import { Users, Building2, UserCheck, Database, ArrowRight, RefreshCw, Eye } from 'lucide-react';

export const Dashboard = () => {
  const { data: users = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: fetchAllUsers,
  });

  const totalRooms = users.reduce((acc, u) => acc + (u.roomsCount || 0), 0);

  return (
    <div>
      <div className="table-header-row" style={{ marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Platform Overview</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Real-time & Cached Firestore Statistics
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw size={14} className={isFetching ? 'spin' : ''} /> {isFetching ? 'Refreshing...' : 'Refresh Cache'}
        </button>
      </div>

      <div className="grid-4">
        <StatCard 
          title="Total Landlords" 
          value={isLoading ? '...' : users.length} 
          icon={Users} 
          colorClass="primary" 
        />
        <StatCard 
          title="Total Properties / Rooms" 
          value={isLoading ? '...' : totalRooms} 
          icon={Building2} 
          colorClass="violet" 
        />
        <StatCard 
          title="Occupied Units" 
          value={isLoading ? '...' : totalRooms} 
          icon={UserCheck} 
          colorClass="emerald" 
        />
        <StatCard 
          title="Cache Strategy" 
          value="TanStack Query" 
          icon={Database} 
          colorClass="amber" 
        />
      </div>

      <div className="glass-card">
        <div className="table-header-row">
          <h3>Registered Landlords ({users.length})</h3>
          <Link to="/users" className="btn btn-secondary btn-sm">
            View All Landlords <ArrowRight size={14} />
          </Link>
        </div>

        {isLoading ? (
          <div className="spinner-container">
            <div className="spinner"></div>
            <span>Fetching cached landlords list...</span>
          </div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
            No registered users found in Firestore.
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Landlord Name</th>
                  <th>Email Address</th>
                  <th>Phone Number</th>
                  <th>Properties / Rooms</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.slice(0, 5).map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="user-cell">
                        <img 
                          src={user.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name || user.id)}`} 
                          alt="Avatar" 
                          className="user-avatar-sm"
                        />
                        <div className="user-cell-info">
                          <h5>{user.name || 'Unnamed Landlord'}</h5>
                          <p>UID: {user.id.slice(0, 10)}...</p>
                        </div>
                      </div>
                    </td>
                    <td>{user.email || 'N/A'}</td>
                    <td>{user.phone || 'N/A'}</td>
                    <td>
                      <span className="badge badge-info">{user.roomsCount || 0} Rooms</span>
                    </td>
                    <td>
                      <Link to={`/users/${user.id}`} className="btn btn-secondary btn-sm">
                        <Eye size={14} /> View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
