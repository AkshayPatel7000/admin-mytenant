import React from 'react';
import { Modal } from './Modal';
import { AlertTriangle } from 'lucide-react';

export const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, loading }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title || "Confirm Action"}>
      <div style={{ textAlign: 'center', padding: '10px 0 20px 0' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'rgba(244, 63, 94, 0.15)',
          color: '#f43f5e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px auto'
        }}>
          <AlertTriangle size={30} />
        </div>
        <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.5' }}>
          {message}
        </p>
      </div>
      <div className="modal-actions">
        <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
          Cancel
        </button>
        <button className="btn btn-danger" onClick={onConfirm} disabled={loading}>
          {loading ? 'Deleting...' : 'Delete Permanently'}
        </button>
      </div>
    </Modal>
  );
};
