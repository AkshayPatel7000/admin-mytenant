import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchRoomDetail, fetchUserDetail, addTenantToRoom, deleteTenant } from '../firebase';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { QRCodeModal } from '../components/QRCodeModal';
import { Toast } from '../components/Toast';
import { User, UserPlus, Trash2, Eye, ChevronRight, Phone, Calendar, RefreshCw, QrCode } from 'lucide-react';

export const RoomDetail = () => {
  const { userId, roomId } = useParams();
  const queryClient = useQueryClient();

  // Modals & toast
  const [isAddTenantOpen, setIsAddTenantOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [deleteTenantId, setDeleteTenantId] = useState(null);
  const [toast, setToast] = useState(null);

  // Tenant form state
  const [tenantForm, setTenantForm] = useState({
    name: '',
    phone: '',
    aadharNo: '',
    startDate: new Date().toISOString().split('T')[0]
  });

  // Query Landlord details (cached)
  const { data: userData } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUserDetail(userId),
    enabled: Boolean(userId)
  });

  // Query Room details (cached)
  const { data: roomData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['room', userId, roomId],
    queryFn: () => fetchRoomDetail(userId, roomId),
    enabled: Boolean(userId && roomId)
  });

  // Add Tenant Mutation
  const addTenantMutation = useMutation({
    mutationFn: (data) => addTenantToRoom(userId, roomId, data),
    onSuccess: (newId, variables) => {
      queryClient.invalidateQueries({ queryKey: ['room', userId, roomId] });
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
      setToast({ type: 'success', message: `Tenant "${variables.name}" assigned to room!` });
      setIsAddTenantOpen(false);
      setTenantForm({ name: '', phone: '', aadharNo: '', startDate: new Date().toISOString().split('T')[0] });
    },
    onError: (err) => {
      console.error(err);
      setToast({ type: 'error', message: 'Failed to assign tenant.' });
    }
  });

  // Delete Tenant Mutation with Optimistic UI Update
  const deleteTenantMutation = useMutation({
    mutationFn: (tId) => deleteTenant(userId, roomId, tId),
    onMutate: async (deletedTenantId) => {
      await queryClient.cancelQueries({ queryKey: ['room', userId, roomId] });
      const previousRoom = queryClient.getQueryData(['room', userId, roomId]);
      if (previousRoom && previousRoom.tenants) {
        queryClient.setQueryData(['room', userId, roomId], {
          ...previousRoom,
          tenants: previousRoom.tenants.filter(t => t.id !== deletedTenantId)
        });
      }
      return { previousRoom };
    },
    onError: (err, deletedTenantId, context) => {
      if (context?.previousRoom) {
        queryClient.setQueryData(['room', userId, roomId], context.previousRoom);
      }
      console.error(err);
      setToast({ type: 'error', message: 'Failed to delete tenant.' });
    },
    onSuccess: () => {
      setToast({ type: 'success', message: 'Tenant record removed.' });
      setDeleteTenantId(null);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['room', userId, roomId] });
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
    }
  });

  const handleAddTenant = (e) => {
    e.preventDefault();
    if (!tenantForm.name || !tenantForm.phone) {
      setToast({ type: 'error', message: 'Tenant Name and Phone Number are required.' });
      return;
    }
    addTenantMutation.mutate(tenantForm);
  };

  const handleDeleteTenant = () => {
    if (!deleteTenantId) return;
    deleteTenantMutation.mutate(deleteTenantId);
  };

  if (isLoading) {
    return (
      <div className="spinner-container">
        <div className="spinner"></div>
        <span>Loading room specifications...</span>
      </div>
    );
  }

  if (!roomData) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
        <h3>Property Not Found</h3>
        <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>The requested room does not exist under this landlord.</p>
        <Link to={`/users/${userId}`} className="btn btn-primary" style={{ marginTop: '16px' }}>Back to Landlord</Link>
      </div>
    );
  }

  return (
    <div>
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Breadcrumbs */}
      <div className="breadcrumb">
        <Link to="/">Dashboard</Link>
        <ChevronRight size={14} />
        <Link to="/users">Landlords</Link>
        <ChevronRight size={14} />
        <Link to={`/users/${userId}`}>{userData?.name || 'Landlord'}</Link>
        <ChevronRight size={14} />
        <span style={{ color: 'var(--text-main)' }}>{roomData.roomName}</span>
      </div>

      {/* Room Overview Card */}
      <div className="glass-card" style={{ marginBottom: '28px' }}>
        <div className="table-header-row" style={{ marginBottom: '16px' }}>
          <div>
            <span className="badge badge-info" style={{ marginBottom: '8px' }}>Room #{roomData.roomNo}</span>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{roomData.roomName}</h2>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setIsQrModalOpen(true)} style={{ borderColor: 'var(--primary)' }}>
              <QrCode size={16} style={{ color: 'var(--primary)' }} /> Tenant QR Code
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw size={14} className={isFetching ? 'spin' : ''} /> {isFetching ? 'Refreshing...' : 'Refresh'}
            </button>
            <button className="btn btn-primary" onClick={() => setIsAddTenantOpen(true)}>
              <UserPlus size={16} /> Add Tenant
            </button>
          </div>
        </div>

        <div className="grid-4" style={{ marginBottom: 0 }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Monthly Rent</span>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--emerald)', marginTop: '4px' }}>
              ₹{roomData.rent?.toLocaleString() || 0}
            </div>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Advance Deposit</span>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--secondary)', marginTop: '4px' }}>
              ₹{roomData.advance || 0}
            </div>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Electricity Rate</span>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--amber)', marginTop: '4px' }}>
              ₹{roomData.perUnit || 0} / unit
            </div>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Meter Baseline</span>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
              {roomData.startReading || 0} kWh
            </div>
          </div>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="glass-card">
        <div className="table-header-row">
          <h3>Tenants History & Occupants ({roomData.tenants?.length || 0})</h3>
        </div>

        {!roomData.tenants || roomData.tenants.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
            No tenants assigned to this room yet.
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tenant Name</th>
                  <th>Phone Number</th>
                  <th>Aadhar / Govt ID</th>
                  <th>Move-in Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {roomData.tenants.map((t) => {
                  const isActive = t.id === roomData.currentTenantId || t.name === roomData.tenetName;
                  return (
                    <tr key={t.id}>
                      <td>
                        <div className="user-cell">
                          <div style={{
                            width: '36px', height: '36px', borderRadius: '50%',
                            background: isActive ? 'var(--primary-light)' : 'rgba(148, 163, 184, 0.1)',
                            color: isActive ? 'var(--primary)' : 'var(--text-dim)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            <User size={18} />
                          </div>
                          <div className="user-cell-info">
                            <h5>{t.name}</h5>
                            <p>Tenant ID: {t.id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                          <Phone size={13} style={{ color: 'var(--emerald)' }} /> {t.phone || 'N/A'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          {t.aadharNo || 'Not provided'}
                        </span>
                      </td>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          <Calendar size={13} /> {t.startDate || 'N/A'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${isActive ? 'badge-paid' : 'badge-info'}`}>
                          {isActive ? 'Active Occupant' : 'Past Tenant'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Link to={`/users/${userId}/rooms/${roomId}/tenants/${t.id}`} className="btn btn-secondary btn-sm">
                            <Eye size={14} /> Bills & Records
                          </Link>
                          <button className="btn btn-danger btn-sm" onClick={() => setDeleteTenantId(t.id)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Tenant Modal */}
      <Modal isOpen={isAddTenantOpen} onClose={() => setIsAddTenantOpen(false)} title="Assign New Tenant">
        <form onSubmit={handleAddTenant}>
          <div className="form-group">
            <label>Tenant Name *</label>
            <input 
              type="text" 
              placeholder="e.g. Ankit Verma" 
              value={tenantForm.name}
              onChange={(e) => setTenantForm({ ...tenantForm, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Phone Number *</label>
            <input 
              type="tel" 
              placeholder="e.g. +91 9876543210" 
              value={tenantForm.phone}
              onChange={(e) => setTenantForm({ ...tenantForm, phone: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Aadhar / Govt ID Number</label>
            <input 
              type="text" 
              placeholder="e.g. 1234-5678-9012" 
              value={tenantForm.aadharNo}
              onChange={(e) => setTenantForm({ ...tenantForm, aadharNo: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Move-in Date</label>
            <input 
              type="date" 
              value={tenantForm.startDate}
              onChange={(e) => setTenantForm({ ...tenantForm, startDate: e.target.value })}
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setIsAddTenantOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={addTenantMutation.isPending}>
              {addTenantMutation.isPending ? 'Assigning...' : 'Assign Tenant'}
            </button>
          </div>
        </form>
      </Modal>

      {/* QR Code Modal */}
      <QRCodeModal 
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        userId={userId}
        roomId={roomId}
        roomName={roomData.roomName}
        roomNo={roomData.roomNo}
        tenantName={roomData.tenetName}
      />

      {/* Delete Tenant Confirm Modal */}
      <ConfirmModal 
        isOpen={Boolean(deleteTenantId)}
        onClose={() => setDeleteTenantId(null)}
        onConfirm={handleDeleteTenant}
        title="Remove Tenant Record"
        message="Are you sure you want to remove this tenant from the room? Historical records will be retained."
        loading={deleteTenantMutation.isPending}
      />
    </div>
  );
};
