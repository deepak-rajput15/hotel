import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Shield, Building } from 'lucide-react';

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
        {/* Quick Demo Switcher (Hygaar-IQ style pill container) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--tertiary)',
            padding: '3px',
            borderRadius: 'var(--r-pill)',
            border: '1px solid var(--border-sub)',
          }}
        >
          <button
            onClick={() => handleQuickSwitch('admin')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              border: 'none',
              background: isSuperAdmin ? 'var(--brand)' : 'transparent',
              color: isSuperAdmin ? 'var(--white)' : 'var(--t-600)',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'var(--transition)',
              boxShadow: isSuperAdmin ? 'var(--shadow-xs)' : 'none',
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
              padding: '6px 14px',
              borderRadius: '20px',
              border: 'none',
              background: !isSuperAdmin ? 'var(--brand)' : 'transparent',
              color: !isSuperAdmin ? 'var(--white)' : 'var(--t-600)',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'var(--transition)',
              boxShadow: !isSuperAdmin ? 'var(--shadow-xs)' : 'none',
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
              gap: '6px',
              background: 'var(--surface-sub)',
              border: '1px solid var(--border-sub)',
              padding: '5px 12px',
              borderRadius: 'var(--r-pill)',
              fontSize: '12px',
            }}
          >
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--success)' }} />
            <span style={{ color: 'var(--t-500)' }}>Hotel:</span>
            <strong style={{ color: 'var(--t-900)' }}>{currentHotel.name}</strong>
          </div>
        )}

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
