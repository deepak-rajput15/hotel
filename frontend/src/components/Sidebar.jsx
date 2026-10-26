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
      <div style={{ padding: '20px 20px', borderBottom: '1px solid var(--border-sub)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--brand), #4f46e5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <Hotel size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '16.5px', fontWeight: '800', letterSpacing: '-0.02em', color: 'var(--t-900)' }}>
              GrandStay<span style={{ color: 'var(--brand)' }}>.</span>
            </h2>
            <p style={{ fontSize: '11px', color: 'var(--t-500)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {isSuperAdmin ? 'Platform Super Admin' : (user?.assigned_role?.name || (user?.is_org_owner ? 'Hotel Owner Portal' : 'Staff Terminal'))}
            </p>
          </div>
        </div>
      </div>

      {/* Hotel Context (For Hotel Owner / Multi-hotel users / Staff) */}
      {!isSuperAdmin && (
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-sub)', background: 'var(--surface-sub)' }}>
          <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--t-500)', display: 'block', marginBottom: '6px' }}>
            {user?.assigned_role && !user?.is_org_owner ? 'Assigned Property' : 'Active Property Context'}
          </label>

          {user?.assigned_role && !user?.is_org_owner && accessibleHotels.length <= 1 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--t-900)' }}>
                {currentHotel?.name}
              </span>
              <span className="badge badge-brand" style={{ fontSize: '10px', padding: '2px 7px' }}>
                {currentHotel?.hotel_code}
              </span>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <select
                className="form-select"
                value={currentHotel?.id || 'ALL'}
                onChange={(e) => {
                  if (e.target.value === 'ALL') {
                    selectHotel('ALL');
                    setCurrentTab('portfolio_overview');
                  } else {
                    const selected = accessibleHotels.find(h => h.id === e.target.value);
                    if (selected) {
                      selectHotel(selected);
                      if (user?.assigned_role && !user?.is_org_owner) {
                        const roleAllowed = {
                          'head-chef': 'kitchen',
                          'front-desk': 'front_office',
                          'restaurant-cashier': 'restaurant',
                          'storekeeper': 'store',
                        };
                        setCurrentTab(roleAllowed[user.assigned_role.slug] || 'front_office');
                      } else {
                        setCurrentTab('dashboard');
                      }
                    }
                  }
                }}
                style={{
                  fontSize: '13px',
                  padding: '7px 10px',
                  paddingRight: '28px',
                  appearance: 'none',
                  cursor: 'pointer',
                  borderColor: 'var(--border)',
                  background: 'var(--white)',
                  fontWeight: '600',
                }}
              >
                {!user?.assigned_role && accessibleHotels.length > 1 && (
                  <option value="ALL">🌐 All Properties (Consolidated Overview)</option>
                )}
                <optgroup label="Individual Hotel Properties">
                  {accessibleHotels.map(h => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.hotel_code})
                    </option>
                  ))}
                </optgroup>
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '10px', pointerEvents: 'none', color: 'var(--t-500)' }} />
            </div>
          )}

          {/* Owner-only subscription context badges */}
          {!user?.assigned_role && (
            currentHotel?.id === 'ALL' ? (
              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11.5px', color: 'var(--t-600)' }}>
                  Scope: <strong style={{ color: 'var(--brand)' }}>{accessibleHotels.length} Properties</strong>
                </span>
                <span className="badge badge-brand" style={{ fontSize: '10px', padding: '2px 8px' }}>
                  Group Portfolio
                </span>
              </div>
            ) : (
              currentHotel && (
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11.5px', color: 'var(--t-600)' }}>
                    Code: <strong style={{ color: 'var(--t-900)' }}>{currentHotel.hotel_code}</strong>
                  </span>
                  <span className="badge badge-active" style={{ fontSize: '10px', padding: '2px 8px' }}>
                    {activeModules.length} Subscribed
                  </span>
                </div>
              )
            )
          )}
        </div>
      )}

      {/* Navigation Links */}
      <div style={{ padding: '16px 12px', flex: 1, overflowY: 'auto' }}>
        {isSuperAdmin ? (
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--t-500)', padding: '0 10px 8px', letterSpacing: '0.04em' }}>
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
        ) : currentHotel?.id === 'ALL' ? (
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--t-500)', padding: '0 10px 8px', letterSpacing: '0.04em' }}>
              Portfolio Management
            </div>

            <NavItem
              active={currentTab === 'portfolio_overview' || currentTab === 'dashboard'}
              onClick={() => setCurrentTab('portfolio_overview')}
              icon={Layers}
              label="Consolidated Portfolio"
            />

            <NavItem
              active={currentTab === 'staff'}
              onClick={() => setCurrentTab('staff')}
              icon={ShieldCheck}
              label="Staff Access & Logins"
              highlight
            />

            <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--t-500)', padding: '18px 10px 8px', letterSpacing: '0.04em' }}>
              Switch To Property Desk
            </div>

            {accessibleHotels.map((h) => (
              <button
                key={h.id}
                onClick={() => {
                  selectHotel(h);
                  setCurrentTab('dashboard');
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: 'var(--r-sm)',
                  background: 'transparent',
                  border: '1px solid transparent',
                  color: 'var(--t-700)',
                  cursor: 'pointer',
                  fontSize: '12.5px',
                  textAlign: 'left',
                  marginBottom: '3px',
                  transition: 'var(--transition)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--surface-hover)';
                  e.currentTarget.style.color = 'var(--t-900)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--t-700)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <Hotel size={14} color="var(--t-500)" />
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.name}</span>
                </div>
                <span className="badge badge-brand" style={{ fontSize: '9.5px', padding: '1px 5px' }}>{h.hotel_code}</span>
              </button>
            ))}
          </div>
        ) : user?.assigned_role && !user?.is_org_owner ? (
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--t-500)', padding: '0 10px 8px', letterSpacing: '0.04em' }}>
              Operational Desk
            </div>

            {(() => {
              const roleAllowedModules = {
                'head-chef': ['kitchen'],
                'front-desk': ['front_office', 'rooms'],
                'restaurant-cashier': ['restaurant'],
                'storekeeper': ['store', 'purchase'],
              };
              const staffPermitted = roleAllowedModules[user.assigned_role.slug] || ['front_office'];
              const displayList = allModulesList.filter(m => staffPermitted.includes(m.code));

              return displayList.map((m) => {
                const isSubscribed = activeModules.includes(m.code);
                return (
                  <div key={m.code}>
                    <NavItem
                      active={currentTab === m.code}
                      onClick={() => {
                        if (isSubscribed) setCurrentTab(m.code);
                      }}
                      icon={m.icon}
                      label={m.name}
                      disabled={!isSubscribed}
                    />
                  </div>
                );
              });
            })()}
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--t-500)', padding: '0 10px 8px', letterSpacing: '0.04em' }}>
              Property Desk
            </div>

            <NavItem
              active={currentTab === 'dashboard'}
              onClick={() => setCurrentTab('dashboard')}
              icon={Layers}
              label="Property Overview"
            />

            {user?.is_org_owner && (
              <NavItem
                active={currentTab === 'staff'}
                onClick={() => setCurrentTab('staff')}
                icon={ShieldCheck}
                label="Staff & Module Access"
              />
            )}

            <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--t-500)', padding: '16px 10px 8px', letterSpacing: '0.04em' }}>
              Subscribed Modules
            </div>

            {allModulesList.map((m) => {
              const isSubscribed = activeModules.includes(m.code);
              return (
                <div key={m.code}>
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
                        <CheckCircle2 size={13} color="var(--success)" />
                      ) : (
                        <Lock size={12} color="var(--t-500)" />
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
      <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border-sub)', background: 'var(--surface-sub)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--brand-50)',
              border: '1px solid var(--brand-200)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: '700',
              color: 'var(--brand)',
            }}
          >
            {user?.name?.[0] || 'U'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--t-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--t-500)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
        padding: '9px 12px',
        borderRadius: 'var(--r-sm)',
        background: active ? 'var(--brand-50)' : 'transparent',
        border: '1px solid',
        borderColor: active ? 'var(--brand-200)' : 'transparent',
        color: active ? 'var(--brand)' : disabled ? 'var(--t-500)' : 'var(--t-700)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        textAlign: 'left',
        marginBottom: '3px',
        transition: 'var(--transition)',
        opacity: disabled ? 0.5 : 1,
        fontFamily: 'var(--font-body)',
        fontSize: '13px',
        fontWeight: active ? '600' : '500',
      }}
      onMouseEnter={(e) => {
        if (!active && !disabled) {
          e.currentTarget.style.background = 'var(--surface-hover)';
          e.currentTarget.style.color = 'var(--t-900)';
        }
      }}
      onMouseLeave={(e) => {
        if (!active && !disabled) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--t-700)';
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
        <Icon size={16} color={active ? 'var(--brand)' : 'currentColor'} />
        <span>{label}</span>
      </div>
      {badge && <div>{badge}</div>}
      {highlight && (
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--brand)' }} />
      )}
    </button>
  );
}
