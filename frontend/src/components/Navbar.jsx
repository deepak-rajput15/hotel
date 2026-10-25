import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, RefreshCw, UserCheck, Shield, Building } from 'lucide-react';

export default function Navbar({ title, subtitle }) {
  const { user, currentHotel, logout, login } = useAuth();
  const isSuperAdmin = user?.is_platform_admin;

  const handleQuickSwitch = async (role) => {
    try {
      if (role === 'admin') {
        await login('admin@hotelsaask.com', 'Password@123');
      } else {
        await login('owner@apexhospitality.com', 'Password@123');
      }
    } catch (err) {
      alert('Error switching accounts: ' + err.message);
    }
  };

  return (
    <header className="top-navbar">
      <div>
        <h1 style={{ fontSize: '19px', fontWeight: '800', color: 'white', letterSpacing: '-0.02em' }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '1px' }}>
            {subtitle}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Quick Demo Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-card)', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <button
            onClick={() => handleQuickSwitch('admin')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: isSuperAdmin ? 'var(--primary)' : 'transparent',
              color: isSuperAdmin ? 'white' : 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'var(--transition)',
            }}
            title="Switch to SaaS Company Platform Super Admin"
          >
            <Shield size={13} />
            <span>Super Admin</span>
          </button>

          <button
            onClick={() => handleQuickSwitch('owner')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: !isSuperAdmin ? 'var(--primary)' : 'transparent',
              color: !isSuperAdmin ? 'white' : 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'var(--transition)',
            }}
            title="Switch to Hotel Owner (Apex Hospitality Group)"
          >
            <Building size={13} />
            <span>Hotel Owner</span>
          </button>
        </div>

        {/* Current Hotel Pill (if in owner portal) */}
        {!isSuperAdmin && currentHotel && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: '12.5px',
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--emerald)', boxShadow: '0 0 8px var(--emerald)' }} />
            <span style={{ color: 'var(--text-secondary)' }}>Selected:</span>
            <strong style={{ color: 'white' }}>{currentHotel.name}</strong>
          </div>
        )}

        {/* Logout Button */}
        <button
          onClick={logout}
          className="btn btn-secondary btn-sm"
          title="Sign out of platform"
        >
          <LogOut size={14} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}
