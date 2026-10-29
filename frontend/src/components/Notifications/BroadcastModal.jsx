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
  Sparkles,
  Clock,
  Eye,
  Check,
  Briefcase,
  Utensils,
  Boxes,
  ConciergeBell,
  ChefHat,
  Shield,
  Layers,
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

  // Preset Templates for fast 1-click broadcast
  const applyTemplate = (tpl) => {
    setTitle(tpl.title);
    setMessage(tpl.message);
    setPriority(tpl.priority);
    setIsBanner(tpl.isBanner);
    if (tpl.role) {
      setTargetScope('SPECIFIC_ROLE');
      setTargetRole(tpl.role);
    } else {
      setTargetScope('ALL_STAFF');
    }
  };

  const templates = [
    {
      label: '👑 VIP Arrival',
      title: 'VIP Dignitary / Corporate Delegation Arrival',
      message: 'High-profile VIP guest check-in scheduled for today at 3:00 PM. Please ensure priority Form-C KYC verification, room inspection, and complimentary welcome beverages.',
      priority: 'URGENT',
      isBanner: true,
      role: 'front-desk',
    },
    {
      label: '📅 Staff Briefing',
      title: 'All-Hands Operations Briefing Meeting',
      message: 'All department leads and staff members are requested to assemble in the conference room today at 4:30 PM for our monthly performance & service quality review.',
      priority: 'INFO',
      isBanner: false,
      role: null,
    },
    {
      label: '🧹 Deep Cleaning',
      title: 'Mandatory Kitchen & Storage Deep Clean Audit',
      message: 'Comprehensive sanitation and deep kitchen cleanliness audit starting at 10 PM. All culinary stations and food storage areas must adhere to FSSAI protocols.',
      priority: 'WARNING',
      isBanner: true,
      role: 'head-chef',
    },
    {
      label: '📦 Inventory Count',
      title: 'Monthly Physical Stock Audit & Expiry Verification',
      message: 'Storekeepers please complete physical item stock counting and flag all batches nearing 30 days expiry before close of business.',
      priority: 'WARNING',
      isBanner: false,
      role: 'storekeeper',
    },
  ];

  const roleOptions = [
    {
      id: 'front-desk',
      title: 'Front Desk',
      desc: 'Reception, Guest KYC, Check-In/Out',
      icon: ConciergeBell,
      badgeColor: '#0284c7',
      badgeBg: '#e0f2fe',
    },
    {
      id: 'head-chef',
      title: 'Kitchen & Chef',
      desc: 'Live KOTs, Food Preparation Queue',
      icon: ChefHat,
      badgeColor: '#d97706',
      badgeBg: '#fef3c7',
    },
    {
      id: 'restaurant-cashier',
      title: 'Restaurant POS',
      desc: 'Dine-In Billing, Table Management',
      icon: Utensils,
      badgeColor: '#059669',
      badgeBg: '#d1fae5',
    },
    {
      id: 'storekeeper',
      title: 'Store / Inventory',
      desc: 'Stock Requisition, Batches, GRN',
      icon: Boxes,
      badgeColor: '#7c3aed',
      badgeBg: '#ede9fe',
    },
    {
      id: 'general-manager',
      title: 'General Manager',
      desc: 'Hotel Sub-Admins & Supervisors',
      icon: Briefcase,
      badgeColor: '#4f46e5',
      badgeBg: '#e0e7ff',
    },
  ];

  const priorityOptions = [
    {
      id: 'INFO',
      label: 'Normal / Informational',
      desc: 'Routine updates, team briefings, schedule notices',
      icon: Info,
      color: 'var(--brand, #4f46e5)',
      bg: 'var(--brand-50, #eeefff)',
      border: 'var(--brand, #6366f1)',
    },
    {
      id: 'WARNING',
      label: 'Important Notice',
      desc: 'Audits, policy changes, time-sensitive tasks',
      icon: AlertTriangle,
      color: '#d97706',
      bg: '#fef3c7',
      border: '#f59e0b',
    },
    {
      id: 'URGENT',
      label: 'Critical / Urgent Alert',
      desc: 'Immediate VIP attention, emergencies, urgent action',
      icon: AlertCircle,
      color: '#dc2626',
      bg: '#fee2e2',
      border: '#ef4444',
    },
  ];

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
      }, 1000);
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
        background: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(8px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        className="card"
        style={{
          width: '740px',
          maxWidth: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          borderRadius: 'var(--r-container, 18px)',
          boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.35), 0 0 1px rgba(15, 23, 42, 0.4)',
          overflow: 'hidden',
          background: 'var(--white)',
          border: '1px solid var(--border)',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '18px 24px',
            background: 'linear-gradient(135deg, var(--surface-sub) 0%, var(--white) 100%)',
            borderBottom: '1px solid var(--border-sub)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, var(--brand) 0%, #4338ca 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)',
              }}
            >
              <Megaphone size={20} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3
                  style={{
                    fontSize: '17px',
                    fontWeight: '800',
                    color: 'var(--t-900)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {isPlatformAdmin
                    ? 'SaaS Platform Announcement Broadcast'
                    : 'Internal Staff Broadcast & Reminder'}
                </h3>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    color: 'var(--brand)',
                    background: 'var(--brand-50)',
                    padding: '2px 8px',
                    borderRadius: 'var(--r-pill)',
                  }}
                >
                  {isPlatformAdmin ? 'Owner Network' : 'Team Broadcast'}
                </span>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--t-500)', marginTop: '2px' }}>
                {isPlatformAdmin
                  ? 'Send official announcements and maintenance notices to Hotel Owners'
                  : 'Broadcast instructions or flash reminders across staff consoles and desks'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsBroadcastOpen(false)}
            style={{
              background: 'var(--surface-sub)',
              border: '1px solid var(--border-sub)',
              color: 'var(--t-500)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--error-bg)';
              e.currentTarget.style.color = 'var(--error)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--surface-sub)';
              e.currentTarget.style.color = 'var(--t-500)';
            }}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '24px' }}>
          {/* Error & Success Banners */}
          {error && (
            <div
              style={{
                padding: '12px 16px',
                background: 'var(--error-bg)',
                border: '1px solid var(--error-border)',
                borderRadius: '10px',
                color: 'var(--error)',
                fontSize: '13px',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <AlertCircle size={17} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                padding: '12px 16px',
                background: 'var(--success-bg)',
                border: '1px solid var(--success-border)',
                borderRadius: '10px',
                color: 'var(--success)',
                fontSize: '13px',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <CheckCircle2 size={17} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Quick Presets Section */}
          <div style={{ marginBottom: '22px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}
            >
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: '700',
                  color: 'var(--t-600)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <Sparkles size={13} color="var(--brand)" />
                <span>Quick Templates (1-Click Fill)</span>
              </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {templates.map((tpl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => applyTemplate(tpl)}
                  style={{
                    background: 'var(--surface-sub)',
                    border: '1px solid var(--border-sub)',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: 'var(--t-700)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--brand-50)';
                    e.currentTarget.style.borderColor = 'var(--brand)';
                    e.currentTarget.style.color = 'var(--brand)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--surface-sub)';
                    e.currentTarget.style.borderColor = 'var(--border-sub)';
                    e.currentTarget.style.color = 'var(--t-700)';
                  }}
                >
                  <span>{tpl.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Step 1: Target Audience Selection */}
          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '700',
                color: 'var(--t-900)',
                marginBottom: '8px',
              }}
            >
              1. Choose Target Audience *
            </label>

            {isPlatformAdmin ? (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: 'var(--brand-50)',
                  border: '1px solid var(--brand)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: 'var(--brand-700)',
                }}
              >
                <Building size={16} />
                <span>🌐 All Hotel Owners (Global SaaS Announcement across all organizations)</span>
              </div>
            ) : (
              <div>
                {/* Segmented Scope Switch */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                    marginBottom: '12px',
                  }}
                >
                  <div
                    onClick={() => setTargetScope('ALL_STAFF')}
                    style={{
                      border: '2px solid',
                      borderColor: targetScope === 'ALL_STAFF' ? 'var(--brand)' : 'var(--border)',
                      background: targetScope === 'ALL_STAFF' ? 'var(--brand-50)' : 'var(--white)',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'all 0.15s ease',
                      boxShadow: targetScope === 'ALL_STAFF' ? '0 2px 8px rgba(99, 102, 241, 0.15)' : 'none',
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: targetScope === 'ALL_STAFF' ? 'var(--brand)' : 'var(--surface-sub)',
                        color: targetScope === 'ALL_STAFF' ? '#ffffff' : 'var(--t-600)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Users size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: '800', color: 'var(--t-900)' }}>
                        All Hotel Staff
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--t-500)', marginTop: '2px' }}>
                        Broadcast to everyone in all hotel departments
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => setTargetScope('SPECIFIC_ROLE')}
                    style={{
                      border: '2px solid',
                      borderColor: targetScope === 'SPECIFIC_ROLE' ? 'var(--brand)' : 'var(--border)',
                      background: targetScope === 'SPECIFIC_ROLE' ? 'var(--brand-50)' : 'var(--white)',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'all 0.15s ease',
                      boxShadow: targetScope === 'SPECIFIC_ROLE' ? '0 2px 8px rgba(99, 102, 241, 0.15)' : 'none',
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: targetScope === 'SPECIFIC_ROLE' ? 'var(--brand)' : 'var(--surface-sub)',
                        color: targetScope === 'SPECIFIC_ROLE' ? '#ffffff' : 'var(--t-600)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Layers size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: '800', color: 'var(--t-900)' }}>
                        Specific Department / Role
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--t-500)', marginTop: '2px' }}>
                        Target Front Desk, Kitchen, POS, Store, or GM
                      </div>
                    </div>
                  </div>
                </div>

                {/* Role Cards Grid when Specific Role is selected */}
                {targetScope === 'SPECIFIC_ROLE' && (
                  <div
                    style={{
                      background: 'var(--surface-sub)',
                      border: '1px solid var(--border-sub)',
                      borderRadius: '12px',
                      padding: '14px',
                      marginTop: '8px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '11.5px',
                        fontWeight: '700',
                        color: 'var(--t-700)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        marginBottom: '10px',
                      }}
                    >
                      Select Department To Receive This Notification:
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                        gap: '8px',
                      }}
                    >
                      {roleOptions.map((role) => {
                        const Icon = role.icon;
                        const isSelected = targetRole === role.id;
                        return (
                          <div
                            key={role.id}
                            onClick={() => setTargetRole(role.id)}
                            style={{
                              background: isSelected ? 'var(--white)' : 'var(--white)',
                              border: '2px solid',
                              borderColor: isSelected ? role.badgeColor : 'var(--border-sub)',
                              borderRadius: '10px',
                              padding: '10px 8px',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              textAlign: 'center',
                              gap: '6px',
                              transition: 'all 0.15s ease',
                              boxShadow: isSelected ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                              position: 'relative',
                            }}
                          >
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                background: role.badgeBg,
                                color: role.badgeColor,
                                display: 'flex',
                                alignItems: 'center',
                                justifyCenter: 'center',
                              }}
                            >
                              <Icon size={16} style={{ margin: 'auto' }} />
                            </div>

                            <div>
                              <div
                                style={{
                                  fontSize: '12px',
                                  fontWeight: isSelected ? '800' : '600',
                                  color: isSelected ? role.badgeColor : 'var(--t-800)',
                                }}
                              >
                                {role.title}
                              </div>
                              <div
                                style={{
                                  fontSize: '10px',
                                  color: 'var(--t-500)',
                                  marginTop: '2px',
                                  lineHeight: 1.2,
                                }}
                              >
                                {role.desc}
                              </div>
                            </div>

                            {isSelected && (
                              <div
                                style={{
                                  position: 'absolute',
                                  top: '4px',
                                  right: '4px',
                                  width: '14px',
                                  height: '14px',
                                  borderRadius: '50%',
                                  background: role.badgeColor,
                                  color: '#fff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Check size={10} strokeWidth={3} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Property Scope Selector Pills (if multi-hotel) */}
                {accessibleHotels.length > 1 && (
                  <div style={{ marginTop: '12px' }}>
                    <div
                      style={{
                        fontSize: '11.5px',
                        fontWeight: '700',
                        color: 'var(--t-600)',
                        marginBottom: '6px',
                      }}
                    >
                      Scope by Hotel Property:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedHotelId('')}
                        style={{
                          background: selectedHotelId === '' ? 'var(--brand)' : 'var(--surface-sub)',
                          color: selectedHotelId === '' ? '#ffffff' : 'var(--t-700)',
                          border: '1px solid',
                          borderColor: selectedHotelId === '' ? 'var(--brand)' : 'var(--border-sub)',
                          padding: '5px 12px',
                          borderRadius: 'var(--r-pill)',
                          fontSize: '11.5px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        🏨 All Properties (Apex Group)
                      </button>

                      {accessibleHotels.map((h) => (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => setSelectedHotelId(h.id)}
                          style={{
                            background: selectedHotelId === h.id ? 'var(--brand)' : 'var(--surface-sub)',
                            color: selectedHotelId === h.id ? '#ffffff' : 'var(--t-700)',
                            border: '1px solid',
                            borderColor: selectedHotelId === h.id ? 'var(--brand)' : 'var(--border-sub)',
                            padding: '5px 12px',
                            borderRadius: 'var(--r-pill)',
                            fontSize: '11.5px',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        >
                          {h.name} ({h.hotel_code})
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 2: Priority Selection Cards */}
          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '700',
                color: 'var(--t-900)',
                marginBottom: '8px',
              }}
            >
              2. Notification Priority & Urgency *
            </label>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '10px',
              }}
            >
              {priorityOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = priority === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => setPriority(opt.id)}
                    style={{
                      border: '2px solid',
                      borderColor: isSelected ? opt.border : 'var(--border)',
                      background: isSelected ? opt.bg : 'var(--white)',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '8px',
                        background: isSelected ? opt.color : 'var(--surface-sub)',
                        color: isSelected ? '#ffffff' : opt.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={16} />
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: '800',
                          color: isSelected ? opt.color : 'var(--t-900)',
                        }}
                      >
                        {opt.label}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--t-600)', marginTop: '2px', lineHeight: 1.3 }}>
                        {opt.desc}
                      </div>
                    </div>

                    {isSelected && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '6px',
                          right: '6px',
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          background: opt.color,
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Check size={11} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 3: Top Reminder Bar Flash Banner Toggle Card */}
          <div
            onClick={() => setIsBanner(!isBanner)}
            style={{
              background: isBanner ? 'linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)' : 'var(--surface-sub)',
              border: '2px solid',
              borderColor: isBanner ? '#f59e0b' : 'var(--border-sub)',
              borderRadius: '12px',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '14px',
              marginBottom: '22px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: isBanner ? '0 3px 10px rgba(245, 158, 11, 0.18)' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: isBanner ? '#f59e0b' : 'var(--tertiary)',
                  color: isBanner ? '#ffffff' : 'var(--t-500)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Pin size={18} />
              </div>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: '800', color: isBanner ? '#92400e' : 'var(--t-900)' }}>
                  ⚡ Flash in Top Reminder Bar (Prominent Banner)
                </div>
                <div style={{ fontSize: '12px', color: isBanner ? '#78350f' : 'var(--t-600)', marginTop: '2px' }}>
                  Pins this message as a full-width announcement across the very top of staff dashboards.
                </div>
              </div>
            </div>

            {/* Custom Modern Toggle Switch */}
            <div
              style={{
                width: '44px',
                height: '24px',
                borderRadius: '12px',
                background: isBanner ? '#f59e0b' : 'var(--border)',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isBanner ? 'flex-end' : 'flex-start',
                transition: 'background 0.2s ease',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}
              />
            </div>
          </div>

          {/* Step 4: Content Inputs */}
          <div style={{ marginBottom: '18px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '700',
                color: 'var(--t-900)',
                marginBottom: '6px',
              }}
            >
              3. Notification Title *
            </label>
            <input
              type="text"
              className="input"
              style={{
                width: '100%',
                fontSize: '13.5px',
                padding: '10px 14px',
                borderRadius: '10px',
                fontWeight: '600',
              }}
              placeholder="e.g. VIP Diplomat Delegation Arrival (Room 201) / Staff Meeting"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: '22px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '700',
                color: 'var(--t-900)',
                marginBottom: '6px',
              }}
            >
              4. Message Content & Operational Instructions *
            </label>
            <textarea
              className="input"
              rows={4}
              style={{
                width: '100%',
                fontSize: '13px',
                padding: '12px 14px',
                borderRadius: '10px',
                lineHeight: 1.45,
                resize: 'vertical',
              }}
              placeholder="Write detailed instructions, room numbers, checklists, or key details for your staff..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          </div>

          {/* Step 5: Validity / Duration Pill Selector */}
          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '700',
                color: 'var(--t-900)',
                marginBottom: '8px',
              }}
            >
              5. Duration & Validity
            </label>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {[
                { id: '24h', label: '⏱️ Next 24 Hours (Standard)' },
                { id: 'today', label: '📅 Today Only (Until Midnight)' },
                { id: '3d', label: '3 Days' },
                { id: '7d', label: '1 Week (7 Days)' },
                { id: 'none', label: '♾️ Permanent (Until Dismissed)' },
              ].map((pill) => {
                const isSelected = expiryOption === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setExpiryOption(pill.id)}
                    style={{
                      background: isSelected ? 'var(--brand)' : 'var(--surface-sub)',
                      color: isSelected ? '#ffffff' : 'var(--t-700)',
                      border: '1px solid',
                      borderColor: isSelected ? 'var(--brand)' : 'var(--border-sub)',
                      borderRadius: 'var(--r-pill)',
                      padding: '6px 14px',
                      fontSize: '12px',
                      fontWeight: isSelected ? '700' : '600',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 6: Real-Time Live WYSIWYG Preview */}
          {title && (
            <div
              style={{
                border: '1px dashed var(--border)',
                background: 'var(--surface-sub)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: '800',
                  color: 'var(--t-500)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Eye size={13} color="var(--brand)" />
                <span>Live Staff Preview:</span>
              </div>

              {/* Banner Preview if isBanner */}
              {isBanner && (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--t-500)', marginBottom: '4px', fontWeight: '600' }}>
                    Top Reminder Bar (Pinned on Staff Desks):
                  </div>
                  <div
                    style={{
                      background:
                        priority === 'URGENT'
                          ? 'linear-gradient(90deg, #991b1b 0%, #dc2626 100%)'
                          : priority === 'WARNING'
                          ? 'linear-gradient(90deg, #92400e 0%, #d97706 100%)'
                          : 'linear-gradient(90deg, #3730a3 0%, #4f46e5 100%)',
                      color: '#ffffff',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '12px',
                    }}
                  >
                    <span
                      style={{
                        background: 'rgba(255,255,255,0.25)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: '800',
                        fontSize: '9.5px',
                      }}
                    >
                      {priority}
                    </span>
                    <strong style={{ fontWeight: '700' }}>{title}</strong>
                    <span style={{ opacity: 0.9 }}>— {message}</span>
                  </div>
                </div>
              )}

              {/* Notification Drawer Card Preview */}
              <div>
                <div style={{ fontSize: '10px', color: 'var(--t-500)', marginBottom: '4px', fontWeight: '600' }}>
                  Notification Center Card:
                </div>
                <div
                  style={{
                    background: 'var(--white)',
                    border: '1px solid var(--border-sub)',
                    borderLeft: `4px solid ${
                      priority === 'URGENT'
                        ? 'var(--error, #ef4444)'
                        : priority === 'WARNING'
                        ? 'var(--warn, #f59e0b)'
                        : 'var(--brand, #6366f1)'
                    }`,
                    borderRadius: '8px',
                    padding: '10px 14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <strong style={{ fontSize: '13px', color: 'var(--t-900)' }}>{title}</strong>
                    <span style={{ fontSize: '10.5px', color: 'var(--t-500)' }}>Just now</span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--t-600)', marginTop: '4px', margin: '4px 0 0' }}>
                    {message}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border-sub)',
            }}
          >
            <button
              type="button"
              onClick={() => setIsBroadcastOpen(false)}
              className="btn btn-secondary"
              disabled={submitting}
              style={{ padding: '8px 18px', fontSize: '13px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 22px',
                fontSize: '13.5px',
                fontWeight: '700',
                background: 'linear-gradient(135deg, var(--brand) 0%, #4338ca 100%)',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)',
              }}
            >
              <Send size={15} />
              <span>{submitting ? 'Broadcasting...' : 'Broadcast Notification Now'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
