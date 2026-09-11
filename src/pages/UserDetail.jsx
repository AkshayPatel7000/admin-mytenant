import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchUserDetail, addRoomToUser, deleteRoom } from '../firebase';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { Toast } from '../components/Toast';
import { Building2, Plus, Trash2, Eye, Mail, Phone, CreditCard, ChevronRight, User, RefreshCw } from 'lucide-react';

export const UserDetail = () => {
  const { userId } = useParams();
  const queryClient = useQueryClient();
  
  // Modals & toast
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [deleteRoomId, setDeleteRoomId] = useState(null);
  const [toast, setToast] = useState(null);

  // Room Form state
  const [roomForm, setRoomForm] = useState({
    roomName: '',
    roomNo: '',
    rent: '',
    advance: '',
    perUnit: '',
    startReading: ''
  });

  // Fetch single landlord detail with query cache
  const { data: userData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUserDetail(userId),
    enabled: Boolean(userId)
  });

  // Add Room Mutation
  const addRoomMutation = useMutation({
    mutationFn: (data) => addRoomToUser(userId, data),
    onSuccess: (newRoomId, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setToast({ type: 'success', message: `Room "${variables.roomName}" created!` });
      setIsAddRoomOpen(false);
      setRoomForm({ roomName: '', roomNo: '', rent: '', advance: '', perUnit: '', startReading: '' });
    },
    onError: (err) => {
      console.error(err);
      setToast({ type: 'error', message: 'Failed to add room.' });
    }
  });

  // Delete Room Mutation with Optimistic UI Update
  const deleteRoomMutation = useMutation({
    mutationFn: (roomId) => deleteRoom(userId, roomId),
    onMutate: async (deletedRoomId) => {
      await queryClient.cancelQueries({ queryKey: ['user', userId] });
      const previousUser = queryClient.getQueryData(['user', userId]);
      if (previousUser && previousUser.rooms) {
        queryClient.setQueryData(['user', userId], {
          ...previousUser,
          rooms: previousUser.rooms.filter(r => r.id !== deletedRoomId)
        });
      }
      return { previousUser };
    },
    onError: (err, deletedRoomId, context) => {
      if (context?.previousUser) {
        queryClient.setQueryData(['user', userId], context.previousUser);
      }
      console.error(err);
      setToast({ type: 'error', message: 'Failed to delete room.' });
    },
    onSuccess: () => {
      setToast({ type: 'success', message: 'Room deleted successfully.' });
      setDeleteRoomId(null);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  const handleAddRoom = (e) => {
    e.preventDefault();
    if (!roomForm.roomName || !roomForm.roomNo || !roomForm.rent) {
      setToast({ type: 'error', message: 'Room Name, Room No, and Rent are required.' });
      return;
    }
    addRoomMutation.mutate(roomForm);
  };

  const handleDeleteRoom = () => {
    if (!deleteRoomId) return;
    deleteRoomMutation.mutate(deleteRoomId);
  };

  if (isLoading) {
    return (
      <div className="spinner-container">
        <div className="spinner"></div>
        <span>Loading landlord details...</span>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
        <h3>Landlord Not Found</h3>
        <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>The requested landlord ID does not exist in Firestore.</p>
        <Link to="/users" className="btn btn-primary" style={{ marginTop: '16px' }}>Back to Landlords</Link>
      </div>
    );
  }

  return (
    <div>
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link to="/">Dashboard</Link>
        <ChevronRight size={14} />
        <Link to="/users">Landlords</Link>
        <ChevronRight size={14} />
        <span style={{ color: 'var(--text-main)' }}>{userData.name || userData.id}</span>
      </div>

      {/* Landlord Profile Banner */}
      <div className="glass-card" style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <img 
            src={userData.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userData.name || userData.id)}`} 
            alt="Avatar" 
            style={{ width: '72px', height: '72px', borderRadius: '50%', border: '2px solid var(--primary)' }}
          />
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{userData.name || 'Unnamed Landlord'}</h2>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.82rem', marginTop: '2px' }}>UID: {userData.id}</p>
            
            <div style={{ display: 'flex', gap: '20px', marginTop: '12px', flexWrap: 'wrap', fontSize: '0.88rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                <Mail size={15} style={{ color: 'var(--primary)' }} /> {userData.email || 'N/A'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                <Phone size={15} style={{ color: 'var(--emerald)' }} /> {userData.phone || 'N/A'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                <CreditCard size={15} style={{ color: 'var(--amber)' }} /> UPI: {userData.upi || 'Not configured'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw size={14} className={isFetching ? 'spin' : ''} /> {isFetching ? 'Refreshing...' : 'Refresh'}
            </button>
            <button className="btn btn-primary" onClick={() => setIsAddRoomOpen(true)}>
              <Plus size={16} /> Add Property / Room
            </button>
          </div>
        </div>
      </div>

      {/* Properties Table */}
      <div className="glass-card">
        <div className="table-header-row">
          <h3>Properties / Rooms ({userData.rooms?.length || 0})</h3>
        </div>

        {!userData.rooms || userData.rooms.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
            No properties or rooms created by this landlord yet.
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Room Name / No</th>
                  <th>Monthly Rent</th>
                  <th>Advance Deposit</th>
                  <th>Electricity Rate</th>
                  <th>Current Tenant</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {userData.rooms.map((room) => (
                  <tr key={room.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ 
                          width: '36px', height: '36px', borderRadius: '10px', 
                          background: 'var(--primary-light)', color: 'var(--primary)', 
                          display: 'flex', alignItems: 'center', justifyContent: 'center' 
                        }}>
                          <Building2 size={18} />
                        </div>
                        <div>
                          <h5 style={{ fontWeight: 600, fontSize: '0.92rem' }}>{room.roomName}</h5>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Room #{room.roomNo}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--emerald)' }}>₹{room.rent?.toLocaleString() || 0}</strong> / mo
                    </td>
                    <td>₹{room.advance || 0}</td>
                    <td>₹{room.perUnit || 0} / unit</td>
                    <td>
                      <span className={`badge ${room.tenetName && room.tenetName !== 'No Tenant' ? 'badge-info' : 'badge-pending'}`}>
                        <User size={13} /> {room.tenetName || 'No Tenant'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Link to={`/users/${userId}/rooms/${room.id}`} className="btn btn-secondary btn-sm">
                          <Eye size={14} /> Room Details
                        </Link>
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteRoomId(room.id)}>
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

      {/* Add Room Modal */}
      <Modal isOpen={isAddRoomOpen} onClose={() => setIsAddRoomOpen(false)} title="Add Property / Room">
        <form onSubmit={handleAddRoom}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label>Room Name *</label>
              <input 
                type="text" 
                placeholder="e.g. Deluxe Room 101" 
                value={roomForm.roomName}
                onChange={(e) => setRoomForm({ ...roomForm, roomName: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Room Number *</label>
              <input 
                type="text" 
                placeholder="e.g. 101" 
                value={roomForm.roomNo}
                onChange={(e) => setRoomForm({ ...roomForm, roomNo: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label>Monthly Rent (₹) *</label>
              <input 
                type="number" 
                placeholder="e.g. 8500" 
                value={roomForm.rent}
                onChange={(e) => setRoomForm({ ...roomForm, rent: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Advance Deposit (₹)</label>
              <input 
                type="number" 
                placeholder="e.g. 15000" 
                value={roomForm.advance}
                onChange={(e) => setRoomForm({ ...roomForm, advance: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label>Electricity Rate / Unit (₹)</label>
              <input 
                type="number" 
                step="0.1" 
                placeholder="e.g. 10" 
                value={roomForm.perUnit}
                onChange={(e) => setRoomForm({ ...roomForm, perUnit: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Meter Initial Reading</label>
              <input 
                type="number" 
                placeholder="e.g. 1250" 
                value={roomForm.startReading}
                onChange={(e) => setRoomForm({ ...roomForm, startReading: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setIsAddRoomOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={addRoomMutation.isPending}>
              {addRoomMutation.isPending ? 'Creating...' : 'Create Room'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Room Confirm Modal */}
      <ConfirmModal 
        isOpen={Boolean(deleteRoomId)}
        onClose={() => setDeleteRoomId(null)}
        onConfirm={handleDeleteRoom}
        title="Delete Room / Property"
        message="Are you sure you want to delete this room? This action will remove the property document from this landlord."
        loading={deleteRoomMutation.isPending}
      />
    </div>
  );
};
