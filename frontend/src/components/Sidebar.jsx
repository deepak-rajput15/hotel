import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  Hotel,
  Layers,
  ShieldCheck,
  Bed,
  Utensils,
  ChefHat,
  Boxes,
  ShoppingCart,
  ConciergeBell,
  CheckCircle2,
  Lock,
  ChevronDown,
} from 'lucide-react';

export default function Sidebar({ currentTab, setCurrentTab }) {
  const { user, currentHotel, activeModules, selectHotel } = useAuth();
  const isSuperAdmin = user?.is_platform_admin;

  const accessibleHotels = user?.accessible_hotels || [];

  // All 6 core modules with metadata
  const allModulesList = [
    { code: 'front_office', name: 'Front Office', icon: ConciergeBell },
    { code: 'rooms', name: 'Rooms & Rack', icon: Bed },
    { code: 'restaurant', name: 'Restaurant POS', icon: Utensils },
    { code: 'kitchen', name: 'Kitchen (KOT)', icon: ChefHat },
    { code: 'store', name: 'Store / Inventory', icon: Boxes },
    { code: 'purchase', name: 'Purchase Orders', icon: ShoppingCart },
  ];

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 2px 10px rgba(99, 102, 241, 0.4)',
            }}
          >
            <Hotel size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '-0.02em', color: 'white' }}>
              GrandStay<span style={{ color: 'var(--primary)' }}>.</span>
            </h2>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
              {isSuperAdmin ? 'Platform Super Admin' : 'Hotel Owner Portal'}
            </p>
          </div>
        </div>
      </div>

      {/* Hotel Switcher (For Hotel Owner / Multi-hotel users) */}
      {!isSuperAdmin && (
        <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255, 255, 255, 0.01)' }}>
          <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
            Active Property
          </label>
          <div style={{ position: 'relative' }}>
            <select
              className="form-select"
              value={currentHotel?.id || ''}
              onChange={(e) => {
                const selected = accessibleHotels.find(h => h.id === e.target.value);
                if (selected) selectHotel(selected);
              }}
              style={{
                fontSize: '13px',
                padding: '8px 12px',
                paddingRight: '30px',
                appearance: 'none',
                cursor: 'pointer',
                borderColor: 'rgba(99, 102, 241, 0.3)',
                background: 'var(--bg-surface)',
              }}
            >
              {accessibleHotels.map(h => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.hotel_code})
                </option>
              ))}
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '12px', pointerEvents: 'none', color: 'var(--text-muted)' }} />
          </div>
          {currentHotel && (
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Code: <strong style={{ color: 'white' }}>{currentHotel.hotel_code}</strong></span>
              <span className="badge badge-active" style={{ fontSize: '10px', padding: '2px 7px' }}>
                {activeModules.length} Modules Active
              </span>
            </div>
          )}
        </div>
      )}

      {/* Navigation Links */}
      <div style={{ padding: '16px 12px', flex: 1, overflowY: 'auto' }}>
        {isSuperAdmin ? (
          // Super Admin Navigation
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '0 10px 8px' }}>
              Platform Administration
            </div>
            <NavItem
              active={currentTab === 'overview'}
              onClick={() => setCurrentTab('overview')}
              icon={Layers}
              label="Platform Overview"
            />
            <NavItem
              active={currentTab === 'organizations'}
              onClick={() => setCurrentTab('organizations')}
              icon={Building2}
              label="Organizations & Owners"
            />
            <NavItem
              active={currentTab === 'hotels'}
              onClick={() => setCurrentTab('hotels')}
              icon={Hotel}
              label="Hotels Directory"
            />
            <NavItem
              active={currentTab === 'subscriptions'}
              onClick={() => setCurrentTab('subscriptions')}
              icon={ShieldCheck}
              label="Module Subscriptions Matrix"
              highlight
            />
          </div>
        ) : (
          // Hotel Owner Dynamic Navigation (Only shows enabled modules!)
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '0 10px 8px' }}>
              Hotel Operations
            </div>

            <NavItem
              active={currentTab === 'dashboard'}
              onClick={() => setCurrentTab('dashboard')}
              icon={Layers}
              label="Property Overview"
            />

            <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '16px 10px 8px' }}>
              Subscribed Modules
            </div>

            {allModulesList.map((m) => {
              const isSubscribed = activeModules.includes(m.code);
              return (
                <div key={m.code} style={{ position: 'relative' }}>
                  <NavItem
                    active={currentTab === m.code}
                    onClick={() => {
                      if (isSubscribed) setCurrentTab(m.code);
                    }}
                    icon={m.icon}
                    label={m.name}
                    disabled={!isSubscribed}
                    badge={
                      isSubscribed ? (
                        <CheckCircle2 size={13} color="var(--emerald)" />
                      ) : (
                        <Lock size={12} color="var(--text-muted)" />
                      )
                    }
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* User Footer */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', background: 'rgba(0, 0, 0, 0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              fontWeight: '700',
              color: 'white',
            }}
          >
            {user?.name?.[0] || 'U'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.email}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavItem({ active, onClick, icon: Icon, label, disabled, badge, highlight }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        borderRadius: 'var(--radius-md)',
        background: active
          ? 'linear-gradient(90deg, rgba(99, 102, 241, 0.16), rgba(99, 102, 241, 0.04))'
          : 'transparent',
        border: '1px solid',
        borderColor: active ? 'rgba(99, 102, 241, 0.3)' : 'transparent',
        color: active
          ? '#a5b4fc'
          : disabled
          ? 'var(--text-muted)'
          : 'var(--text-secondary)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        textAlign: 'left',
        marginBottom: '4px',
        transition: 'var(--transition)',
        opacity: disabled ? 0.45 : 1,
        fontFamily: 'var(--font-sans)',
        fontSize: '13.5px',
        fontWeight: active ? '600' : '500',
      }}
      onMouseEnter={(e) => {
        if (!active && !disabled) {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
          e.currentTarget.style.color = 'var(--text-primary)';
        }
      }}
      onMouseLeave={(e) => {
        if (!active && !disabled) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--text-secondary)';
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Icon size={18} color={active ? 'var(--primary)' : 'currentColor'} />
        <span>{label}</span>
      </div>
      {badge && <div>{badge}</div>}
      {highlight && (
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)' }} />
      )}
    </button>
  );
}
