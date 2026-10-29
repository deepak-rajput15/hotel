import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import {
  Bell,
  CheckCheck,
  Megaphone,
  Pin,
  Trash2,
  AlertCircle,
  AlertTriangle,
  Info,
  Check,
  X,
  Clock,
  Sparkles,
} from 'lucide-react';

export default function NotificationBell() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    toggleBanner,
    deleteNotification,
    setIsBroadcastOpen,
  } = useNotifications();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' or 'unread'
  const dropdownRef = useRef(null);

  const canBroadcast = user?.is_platform_admin || user?.is_org_owner;

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredNotifications = notifications.filter((item) => {
    if (filter === 'unread') return !item.is_read;
    return true;
  });

  const getTargetBadge = (item) => {
    if (item.sender_type === 'PLATFORM_ADMIN') {
      return { label: '🏢 SaaS Platform Announcement', color: 'var(--brand)', bg: 'var(--brand-50)' };
    }
    if (item.target_scope === 'SPECIFIC_ROLE') {
      const map = {
        'front-desk': '🛎️ Front Desk Reception',
        'head-chef': '🍳 Kitchen / Chef Desk',
        'restaurant-cashier': '🍽️ Restaurant Cashier',
        'storekeeper': '📦 Store & Inventory',
        'general-manager': '👔 General Manager',
      };
      return {
        label: map[item.target_role] || `🎯 ${item.target_role}`,
        color: '#0284c7',
        bg: '#e0f2fe',
      };
    }
    if (item.target_scope === 'SPECIFIC_HOTEL') {
      return {
        label: `🏨 ${item.hotel?.name || 'Property'} Only`,
        color: '#7c3aed',
        bg: '#ede9fe',
      };
    }
    return { label: '👥 All Hotel Staff', color: '#059669', bg: '#d1fae5' };
  };

  const formatTimestamp = (iso) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return '';
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          background: isOpen ? 'var(--brand-50)' : 'var(--surface-sub)',
          border: '1px solid',
          borderColor: isOpen ? 'var(--brand)' : 'var(--border-sub)',
          color: isOpen ? 'var(--brand)' : 'var(--t-700)',
          borderRadius: 'var(--r-pill)',
          width: '38px',
          height: '38px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        title="Internal Reminders & Notifications"
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              background: 'var(--error, #ef4444)',
              color: '#ffffff',
              fontSize: '10.5px',
              fontWeight: '800',
              borderRadius: '9999px',
              minWidth: '18px',
              height: '18px',
              padding: '0 4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(239, 68, 68, 0.35)',
              border: '2px solid var(--white, #ffffff)',
              lineHeight: 1,
              whiteSpace: 'nowrap',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 0,
            width: '460px',
            maxWidth: 'calc(100vw - 24px)',
            maxHeight: '560px',
            background: 'var(--white)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-card)',
            boxShadow: '0 20px 40px -8px rgba(15, 23, 42, 0.18), 0 0 1px rgba(15, 23, 42, 0.2)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header Row 1: Title, Unread Count & Broadcast */}
          <div
            style={{
              padding: '14px 18px',
              background: 'var(--surface-sub)',
              borderBottom: '1px solid var(--border-sub)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: 'var(--r-sm)',
                  background: 'var(--brand-50)',
                  color: 'var(--brand)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Bell size={14} />
              </div>

              <span
                style={{
                  fontSize: '14.5px',
                  fontWeight: '800',
                  color: 'var(--t-900)',
                  whiteSpace: 'nowrap',
                  letterSpacing: '-0.01em',
                }}
              >
                Notifications & Reminders
              </span>

              {/* Fixed 2 new pill display */}
              {unreadCount > 0 ? (
                <span
                  style={{
                    background: 'var(--error-bg, #fee4e2)',
                    color: 'var(--error, #d92d20)',
                    border: '1px solid var(--error-border, #fecdca)',
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: 'var(--error, #d92d20)',
                    }}
                  />
                  {unreadCount} new
                </span>
              ) : (
                <span
                  style={{
                    background: 'var(--success-bg, #dcfae6)',
                    color: 'var(--success, #079455)',
                    border: '1px solid var(--success-border, #a7f3d0)',
                    fontSize: '11px',
                    fontWeight: '600',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  All caught up
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              {canBroadcast && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setIsBroadcastOpen(true);
                  }}
                  className="btn btn-primary btn-sm"
                  style={{
                    padding: '4px 10px',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title="Broadcast new internal notification"
                >
                  <Megaphone size={12} />
                  <span>+ Broadcast</span>
                </button>
              )}

              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--t-500)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Header Row 2: Sub-bar with Segmented Tabs & Mark all read */}
          <div
            style={{
              padding: '8px 16px',
              background: 'var(--white)',
              borderBottom: '1px solid var(--border-sub)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            {/* Segmented Filter Pills */}
            <div
              style={{
                display: 'inline-flex',
                background: 'var(--surface-sub)',
                border: '1px solid var(--border-sub)',
                borderRadius: '8px',
                padding: '2px',
                gap: '2px',
              }}
            >
              <button
                onClick={() => setFilter('all')}
                style={{
                  background: filter === 'all' ? 'var(--white)' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  color: filter === 'all' ? 'var(--t-900)' : 'var(--t-600)',
                  fontWeight: filter === 'all' ? '700' : '500',
                  fontSize: '11.5px',
                  padding: '4px 10px',
                  cursor: 'pointer',
                  boxShadow: filter === 'all' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                style={{
                  background: filter === 'unread' ? 'var(--white)' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  color: filter === 'unread' ? 'var(--brand)' : 'var(--t-600)',
                  fontWeight: filter === 'unread' ? '700' : '500',
                  fontSize: '11.5px',
                  padding: '4px 10px',
                  cursor: 'pointer',
                  boxShadow: filter === 'unread' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                Unread ({unreadCount})
              </button>
            </div>

            {/* Mark All Read Action */}
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--brand)',
                  fontSize: '11.5px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 6px',
                  borderRadius: '4px',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--brand-50)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                title="Mark all notifications as read"
              >
                <CheckCheck size={13} />
                <span>Mark all as read</span>
              </button>
            )}
          </div>

          {/* Notifications Scroll List */}
          <div style={{ overflowY: 'auto', maxHeight: '420px' }}>
            {filteredNotifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '42px 20px', color: 'var(--t-500)' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: 'var(--surface-sub)',
                    border: '1px solid var(--border-sub)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                    color: 'var(--t-400)',
                  }}
                >
                  <Bell size={20} />
                </div>
                <h4 style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--t-800)', margin: 0 }}>
                  {filter === 'unread' ? 'No Unread Notifications' : 'No Notifications Yet'}
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--t-500)', marginTop: '4px', maxWidth: '240px', margin: '4px auto 0' }}>
                  {filter === 'unread'
                    ? 'You have caught up with all internal messages & reminders!'
                    : 'System broadcasts and reminders from your team will show up here.'}
                </p>
              </div>
            ) : (
              filteredNotifications.map((item) => {
                const isUrgent = item.priority === 'URGENT';
                const isWarning = item.priority === 'WARNING';
                const targetInfo = getTargetBadge(item);
                const isOwnerOrAdmin = user?.is_platform_admin || user?.is_org_owner;

                // Priority style config
                let accentColor = 'var(--brand, #6366f1)';
                let iconBg = 'var(--brand-50, #eeefff)';
                let iconColor = 'var(--brand, #4f46e5)';
                let PriorityIcon = Info;
                let priorityText = 'INFO';
                let priorityBadgeBg = 'var(--brand-50)';
                let priorityBadgeColor = 'var(--brand)';

                if (isUrgent) {
                  accentColor = 'var(--error, #ef4444)';
                  iconBg = 'var(--error-bg, #fee4e2)';
                  iconColor = 'var(--error, #d92d20)';
                  PriorityIcon = AlertCircle;
                  priorityText = 'URGENT';
                  priorityBadgeBg = '#fee2e2';
                  priorityBadgeColor = '#b91c1c';
                } else if (isWarning) {
                  accentColor = 'var(--warn, #f59e0b)';
                  iconBg = 'var(--warn-bg, #fef0c7)';
                  iconColor = 'var(--warn, #b54708)';
                  PriorityIcon = AlertTriangle;
                  priorityText = 'IMPORTANT';
                  priorityBadgeBg = '#fef3c7';
                  priorityBadgeColor = '#92400e';
                }

                return (
                  <div
                    key={item.id}
                    style={{
                      padding: '14px 18px',
                      borderBottom: '1px solid var(--border-sub)',
                      borderLeft: item.is_read ? '4px solid transparent' : `4px solid ${accentColor}`,
                      background: item.is_read ? 'var(--white)' : 'rgba(99, 102, 241, 0.03)',
                      transition: 'background 0.15s ease',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      {/* Priority Icon Square */}
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          background: iconBg,
                          color: iconColor,
                          marginTop: '2px',
                        }}
                      >
                        <PriorityIcon size={16} />
                      </div>

                      {/* Content Body */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Header: Title + Priority + Timestamp */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span
                              style={{
                                fontSize: '13.5px',
                                fontWeight: item.is_read ? '600' : '800',
                                color: 'var(--t-900)',
                                letterSpacing: '-0.01em',
                              }}
                            >
                              {item.title}
                            </span>

                            {/* Priority Mini Tag */}
                            <span
                              style={{
                                fontSize: '9.5px',
                                fontWeight: '800',
                                color: priorityBadgeColor,
                                background: priorityBadgeBg,
                                padding: '1px 5px',
                                borderRadius: '4px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                              }}
                            >
                              {priorityText}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            <span style={{ fontSize: '11px', color: 'var(--t-500)' }}>
                              {formatTimestamp(item.created_at)}
                            </span>
                            {!item.is_read && (
                              <span
                                style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  background: accentColor,
                                }}
                                title="Unread notification"
                              />
                            )}
                          </div>
                        </div>

                        {/* Message Description */}
                        <p
                          style={{
                            fontSize: '12.5px',
                            color: item.is_read ? 'var(--t-600)' : 'var(--t-700)',
                            marginTop: '5px',
                            lineHeight: 1.45,
                            whiteSpace: 'pre-line',
                          }}
                        >
                          {item.message}
                        </p>

                        {/* Meta Chips */}
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            gap: '6px',
                            marginTop: '10px',
                          }}
                        >
                          {/* Audience Target Chip */}
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: '600',
                              color: targetInfo.color,
                              background: targetInfo.bg,
                              padding: '2px 7px',
                              borderRadius: '5px',
                            }}
                          >
                            {targetInfo.label}
                          </span>

                          {/* Pinned to Top Banner Chip */}
                          {item.is_banner && (
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: '700',
                                color: '#92400e',
                                background: '#fef3c7',
                                border: '1px solid #fde68a',
                                padding: '2px 7px',
                                borderRadius: '5px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                              }}
                            >
                              <Pin size={10} />
                              <span>Pinned Banner</span>
                            </span>
                          )}

                          {/* Sender Info Chip */}
                          {item.sender && (
                            <span
                              style={{
                                fontSize: '11px',
                                color: 'var(--t-500)',
                                background: 'var(--surface-sub)',
                                border: '1px solid var(--border-sub)',
                                padding: '2px 7px',
                                borderRadius: '5px',
                              }}
                            >
                              by {item.sender.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Row */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: '6px',
                        marginTop: '10px',
                        paddingTop: '8px',
                        borderTop: '1px solid var(--border-sub)',
                      }}
                    >
                      {!item.is_read && (
                        <button
                          onClick={() => markAsRead(item.id)}
                          style={{
                            background: 'var(--surface-sub)',
                            border: '1px solid var(--border-sub)',
                            borderRadius: '5px',
                            color: 'var(--t-700)',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
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
                          title="Mark as read"
                        >
                          <Check size={11} />
                          <span>Mark Read</span>
                        </button>
                      )}

                      {isOwnerOrAdmin && (
                        <>
                          <button
                            onClick={() => toggleBanner(item.id)}
                            style={{
                              background: item.is_banner ? '#fef3c7' : 'var(--surface-sub)',
                              border: '1px solid',
                              borderColor: item.is_banner ? '#fde68a' : 'var(--border-sub)',
                              borderRadius: '5px',
                              color: item.is_banner ? '#92400e' : 'var(--t-600)',
                              fontSize: '11px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              transition: 'all 0.15s ease',
                            }}
                            title={item.is_banner ? 'Unpin from top reminder bar' : 'Pin to top reminder bar'}
                          >
                            <Pin size={11} />
                            <span>{item.is_banner ? 'Unpin Banner' : 'Pin Banner'}</span>
                          </button>

                          <button
                            onClick={() => deleteNotification(item.id)}
                            style={{
                              background: 'var(--surface-sub)',
                              border: '1px solid var(--border-sub)',
                              borderRadius: '5px',
                              color: 'var(--error)',
                              fontSize: '11px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'var(--error-bg)';
                              e.currentTarget.style.borderColor = 'var(--error-border)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'var(--surface-sub)';
                              e.currentTarget.style.borderColor = 'var(--border-sub)';
                            }}
                            title="Delete reminder"
                          >
                            <Trash2 size={11} />
                            <span>Delete</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
