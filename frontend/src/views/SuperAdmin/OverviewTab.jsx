import React from 'react';
import {
  Building2,
  Hotel,
  Layers,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

export default function OverviewTab({
  organizations,
  hotels,
  modules,
  onNavigateTab,
}) {
  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--t-900)' }}>
          Platform Command Center
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--t-500)', marginTop: '2px' }}>
          Real-time summary of SaaS tenant accounts, properties, and system infrastructure.
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '20px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: 'var(--r-card)', background: 'var(--brand-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand)' }}>
            <Building2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--t-500)', textTransform: 'uppercase' }}>
              Organizations
            </div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--t-900)' }}>
              {organizations.length}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--t-600)' }}>Hotel Owner Accounts</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '20px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: 'var(--r-card)', background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
            <Hotel size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--t-500)', textTransform: 'uppercase' }}>
              Hotel Properties
            </div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--t-900)' }}>
              {hotels.length}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--t-600)' }}>Active Tenancies</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '20px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: 'var(--r-card)', background: '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0891b2' }}>
            <Layers size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--t-500)', textTransform: 'uppercase' }}>
              Platform Modules
            </div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--t-900)' }}>
              {modules.length}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--t-600)' }}>Modular Entitlements</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '20px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: 'var(--r-card)', background: '#faf5ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9333ea' }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--t-500)', textTransform: 'uppercase' }}>
              Multi-Tenancy
            </div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--t-900)', marginTop: '2px' }}>
              PostgreSQL (Docker)
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--success)', fontWeight: '600' }}>Active: hotel_id scope</div>
          </div>
        </div>
      </div>

      {/* Quick Launch Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--t-900)' }}>
              Organizations & Hotel Owners
            </h3>
            <button
              onClick={() => onNavigateTab('organizations')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '12px' }}
            >
              <span>View All</span>
              <ArrowRight size={13} />
            </button>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--t-600)', marginBottom: '16px' }}>
            {organizations.length} customer businesses onboarded. Manage billing contacts, owner credentials, and property allocations.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {organizations.slice(0, 3).map((org) => (
              <div
                key={org.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'var(--surface-sub)',
                  borderRadius: 'var(--r-sm)',
                  border: '1px solid var(--border-sub)',
                }}
              >
                <div>
                  <strong style={{ fontSize: '13px', color: 'var(--t-900)' }}>{org.name}</strong>
                  <span className="badge badge-brand" style={{ marginLeft: '8px', fontSize: '10.5px' }}>
                    {org.org_code}
                  </span>
                </div>
                <span className="badge badge-success" style={{ fontSize: '10px' }}>
                  {org.hotels_count || org.hotels?.length || 0} Hotels
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--t-900)' }}>
              Module Subscriptions Management
            </h3>
            <button
              onClick={() => onNavigateTab('subscriptions')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '12px' }}
            >
              <span>Manage Matrix</span>
              <ArrowRight size={13} />
            </button>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--t-600)', marginBottom: '16px' }}>
            Independently toggle Front Office, Rooms, Restaurant POS, KOT, and Inventory per hotel with instant effect.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {hotels.slice(0, 3).map((h) => {
              const activeCount = (h.subscriptions || []).filter((s) => s.status === 'ACTIVE').length;
              return (
                <div
                  key={h.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: 'var(--surface-sub)',
                    borderRadius: 'var(--r-sm)',
                    border: '1px solid var(--border-sub)',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '13px', color: 'var(--t-900)' }}>{h.name}</strong>
                    <span style={{ fontSize: '11px', color: 'var(--t-500)', marginLeft: '6px' }}>
                      ({h.hotel_code})
                    </span>
                  </div>
                  <span className="badge badge-brand" style={{ fontSize: '10.5px' }}>
                    {activeCount} Modules Subscribed
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
