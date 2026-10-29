import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Shield, Building } from 'lucide-react';
import NotificationBell from './Notifications/NotificationBell';

export default function Navbar({ title, subtitle }) {
  const { user, currentHotel, logout, login } = useAuth();
  const isSuperAdmin = user?.is_platform_admin;

  return (
    <header className="top-navbar">
      <div>
        <h1 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--t-900)' }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: '12px', color: 'var(--t-500)', marginTop: '1px' }}>
            {subtitle}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Role / Terminal Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--surface-sub)',
            border: '1px solid var(--border-sub)',
            padding: '5px 12px',
            borderRadius: 'var(--r-pill)',
            fontSize: '12px',
            fontWeight: '600',
            color: 'var(--t-700)',
          }}
        >
          {isSuperAdmin ? (
            <>
              <Shield size={13} color="var(--brand)" />
              <span>Platform Super Admin</span>
            </>
          ) : user?.assigned_role ? (
            <>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--brand)' }} />
              <span>{user.assigned_role.name}</span>
            </>
          ) : (
            <>
              <Building size={13} color="var(--brand)" />
              <span>Hotel Owner</span>
            </>
          )}
        </div>

        {/* Current Hotel Pill (if in property context) */}
        {!isSuperAdmin && currentHotel && currentHotel.id !== 'ALL' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--surface-sub)',
              border: '1px solid var(--border-sub)',
              padding: '5px 12px',
              borderRadius: 'var(--r-pill)',
              fontSize: '12px',
            }}
          >
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--success)' }} />
            <span style={{ color: 'var(--t-500)' }}>Property:</span>
            <strong style={{ color: 'var(--t-900)' }}>{currentHotel.name}</strong>
          </div>
        )}

        {/* Internal Notification & Reminder Bell */}
        <NotificationBell />

        {/* Logout Button */}
        <button
          onClick={logout}
          className="btn btn-secondary btn-sm"
          title="Sign out of platform"
        >
          <LogOut size={13} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}
