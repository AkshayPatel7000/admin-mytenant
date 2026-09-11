import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAllUsers, addUser, deleteUser } from '../firebase';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { Toast } from '../components/Toast';
import { UserPlus, Trash2, Eye, Search, Phone, Mail, RefreshCw } from 'lucide-react';

export const Users = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals & toast
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState(null);
  const [toast, setToast] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    upi: ''
  });

  // Query users with caching
  const { data: users = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: fetchAllUsers,
  });

  // Add User Mutation
  const addUserMutation = useMutation({
    mutationFn: (newUserData) => addUser(newUserData),
    onSuccess: (newId, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setToast({ type: 'success', message: `Landlord "${variables.name}" created!` });
      setIsAddModalOpen(false);
      setFormData({ name: '', email: '', phone: '', upi: '' });
    },
    onError: (err) => {
      console.error(err);
      setToast({ type: 'error', message: 'Failed to add user to Firestore.' });
    }
  });

  // Delete User Mutation with INSTANT Optimistic UI Update & Cache Sync
  const deleteUserMutation = useMutation({
    mutationFn: (userId) => deleteUser(userId),
    onMutate: async (deletedUserId) => {
      await queryClient.cancelQueries({ queryKey: ['users'] });
      const previousUsers = queryClient.getQueryData(['users']);
      if (previousUsers) {
        queryClient.setQueryData(['users'], (old) => (old || []).filter(u => u.id !== deletedUserId));
      }
      return { previousUsers };
    },
    onError: (err, deletedUserId, context) => {
      if (context?.previousUsers) {
        queryClient.setQueryData(['users'], context.previousUsers);
      }
      console.error(err);
      setToast({ type: 'error', message: 'Failed to delete landlord from Firestore.' });
    },
    onSuccess: () => {
      setToast({ type: 'success', message: 'Landlord deleted successfully.' });
      setDeleteUserId(null);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  const handleAddUser = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      setToast({ type: 'error', message: 'Name and Email are required.' });
      return;
    }
    const sanitizedData = {
      ...formData,
      upi: (formData.upi || '').replace(/%20/gi, '').replace(/[\s\u00A0\u200B]+/g, '').trim()
    };
    addUserMutation.mutate(sanitizedData);
  };

  const handleDeleteUser = () => {
    if (!deleteUserId) return;
    deleteUserMutation.mutate(deleteUserId);
  };

  const filteredUsers = users.filter(u => 
    (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.phone || '').includes(searchTerm)
  );

  return (
    <div>
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="table-header-row" style={{ marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Registered Landlords</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Instant Optimistic Deletions & Sync
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw size={14} className={isFetching ? 'spin' : ''} /> {isFetching ? 'Refreshing...' : 'Refresh'}
          </button>
          <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
            <UserPlus size={16} /> Add Landlord
          </button>
        </div>
      </div>

      <div className="glass-card">
        <div className="table-header-row" style={{ gap: '16px', flexWrap: 'wrap' }}>
          <div className="search-box" style={{ width: '320px' }}>
            <Search className="search-icon" size={16} />
            <input 
              type="text" 
              placeholder="Search by name, email, phone..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
            Showing {filteredUsers.length} of {users.length} users
          </span>
        </div>

        {isLoading ? (
          <div className="spinner-container">
            <div className="spinner"></div>
            <span>Loading landlords directory...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
            No landlords match your search query.
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Landlord</th>
                  <th>Contact Information</th>
                  <th>UPI Payment ID</th>
                  <th>Rooms Owned</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
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
                          <p>ID: {user.id}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                          <Mail size={13} /> {user.email || 'N/A'}
                        </span>
                        {user.phone && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                            <Phone size={13} /> {user.phone}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <code style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.82rem', color: 'var(--primary)' }}>
                        {user.upi || 'Not Set'}
                      </code>
                    </td>
                    <td>
                      <span className="badge badge-info">{user.roomsCount || 0} Rooms</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Link to={`/users/${user.id}`} className="btn btn-secondary btn-sm">
                          <Eye size={14} /> Details
                        </Link>
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteUserId(user.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Landlord">
        <form onSubmit={handleAddUser}>
          <div className="form-group">
            <label>Full Name *</label>
            <input 
              type="text" 
              placeholder="e.g. Rajesh Sharma" 
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Email Address *</label>
            <input 
              type="email" 
              placeholder="e.g. rajesh@example.com" 
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <input 
              type="tel" 
              placeholder="e.g. +91 9876543210" 
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>UPI ID (For Rent Payments)</label>
            <input 
              type="text" 
              placeholder="e.g. rajesh@upi" 
              value={formData.upi}
              onChange={(e) => setFormData({ ...formData, upi: e.target.value })}
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={addUserMutation.isPending}>
              {addUserMutation.isPending ? 'Saving...' : 'Create Landlord'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <ConfirmModal 
        isOpen={Boolean(deleteUserId)}
        onClose={() => setDeleteUserId(null)}
        onConfirm={handleDeleteUser}
        title="Delete Landlord Account"
        message="Are you sure you want to delete this landlord from Firestore? This action will permanently remove their profile document."
        loading={deleteUserMutation.isPending}
      />
    </div>
  );
};
