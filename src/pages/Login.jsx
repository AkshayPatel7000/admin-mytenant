import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building, ShieldCheck, AlertCircle, Eye, EyeOff, Lock, Mail } from 'lucide-react';

export const Login = () => {
  const { login, authError } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both Admin Email ID and Password.');
      return;
    }

    try {
      setError('');
      setLoading(true);
      await login(email, password);
      navigate('/');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Invalid Email ID or Password.');
    } finally {
      setLoading(false);
    }
  };

  const displayError = error || authError;

  return (
    <div className="login-container">
      <div className="glass-card login-card">
        <div className="login-logo">
          <Building size={34} style={{ color: 'white' }} />
        </div>

        <h1>myTenant Admin</h1>
        <p>Enter your Administrator credentials to log in</p>

        {displayError && (
          <div style={{
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            color: '#f43f5e',
            padding: '14px',
            borderRadius: '12px',
            fontSize: '0.88rem',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textAlign: 'left'
          }}>
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <span>{displayError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mail size={14} /> Admin Email ID / Login
            </label>
            <input 
              type="email" 
              placeholder="e.g. admin@mytenant.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group" style={{ position: 'relative' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lock size={14} /> Password
            </label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? 'text' : 'password'} 
                placeholder="••••••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingRight: '42px' }}
              />
              <button 
                type="button" 
                className="btn-icon" 
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-dim)'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '14px', marginTop: '10px', fontSize: '0.95rem' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In to Admin Portal'}
          </button>
        </form>

        <div style={{ marginTop: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#64748b', fontSize: '0.8rem' }}>
          <ShieldCheck size={16} /> Restricted Master Admin Access
        </div>
      </div>
    </div>
  );
};
