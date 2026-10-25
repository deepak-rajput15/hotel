import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api';
import {
  Building2,
  Hotel,
  ShieldCheck,
  Plus,
  Save,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export default function SuperAdminDashboard({ activeTab = 'subscriptions' }) {
  const [organizations, setOrganizations] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [modules, setModules] = useState([]);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [moduleToggles, setModuleToggles] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  // Modals
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [showHotelModal, setShowHotelModal] = useState(false);

  // New Org Form
  const [orgForm, setOrgForm] = useState({
    name: '',
    billing_email: '',
    phone: '',
    tax_number: '',
    owner_name: '',
    owner_email: '',
    owner_password: 'Password@123',
  });

  // New Hotel Form
  const [hotelForm, setHotelForm] = useState({
    organization_id: '',
    name: '',
    city: '',
    state: '',
    selected_modules: ['front_office', 'rooms'],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [orgsRes, hotelsRes, modsRes] = await Promise.all([
        adminApi.getOrganizations(),
        adminApi.getHotels(),
        adminApi.getModules(),
      ]);

      if (orgsRes.success) setOrganizations(orgsRes.data.data || orgsRes.data || []);
      if (hotelsRes.success) {
        const hotelList = hotelsRes.data.data || hotelsRes.data || [];
        setHotels(hotelList);
        if (hotelList.length > 0 && !selectedHotel) {
          selectHotelForManagement(hotelList[0]);
        }
      }
      if (modsRes.success) setModules(modsRes.data || []);
    } catch (err) {
      console.error('Failed to load super admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectHotelForManagement = (hotel) => {
    setSelectedHotel(hotel);

    // Build initial toggle state based on hotel's active subscriptions
    const toggles = {};
    const subs = hotel.subscriptions || [];

    modules.forEach((mod) => {
      const existingSub = subs.find(
        (s) => s.module?.code === mod.code || s.module_id === mod.id
      );
      toggles[mod.code] = {
        enabled: existingSub ? existingSub.status === 'ACTIVE' : false,
        expires_at: existingSub?.expires_at ? existingSub.expires_at.split('T')[0] : '',
      };
    });

    setModuleToggles(toggles);
  };

  const handleToggle = (moduleCode) => {
    setModuleToggles((prev) => ({
      ...prev,
      [moduleCode]: {
        ...prev[moduleCode],
        enabled: !prev[moduleCode]?.enabled,
      },
    }));
  };

  const handleExpiryChange = (moduleCode, value) => {
    setModuleToggles((prev) => ({
      ...prev,
      [moduleCode]: {
        ...prev[moduleCode],
        expires_at: value,
      },
    }));
  };

  const handleSaveModules = async () => {
    if (!selectedHotel) return;
    try {
      setSaving(true);
      const res = await adminApi.updateHotelModules(selectedHotel.id, moduleToggles);
      if (res.success) {
        setNotification({
          type: 'success',
          message: `Module access for ${selectedHotel.name} (${selectedHotel.hotel_code}) updated instantly!`,
        });

        // Refresh hotels list
        const hotelsRes = await adminApi.getHotels();
        const updatedList = hotelsRes.data.data || hotelsRes.data || [];
        setHotels(updatedList);
        const updatedHotel = updatedList.find((h) => h.id === selectedHotel.id);
        if (updatedHotel) setSelectedHotel(updatedHotel);
      }
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to update module subscriptions.',
      });
    } finally {
      setSaving(false);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleCreateOrg = async (e) => {
    e.preventDefault();
    try {
      const res = await adminApi.createOrganization(orgForm);
      if (res.success) {
        setShowOrgModal(false);
        setNotification({
          type: 'success',
          message: `Organization registered with ID: ${res.organization.org_code}`,
        });
        loadData();
      }
    } catch (err) {
      alert('Error creating organization: ' + err.message);
    }
  };

  const handleCreateHotel = async (e) => {
    e.preventDefault();
    try {
      const res = await adminApi.createHotel(hotelForm.organization_id, {
        name: hotelForm.name,
        city: hotelForm.city,
        state: hotelForm.state,
        modules: hotelForm.selected_modules,
      });
      if (res.success) {
        setShowHotelModal(false);
        setNotification({
          type: 'success',
          message: `Hotel registered with ID: ${res.hotel.hotel_code}`,
        });
        loadData();
      }
    } catch (err) {
      alert('Error creating hotel: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading platform administration metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-body">
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: notification.type === 'success' ? '#064e3b' : '#7f1d1d',
            border: `1px solid ${notification.type === 'success' ? 'var(--emerald)' : 'var(--rose)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '14px 20px',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 110,
            animation: 'scaleIn 0.2s ease-out',
          }}
        >
          {notification.type === 'success' ? <CheckCircle2 size={18} color="var(--emerald)" /> : <AlertCircle size={18} color="var(--rose)" />}
          <span style={{ fontSize: '13.5px', fontWeight: '600' }}>{notification.message}</span>
        </div>
      )}

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <MetricCard
          label="Registered Organizations"
          value={organizations.length}
          subtext="Hotel Owner Accounts"
          icon={Building2}
          color="var(--primary)"
        />
        <MetricCard
          label="Active Hotel Properties"
          value={hotels.length}
          subtext="Operational Tenancies"
          icon={Hotel}
          color="var(--emerald)"
        />
        <MetricCard
          label="Available Platform Modules"
          value={modules.length}
          subtext="Front Office, POS, KOT, etc."
          icon={Layers}
          color="var(--cyan)"
        />
        <MetricCard
          label="Multi-Tenant Isolation"
          value="Row-Level (PostgreSQL)"
          subtext="Scope Active: hotel_id"
          icon={ShieldCheck}
          color="#a855f7"
        />
      </div>

      {/* Main Feature: Module Subscriptions Matrix */}
      {(activeTab === 'subscriptions' || activeTab === 'overview') && (
        <div className="card" style={{ marginBottom: '32px', border: '1px solid rgba(99, 102, 241, 0.3)', background: 'linear-gradient(180deg, rgba(99, 102, 241, 0.05) 0%, var(--bg-card) 20%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <ShieldCheck size={20} color="var(--primary)" />
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'white' }}>
                  Dynamic Module Subscriptions & Entitlements
                </h2>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Turn modules ON or OFF for any hotel in real-time. Changes apply instantly without touching code.
              </p>
            </div>

            {/* Hotel Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>Target Hotel:</span>
              <select
                className="form-select"
                value={selectedHotel?.id || ''}
                onChange={(e) => {
                  const h = hotels.find((item) => item.id === e.target.value);
                  if (h) selectHotelForManagement(h);
                }}
                style={{ width: '260px', background: 'var(--bg-app)', borderColor: 'var(--border)' }}
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
            <div>
              {/* Hotel Overview Banner */}
              <div
                style={{
                  background: 'var(--bg-surface)',
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '20px',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Configuring Access For:</span>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: 'white', marginTop: '2px' }}>
                    {selectedHotel.name} <span style={{ color: 'var(--primary)', marginLeft: '6px' }}>[{selectedHotel.hotel_code}]</span>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Organization:</span>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {selectedHotel.organization?.name || 'Apex Hospitality Group'} ({selectedHotel.organization?.org_code || 'ORG-1001'})
                  </div>
                </div>
              </div>

              {/* Module Toggle Matrix Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {modules.map((mod) => {
                  const toggleState = moduleToggles[mod.code] || { enabled: false, expires_at: '' };
                  const isEnabled = toggleState.enabled;

                  return (
                    <div
                      key={mod.code}
                      style={{
                        background: isEnabled ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-surface)',
                        border: '1px solid',
                        borderColor: isEnabled ? 'rgba(16, 185, 129, 0.3)' : 'var(--border)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '18px',
                        transition: 'var(--transition)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: '700', color: 'white' }}>{mod.name}</div>
                          <div style={{ fontSize: '11.5px', color: 'var(--primary)', fontFamily: 'monospace', marginTop: '2px' }}>
                            code: {mod.code}
                          </div>
                        </div>

                        {/* Interactive Toggle Switch */}
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={() => handleToggle(mod.code)}
                          />
                          <span className="toggle-slider" />
                        </label>
                      </div>

                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.4 }}>
                        {mod.description}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                        <span className={`badge ${isEnabled ? 'badge-active' : 'badge-inactive'}`}>
                          {isEnabled ? 'Subscribed' : 'Disabled'}
                        </span>

                        {isEnabled && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Calendar size={13} color="var(--text-muted)" />
                            <input
                              type="date"
                              value={toggleState.expires_at || ''}
                              onChange={(e) => handleExpiryChange(mod.code, e.target.value)}
                              placeholder="Perpetual"
                              style={{
                                background: 'transparent',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm)',
                                color: 'var(--text-secondary)',
                                fontSize: '11px',
                                padding: '3px 6px',
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  onClick={handleSaveModules}
                  disabled={saving}
                  className="btn btn-primary"
                  style={{ padding: '10px 24px', fontSize: '14px' }}
                >
                  <Save size={16} />
                  <span>{saving ? 'Saving Subscriptions...' : 'Save & Publish Changes'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Organizations & Hotels Tables */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Organizations Section */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'white' }}>Hotel Organizations</h3>
            <button onClick={() => setShowOrgModal(true)} className="btn btn-secondary btn-sm">
              <Plus size={14} />
              <span>Onboard Owner</span>
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Organization Name</th>
                  <th>Owner</th>
                  <th>Hotels</th>
                </tr>
              </thead>
              <tbody>
                {organizations.map((org) => (
                  <tr key={org.id}>
                    <td>
                      <span className="badge badge-primary">{org.org_code}</span>
                    </td>
                    <td style={{ fontWeight: '600', color: 'white' }}>{org.name}</td>
                    <td>{org.users?.[0]?.name || org.billing_email}</td>
                    <td>
                      <span className="badge badge-active">{org.hotels_count || org.hotels?.length || 0}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Hotels Directory Section */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'white' }}>Registered Hotel Properties</h3>
            <button onClick={() => setShowHotelModal(true)} className="btn btn-secondary btn-sm">
              <Plus size={14} />
              <span>Register Hotel</span>
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Hotel Code</th>
                  <th>Name</th>
                  <th>City</th>
                  <th>Subscribed Modules</th>
                </tr>
              </thead>
              <tbody>
                {hotels.map((h) => (
                  <tr key={h.id}>
                    <td>
                      <strong style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>{h.hotel_code}</strong>
                    </td>
                    <td style={{ fontWeight: '600', color: 'white' }}>{h.name}</td>
                    <td>{h.city || 'India'}</td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {(h.subscriptions || [])
                          .filter((s) => s.status === 'ACTIVE')
                          .map((s) => (
                            <span key={s.id || s.module?.code} className="badge badge-active" style={{ fontSize: '10px', padding: '2px 6px' }}>
                              {s.module?.name || s.module?.code}
                            </span>
                          ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Onboard Organization Modal */}
      {showOrgModal && (
        <div className="modal-overlay" onClick={() => setShowOrgModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'white', marginBottom: '6px' }}>
              Onboard Hotel Owner / Organization
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              The platform generates the unique Organization Code and creates the primary owner credentials.
            </p>

            <form onSubmit={handleCreateOrg}>
              <div className="form-group">
                <label className="form-label">Organization / Business Name *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g. Skyline Hospitality Group"
                  value={orgForm.name}
                  onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Billing Email *</label>
                  <input
                    type="email"
                    className="form-input"
                    required
                    placeholder="billing@skyline.com"
                    value={orgForm.billing_email}
                    onChange={(e) => setOrgForm({ ...orgForm, billing_email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="+91 9876543210"
                    value={orgForm.phone}
                    onChange={(e) => setOrgForm({ ...orgForm, phone: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ padding: '14px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', margin: '16px 0', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '10px' }}>
                  Owner Account Credentials
                </div>
                <div className="form-group">
                  <label className="form-label">Owner Full Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    placeholder="e.g. Ramesh Patel"
                    value={orgForm.owner_name}
                    onChange={(e) => setOrgForm({ ...orgForm, owner_name: e.target.value })}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Owner Email *</label>
                    <input
                      type="email"
                      className="form-input"
                      required
                      placeholder="owner@skyline.com"
                      value={orgForm.owner_email}
                      onChange={(e) => setOrgForm({ ...orgForm, owner_email: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Initial Password *</label>
                    <input
                      type="password"
                      className="form-input"
                      required
                      value={orgForm.owner_password}
                      onChange={(e) => setOrgForm({ ...orgForm, owner_password: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" onClick={() => setShowOrgModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Register Organization
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Provision Hotel Modal */}
      {showHotelModal && (
        <div className="modal-overlay" onClick={() => setShowHotelModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'white', marginBottom: '6px' }}>
              Register Hotel Property
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              The platform generates the unique Hotel ID (e.g., HTL-1004).
            </p>

            <form onSubmit={handleCreateHotel}>
              <div className="form-group">
                <label className="form-label">Parent Organization *</label>
                <select
                  className="form-select"
                  required
                  value={hotelForm.organization_id}
                  onChange={(e) => setHotelForm({ ...hotelForm, organization_id: e.target.value })}
                >
                  <option value="">Select Organization</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.org_code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Hotel Name *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g. Skyline Luxury Suites"
                  value={hotelForm.name}
                  onChange={(e) => setHotelForm({ ...hotelForm, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">City *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    placeholder="e.g. Bengaluru"
                    value={hotelForm.city}
                    onChange={(e) => setHotelForm({ ...hotelForm, city: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Karnataka"
                    value={hotelForm.state}
                    onChange={(e) => setHotelForm({ ...hotelForm, state: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" onClick={() => setShowHotelModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Provision Hotel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, subtext, icon: Icon, color }) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div
        style={{
          width: '46px',
          height: '46px',
          borderRadius: 'var(--radius-md)',
          background: `rgba(255, 255, 255, 0.04)`,
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: color,
        }}
      >
        <Icon size={22} />
      </div>
      <div>
        <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          {label}
        </div>
        <div style={{ fontSize: '22px', fontWeight: '800', color: 'white', marginTop: '2px' }}>
          {value}
        </div>
        <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          {subtext}
        </div>
      </div>
    </div>
  );
}
