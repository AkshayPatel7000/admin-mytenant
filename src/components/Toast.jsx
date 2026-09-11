import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

export const Toast = ({ toast, onClose }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const isSuccess = toast.type === 'success';

  return (
    <div className="toast-container">
      <div className={`toast ${isSuccess ? 'success' : 'error'}`}>
        {isSuccess ? (
          <CheckCircle size={20} style={{ color: '#10b981' }} />
        ) : (
          <AlertCircle size={20} style={{ color: '#f43f5e' }} />
        )}
        <span style={{ fontSize: '0.9rem', flex: 1 }}>{toast.message}</span>
        <button className="btn-icon" onClick={onClose}>
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
