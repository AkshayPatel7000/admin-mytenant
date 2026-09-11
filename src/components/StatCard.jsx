import React from 'react';

export const StatCard = ({ title, value, icon: Icon, colorClass = 'primary' }) => {
  return (
    <div className="glass-card stat-card">
      <div className={`stat-icon ${colorClass}`}>
        {Icon && <Icon size={26} />}
      </div>
      <div className="stat-details">
        <h4>{title}</h4>
        <div className="stat-number">{value}</div>
      </div>
    </div>
  );
};
