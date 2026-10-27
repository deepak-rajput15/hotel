import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { hotelApi } from '../../api';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Hotel,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  Copy,
  Check,
  Search,
} from 'lucide-react';

export default function StaffManagementTab({ activeHotelId = 'ALL' }) {
  const { user, currentHotel } = useAuth();
  const accessibleHotels = user?.accessible_hotels || [];

  const [staffList, setStaffList] = useState([]);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterHotel, setFilterHotel] = useState(activeHotelId || 'ALL');

  // Form state
  const [formData, setFormData] = useState({
    hotel_id: activeHotelId !== 'ALL' ? activeHotelId : (accessibleHotels[0]?.id || ''),
    name: '',
    email: '',
    phone: '',
    password: 'Password@123',
    role_id: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successInfo, setSuccessInfo] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchStaffData();
  }, [filterHotel]);

  const fetchStaffData = async () => {
    try {
      setLoading(true);
      const res = await hotelApi.getStaff(filterHotel);
      if (res.success) {
        setStaffList(res.staff || []);
        setAvailableRoles(res.available_roles || []);
        if (res.available_roles?.length > 0 && !formData.role_id) {
          setFormData(prev => ({ ...prev, role_id: res.available_roles[0].id }));
        }
      }
    } catch (err) {
      console.error('Failed to load staff list:', err);
    } finally {
      setLoading(false);
    }
  };

  // Find currently selected hotel object in modal
  const selectedHotelObj = accessibleHotels.find(h => h.id === formData.hotel_id);
  const selectedRoleObj = availableRoles.find(r => r.id === formData.role_id);

  // Check module entitlement for selected hotel & role
  const checkRoleEntitlement = () => {
    if (!selectedHotelObj || !selectedRoleObj) return { eligible: true };

    const hotelSubscribedCodes = (selectedHotelObj.subscriptions || [])
      .filter(s => s.status === 'ACTIVE')
      .map(s => s.module?.code);

    const roleRequirements = {
      'front-desk': ['front_office', 'rooms'],
      'restaurant-cashier': ['restaurant'],
      'head-chef': ['kitchen'],
      'storekeeper': ['store', 'purchase'],
    };

    const reqs = roleRequirements[selectedRoleObj.slug];
    if (!reqs) return { eligible: true };

    const hasAccess = reqs.some(r => hotelSubscribedCodes.includes(r));
    return {
      eligible: hasAccess,
      requiredModules: reqs,
      subscribedModules: hotelSubscribedCodes,
    };
  };

  const entitlementStatus = checkRoleEntitlement();

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!entitlementStatus.eligible) {
      setErrorMessage(`Cannot grant '${selectedRoleObj?.name}'. Target property ${selectedHotelObj?.name} is not subscribed to required module.`);
      return;
    }

    try {
      setSubmitting(true);
      const res = await hotelApi.createStaff(formData.hotel_id, formData);
      if (res.success) {
        setSuccessInfo({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          roleName: selectedRoleObj?.name,
          hotelName: selectedHotelObj?.name,
        });
        setShowAddModal(false);
        setFormData({
          hotel_id: accessibleHotels[0]?.id || '',
          name: '',
          email: '',
          phone: '',
          password: 'Password@123',
          role_id: availableRoles[0]?.id || '',
        });
        fetchStaffData();
      }
    } catch (err) {
      setErrorMessage(err.data?.message || err.message || 'Failed to create staff account');
    } finally {
      setSubmitting(false);
    }
  };

  const copyCredentials = () => {
    if (!successInfo) return;
    const text = `GrandStay SaaS Login\nHotel: ${successInfo.hotelName}\nRole: ${successInfo.roleName}\nEmail: ${successInfo.email}\nPassword: ${successInfo.password}\nLogin URL: ${window.location.origin}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const filteredStaff = staffList.filter(s => {
    const q = searchTerm.toLowerCase();
    return (
      s.name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.role?.name?.toLowerCase().includes(q) ||
      s.hotel?.name?.toLowerCase().includes(q) ||
      s.hotel?.hotel_code?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="page-body">
      {/* Header Notification Card */}
      <div
        className="card"
        style={{
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          borderLeft: '4px solid var(--brand)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-brand">Tier 2 Owner Administration</span>
            <span className="badge badge-success">Granular Role-Based Access</span>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--t-900)' }}>
            Staff & Module Access Management
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--t-600)', marginTop: '2px' }}>
            Generate staff login credentials with access restricted strictly to their assigned hotel property and subscribed operational module.
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMessage('');
            setShowAddModal(true);
          }}
          className="btn btn-primary"
        >
          <UserPlus size={16} />
          <span>+ Add Staff & Generate Credentials</span>
        </button>
      </div>

      {/* Success Banner when credentials generated */}
      {successInfo && (
        <div
          className="card"
          style={{
            marginBottom: '24px',
            background: 'var(--success-bg)',
            border: '1px solid var(--success-border)',
            padding: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--success)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#065f46', marginBottom: '2px' }}>
                  Staff Account & Login Credentials Generated!
                </h4>
                <p style={{ fontSize: '12.5px', color: '#047857', marginBottom: '10px' }}>
                  Provide these credentials to your staff member. Upon login, they will only have access to <strong>{successInfo.roleName}</strong> for <strong>{successInfo.hotelName}</strong>.
                </p>
                <div style={{ background: 'var(--white)', padding: '12px 16px', borderRadius: 'var(--r-sm)', border: '1px solid var(--success-border)', display: 'inline-flex', gap: '24px', fontSize: '13px' }}>
                  <div>Email: <strong style={{ color: 'var(--t-900)' }}>{successInfo.email}</strong></div>
                  <div>Password: <strong style={{ color: 'var(--t-900)' }}>{successInfo.password}</strong></div>
                  <div>Role: <span className="badge badge-brand">{successInfo.roleName}</span></div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={copyCredentials} className="btn btn-secondary btn-sm" style={{ background: 'white' }}>
                {copied ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                <span>{copied ? 'Copied!' : 'Copy Login Details'}</span>
              </button>
              <button onClick={() => setSuccessInfo(null)} className="btn btn-secondary btn-sm" style={{ background: 'white' }}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--t-500)' }} />
            <input
              type="text"
              placeholder="Search staff by name, email, role, or hotel..."
              className="form-control"
              style={{ paddingLeft: '34px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="form-select"
            style={{ width: '220px' }}
            value={filterHotel}
            onChange={(e) => setFilterHotel(e.target.value)}
          >
            <option value="ALL">🌐 All Properties Staff</option>
            {accessibleHotels.map(h => (
              <option key={h.id} value={h.id}>
                {h.name} ({h.hotel_code})
              </option>
            ))}
          </select>
        </div>

        <span style={{ fontSize: '12.5px', color: 'var(--t-500)', fontWeight: '600' }}>
          Showing {filteredStaff.length} Team Members
        </span>
      </div>

      {/* Staff Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Staff Member</th>
              <th>Assigned Property</th>
              <th>System Role</th>
              <th>Permitted Module</th>
              <th>Account Status</th>
              <th style={{ textAlign: 'right' }}>Security Scope</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '36px' }}>
                  <div style={{ color: 'var(--t-500)', fontSize: '13px' }}>Loading staff members...</div>
                </td>
              </tr>
            ) : filteredStaff.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>
                  <Users size={32} color="var(--t-400)" style={{ margin: '0 auto 10px', display: 'block' }} />
                  <div style={{ fontSize: '14.5px', fontWeight: '700', color: 'var(--t-800)', marginBottom: '4px' }}>
                    No Staff Members Found
                  </div>
                  <p style={{ fontSize: '12.5px', color: 'var(--t-500)', maxWidth: '360px', margin: '0 auto 16px' }}>
                    Generate staff logins for your front desk, kitchen chef, or cashier to give them restricted module access.
                  </p>
                  <button onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm">
                    <UserPlus size={14} />
                    <span>+ Add First Staff Member</span>
                  </button>
                </td>
              </tr>
            ) : (
              filteredStaff.map((staff) => (
                <tr key={staff.access_id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'var(--brand-50)',
                          border: '1px solid var(--brand-200)',
                          color: 'var(--brand)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: '700',
                        }}
                      >
                        {staff.name?.[0] || 'S'}
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', color: 'var(--t-900)', fontSize: '13.5px' }}>
                          {staff.name}
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--t-500)' }}>
                          {staff.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div>
                      <span className="badge badge-brand" style={{ fontSize: '10.5px', marginRight: '6px' }}>
                        {staff.hotel?.hotel_code}
                      </span>
                      <strong style={{ fontSize: '13px', color: 'var(--t-800)' }}>{staff.hotel?.name}</strong>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-brand" style={{ fontWeight: '600' }}>
                      <ShieldCheck size={12} />
                      {staff.role?.name}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: '12.5px', color: 'var(--t-700)', fontWeight: '500' }}>
                      {staff.role?.slug === 'head-chef' && '🍳 Kitchen (KOT) Only'}
                      {staff.role?.slug === 'front-desk' && '🛎️ Front Desk & Rooms Only'}
                      {staff.role?.slug === 'restaurant-cashier' && '🍽️ Restaurant POS Only'}
                      {staff.role?.slug === 'storekeeper' && '📦 Store & Purchases Only'}
                      {staff.role?.slug === 'general-manager' && '⭐ Hotel Sub-Admin (All modules of this hotel only)'}
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-success">ACTIVE</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--t-500)', fontFamily: 'monospace' }}>
                      Tenant Isolated
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Onboard Staff Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '540px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--t-900)' }}>
                  Add Staff Member & Generate Access
                </h3>
                <p style={{ fontSize: '12.5px', color: 'var(--t-500)' }}>
                  Issue login credentials bound to a specific property and operational module.
                </p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px' }}>
                ✕
              </button>
            </div>

            {errorMessage && (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--r-sm)',
                  marginBottom: '16px',
                  background: 'var(--error-bg)',
                  border: '1px solid var(--error-border)',
                  color: 'var(--error)',
                  fontSize: '12.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreateStaff}>
              <div className="form-group">
                <label className="form-label">Assign to Hotel Property *</label>
                <select
                  className="form-select"
                  value={formData.hotel_id}
                  onChange={(e) => setFormData({ ...formData, hotel_id: e.target.value })}
                  required
                >
                  {accessibleHotels.map(h => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.hotel_code}) - {h.city}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Staff Full Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Vikram Malhotra"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Staff Work Email *</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="e.g. chef.vikram@apexhospitality.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Contact Phone</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="+91 9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Initial Password *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Assigned Role & Permitted Module *</label>
                <select
                  className="form-select"
                  value={formData.role_id}
                  onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                  required
                >
                  {availableRoles.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.slug === 'general-manager' ? `⭐ Hotel Sub-Admin (General Manager) - Restricted to selected hotel only` : `${r.name} (${r.description})`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Module Entitlement Guard Preview */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--r-sm)',
                  marginBottom: '18px',
                  background: entitlementStatus.eligible ? 'var(--brand-50)' : 'var(--error-bg)',
                  border: `1px solid ${entitlementStatus.eligible ? 'var(--brand-200)' : 'var(--error-border)'}`,
                  fontSize: '12px',
                }}
              >
                {entitlementStatus.eligible ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--brand)' }}>
                    <CheckCircle2 size={16} />
                    <span>
                      <strong>Module Guard Verified:</strong> Hotel <strong>{selectedHotelObj?.name}</strong> has active subscription for this role.
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--error)' }}>
                    <Lock size={16} />
                    <span>
                      <strong>Module Guard Warning:</strong> Hotel <strong>{selectedHotelObj?.name}</strong> is <u>NOT subscribed</u> to {entitlementStatus.requiredModules?.join(', ')}. Subscription must be enabled by Super Admin.
                    </span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || !entitlementStatus.eligible}
                >
                  {submitting ? 'Generating Account...' : 'Confirm & Create Login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
