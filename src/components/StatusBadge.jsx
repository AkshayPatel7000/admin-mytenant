import React from 'react';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export const StatusBadge = ({ status, paidAmount, pendingAmount }) => {
  if (status === true || status === 'paid') {
    return (
      <span className="badge badge-paid">
        <CheckCircle2 size={13} /> Paid
      </span>
    );
  }

  if (status === 'partial' || (paidAmount > 0 && pendingAmount > 0)) {
    return (
      <span className="badge badge-partial">
        <Clock size={13} /> Partial Paid
      </span>
    );
  }

  return (
    <span className="badge badge-pending">
      <AlertCircle size={13} /> Pending
    </span>
  );
};
