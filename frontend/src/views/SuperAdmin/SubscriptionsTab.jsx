import React from 'react';
import {
  ShieldCheck,
  Calendar,
  Save,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export default function SubscriptionsTab({
  hotels,
  modules,
  selectedHotel,
  moduleToggles,
  onSelectHotel,
  onToggleModule,
  onExpiryChange,
  onSaveModules,
  saving,
}) {
  return (
    <div>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--t-900)' }}>
            Module Subscriptions & Entitlement Control
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--t-500)', marginTop: '2px' }}>
            Turn modules ON or OFF for any individual hotel property in real-time. Changes are enforced immediately.
          </p>
        </div>

        {/* Target Hotel Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12.5px', color: 'var(--t-500)', fontWeight: '600' }}>Target Property:</span>
          <select
            className="form-select"
            value={selectedHotel?.id || ''}
            onChange={(e) => {
              const h = hotels.find((item) => item.id === e.target.value);
              if (h) onSelectHotel(h);
            }}
            style={{ width: '280px', fontWeight: '600' }}
          >
            {hotels.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} ({h.hotel_code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedHotel && (
        <div className="card" style={{ marginBottom: '24px' }}>
          {/* Hotel Metadata Header */}
          <div
            style={{
              background: 'var(--surface-sub)',
              padding: '16px 20px',
              borderRadius: 'var(--r-card)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '24px',
              border: '1px solid var(--border-sub)',
            }}
          >
            <div>
              <span style={{ fontSize: '11px', color: 'var(--t-500)', textTransform: 'uppercase', fontWeight: '700' }}>
                Configuring Access For:
              </span>
              <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--t-900)', marginTop: '2px' }}>
                {selectedHotel.name} <span style={{ color: 'var(--brand)', marginLeft: '6px' }}>[{selectedHotel.hotel_code}]</span>
              </div>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--t-500)', textTransform: 'uppercase', fontWeight: '700' }}>
                Parent Organization:
              </span>
              <div style={{ fontSize: '14px', color: 'var(--t-700)', fontWeight: '600', marginTop: '2px' }}>
                {selectedHotel.organization?.name || 'Apex Hospitality Group'} ({selectedHotel.organization?.org_code || 'ORG-1001'})
              </div>
            </div>
          </div>

          {/* Module Toggle Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '18px',
              marginBottom: '26px',
            }}
          >
            {modules.map((mod) => {
              const toggleState = moduleToggles[mod.code] || { enabled: false, expires_at: '' };
              const isEnabled = toggleState.enabled;

              return (
                <div
                  key={mod.code}
                  style={{
                    background: isEnabled ? 'var(--white)' : 'var(--surface-sub)',
                    border: '1px solid',
                    borderColor: isEnabled ? 'var(--border)' : 'var(--border-sub)',
                    borderRadius: 'var(--r-card)',
                    padding: '20px',
                    boxShadow: isEnabled ? 'var(--shadow-xs)' : 'none',
                    transition: 'var(--transition)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--t-900)' }}>
                        {mod.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--brand)', fontFamily: 'monospace', marginTop: '2px' }}>
                        code: {mod.code}
                      </div>
                    </div>

                    {/* Interactive Toggle Switch */}
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={() => onToggleModule(mod.code)}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>

                  <p style={{ fontSize: '12.5px', color: 'var(--t-600)', marginBottom: '16px', lineHeight: 1.45 }}>
                    {mod.description}
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '12px',
                      borderTop: '1px solid var(--border-sub)',
                    }}
                  >
                    <span className={`badge ${isEnabled ? 'badge-success' : 'badge-inactive'}`}>
                      {isEnabled ? <CheckCircle2 size={12} /> : <Lock size={12} />}
                      {isEnabled ? 'Subscribed' : 'Disabled'}
                    </span>

                    {isEnabled && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={13} color="var(--t-500)" />
                        <input
                          type="date"
                          value={toggleState.expires_at || ''}
                          onChange={(e) => onExpiryChange(mod.code, e.target.value)}
                          style={{
                            background: 'var(--white)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--r-sm)',
                            color: 'var(--t-700)',
                            fontSize: '11.5px',
                            padding: '4px 8px',
                            outline: 'none',
                          }}
                          title="Expiry date (Leave empty for perpetual)"
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingTop: '18px',
              borderTop: '1px solid var(--border-sub)',
            }}
          >
            <button
              onClick={onSaveModules}
              disabled={saving}
              className="btn btn-primary"
              style={{ padding: '10px 24px', fontSize: '14px' }}
            >
              <Save size={16} />
              <span>{saving ? 'Publishing Changes...' : 'Save & Publish Changes'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
