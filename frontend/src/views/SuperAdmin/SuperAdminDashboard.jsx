import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api';
import OverviewTab from './OverviewTab';
import OrganizationsTab from './OrganizationsTab';
import HotelsTab from './HotelsTab';
import SubscriptionsTab from './SubscriptionsTab';
import {
  CheckCircle2,
  AlertCircle,
  Building2,
  Hotel,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function SuperAdminDashboard({ activeTab = 'overview', onNavigateTab }) {
  const [organizations, setOrganizations] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [modules, setModules] = useState([]);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [moduleToggles, setModuleToggles] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  // Filters
  const [filterOrgId, setFilterOrgId] = useState(null);

  // Modals
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [showHotelModal, setShowHotelModal] = useState(false);
  const [showOwnerPassword, setShowOwnerPassword] = useState(false);

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

  const populateToggles = (hotel, moduleList) => {
    if (!hotel || !moduleList || moduleList.length === 0) return {};
    const toggles = {};
    const subs = hotel.subscriptions || [];

    moduleList.forEach((mod) => {
      const existingSub = subs.find(
        (s) => s.module?.code === mod.code || s.module_id === mod.id
      );
      toggles[mod.code] = {
        enabled: existingSub ? existingSub.status === 'ACTIVE' : false,
        expires_at: existingSub?.expires_at ? existingSub.expires_at.split('T')[0] : '',
      };
    });

    return toggles;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [orgsRes, hotelsRes, modsRes] = await Promise.all([
        adminApi.getOrganizations(),
        adminApi.getHotels(),
        adminApi.getModules(),
      ]);

      const availableModules = modsRes.success ? (modsRes.data || []) : [];
      setModules(availableModules);

      if (orgsRes.success) setOrganizations(orgsRes.data.data || orgsRes.data || []);
      if (hotelsRes.success) {
        const hotelList = hotelsRes.data.data || hotelsRes.data || [];
        setHotels(hotelList);
        if (hotelList.length > 0) {
          const initialHotel = selectedHotel 
            ? hotelList.find((h) => h.id === selectedHotel.id) || hotelList[0] 
            : hotelList[0];
          setSelectedHotel(initialHotel);
          setModuleToggles(populateToggles(initialHotel, availableModules));
        }
      }
    } catch (err) {
      console.error('Failed to load super admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Ensure toggles are initialized if modules load after hotel selection
  useEffect(() => {
    if (selectedHotel && modules.length > 0 && Object.keys(moduleToggles).length === 0) {
      setModuleToggles(populateToggles(selectedHotel, modules));
    }
  }, [selectedHotel, modules]);

  const selectHotelForManagement = (hotel) => {
    setSelectedHotel(hotel);
    setModuleToggles(populateToggles(hotel, modules));
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
          message: `Module subscriptions for ${selectedHotel.name} (${selectedHotel.hotel_code}) saved successfully!`,
        });

        const hotelsRes = await adminApi.getHotels();
        const updatedList = hotelsRes.data.data || hotelsRes.data || [];
        setHotels(updatedList);
        const updatedHotel = updatedList.find((h) => h.id === selectedHotel.id);
        if (updatedHotel) {
          setSelectedHotel(updatedHotel);
          setModuleToggles(populateToggles(updatedHotel, modules));
        }
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
        setOrgForm({
          name: '',
          billing_email: '',
          phone: '',
          tax_number: '',
          owner_name: '',
          owner_email: '',
          owner_password: 'Password@123',
        });
        loadData();
      }
    } catch (err) {
      const errorMsg = err.data?.errors 
        ? Object.values(err.data.errors).flat().join('\n') 
        : (err.data?.message || err.message);
      alert('Error creating organization:\n' + errorMsg);
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
        setHotelForm({
          organization_id: '',
          name: '',
          city: '',
          state: '',
          selected_modules: ['front_office', 'rooms'],
        });
        loadData();
      }
    } catch (err) {
      const errorMsg = err.data?.errors 
        ? Object.values(err.data.errors).flat().join('\n') 
        : (err.data?.message || err.message);
      alert('Error creating hotel:\n' + errorMsg);
    }
  };

  const handleSelectOrgForHotels = (orgId) => {
    setFilterOrgId(orgId);
    if (onNavigateTab) onNavigateTab('hotels');
  };

  const handleManageModulesForHotel = (hotel) => {
    selectHotelForManagement(hotel);
    if (onNavigateTab) onNavigateTab('subscriptions');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '36px', height: '36px', border: '3px solid var(--border)', borderTopColor: 'var(--brand)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--t-500)', fontSize: '13px' }}>Loading platform dashboard...</p>
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
            background: notification.type === 'success' ? 'var(--success-bg)' : 'var(--error-bg)',
            border: `1px solid ${notification.type === 'success' ? 'var(--success-border)' : 'var(--error-border)'}`,
            borderRadius: 'var(--r-card)',
            padding: '12px 18px',
            color: notification.type === 'success' ? 'var(--success)' : 'var(--error)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 110,
            animation: 'scaleIn 0.2s ease-out',
          }}
        >
          {notification.type === 'success' ? <CheckCircle2 size={18} color="var(--success)" /> : <AlertCircle size={18} color="var(--error)" />}
          <span style={{ fontSize: '13px', fontWeight: '600' }}>{notification.message}</span>
        </div>
      )}

      {/* Render Dedicated Full-Page Tab */}
      {activeTab === 'overview' && (
        <OverviewTab
          organizations={organizations}
          hotels={hotels}
          modules={modules}
          onNavigateTab={onNavigateTab}
        />
      )}

      {activeTab === 'organizations' && (
        <OrganizationsTab
          organizations={organizations}
          onOpenOnboardModal={() => setShowOrgModal(true)}
          onSelectOrgForHotels={handleSelectOrgForHotels}
        />
      )}

      {activeTab === 'hotels' && (
        <HotelsTab
          hotels={hotels}
          organizations={organizations}
          onOpenHotelModal={() => setShowHotelModal(true)}
          onManageModules={handleManageModulesForHotel}
          filterOrgId={filterOrgId}
          onClearOrgFilter={() => setFilterOrgId(null)}
        />
      )}

      {activeTab === 'subscriptions' && (
        <SubscriptionsTab
          hotels={hotels}
          modules={modules}
          selectedHotel={selectedHotel}
          moduleToggles={moduleToggles}
          onSelectHotel={selectHotelForManagement}
          onToggleModule={handleToggle}
          onExpiryChange={handleExpiryChange}
          onSaveModules={handleSaveModules}
          saving={saving}
        />
      )}

      {/* Onboard Organization Modal (Professional & Generous) */}
      {showOrgModal && (
        <div className="modal-overlay" onClick={() => setShowOrgModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '600px', padding: '32px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: 'var(--r-sm)', background: 'var(--brand-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand)' }}>
                <Building2 size={18} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--t-900)' }}>
                Onboard Hotel Owner / Organization
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--t-500)', marginBottom: '22px' }}>
              The platform will provision a unique Organization Code (e.g., ORG-1002) and set up the primary owner account.
            </p>

            <form onSubmit={handleCreateOrg}>
              <div className="form-group">
                <label className="form-label">Business / Organization Name *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g. Skyline Hospitality Group"
                  value={orgForm.name}
                  onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
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
                  <label className="form-label">Contact Phone</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="+91 9876543210"
                    value={orgForm.phone}
                    onChange={(e) => setOrgForm({ ...orgForm, phone: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ padding: '16px 18px', background: 'var(--surface-sub)', borderRadius: 'var(--r-card)', margin: '18px 0', border: '1px solid var(--border-sub)' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--t-900)', marginBottom: '12px' }}>
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Owner Login Email *</label>
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
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showOwnerPassword ? 'text' : 'password'}
                        className="form-input"
                        required
                        value={orgForm.owner_password}
                        onChange={(e) => setOrgForm({ ...orgForm, owner_password: e.target.value })}
                        style={{ paddingRight: '40px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowOwnerPassword(!showOwnerPassword)}
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          padding: '4px',
                          cursor: 'pointer',
                          color: showOwnerPassword ? 'var(--brand)' : 'var(--t-500)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title={showOwnerPassword ? 'Hide password' : 'View password'}
                        aria-label={showOwnerPassword ? 'Hide password' : 'View password'}
                      >
                        {showOwnerPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '22px' }}>
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

      {/* Provision Hotel Modal (Professional & Generous) */}
      {showHotelModal && (
        <div className="modal-overlay" onClick={() => setShowHotelModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '580px', padding: '32px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: 'var(--r-sm)', background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
                <Hotel size={18} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--t-900)' }}>
                Register New Hotel Property
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--t-500)', marginBottom: '22px' }}>
              The system will automatically allocate a unique Hotel ID (e.g., HTL-1004) and link it to the selected owner.
            </p>

            <form onSubmit={handleCreateHotel}>
              <div className="form-group">
                <label className="form-label">Assign to Organization *</label>
                <select
                  className="form-select"
                  required
                  value={hotelForm.organization_id}
                  onChange={(e) => setHotelForm({ ...hotelForm, organization_id: e.target.value })}
                >
                  <option value="">Select Parent Organization</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.org_code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Hotel / Property Name *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g. Skyline Luxury Suites"
                  value={hotelForm.name}
                  onChange={(e) => setHotelForm({ ...hotelForm, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '22px' }}>
                <button type="button" onClick={() => setShowHotelModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Provision Hotel Property
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
