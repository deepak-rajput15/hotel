import React, { useState } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import {
  Megaphone,
  X,
  AlertCircle,
  AlertTriangle,
  Info,
  Users,
  Building,
  CheckCircle2,
  Calendar,
  Pin,
  Send,
} from 'lucide-react';

export default function BroadcastModal() {
  const { isBroadcastOpen, setIsBroadcastOpen, createBroadcast } = useNotifications();
  const { user } = useAuth();

  const isPlatformAdmin = !!user?.is_platform_admin;
  const accessibleHotels = user?.accessible_hotels || [];

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('INFO');
  const [targetScope, setTargetScope] = useState(
    isPlatformAdmin ? 'GLOBAL_OWNERS' : 'ALL_STAFF'
  );
  const [targetRole, setTargetRole] = useState('front-desk');
  const [selectedHotelId, setSelectedHotelId] = useState('');
  const [isBanner, setIsBanner] = useState(true);
  const [expiryOption, setExpiryOption] = useState('24h'); // 'today', '24h', '3d', '7d', 'none'
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  if (!isBroadcastOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!title.trim() || !message.trim()) {
      setError('Please provide both a notification title and detailed message.');
      return;
    }

    try {
      setSubmitting(true);

      // Compute expiry date
      let expiresAt = null;
      const now = new Date();
      if (expiryOption === 'today') {
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        expiresAt = endOfToday.toISOString();
      } else if (expiryOption === '24h') {
        expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      } else if (expiryOption === '3d') {
        expiresAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
      } else if (expiryOption === '7d') {
        expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      }

      const payload = {
        title: title.trim(),
        message: message.trim(),
        priority,
        is_banner: isBanner,
        target_scope: targetScope,
        target_role: targetScope === 'SPECIFIC_ROLE' ? targetRole : null,
        hotel_id: selectedHotelId ? selectedHotelId : null,
        expires_at: expiresAt,
      };

      await createBroadcast(payload);

      setSuccessMsg('Notification broadcasted successfully!');
      setTimeout(() => {
        setIsBroadcastOpen(false);
        setTitle('');
        setMessage('');
        setSuccessMsg(null);
      }, 1200);
    } catch (err) {
      console.error('Failed to broadcast:', err);
      setError(err.data?.message || err.message || 'Failed to broadcast notification.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        className="card"
        style={{
          width: '580px',
          maxWidth: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          borderRadius: 'var(--r-container)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          background: 'var(--white)',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-sub)',
            background: 'var(--surface-sub)',
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
                borderRadius: 'var(--r-sm)',
                background: 'var(--brand-50)',
                color: 'var(--brand)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Megaphone size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--t-900)' }}>
                {isPlatformAdmin
                  ? 'SaaS Platform Announcement Broadcast'
                  : 'Broadcast Notification to Hotel Staff'}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--t-500)', marginTop: '1px' }}>
                {isPlatformAdmin
                  ? 'Send internal announcements and alerts to Hotel Owners'
                  : 'Flash reminders or instructions to your hotel subordinates'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsBroadcastOpen(false)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--t-500)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: 'var(--r-sm)',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '20px' }}>
          {error && (
            <div
              style={{
                padding: '10px 14px',
                background: 'var(--error-bg)',
                border: '1px solid var(--error-border)',
                borderRadius: 'var(--r-sm)',
                color: 'var(--error)',
                fontSize: '12.5px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                padding: '10px 14px',
                background: 'var(--success-bg)',
                border: '1px solid var(--success-border)',
                borderRadius: 'var(--r-sm)',
                color: 'var(--success)',
                fontSize: '12.5px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <CheckCircle2 size={15} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Section 1: Target Audience Selection */}
          <div style={{ marginBottom: '18px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: '700',
                color: 'var(--t-900)',
                marginBottom: '6px',
              }}
            >
              🎯 Select Target Audience *
            </label>

            {isPlatformAdmin ? (
              <select
                value={targetScope}
                onChange={(e) => setTargetScope(e.target.value)}
                className="input"
                style={{ width: '100%', fontSize: '13px' }}
              >
                <option value="GLOBAL_OWNERS">🌐 All Hotel Owners (Across All Tenant Organizations)</option>
              </select>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <label
                    style={{
                      border: '1px solid',
                      borderColor: targetScope === 'ALL_STAFF' ? 'var(--brand)' : 'var(--border)',
                      background: targetScope === 'ALL_STAFF' ? 'var(--brand-50)' : 'var(--white)',
                      padding: '10px 12px',
                      borderRadius: 'var(--r-sm)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <input
                      type="radio"
                      name="target_scope"
                      checked={targetScope === 'ALL_STAFF'}
                      onChange={() => setTargetScope('ALL_STAFF')}
                    />
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--t-900)' }}>
                        👥 All Staff
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--t-500)' }}>
                        Broadcast to entire team
                      </div>
                    </div>
                  </label>

                  <label
                    style={{
                      border: '1px solid',
                      borderColor: targetScope === 'SPECIFIC_ROLE' ? 'var(--brand)' : 'var(--border)',
                      background: targetScope === 'SPECIFIC_ROLE' ? 'var(--brand-50)' : 'var(--white)',
                      padding: '10px 12px',
                      borderRadius: 'var(--r-sm)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <input
                      type="radio"
                      name="target_scope"
                      checked={targetScope === 'SPECIFIC_ROLE'}
                      onChange={() => setTargetScope('SPECIFIC_ROLE')}
                    />
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--t-900)' }}>
                        🎯 Specific Role
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--t-500)' }}>
                        Target department/role
                      </div>
                    </div>
                  </label>
                </div>

                {targetScope === 'SPECIFIC_ROLE' && (
                  <div
                    style={{
                      background: 'var(--surface-sub)',
                      border: '1px solid var(--border-sub)',
                      borderRadius: 'var(--r-sm)',
                      padding: '10px',
                      marginTop: '4px',
                    }}
                  >
                    <label
                      style={{
                        display: 'block',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        color: 'var(--t-700)',
                        marginBottom: '6px',
                      }}
                    >
                      Choose Role to Receive this Notification:
                    </label>
                    <select
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      className="input"
                      style={{ width: '100%', fontSize: '13px' }}
                    >
                      <option value="front-desk">🛎️ Front Desk Receptionists Only</option>
                      <option value="head-chef">🍳 Kitchen & Chefs Only</option>
                      <option value="restaurant-cashier">🍽️ Restaurant Cashiers & Waiters Only</option>
                      <option value="storekeeper">📦 Storekeepers & Inventory Only</option>
                      <option value="general-manager">👔 General Managers & Sub-Admins Only</option>
                    </select>
                  </div>
                )}

                {/* Hotel Property Selector (for multi-hotel owner) */}
                {accessibleHotels.length > 1 && (
                  <div style={{ marginTop: '6px' }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '11.5px',
                        fontWeight: '600',
                        color: 'var(--t-600)',
                        marginBottom: '4px',
                      }}
                    >
                      Filter by Property (Optional):
                    </label>
                    <select
                      value={selectedHotelId}
                      onChange={(e) => setSelectedHotelId(e.target.value)}
                      className="input"
                      style={{ width: '100%', fontSize: '12.5px' }}
                    >
                      <option value="">🏨 All Properties (Apex Hospitality Group)</option>
                      {accessibleHotels.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name} ({h.hotel_code} - {h.city})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Priority & Flash in Banner */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  color: 'var(--t-900)',
                  marginBottom: '6px',
                }}
              >
                Notification Priority *
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="input"
                style={{ width: '100%', fontSize: '13px' }}
              >
                <option value="INFO">ℹ️ Normal / Info</option>
                <option value="WARNING">⚠️ Warning / Attention</option>
                <option value="URGENT">🚨 Urgent / Critical Alert</option>
              </select>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  color: 'var(--t-900)',
                  marginBottom: '6px',
                }}
              >
                Expiration / Validity
              </label>
              <select
                value={expiryOption}
                onChange={(e) => setExpiryOption(e.target.value)}
                className="input"
                style={{ width: '100%', fontSize: '13px' }}
              >
                <option value="24h">Next 24 Hours</option>
                <option value="today">Today only (Ends midnight)</option>
                <option value="3d">Next 3 Days</option>
                <option value="7d">Next 7 Days</option>
                <option value="none">Permanent (Until Dismissed)</option>
              </select>
            </div>
          </div>

          {/* Toggle: Flash in Top Reminder Bar */}
          <div
            style={{
              background: isBanner ? 'var(--brand-50)' : 'var(--surface-sub)',
              border: '1px solid',
              borderColor: isBanner ? 'var(--brand)' : 'var(--border-sub)',
              borderRadius: 'var(--r-sm)',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '18px',
              cursor: 'pointer',
            }}
            onClick={() => setIsBanner(!isBanner)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Pin size={16} color={isBanner ? 'var(--brand)' : 'var(--t-500)'} />
              <div>
                <strong style={{ fontSize: '12.5px', color: 'var(--t-900)' }}>
                  ⚡ Flash in Top Reminder Bar
                </strong>
                <p style={{ fontSize: '11px', color: 'var(--t-600)', marginTop: '1px' }}>
                  Pins this message prominently at the very top of the staff dashboard screen.
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={isBanner}
              onChange={(e) => setIsBanner(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--brand)', cursor: 'pointer' }}
            />
          </div>

          {/* Section 3: Title */}
          <div style={{ marginBottom: '14px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: '700',
                color: 'var(--t-900)',
                marginBottom: '6px',
              }}
            >
              Notification Title *
            </label>
            <input
              type="text"
              className="input"
              style={{ width: '100%', fontSize: '13px' }}
              placeholder={
                isPlatformAdmin
                  ? 'e.g. Scheduled System Maintenance Tonight at 2 AM'
                  : 'e.g. Urgent VIP Delegation Arrival at 3 PM / Staff Meeting'
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Section 4: Message Body */}
          <div style={{ marginBottom: '18px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: '700',
                color: 'var(--t-900)',
                marginBottom: '6px',
              }}
            >
              Message Content / Instructions *
            </label>
            <textarea
              className="input"
              rows={4}
              style={{ width: '100%', fontSize: '13px', resize: 'vertical' }}
              placeholder="Write the complete announcement, reminders, or operational instructions..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          </div>

          {/* Live Preview Card */}
          {title && (
            <div
              style={{
                border: '1px dashed var(--border)',
                background: 'var(--surface-sub)',
                borderRadius: 'var(--r-sm)',
                padding: '12px',
                marginBottom: '18px',
              }}
            >
              <div
                style={{
                  fontSize: '10.5px',
                  fontWeight: '700',
                  color: 'var(--t-500)',
                  textTransform: 'uppercase',
                  marginBottom: '6px',
                }}
              >
                Live Preview (How recipients will see it):
              </div>
              <div
                style={{
                  background:
                    priority === 'URGENT'
                      ? '#fee2e2'
                      : priority === 'WARNING'
                      ? '#fef3c7'
                      : '#e0e7ff',
                  border: '1px solid',
                  borderColor:
                    priority === 'URGENT'
                      ? '#fca5a5'
                      : priority === 'WARNING'
                      ? '#fde68a'
                      : '#c7d2fe',
                  borderRadius: 'var(--r-sm)',
                  padding: '10px 12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                  <strong style={{ fontSize: '13px', color: 'var(--t-900)' }}>{title}</strong>
                  <span
                    style={{
                      fontSize: '9.5px',
                      fontWeight: '800',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      background: 'rgba(0,0,0,0.08)',
                    }}
                  >
                    {priority}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--t-700)', margin: 0 }}>
                  {message || 'Your detailed message will appear here...'}
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
              paddingTop: '12px',
              borderTop: '1px solid var(--border-sub)',
            }}
          >
            <button
              type="button"
              onClick={() => setIsBroadcastOpen(false)}
              className="btn btn-secondary btn-sm"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={submitting}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Send size={13} />
              <span>{submitting ? 'Broadcasting...' : 'Broadcast Notification Now'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

