import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchPublicActiveTenantData } from '../firebase';
import { StatusBadge } from '../components/StatusBadge';
import { Building2, Zap, Phone, CreditCard, ShieldCheck, User, Calendar, AlertCircle, RefreshCw, Copy, Check, Info, QrCode } from 'lucide-react';

export const PublicTenantView = () => {
  const { userId, roomId } = useParams();
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedAmt, setCopiedAmt] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['publicTenantView', userId, roomId],
    queryFn: () => fetchPublicActiveTenantData(userId, roomId),
    enabled: Boolean(userId && roomId),
    staleTime: 1000 * 60 * 2
  });

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#060b18',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#94a3b8',
        fontFamily: "'Inter', sans-serif",
        padding: '20px'
      }}>
        <div className="spinner" style={{ width: '44px', height: '44px', marginBottom: '16px' }}></div>
        <span style={{ fontSize: '0.95rem' }}>Loading meter reading history...</span>
      </div>
    );
  }

  const isPermissionError = error && (
    error.message?.includes('Permission') || 
    error.code === 'permission-denied' ||
    error.message?.includes('permission')
  );

  if (error || !data || !data.room) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#060b18',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        color: '#f8fafc',
        fontFamily: "'Inter', sans-serif"
      }}>
        <div className="glass-card" style={{ maxWidth: '440px', width: '100%', textAlign: 'center', padding: '32px 24px' }}>
          <AlertCircle size={48} style={{ color: '#f43f5e', margin: '0 auto 16px auto' }} />
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>
            {isPermissionError ? 'Firestore Permission Error' : 'Property Not Found'}
          </h2>

          <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginTop: '8px', lineHeight: '1.5' }}>
            {error?.message || `The scanned room ID ("${roomId}") does not match an active property under landlord ID ("${userId}").`}
          </p>

          {isPermissionError && (
            <div style={{
              background: 'rgba(244, 63, 94, 0.1)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: '12px',
              padding: '14px',
              marginTop: '16px',
              fontSize: '0.8rem',
              color: '#f8fafc',
              textAlign: 'left',
              lineHeight: '1.4'
            }}>
              <strong style={{ color: '#f43f5e', display: 'block', marginBottom: '6px' }}>
                Firebase Console Action Required:
              </strong>
              1. Enable <strong>Anonymous Authentication</strong> under <i>Authentication &gt; Sign-in method</i>.<br/>
              2. Or update <strong>Firestore Database Rules</strong> to allow public reads for <code>/users/{'{userId}'}/rooms/{'{roomId}'}</code>.
            </div>
          )}

          <button 
            className="btn btn-secondary btn-sm" 
            onClick={() => refetch()} 
            style={{ marginTop: '20px' }}
            disabled={isFetching}
          >
            <RefreshCw size={14} className={isFetching ? 'spin' : ''} /> {isFetching ? 'Retrying...' : 'Retry Connection'}
          </button>
        </div>
      </div>
    );
  }

  const { landlord, room, tenant, records, latestRecord } = data;

  if (!tenant) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#060b18',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        color: '#f8fafc',
        fontFamily: "'Inter', sans-serif"
      }}>
        <div className="glass-card" style={{ maxWidth: '420px', width: '100%', textAlign: 'center', padding: '32px 24px' }}>
          <User size={48} style={{ color: '#6366f1', margin: '0 auto 16px auto' }} />
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>{room.roomName} (Room #{room.roomNo})</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '12px', lineHeight: '1.5' }}>
            There is currently no active tenant assigned to this room.
          </p>
          <div style={{ marginTop: '20px', padding: '12px', borderRadius: '10px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(99, 102, 241, 0.2)', fontSize: '0.8rem', color: '#64748b' }}>
            Landlord: {landlord?.name || 'Property Owner'}
          </div>
        </div>
      </div>
    );
  }

  // Construct NPCI Compliant P2P Deep Links & Payment Details (Strips ALL whitespace/spaces from pa=)
  const getUpiDetails = () => {
    if (!landlord?.upi) return null;
    // Completely remove all whitespace, non-breaking spaces, zero-width spaces, and %20 from UPI ID
    const cleanUpi = String(landlord.upi)
      .replace(/%20/gi, '')
      .replace(/[\s\u00A0\u200B]+/g, '')
      .trim();
      
    if (!cleanUpi || !cleanUpi.includes('@')) return null;

    // Use Landlord's name accurately
    const payeeName = (landlord.name || landlord.displayName || landlord.email?.split('@')[0] || 'Property Owner').trim();
    const rawAmt = Number(latestRecord?.pendingAmount || latestRecord?.totalAmount || 0);

    // Clean P2P parameters without extra space or forced merchant params that cause app errors
    const simpleParams = `pa=${cleanUpi}&cu=INR`;
    const fullParams = rawAmt > 0 ? `pa=${cleanUpi}&pn=${encodeURIComponent(payeeName)}&am=${rawAmt.toFixed(2)}&cu=INR` : `pa=${cleanUpi}&pn=${encodeURIComponent(payeeName)}&cu=INR`;

    const upiQrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`upi://pay?${fullParams}`)}&color=0f172a&bgcolor=ffffff`;

    return {
      upiId: cleanUpi,
      amount: rawAmt,
      payeeName,
      upiQrApiUrl,
      cleanUrl: `upi://pay?${simpleParams}`,
      fullUrl: `upi://pay?${fullParams}`,
      gpayUrl: `tez://upi/pay?${simpleParams}`,
      phonepeUrl: `phonepe://pay?${simpleParams}`,
      paytmUrl: `paytmmp://pay?${simpleParams}`
    };
  };

  const upiInfo = getUpiDetails();

  const handleCopyUpi = (upiId) => {
    const clean = String(upiId).replace(/%20/gi, '').replace(/[\s\u00A0\u200B]+/g, '').trim();
    navigator.clipboard.writeText(clean);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  const handleCopyAmount = (amt) => {
    navigator.clipboard.writeText(String(amt));
    setCopiedAmt(true);
    setTimeout(() => setCopiedAmt(false), 2500);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#060b18',
      backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.12) 0%, transparent 60%)',
      color: '#f8fafc',
      fontFamily: "'Inter', sans-serif",
      paddingBottom: '24px',
      overflowX: 'hidden'
    }}>
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '16px 14px' }}>
        
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)'
            }}>
              <Building2 size={20} color="white" />
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#6366f1', fontWeight: 700, letterSpacing: '1px' }}>myTenant PORTAL</span>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>{room.roomName}</h3>
            </div>
          </div>
          <span className="badge badge-info" style={{ fontSize: '0.78rem' }}>Room #{room.roomNo}</span>
        </div>

        {/* Tenant Profile Banner */}
        <div className="glass-card" style={{ padding: '18px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '46px', height: '46px', borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <User size={24} />
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current Tenant</span>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tenant.name}</h4>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(99, 102, 241, 0.12)', fontSize: '0.8rem', color: '#94a3b8' }}>
            <div>
              <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b' }}>Move-in Date</span>
              <span style={{ color: '#f8fafc', fontWeight: 600 }}>{tenant.startDate || 'N/A'}</span>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b' }}>Landlord (Payee)</span>
              <span style={{ color: '#f8fafc', fontWeight: 600 }}>{landlord?.name || 'Property Owner'}</span>
            </div>
          </div>
        </div>

        {/* Hero Highlight Card: Latest Bill */}
        {latestRecord ? (
          <div className="glass-card" style={{ 
            padding: '22px', 
            marginBottom: '24px', 
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.8))',
            border: '1px solid rgba(99, 102, 241, 0.35)',
            boxShadow: '0 0 30px rgba(99, 102, 241, 0.15)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={18} style={{ color: '#f59e0b' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>Latest Electricity Reading</span>
              </div>
              <StatusBadge status={latestRecord.paidStatus} paidAmount={latestRecord.paidAmount} pendingAmount={latestRecord.pendingAmount} />
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '14px 0 18px 0' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Total Amount Due</span>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#10b981', letterSpacing: '-0.5px' }}>
                  ₹{latestRecord.totalAmount?.toLocaleString() || 0}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Units Consumed</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f59e0b' }}>
                  {latestRecord.totalUnitBurned || 0} kWh
                </div>
              </div>
            </div>

            {/* Meter Breakdown Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', padding: '12px', background: 'rgba(6, 11, 24, 0.6)', borderRadius: '12px', textAlign: 'center', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>PREVIOUS</span>
                <strong style={{ fontSize: '0.88rem' }}>{latestRecord.previousReading || 0}</strong>
              </div>
              <div style={{ borderLeft: '1px solid rgba(255,255,255,0.06)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>CURRENT</span>
                <strong style={{ fontSize: '0.88rem', color: '#6366f1' }}>{latestRecord.currentReading || 0}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>RATE / UNIT</span>
                <strong style={{ fontSize: '0.88rem', color: '#10b981' }}>₹{latestRecord.perUnit || 0}</strong>
              </div>
            </div>

            {/* Reliable Landlord UPI Payment Section */}
            {upiInfo ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                {/* 1-Tap Copy UPI ID Card (Payee: Landlord Name) */}
                <div style={{
                  padding: '14px',
                  borderRadius: '14px',
                  background: 'rgba(99, 102, 241, 0.08)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px'
                }}>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>
                      Landlord Payee: <strong style={{ color: '#f8fafc' }}>{upiInfo.payeeName}</strong>
                    </span>
                    <code style={{ fontSize: '0.95rem', fontWeight: 700, color: '#6366f1' }}>{upiInfo.upiId}</code>
                  </div>

                  <button 
                    className="btn btn-primary btn-sm" 
                    onClick={() => handleCopyUpi(upiInfo.upiId)}
                    style={{ gap: '6px', padding: '8px 14px', flexShrink: 0 }}
                  >
                    {copiedUpi ? <Check size={16} style={{ color: '#10b981' }} /> : <Copy size={16} />}
                    {copiedUpi ? 'Copied!' : 'Copy UPI'}
                  </button>
                </div>

                {/* Quick Copy Amount & Show Payment QR Buttons - Commented out for now
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button 
                    className="btn btn-secondary btn-sm" 
                    onClick={() => handleCopyAmount(upiInfo.amount)}
                    style={{ gap: '6px', fontSize: '0.8rem', padding: '10px' }}
                  >
                    {copiedAmt ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} />}
                    {copiedAmt ? 'Amount Copied!' : `Copy ₹${upiInfo.amount}`}
                  </button>

                  <button 
                    className="btn btn-secondary btn-sm" 
                    onClick={() => setShowQr(!showQr)}
                    style={{ gap: '6px', fontSize: '0.8rem', padding: '10px', borderColor: 'var(--primary)' }}
                  >
                    <QrCode size={14} style={{ color: 'var(--primary)' }} />
                    {showQr ? 'Hide Pay QR' : 'Show Pay QR'}
                  </button>
                </div>
                */}

                {/* Single Direct UPI Payment Button - Commented out for now
                <a 
                  href={upiInfo.cleanUrl} 
                  className="btn btn-primary" 
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    fontSize: '0.92rem', 
                    fontWeight: 700, 
                    gap: '8px', 
                    textDecoration: 'none',
                    boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)'
                  }}
                >
                  <CreditCard size={18} /> Pay via Any UPI App
                </a>
                */}

                {/* Payment QR Image Display - Commented out for now
                {showQr && (
                  <div style={{ textAlign: 'center', padding: '16px', borderRadius: '14px', background: '#ffffff', border: '1px solid rgba(255,255,255,0.2)', marginTop: '4px' }}>
                    <img src={upiInfo.upiQrApiUrl} alt="Pay UPI QR" style={{ width: '180px', height: '180px', display: 'block', margin: '0 auto' }} />
                    <span style={{ fontSize: '0.72rem', color: '#0f172a', fontWeight: 700, marginTop: '8px', display: 'block' }}>
                      Scan to Pay Landlord ({upiInfo.payeeName}) ₹{upiInfo.amount}
                    </span>
                  </div>
                )}
                */}

                {/* Security Note */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.75rem', color: '#94a3b8', background: 'rgba(15, 23, 42, 0.6)', padding: '10px 12px', borderRadius: '10px', marginTop: '2px' }}>
                  <Info size={14} style={{ color: '#6366f1', flexShrink: 0, marginTop: '2px' }} />
                  <span>
                    <strong>Payee:</strong> Payments go directly to Landlord <strong>{upiInfo.payeeName}</strong> (<code>{upiInfo.upiId}</code>).
                  </span>
                </div>

              </div>
            ) : landlord?.phone ? (
              <a 
                href={`tel:${landlord.phone}`} 
                className="btn btn-secondary" 
                style={{ width: '100%', padding: '12px', fontSize: '0.88rem', gap: '8px', textDecoration: 'none' }}
              >
                <Phone size={16} /> Contact Landlord ({landlord.phone})
              </a>
            ) : (
              <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#64748b' }}>
                Landlord UPI ID not configured yet. Please pay rent/bills directly to property owner.
              </div>
            )}
          </div>
        ) : (
          <div className="glass-card" style={{ padding: '24px', textAlign: 'center', marginBottom: '24px' }}>
            <Zap size={36} style={{ color: '#64748b', margin: '0 auto 10px auto' }} />
            <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>No Reading Records Logged Yet</h4>
            <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: '4px' }}>Your landlord will log meter readings here monthly.</p>
          </div>
        )}

        {/* Full Reading History Table / Timeline */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '16px' }}>
            Reading History ({records.length})
          </h3>

          {records.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
              No previous history available.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {records.map((rec, index) => {
                const dateStr = rec.createdAt ? new Date(rec.createdAt).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric'
                }) : `Record #${records.length - index}`;

                return (
                  <div key={rec.id} style={{
                    padding: '14px',
                    borderRadius: '12px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(99, 102, 241, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '4px' }}>
                        <Calendar size={13} /> {dateStr}
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                        {rec.previousReading || 0} → <span style={{ color: '#6366f1' }}>{rec.currentReading || 0} kWh</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '2px' }}>
                        {rec.totalUnitBurned || 0} units @ ₹{rec.perUnit || 0}/unit
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: '#10b981', marginBottom: '4px' }}>
                        ₹{rec.totalAmount?.toLocaleString() || 0}
                      </div>
                      <StatusBadge status={rec.paidStatus} paidAmount={rec.paidAmount} pendingAmount={rec.pendingAmount} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Data Isolation & Privacy Notice */}
        <div style={{ 
          marginTop: '28px', 
          padding: '14px', 
          borderRadius: '12px', 
          background: 'rgba(15, 23, 42, 0.4)', 
          border: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px',
          fontSize: '0.78rem',
          color: '#64748b'
        }}>
          <ShieldCheck size={18} style={{ color: '#10b981', flexShrink: 0 }} />
          <span>Active Occupant View. Past tenant data is private and strictly hidden.</span>
        </div>

      </div>
    </div>
  );
};
