import React, { useState, useEffect } from 'react';
import { paymentSettingsApi } from '../../api';
import { QrCode, Check, AlertCircle, Upload, Building2, Smartphone, X } from 'lucide-react';

export default function UpiSettingsModal({ isOpen, onClose, hotelId, onSettingsUpdated }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [form, setForm] = useState({
    upi_id: '',
    upi_payee_name: '',
    upi_qr_image: '',
    upi_merchant_code: '',
  });

  // Load existing settings
  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setSuccessMsg('');
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await paymentSettingsApi.getSettings(hotelId);
        if (res.success && res.settings) {
          setForm({
            upi_id: res.settings.upi_id || '',
            upi_payee_name: res.settings.upi_payee_name || res.hotel?.name || '',
            upi_qr_image: res.settings.upi_qr_image || '',
            upi_merchant_code: res.settings.upi_merchant_code || '',
          });
        }
      } catch (err) {
        console.error('Failed to load UPI settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [isOpen, hotelId]);

  if (!isOpen) return null;

  // Handle local image file upload (converts to base64 data URL)
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('Image file must be under 2MB in size.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setForm((prev) => ({
        ...prev,
        upi_qr_image: uploadEvent.target?.result || '',
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    // Client-side UPI ID check
    const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
    if (!upiRegex.test(form.upi_id.trim())) {
      setError('Please enter a valid UPI VPA ID (e.g. apexresort@icici, 9876543210@paytm, hotel@okhdfcbank)');
      return;
    }

    try {
      setSaving(true);
      const res = await paymentSettingsApi.updateSettings({
        upi_id: form.upi_id.trim(),
        upi_payee_name: form.upi_payee_name.trim(),
        upi_qr_image: form.upi_qr_image || null,
        upi_merchant_code: form.upi_merchant_code.trim() || null,
      }, hotelId);

      if (res.success) {
        setSuccessMsg('✓ UPI ID & QR settings saved successfully!');
        if (onSettingsUpdated) {
          onSettingsUpdated(res.settings);
        }
        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        setError(res.message || 'Failed to save settings');
      }
    } catch (err) {
      setError(err.data?.message || err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Preview Dynamic UPI URI
  const previewUpiString = form.upi_id
    ? `upi://pay?pa=${encodeURIComponent(form.upi_id.trim())}&pn=${encodeURIComponent(form.upi_payee_name.trim() || 'Hotel')}&cu=INR`
    : '';

  const previewQrUrl = previewUpiString
    ? `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(previewUpiString)}&size=180x180&margin=6`
    : null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '560px',
          background: 'var(--white, #ffffff)',
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8',
              }}
            >
              <QrCode size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#ffffff' }}>
                Set Hotel UPI ID & QR Code
              </h3>
              <p style={{ margin: 0, fontSize: '11.5px', color: '#94a3b8' }}>
                Official receiving VPA for Restaurant POS & Front Desk billing
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          {error && (
            <div
              style={{
                marginBottom: '16px',
                padding: '10px 14px',
                borderRadius: '8px',
                background: '#fee2e2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                marginBottom: '16px',
                padding: '10px 14px',
                borderRadius: '8px',
                background: '#dcfce7',
                border: '1px solid #bbf7d0',
                color: '#15803d',
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Check size={16} style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px' }}>
            {/* UPI ID Field */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--t-700, #334155)', marginBottom: '4px' }}>
                Hotel UPI ID (VPA) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#64748b',
                    fontSize: '14px',
                  }}
                >
                  📱
                </span>
                <input
                  type="text"
                  required
                  placeholder="e.g. apexgrand@icici or 9876543210@paytm"
                  value={form.upi_id}
                  onChange={(e) => setForm({ ...form, upi_id: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 36px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    border: '1px solid var(--border, #cbd5e1)',
                    background: 'var(--surface-input, #ffffff)',
                    color: '#0f172a',
                    fontWeight: '600',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#64748b' }}>
                Payments will be directly credited to this bank account via GPay, PhonePe, Paytm, BHIM, CRED.
              </p>
            </div>

            {/* Payee / Business Name */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--t-700, #334155)', marginBottom: '4px' }}>
                Payee / Hotel Business Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#64748b',
                    fontSize: '14px',
                  }}
                >
                  🏨
                </span>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Sea Breeze Resort"
                  value={form.upi_payee_name}
                  onChange={(e) => setForm({ ...form, upi_payee_name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 36px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    border: '1px solid var(--border, #cbd5e1)',
                    background: 'var(--surface-input, #ffffff)',
                    color: '#0f172a',
                    fontWeight: '600',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#64748b' }}>
                This business name will be displayed on the customer's phone when scanning the QR code.
              </p>
            </div>

            {/* Upload or Custom Static QR Standee */}
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>
                  Custom Merchant QR Standee (Optional)
                </label>
                {form.upi_qr_image && (
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, upi_qr_image: '' })}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    Remove Standee
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    background: '#ffffff',
                    border: '1px dashed #cbd5e1',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#475569',
                  }}
                >
                  <Upload size={14} />
                  <span>Upload QR Standee Image (Paytm / BharatPe)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              {form.upi_qr_image && (
                <div style={{ marginTop: '10px', textAlign: 'center' }}>
                  <img
                    src={form.upi_qr_image}
                    alt="Custom QR Preview"
                    style={{
                      maxHeight: '120px',
                      maxWidth: '120px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      objectFit: 'contain',
                    }}
                  />
                  <div style={{ fontSize: '11px', color: '#15803d', fontWeight: '700', marginTop: '2px' }}>
                    ✓ Custom Standee Active
                  </div>
                </div>
              )}
            </div>

            {/* Live Interactive Preview */}
            {form.upi_id && previewQrUrl && (
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '10px',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                }}
              >
                <div
                  style={{
                    background: '#ffffff',
                    padding: '6px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={previewQrUrl}
                    alt="Live UPI QR Preview"
                    style={{ width: '84px', height: '84px', display: 'block' }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: '#15803d', textTransform: 'uppercase' }}>
                    ● Live Dynamic Scannable QR Preview
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                    {form.upi_payee_name || 'Hotel Name'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#334155', fontWeight: '600', marginTop: '1px' }}>
                    UPI: <code>{form.upi_id}</code>
                  </div>
                  <div style={{ fontSize: '11px', color: '#166534', marginTop: '3px' }}>
                    ✓ Generates instant QR with auto-filled bill amount in POS and Folio billing.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
              marginTop: '20px',
              borderTop: '1px solid #e2e8f0',
              paddingTop: '14px',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="btn btn-outline"
              style={{ fontSize: '13px', padding: '8px 16px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || loading}
              className="btn btn-primary"
              style={{
                fontSize: '13px',
                padding: '8px 20px',
                fontWeight: '700',
                background: 'var(--brand, #2563eb)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              {saving ? 'Saving UPI Settings...' : 'Save UPI & QR Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
