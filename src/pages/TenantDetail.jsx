import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTenantDetail, fetchRoomDetail, fetchUserDetail, addBillingRecord, deleteBillingRecord } from '../firebase';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { Toast } from '../components/Toast';
import { StatusBadge } from '../components/StatusBadge';
import { User, Plus, Trash2, ChevronRight, Phone, Calendar, FileText, RefreshCw } from 'lucide-react';

export const TenantDetail = () => {
  const { userId, roomId, tenantId } = useParams();
  const queryClient = useQueryClient();

  // Modals & toast
  const [isAddRecordOpen, setIsAddRecordOpen] = useState(false);
  const [deleteRecordId, setDeleteRecordId] = useState(null);
  const [toast, setToast] = useState(null);

  // Record Form state
  const [recordForm, setRecordForm] = useState({
    previousReading: '',
    currentReading: '',
    perUnit: '',
    paidAmount: '',
    paidStatus: true,
    note: ''
  });

  // Cached Parent Data
  const { data: userData } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUserDetail(userId),
    enabled: Boolean(userId)
  });

  const { data: roomData } = useQuery({
    queryKey: ['room', userId, roomId],
    queryFn: () => fetchRoomDetail(userId, roomId),
    enabled: Boolean(userId && roomId)
  });

  // Cached Tenant Detail & Billing Records
  const { data: tenantData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['tenant', userId, roomId, tenantId],
    queryFn: () => fetchTenantDetail(userId, roomId, tenantId),
    enabled: Boolean(userId && roomId && tenantId)
  });

  // Initialize previous reading & rate when modal opens or data changes
  useEffect(() => {
    if (roomData || tenantData) {
      const lastRec = tenantData?.records?.[0];
      const prevRead = lastRec ? lastRec.currentReading : (roomData?.startReading || 0);
      setRecordForm(prev => ({
        ...prev,
        previousReading: prevRead,
        perUnit: roomData?.perUnit || 10
      }));
    }
  }, [roomData, tenantData]);

  // Add Billing Record Mutation
  const addRecordMutation = useMutation({
    mutationFn: (data) => addBillingRecord(userId, roomId, tenantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', userId, roomId, tenantId] });
      setToast({ type: 'success', message: 'Meter reading & bill record logged!' });
      setIsAddRecordOpen(false);
    },
    onError: (err) => {
      console.error(err);
      setToast({ type: 'error', message: 'Failed to log billing record.' });
    }
  });

  // Delete Billing Record Mutation with Optimistic UI Update
  const deleteRecordMutation = useMutation({
    mutationFn: (rId) => deleteBillingRecord(userId, roomId, tenantId, rId),
    onMutate: async (deletedRecordId) => {
      await queryClient.cancelQueries({ queryKey: ['tenant', userId, roomId, tenantId] });
      const previousTenant = queryClient.getQueryData(['tenant', userId, roomId, tenantId]);
      if (previousTenant && previousTenant.records) {
        queryClient.setQueryData(['tenant', userId, roomId, tenantId], {
          ...previousTenant,
          records: previousTenant.records.filter(r => r.id !== deletedRecordId)
        });
      }
      return { previousTenant };
    },
    onError: (err, deletedRecordId, context) => {
      if (context?.previousTenant) {
        queryClient.setQueryData(['tenant', userId, roomId, tenantId], context.previousTenant);
      }
      console.error(err);
      setToast({ type: 'error', message: 'Failed to delete record.' });
    },
    onSuccess: () => {
      setToast({ type: 'success', message: 'Record deleted.' });
      setDeleteRecordId(null);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', userId, roomId, tenantId] });
    }
  });

  const handleAddRecord = (e) => {
    e.preventDefault();
    const prev = Number(recordForm.previousReading) || 0;
    const curr = Number(recordForm.currentReading) || 0;
    const rate = Number(recordForm.perUnit) || 0;

    if (curr < prev) {
      setToast({ type: 'error', message: 'Current reading cannot be less than previous reading!' });
      return;
    }

    const units = curr - prev;
    const total = units * rate;
    const paid = recordForm.paidStatus ? total : (Number(recordForm.paidAmount) || 0);
    const pending = total - paid;
    const partial = paid > 0 && pending > 0;

    addRecordMutation.mutate({
      previousReading: prev,
      currentReading: curr,
      totalUnitBurned: units,
      perUnit: rate,
      totalAmount: total,
      paidAmount: paid,
      pendingAmount: Math.max(0, pending),
      paidStatus: recordForm.paidStatus,
      partialPaid: partial,
      note: recordForm.note
    });
  };

  const handleDeleteRecord = () => {
    if (!deleteRecordId) return;
    deleteRecordMutation.mutate(deleteRecordId);
  };

  if (isLoading) {
    return (
      <div className="spinner-container">
        <div className="spinner"></div>
        <span>Loading tenant ledger...</span>
      </div>
    );
  }

  if (!tenantData) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
        <h3>Tenant Not Found</h3>
        <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>The requested tenant record does not exist in Firestore.</p>
        <Link to={`/users/${userId}/rooms/${roomId}`} className="btn btn-primary" style={{ marginTop: '16px' }}>Back to Room</Link>
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
        <Link to={`/users/${userId}/rooms/${roomId}`}>{roomData?.roomName || 'Room'}</Link>
        <ChevronRight size={14} />
        <span style={{ color: 'var(--text-main)' }}>{tenantData.name}</span>
      </div>

      {/* Tenant Profile Banner */}
      <div className="glass-card" style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
          }}>
            <User size={32} />
          </div>

          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{tenantData.name}</h2>
            <div style={{ display: 'flex', gap: '16px', marginTop: '6px', flexWrap: 'wrap', fontSize: '0.88rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                <Phone size={14} style={{ color: 'var(--emerald)' }} /> {tenantData.phone || 'N/A'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                <FileText size={14} style={{ color: 'var(--amber)' }} /> Aadhar: {tenantData.aadharNo || 'N/A'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                <Calendar size={14} style={{ color: 'var(--primary)' }} /> Move-in: {tenantData.startDate || 'N/A'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw size={14} className={isFetching ? 'spin' : ''} /> {isFetching ? 'Refreshing...' : 'Refresh'}
            </button>
            <button className="btn btn-primary" onClick={() => setIsAddRecordOpen(true)}>
              <Plus size={16} /> Add Meter / Rent Record
            </button>
          </div>
        </div>
      </div>

      {/* Electricity & Rent Records Table */}
      <div className="glass-card">
        <div className="table-header-row">
          <h3>Billing Ledger & Utility Records ({tenantData.records?.length || 0})</h3>
        </div>

        {!tenantData.records || tenantData.records.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
            No billing or meter reading records logged for this tenant yet.
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date Logged</th>
                  <th>Meter Reading (Prev → Curr)</th>
                  <th>Units Burned</th>
                  <th>Rate / Unit</th>
                  <th>Total Bill Amount</th>
                  <th>Status</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenantData.records.map((rec) => {
                  const dateStr = rec.createdAt ? new Date(rec.createdAt).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric'
                  }) : 'N/A';

                  return (
                    <tr key={rec.id}>
                      <td>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                          {dateStr}
                        </span>
                      </td>
                      <td>
                        <code style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.82rem' }}>
                          {rec.previousReading || 0} → {rec.currentReading || 0} kWh
                        </code>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: 'var(--amber)' }}>
                          {rec.totalUnitBurned || 0} units
                        </span>
                      </td>
                      <td>₹{rec.perUnit || 0}</td>
                      <td>
                        <strong style={{ fontSize: '0.98rem', color: 'var(--emerald)' }}>
                          ₹{rec.totalAmount?.toLocaleString() || 0}
                        </strong>
                      </td>
                      <td>
                        <StatusBadge 
                          status={rec.paidStatus} 
                          paidAmount={rec.paidAmount} 
                          pendingAmount={rec.pendingAmount} 
                        />
                      </td>
                      <td>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                          {rec.note || '-'}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteRecordId(rec.id)}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Billing Record Modal */}
      <Modal isOpen={isAddRecordOpen} onClose={() => setIsAddRecordOpen(false)} title="Log Meter Reading / Bill">
        <form onSubmit={handleAddRecord}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label>Previous Reading (kWh)</label>
              <input 
                type="number" 
                value={recordForm.previousReading}
                onChange={(e) => setRecordForm({ ...recordForm, previousReading: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Current Reading (kWh) *</label>
              <input 
                type="number" 
                placeholder="e.g. 1450" 
                value={recordForm.currentReading}
                onChange={(e) => setRecordForm({ ...recordForm, currentReading: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label>Rate / Unit (₹) *</label>
              <input 
                type="number" 
                step="0.1" 
                value={recordForm.perUnit}
                onChange={(e) => setRecordForm({ ...recordForm, perUnit: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Payment Status</label>
              <select 
                value={recordForm.paidStatus ? 'paid' : 'pending'} 
                onChange={(e) => setRecordForm({ ...recordForm, paidStatus: e.target.value === 'paid' })}
              >
                <option value="paid">Fully Paid</option>
                <option value="pending">Pending Payment</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Note / Remark</label>
            <input 
              type="text" 
              placeholder="e.g. September electricity bill" 
              value={recordForm.note}
              onChange={(e) => setRecordForm({ ...recordForm, note: e.target.value })}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setIsAddRecordOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={addRecordMutation.isPending}>
              {addRecordMutation.isPending ? 'Saving...' : 'Save Record'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Record Confirm Modal */}
      <ConfirmModal 
        isOpen={Boolean(deleteRecordId)}
        onClose={() => setDeleteRecordId(null)}
        onConfirm={handleDeleteRecord}
        title="Delete Billing Record"
        message="Are you sure you want to delete this billing record from Firestore?"
        loading={deleteRecordMutation.isPending}
      />
    </div>
  );
};
