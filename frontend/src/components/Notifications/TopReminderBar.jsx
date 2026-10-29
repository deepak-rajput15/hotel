import React, { useState } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { AlertCircle, AlertTriangle, Info, X, ChevronLeft, ChevronRight, Megaphone, Target } from 'lucide-react';

export default function TopReminderBar() {
  const { banners, dismissBanner } = useNotifications();
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!banners || banners.length === 0) {
    return null;
  }

  // Ensure currentIndex stays within bounds
  const safeIndex = currentIndex >= banners.length ? 0 : currentIndex;
  const currentBanner = banners[safeIndex];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const isUrgent = currentBanner.priority === 'URGENT';
  const isWarning = currentBanner.priority === 'WARNING';

  // Config based on priority
  let bgGradient = 'linear-gradient(90deg, #3730a3 0%, #4338ca 50%, #4f46e5 100%)';
  let badgeBg = 'rgba(255, 255, 255, 0.2)';
  let badgeColor = '#ffffff';
  let Icon = Info;
  let priorityLabel = 'ANNOUNCEMENT';

  if (isUrgent) {
    bgGradient = 'linear-gradient(90deg, #991b1b 0%, #b91c1c 50%, #dc2626 100%)';
    badgeBg = '#ffffff';
    badgeColor = '#b91c1c';
    Icon = AlertCircle;
    priorityLabel = 'CRITICAL ALERT';
  } else if (isWarning) {
    bgGradient = 'linear-gradient(90deg, #92400e 0%, #b45309 50%, #d97706 100%)';
    badgeBg = '#ffffff';
    badgeColor = '#92400e';
    Icon = AlertTriangle;
    priorityLabel = 'IMPORTANT NOTICE';
  }

  const getTargetLabel = (b) => {
    if (b.sender_type === 'PLATFORM_ADMIN') return 'SaaS Platform Broadcast';
    if (b.target_scope === 'SPECIFIC_ROLE') {
      const roleMap = {
        'front-desk': 'Front Desk Reception',
        'head-chef': 'Kitchen & Chefs',
        'restaurant-cashier': 'Restaurant Cashiers',
        'storekeeper': 'Store & Inventory',
        'general-manager': 'General Managers',
      };
      return `Target: ${roleMap[b.target_role] || b.target_role}`;
    }
    if (b.target_scope === 'SPECIFIC_HOTEL') {
      return `Hotel: ${b.hotel?.name || 'Property'}`;
    }
    return 'Hotel-wide Broadcast (All Staff)';
  };

  return (
    <div
      style={{
        background: bgGradient,
        color: '#ffffff',
        padding: '9px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        fontSize: '13px',
        fontWeight: '500',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        zIndex: 99,
        position: 'relative',
        transition: 'all 0.3s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
        {/* Priority Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            background: badgeBg,
            color: badgeColor,
            padding: '3px 8px',
            borderRadius: 'var(--r-pill)',
            fontSize: '10.5px',
            fontWeight: '800',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            flexShrink: 0,
          }}
        >
          <Icon size={12} strokeWidth={2.5} />
          <span>{priorityLabel}</span>
        </div>

        {/* Target Scope Pill */}
        <span
          style={{
            background: 'rgba(255, 255, 255, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            padding: '2px 7px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: '600',
            flexShrink: 0,
          }}
        >
          {getTargetLabel(currentBanner)}
        </span>

        {/* Title & Message */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          <strong style={{ fontWeight: '700', letterSpacing: '-0.01em' }}>
            {currentBanner.title}
          </strong>
          <span style={{ opacity: 0.85, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            — {currentBanner.message}
          </span>
        </div>
      </div>

      {/* Right Controls: Navigation (if multiple) & Dismiss */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {banners.length > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'rgba(0,0,0,0.18)',
              borderRadius: 'var(--r-pill)',
              padding: '2px 6px',
              fontSize: '11px',
            }}
          >
            <button
              onClick={handlePrev}
              style={{
                background: 'none',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                padding: '2px',
              }}
              title="Previous reminder"
            >
              <ChevronLeft size={13} />
            </button>
            <span>
              {safeIndex + 1}/{banners.length}
            </span>
            <button
              onClick={handleNext}
              style={{
                background: 'none',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                padding: '2px',
              }}
              title="Next reminder"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        )}

        <button
          onClick={() => dismissBanner(currentBanner.id)}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: 'none',
            color: '#fff',
            borderRadius: 'var(--r-sm)',
            padding: '4px 8px',
            fontSize: '11.5px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
          title="Dismiss banner"
        >
          <X size={13} />
          <span>Dismiss</span>
        </button>
      </div>
    </div>
  );
}

