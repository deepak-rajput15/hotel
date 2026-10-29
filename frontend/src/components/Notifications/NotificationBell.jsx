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
  Clock,
  Building,
  Target,
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
      return { label: 'SaaS Platform Announcement', color: 'var(--brand)' };
    }
    if (item.target_scope === 'SPECIFIC_ROLE') {
      const map = {
        'front-desk': '🛎️ Front Desk',
        'head-chef': '🍳 Kitchen / Chef',
        'restaurant-cashier': '🍽️ Restaurant Cashier',
        'storekeeper': '📦 Storekeeper',
        'general-manager': '👔 General Manager',
      };
      return { label: map[item.target_role] || item.target_role, color: '#0284c7' };
    }
    if (item.target_scope === 'SPECIFIC_HOTEL') {
      return { label: `🏨 ${item.hotel?.name || 'Property'} Only`, color: '#7c3aed' };
    }
    return { label: '👥 All Hotel Staff', color: '#059669' };
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
          width: '36px',
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        title="Internal Reminders & Notifications"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              background: '#ef4444',
              color: '#fff',
              fontSize: '10px',
              fontWeight: '800',
              borderRadius: 'var(--r-pill)',
              minWidth: '18px',
              height: '18px',
              padding: '0 4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              border: '2px solid #fff',
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
            top: 'calc(100% + 8px)',
            right: 0,
            width: '420px',
            maxWidth: '90vw',
            maxHeight: '520px',
            background: 'var(--white)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-card)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--border-sub)',
              background: 'var(--surface-sub)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--t-900)' }}>
                Reminders & Broadcasts
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    background: '#ef4444',
                    color: '#fff',
                    fontSize: '10.5px',
                    fontWeight: '700',
                    padding: '1px 6px',
                    borderRadius: 'var(--r-pill)',
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {canBroadcast && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setIsBroadcastOpen(true);
                  }}
                  className="btn btn-primary btn-sm"
                  style={{
                    padding: '4px 9px',
                    fontSize: '11.5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title="Broadcast new internal notification"
                >
                  <Megaphone size={12} />
                  <span>+ Broadcast</span>
                </button>
              )}

              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--t-500)',
                    fontSize: '11px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    padding: '4px',
                  }}
                  title="Mark all notifications as read"
                >
                  <CheckCheck size={13} />
                  <span>Mark all read</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid var(--border-sub)',
              padding: '4px 16px',
              background: 'var(--white)',
              gap: '12px',
            }}
          >
            <button
              onClick={() => setFilter('all')}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: filter === 'all' ? '2px solid var(--brand)' : '2px solid transparent',
                color: filter === 'all' ? 'var(--brand)' : 'var(--t-500)',
                fontWeight: filter === 'all' ? '700' : '500',
                fontSize: '12px',
                padding: '6px 4px',
                cursor: 'pointer',
              }}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: filter === 'unread' ? '2px solid var(--brand)' : '2px solid transparent',
                color: filter === 'unread' ? 'var(--brand)' : 'var(--t-500)',
                fontWeight: filter === 'unread' ? '700' : '500',
                fontSize: '12px',
                padding: '6px 4px',
                cursor: 'pointer',
              }}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notifications Scroll List */}
          <div style={{ overflowY: 'auto', maxHeight: '400px' }}>
            {filteredNotifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--t-500)' }}>
                <Bell size={32} style={{ opacity: 0.3, margin: '0 auto 8px' }} />
                <p style={{ fontSize: '13px', fontWeight: '600' }}>No notifications found</p>
                <p style={{ fontSize: '11.5px', marginTop: '2px' }}>
                  {filter === 'unread' ? 'You have read all reminders!' : 'All clear. No active reminders.'}
                </p>
              </div>
            ) : (
              filteredNotifications.map((item) => {
                const isUrgent = item.priority === 'URGENT';
                const isWarning = item.priority === 'WARNING';
                const targetInfo = getTargetBadge(item);
                const isOwnerOrAdmin = user?.is_platform_admin || user?.is_org_owner;

                return (
                  <div
                    key={item.id}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border-sub)',
                      background: item.is_read ? 'var(--white)' : 'var(--brand-50)',
                      transition: 'background 0.15s ease',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      {/* Priority Icon */}
                      <div
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          background: isUrgent
                            ? '#fee2e2'
                            : isWarning
                            ? '#fef3c7'
                            : '#e0e7ff',
                          color: isUrgent
                            ? '#dc2626'
                            : isWarning
                            ? '#d97706'
                            : '#4f46e5',
                          marginTop: '2px',
                        }}
                      >
                        {isUrgent ? (
                          <AlertCircle size={15} />
                        ) : isWarning ? (
                          <AlertTriangle size={15} />
                        ) : (
                          <Info size={15} />
                        )}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <span
                            style={{
                              fontSize: '13px',
                              fontWeight: item.is_read ? '600' : '800',
                              color: 'var(--t-900)',
                            }}
                          >
                            {item.title}
                          </span>

                          <span style={{ fontSize: '11px', color: 'var(--t-500)', flexShrink: 0 }}>
                            {formatTimestamp(item.created_at)}
                          </span>
                        </div>

                        <p
                          style={{
                            fontSize: '12px',
                            color: 'var(--t-700)',
                            marginTop: '4px',
                            lineHeight: 1.4,
                            whiteSpace: 'pre-line',
                          }}
                        >
                          {item.message}
                        </p>

                        {/* Badges / Meta */}
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            gap: '6px',
                            marginTop: '8px',
                          }}
                        >
                          {/* Target Scope Badge */}
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: '600',
                              color: targetInfo.color,
                              background: 'var(--surface-sub)',
                              border: '1px solid var(--border-sub)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            {targetInfo.label}
                          </span>

                          {/* Banner Pinned Badge */}
                          {item.is_banner && (
                            <span
                              style={{
                                fontSize: '10.5px',
                                fontWeight: '700',
                                color: '#b45309',
                                background: '#fef3c7',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                              }}
                            >
                              <Pin size={10} />
                              <span>Top Banner</span>
                            </span>
                          )}

                          {/* Sender Info */}
                          {item.sender && (
                            <span style={{ fontSize: '10.5px', color: 'var(--t-500)' }}>
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
                        gap: '8px',
                        marginTop: '8px',
                        paddingTop: '6px',
                        borderTop: '1px dashed var(--border-sub)',
                      }}
                    >
                      {!item.is_read && (
                        <button
                          onClick={() => markAsRead(item.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--brand)',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '2px 4px',
                          }}
                          title="Mark as read"
                        >
                          <Check size={12} />
                          <span>Mark Read</span>
                        </button>
                      )}

                      {isOwnerOrAdmin && (
                        <>
                          <button
                            onClick={() => toggleBanner(item.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: item.is_banner ? '#d97706' : 'var(--t-500)',
                              fontSize: '11px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '2px 4px',
                            }}
                            title={item.is_banner ? 'Unpin from top reminder bar' : 'Pin to top reminder bar'}
                          >
                            <Pin size={11} />
                            <span>{item.is_banner ? 'Unpin Banner' : 'Pin Banner'}</span>
                          </button>

                          <button
                            onClick={() => deleteNotification(item.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--error)',
                              fontSize: '11px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '2px 4px',
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
