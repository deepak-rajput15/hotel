import React, { useState, useEffect } from 'react';
import { paymentSettingsApi } from '../../api';
import { QrCode, Copy, Check, Settings2, Smartphone, ShieldCheck, Sparkles, Image as ImageIcon } from 'lucide-react';
import UpiSettingsModal from './UpiSettingsModal';

export default function UpiQrPaymentDisplay({
  amount = 0,
  orderNumber = '',
  hotelId = null,
  hotelName = '',
  onUtrChange = null,
  initialUtr = '',
  canConfigure = true,
}) {
  const [settings, setSettings] = useState({
    upi_id: 'merchant@apexhotel',
    upi_payee_name: hotelName || 'Hotel GrandStay',
    upi_qr_image: null,
    is_configured: false,
  });

  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [viewMode, setViewMode] = useState('DYNAMIC'); // 'DYNAMIC' or 'STANDEE'
  const [utr, setUtr] = useState(initialUtr || '');

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await paymentSettingsApi.getSettings(hotelId);
      if (res.success && res.settings) {
        setSettings({
          upi_id: res.settings.upi_id || 'merchant@apexhotel',
          upi_payee_name: res.settings.upi_payee_name || hotelName || 'Hotel GrandStay',
          upi_qr_image: res.settings.upi_qr_image || null,
          is_configured: !!res.settings.is_configured,
        });
      }
    } catch (err) {
      console.error('Failed to load hotel UPI settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [hotelId]);

  const cleanAmount = parseFloat(amount) || 0;
  const payeeName = settings.upi_payee_name || hotelName || 'Hotel';
  const upiId = settings.upi_id || 'merchant@apexhotel';
  const billNote = orderNumber ? `Bill_${orderNumber}` : 'Hotel_Bill';

  // Standard NPCI UPI URI
  const upiString = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${cleanAmount.toFixed(2)}&tn=${encodeURIComponent(billNote)}&cu=INR`;
  const dynamicQrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(upiString)}&size=190x190&margin=6`;

  const handleCopyUpi = () => {
    navigator.clipboard?.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUtrInput = (e) => {
    const val = e.target.value;
    setUtr(val);
    if (onUtrChange) {
      onUtrChange(val);
    }
  };

  return (
    <div
      style={{
        background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
        border: '1.5px solid #e2e8f0',
        borderRadius: '12px',
        padding: '14px',
        marginBottom: '16px',
        textAlign: 'center',
        position: 'relative',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
      }}
    >
      {/* Top Bar: Payee & Settings Button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px',
          paddingBottom: '8px',
          borderBottom: '1px solid #f1f5f9',
          flexWrap: 'wrap',
          gap: '6px',
        }}
      >
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span>💳</span>
            <span>{payeeName}</span>
          </div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            Scan & Pay via any UPI App
          </div>
        </div>

        {canConfigure && (
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              fontSize: '11px',
              fontWeight: '700',
              borderRadius: '6px',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#1d4ed8',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Configure Hotel UPI ID and custom QR standee"
          >
            <Settings2 size={13} />
            <span>Set / Change UPI ID</span>
          </button>
        )}
      </div>

      {/* Standee vs Dynamic Toggle (if custom standee is configured) */}
      {settings.upi_qr_image && (
        <div
          style={{
            display: 'inline-flex',
            background: '#f1f5f9',
            padding: '2px',
            borderRadius: '6px',
            marginBottom: '10px',
          }}
        >
          <button
            type="button"
            onClick={() => setViewMode('DYNAMIC')}
            style={{
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: viewMode === 'DYNAMIC' ? '700' : '500',
              background: viewMode === 'DYNAMIC' ? '#ffffff' : 'transparent',
              color: viewMode === 'DYNAMIC' ? '#1e293b' : '#64748b',
              border: 'none',
              cursor: 'pointer',
              boxShadow: viewMode === 'DYNAMIC' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            }}
          >
            ⚡ Auto-Amount QR (₹{cleanAmount})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('STANDEE')}
            style={{
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: viewMode === 'STANDEE' ? '700' : '500',
              background: viewMode === 'STANDEE' ? '#ffffff' : 'transparent',
              color: viewMode === 'STANDEE' ? '#1e293b' : '#64748b',
              border: 'none',
              cursor: 'pointer',
              boxShadow: viewMode === 'STANDEE' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            }}
          >
            🖼️ Merchant Standee
          </button>
        </div>
      )}

      {/* QR Code Container */}
      <div
        style={{
          display: 'inline-block',
          background: '#ffffff',
          padding: '8px',
          borderRadius: '12px',
          border: '1.5px solid #cbd5e1',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
          position: 'relative',
        }}
      >
        {viewMode === 'STANDEE' && settings.upi_qr_image ? (
          <img
            src={settings.upi_qr_image}
            alt="Merchant UPI Standee"
            style={{ width: '170px', height: '170px', objectFit: 'contain', display: 'block', borderRadius: '8px' }}
          />
        ) : (
          <img
            src={dynamicQrUrl}
            alt="Dynamic Scannable UPI QR"
            style={{ width: '170px', height: '170px', display: 'block', borderRadius: '8px' }}
          />
        )}

        {/* Center UPI Logo badge */}
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '9px',
            fontWeight: '800',
            color: '#15803d',
            border: '1px solid #bbf7d0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          ✓ NPCI UPI
        </div>
      </div>

      {/* Bill Amount Pill */}
      <div style={{ marginTop: '8px' }}>
        <span
          style={{
            display: 'inline-block',
            background: '#ecfdf5',
            color: '#047857',
            border: '1px solid #a7f3d0',
            padding: '3px 12px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: '800',
            letterSpacing: '0.3px',
          }}
        >
          ₹{cleanAmount.toFixed(2)} (Amount Auto-filled)
        </span>
      </div>

      {/* UPI ID Pill & Copy Button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          marginTop: '8px',
        }}
      >
        <span style={{ fontSize: '11px', color: '#64748b' }}>UPI ID:</span>
        <code
          style={{
            fontSize: '12px',
            fontWeight: '700',
            background: '#f1f5f9',
            padding: '2px 8px',
            borderRadius: '4px',
            color: '#0f172a',
          }}
        >
          {upiId}
        </code>
        <button
          type="button"
          onClick={handleCopyUpi}
          style={{
            background: copied ? '#dcfce7' : '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            padding: '2px 6px',
            fontSize: '11px',
            color: copied ? '#15803d' : '#475569',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            fontWeight: '600',
          }}
          title="Copy UPI ID"
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>

      {/* Supported UPI Apps logos */}
      <div
        style={{
          marginTop: '8px',
          fontSize: '10.5px',
          color: '#64748b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontWeight: '600' }}>GooglePay</span> &bull;
        <span style={{ fontWeight: '600' }}>PhonePe</span> &bull;
        <span style={{ fontWeight: '600' }}>Paytm</span> &bull;
        <span style={{ fontWeight: '600' }}>BHIM</span> &bull;
        <span style={{ fontWeight: '600' }}>CRED</span>
      </div>

      {/* Optional UTR / Reference Input */}
      {onUtrChange && (
        <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #e2e8f0', textAlign: 'left' }}>
          <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '3px' }}>
            Optional UPI Transaction / UTR Ref #:
          </label>
          <input
            type="text"
            placeholder="e.g. 430219928312"
            value={utr}
            onChange={handleUtrInput}
            style={{
              width: '100%',
              padding: '6px 10px',
              fontSize: '12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
        </div>
      )}

      {/* UPI Settings Modal */}
      <UpiSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        hotelId={hotelId}
        onSettingsUpdated={(newSettings) => {
          setSettings({
            upi_id: newSettings.upi_id,
            upi_payee_name: newSettings.upi_payee_name,
            upi_qr_image: newSettings.upi_qr_image,
            is_configured: true,
          });
        }}
      />
    </div>
  );
}

