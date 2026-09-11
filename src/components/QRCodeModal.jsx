import React from 'react';
import { Modal } from './Modal';
import { QrCode, Copy, ExternalLink, Printer, Check, Smartphone, Zap, CreditCard } from 'lucide-react';

export const QRCodeModal = ({ isOpen, onClose, userId, roomId, roomName, roomNo }) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const publicUrl = `${window.location.origin}/tenant-view/${userId}/${roomId}`;
  // Pure white background (#ffffff) with crisp dark code (#0f172a) for clean printing
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(publicUrl)}&color=0f172a&bgcolor=ffffff`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Room Placard QR Code - ${roomName}</title>
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Inter', system-ui, -apple-system, sans-serif;
              background: #ffffff;
              color: #0f172a;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              padding: 20px;
            }
            .print-placard {
              width: 100%;
              max-width: 480px;
              border: 3px solid #0f172a;
              border-radius: 24px;
              padding: 36px 28px;
              text-align: center;
              background: #ffffff;
              box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
              position: relative;
            }
            .badge-header {
              display: inline-block;
              background: #0f172a;
              color: #ffffff;
              font-size: 11px;
              font-weight: 800;
              letter-spacing: 2px;
              text-transform: uppercase;
              padding: 6px 16px;
              border-radius: 999px;
              margin-bottom: 20px;
            }
            .room-title {
              font-size: 26px;
              font-weight: 900;
              color: #0f172a;
              letter-spacing: -0.5px;
              margin-bottom: 4px;
            }
            .room-number {
              font-size: 15px;
              color: #475569;
              font-weight: 600;
              margin-bottom: 24px;
            }
            .qr-wrapper {
              background: #ffffff;
              border: 2px dashed #cbd5e1;
              border-radius: 20px;
              padding: 16px;
              display: inline-block;
              margin-bottom: 24px;
            }
            .qr-wrapper img {
              width: 220px;
              height: 220px;
              display: block;
            }
            .guide-box {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 16px;
              padding: 20px 16px;
              text-align: left;
              margin-bottom: 20px;
            }
            .guide-title {
              font-size: 13px;
              font-weight: 800;
              color: #0f172a;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 12px;
              text-align: center;
            }
            .guide-step {
              display: flex;
              align-items: flex-start;
              gap: 12px;
              margin-bottom: 10px;
              font-size: 13px;
              color: #334155;
              line-height: 1.4;
            }
            .guide-step:last-child { margin-bottom: 0; }
            .step-number {
              background: #0f172a;
              color: #ffffff;
              width: 22px;
              height: 22px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 11px;
              font-weight: 800;
              flex-shrink: 0;
            }
            .placard-footer {
              font-size: 11px;
              color: #64748b;
              font-weight: 500;
            }
            @media print {
              body { background: #ffffff; padding: 0; }
              .print-placard { border-width: 2px; box-shadow: none; max-width: 100%; width: 100%; border-radius: 0; }
            }
          </style>
        </head>
        <body>
          <div class="print-placard">
            <div class="badge-header">myTenant PORTAL</div>
            
            <h1 class="room-title">${roomName}</h1>
            <div class="room-number">Room Number #${roomNo}</div>

            <div class="qr-wrapper">
              <img src="${qrApiUrl}" alt="Room QR Code" />
            </div>

            <div class="guide-box">
              <div class="guide-title">How to View Readings & Pay</div>
              <div class="guide-step">
                <div class="step-number">1</div>
                <div><strong>Open Camera:</strong> Open your smartphone camera or any QR scanner app.</div>
              </div>
              <div class="guide-step">
                <div class="step-number">2</div>
                <div><strong>Scan Code:</strong> Point your camera at this QR code to open your room portal.</div>
              </div>
              <div class="guide-step">
                <div class="step-number">3</div>
                <div><strong>View & Pay:</strong> Check electricity meter reading history & pay via Google Pay, PhonePe, or UPI.</div>
              </div>
            </div>

            <div class="placard-footer">
              Scan anytime 24/7 for monthly meter reading receipts & bill status
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Room QR Code Placard">
      <div style={{ textAlign: 'center', padding: '10px 0' }}>
        
        {/* Pure White Background QR Box */}
        <div style={{
          background: '#ffffff',
          border: '2px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '20px',
          padding: '20px',
          display: 'inline-block',
          marginBottom: '18px',
          boxShadow: '0 8px 25px rgba(0, 0, 0, 0.4)'
        }}>
          <img 
            src={qrApiUrl} 
            alt="Room QR Code" 
            style={{ width: '210px', height: '210px', display: 'block' }}
          />
        </div>

        {/* Room Info (NO Tenant Details) */}
        <h4 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{roomName}</h4>
        <span className="badge badge-info" style={{ marginTop: '6px', fontSize: '0.82rem' }}>
          Room #{roomNo}
        </span>

        {/* User Scanning Guide */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '14px',
          padding: '16px',
          marginTop: '18px',
          textAlign: 'left'
        }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
            Tenant Scanning Instructions:
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Smartphone size={15} style={{ color: 'var(--emerald)', flexShrink: 0 }} />
              <span>1. Open smartphone camera or any QR Code scanner.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={15} style={{ color: 'var(--amber)', flexShrink: 0 }} />
              <span>2. Scan to view monthly electricity meter reading history.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} />
              <span>3. Pay electricity & rent directly via GPay / PhonePe / UPI.</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '22px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleCopyLink}>
            {copied ? <Check size={14} style={{ color: 'var(--emerald)' }} /> : <Copy size={14} />}
            {copied ? 'Link Copied!' : 'Copy Public URL'}
          </button>

          <a href={publicUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
            <ExternalLink size={14} /> Open Public View
          </a>

          <button className="btn btn-primary btn-sm" onClick={handlePrint}>
            <Printer size={14} /> Print Room Placard
          </button>
        </div>
      </div>
    </Modal>
  );
};
