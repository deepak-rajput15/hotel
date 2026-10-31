import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Plus,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building2,
  Hotel,
  ShieldCheck,
  TrendingUp,
  Search,
  Filter,
  DollarSign,
  CreditCard,
  FileText,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { adminApi } from '../../api';

export default function HotelSubscriptionsTab({
  hotels,
  packages,
  initialTargetHotel,
  initialTargetPackage,
  onReloadAll,
}) {
  const [subscriptions, setSubscriptions] = useState([]);
  const [kpis, setKpis] = useState({
    total_contracts: 0,
    active_subscriptions: 0,
    mrr: 0,
    arr: 0,
    expiring_soon_count: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [cycleFilter, setCycleFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [selectedSubForExtend, setSelectedSubForExtend] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Assign Form
  const [assignForm, setAssignForm] = useState({
    hotel_id: '',
    package_id: '',
    billing_cycle: 'YEARLY',
    agreed_price: '',
    payment_status: 'PAID',
    payment_method: 'BANK_TRANSFER',
    payment_reference: '',
    sales_notes: '',
    expires_at: '',
  });

  // Extend Form
  const [extendForm, setExtendForm] = useState({
    months_to_add: 12,
    new_expires_at: '',
    payment_status: 'PAID',
    payment_reference: '',
    sales_notes: '',
  });

  useEffect(() => {
    loadSubscriptions();
  }, [statusFilter, cycleFilter]);

  // Pre-fill if opened with target hotel or package
  useEffect(() => {
    if (initialTargetHotel || initialTargetPackage) {
      handleOpenAssign(initialTargetHotel, initialTargetPackage);
    }
  }, [initialTargetHotel, initialTargetPackage]);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getHotelSubscriptions({
        status: statusFilter,
        billing_cycle: cycleFilter,
      });

      if (res.success) {
        setSubscriptions(res.data?.data || res.data || []);
        if (res.kpis) setKpis(res.kpis);
      }
    } catch (err) {
      console.error('Failed to load subscriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAssign = (targetHotel = null, targetPkg = null) => {
    const defaultHotel = targetHotel || (hotels.length > 0 ? hotels[0] : null);
    const defaultPkg = targetPkg || (packages.length > 0 ? packages[0] : null);

    const cycle = 'YEARLY';
    let defaultPrice = '';
    if (defaultPkg) {
      defaultPrice = defaultPkg.yearly_price ? defaultPkg.yearly_price.toString() : '';
    }

    setAssignForm({
      hotel_id: defaultHotel ? defaultHotel.id : '',
      package_id: defaultPkg ? defaultPkg.id : '',
      billing_cycle: cycle,
      agreed_price: defaultPrice,
      payment_status: 'PAID',
      payment_method: 'BANK_TRANSFER',
      payment_reference: '',
      sales_notes: '',
      expires_at: '',
    });
    setError('');
    setShowAssignModal(true);
  };

  const handlePackageChangeInAssign = (pkgId) => {
    const pkg = packages.find((p) => p.id === pkgId);
    if (!pkg) return;

    let price = '';
    if (assignForm.billing_cycle === 'MONTHLY') {
      price = pkg.monthly_price ? pkg.monthly_price.toString() : '';
    } else if (assignForm.billing_cycle === 'YEARLY') {
      price = pkg.yearly_price ? pkg.yearly_price.toString() : '';
    } else if (assignForm.billing_cycle === 'ONETIME') {
      price = pkg.onetime_price ? pkg.onetime_price.toString() : '';
    }

    setAssignForm((prev) => ({
      ...prev,
      package_id: pkgId,
      agreed_price: price,
    }));
  };

  const handleCycleChangeInAssign = (cycle) => {
    const pkg = packages.find((p) => p.id === assignForm.package_id);
    let price = assignForm.agreed_price;

    if (pkg) {
      if (cycle === 'MONTHLY') price = pkg.monthly_price ? pkg.monthly_price.toString() : '';
      else if (cycle === 'YEARLY') price = pkg.yearly_price ? pkg.yearly_price.toString() : '';
      else if (cycle === 'ONETIME') price = pkg.onetime_price ? pkg.onetime_price.toString() : '';
      else if (cycle === 'TRIAL') price = '0';
    }

    setAssignForm((prev) => ({
      ...prev,
      billing_cycle: cycle,
      agreed_price: price,
    }));
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!assignForm.hotel_id || !assignForm.package_id) {
      setError('Please select both a hotel and a package.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await adminApi.assignHotelPackage(assignForm.hotel_id, {
        ...assignForm,
        agreed_price: parseFloat(assignForm.agreed_price) || 0,
      });

      if (res.success) {
        setShowAssignModal(false);
        loadSubscriptions();
        if (onReloadAll) onReloadAll();
      }
    } catch (err) {
      setError(err.message || 'Failed to assign package');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenExtend = (sub) => {
    setSelectedSubForExtend(sub);
    setExtendForm({
      months_to_add: 12,
      new_expires_at: '',
      payment_status: 'PAID',
      payment_reference: '',
      sales_notes: '',
    });
    setError('');
    setShowExtendModal(true);
  };

  const handleExtendSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSubForExtend) return;

    setSaving(true);
    setError('');

    try {
      const res = await adminApi.extendSubscription(selectedSubForExtend.id, extendForm);
      if (res.success) {
        setShowExtendModal(false);
        loadSubscriptions();
        if (onReloadAll) onReloadAll();
      }
    } catch (err) {
      setError(err.message || 'Failed to extend validity');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelSub = async (sub) => {
    if (!window.confirm(`Are you sure you want to cancel subscription for "${sub.hotel?.name}"? Modules will be deactivated.`)) return;
    try {
      await adminApi.cancelSubscription(sub.id);
      loadSubscriptions();
      if (onReloadAll) onReloadAll();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const filteredSubs = subscriptions.filter((sub) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const hotelName = sub.hotel?.name?.toLowerCase() || '';
    const hotelCode = sub.hotel?.hotel_code?.toLowerCase() || '';
    const orgName = sub.hotel?.organization?.name?.toLowerCase() || '';
    const planName = sub.plan_name?.toLowerCase() || '';
    return hotelName.includes(q) || hotelCode.includes(q) || orgName.includes(q) || planName.includes(q);
  });

  return (
    <div>
      {/* Top Header */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <Receipt size={18} />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--t-900)' }}>
              Hotel Subscriptions & Sales Deals
            </h2>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--t-500)', marginTop: '4px' }}>
            Manage active client hotel contracts, monthly/yearly recurring revenue, renewal dates, and payment verifications.
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenAssign()}
          className="btn btn-brand"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '8px',
            fontWeight: '700',
            fontSize: '13px',
          }}
        >
          <Plus size={16} />
          Assign Package to Hotel
        </button>
      </div>

      {/* 4 Sales KPI Metrics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* Active Hotels */}
        <div className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'var(--brand-50, #eef2ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand, #4f46e5)' }}>
            <Hotel size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--t-500)' }}>
              Active Subscribed Hotels
            </div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--t-900)', marginTop: '2px' }}>
              {kpis.active_subscriptions}
              <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--t-500)', marginLeft: '6px' }}>
                of {hotels.length} Properties
              </span>
            </div>
          </div>
        </div>

        {/* MRR */}
        <div className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--t-500)' }}>
              Monthly Recurring (MRR)
            </div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--t-900)', marginTop: '2px' }}>
              ₹{kpis.mrr.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* ARR */}
        <div className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6' }}>
            <DollarSign size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--t-500)' }}>
              Annual Run Rate (ARR)
            </div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--t-900)', marginTop: '2px' }}>
              ₹{kpis.arr.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Expiring Soon */}
        <div className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: kpis.expiring_soon_count > 0 ? '#fff1f2' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: kpis.expiring_soon_count > 0 ? '#e11d48' : '#64748b' }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--t-500)' }}>
              Expiring in &lt;15 Days
            </div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: kpis.expiring_soon_count > 0 ? '#e11d48' : 'var(--t-900)', marginTop: '2px' }}>
              {kpis.expiring_soon_count}
              <span style={{ fontSize: '11.5px', fontWeight: '500', color: 'var(--t-500)', marginLeft: '6px' }}>
                Needs Renewal
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
            <Search size={15} color="var(--t-400)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input
              type="text"
              placeholder="Search by hotel, code, or org..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '32px', fontSize: '12.5px' }}
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-select"
            style={{ width: '150px', fontSize: '12.5px' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="TRIAL">Trial</option>
            <option value="EXPIRED">Expired</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          {/* Billing Cycle Filter */}
          <select
            value={cycleFilter}
            onChange={(e) => setCycleFilter(e.target.value)}
            className="form-select"
            style={{ width: '160px', fontSize: '12.5px' }}
          >
            <option value="ALL">All Cycles</option>
            <option value="YEARLY">Yearly</option>
            <option value="MONTHLY">Monthly</option>
            <option value="ONETIME">One-Time Lifetime</option>
          </select>
        </div>

        <button
          type="button"
          onClick={loadSubscriptions}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px' }}
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Contracts Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'var(--surface-sub)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '12px 18px', fontWeight: '700', color: 'var(--t-600)', fontSize: '11px', textTransform: 'uppercase' }}>
                Hotel Property
              </th>
              <th style={{ padding: '12px 18px', fontWeight: '700', color: 'var(--t-600)', fontSize: '11px', textTransform: 'uppercase' }}>
                Subscribed Plan
              </th>
              <th style={{ padding: '12px 18px', fontWeight: '700', color: 'var(--t-600)', fontSize: '11px', textTransform: 'uppercase' }}>
                Billing Cycle
              </th>
              <th style={{ padding: '12px 18px', fontWeight: '700', color: 'var(--t-600)', fontSize: '11px', textTransform: 'uppercase', textAlign: 'right' }}>
                Agreed Deal Price
              </th>
              <th style={{ padding: '12px 18px', fontWeight: '700', color: 'var(--t-600)', fontSize: '11px', textTransform: 'uppercase' }}>
                Validity & Status
              </th>
              <th style={{ padding: '12px 18px', fontWeight: '700', color: 'var(--t-600)', fontSize: '11px', textTransform: 'uppercase' }}>
                Payment
              </th>
              <th style={{ padding: '12px 18px', fontWeight: '700', color: 'var(--t-600)', fontSize: '11px', textTransform: 'uppercase', textAlign: 'right' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--t-500)' }}>
                  ⏳ Loading hotel subscriptions...
                </td>
              </tr>
            ) : filteredSubs.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: 'var(--t-500)' }}>
                  <Receipt size={36} color="var(--t-300)" style={{ margin: '0 auto 12px' }} />
                  <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--t-800)' }}>
                    No Hotel Subscriptions Found
                  </div>
                  <div style={{ fontSize: '12.5px', marginTop: '4px' }}>
                    Click "Assign Package to Hotel" to set up a subscription deal.
                  </div>
                </td>
              </tr>
            ) : (
              filteredSubs.map((sub) => {
                const isLifetime = !sub.expires_at;
                const expiresAt = sub.expires_at ? new Date(sub.expires_at) : null;
                const now = new Date();
                const daysRemaining = expiresAt
                  ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                  : null;
                const isExpired = expiresAt && daysRemaining <= 0;
                const isExpiringSoon = expiresAt && daysRemaining > 0 && daysRemaining <= 15;

                return (
                  <tr
                    key={sub.id}
                    style={{
                      borderBottom: '1px solid var(--border-sub)',
                      background: 'var(--surface)',
                    }}
                  >
                    {/* Hotel Property */}
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: '700', color: 'var(--t-900)' }}>
                        {sub.hotel?.name || 'Hotel'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--t-500)', marginTop: '2px' }}>
                        Code: <strong>{sub.hotel?.hotel_code}</strong> • {sub.hotel?.organization?.name || 'Org'}
                      </div>
                    </td>

                    {/* Subscribed Plan */}
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: '700', color: 'var(--t-900)' }}>{sub.plan_name}</span>
                        {sub.package?.badge_text && (
                          <span
                            style={{
                              background: 'var(--surface-sub)',
                              fontSize: '10px',
                              fontWeight: '700',
                              color: 'var(--t-600)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            {sub.package.badge_text}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--t-500)', marginTop: '2px' }}>
                        {sub.package?.included_modules?.length || 0} Modules Activated
                      </div>
                    </td>

                    {/* Billing Cycle */}
                    <td style={{ padding: '14px 18px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: '11px',
                          fontWeight: '800',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          textTransform: 'uppercase',
                          background:
                            sub.billing_cycle === 'YEARLY'
                              ? '#f5f3ff'
                              : sub.billing_cycle === 'ONETIME'
                              ? '#ecfdf5'
                              : '#eff6ff',
                          color:
                            sub.billing_cycle === 'YEARLY'
                              ? '#7c3aed'
                              : sub.billing_cycle === 'ONETIME'
                              ? '#059669'
                              : '#2563eb',
                          border: `1px solid ${
                            sub.billing_cycle === 'YEARLY'
                              ? '#ddd6fe'
                              : sub.billing_cycle === 'ONETIME'
                              ? '#a7f3d0'
                              : '#bfdbfe'
                          }`,
                        }}
                      >
                        {sub.billing_cycle}
                      </span>
                    </td>

                    {/* Agreed Deal Price */}
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <div style={{ fontWeight: '800', color: 'var(--t-900)', fontSize: '14px' }}>
                        ₹{parseFloat(sub.agreed_price).toLocaleString('en-IN')}
                      </div>
                      <div style={{ fontSize: '10.5px', color: 'var(--t-500)' }}>
                        {sub.billing_cycle === 'MONTHLY' ? '/ month' : sub.billing_cycle === 'YEARLY' ? '/ year' : 'lifetime buyout'}
                      </div>
                    </td>

                    {/* Validity & Status */}
                    <td style={{ padding: '14px 18px' }}>
                      {isLifetime ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#059669', fontWeight: '700', fontSize: '12px' }}>
                          <CheckCircle2 size={13} />
                          <span>Lifetime Perpetual</span>
                        </div>
                      ) : (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: isExpired ? '#ef4444' : isExpiringSoon ? '#f59e0b' : '#10b981',
                              }}
                            />
                            <span style={{ fontSize: '12px', fontWeight: '700', color: isExpired ? '#ef4444' : isExpiringSoon ? '#b45309' : 'var(--t-900)' }}>
                              {isExpired ? 'Expired' : isExpiringSoon ? `Expiring in ${daysRemaining}d` : `Active (${daysRemaining}d left)`}
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--t-500)', marginTop: '2px' }}>
                            Valid until: {expiresAt ? expiresAt.toLocaleDateString('en-IN') : 'N/A'}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Payment */}
                    <td style={{ padding: '14px 18px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: sub.payment_status === 'PAID' ? '#ecfdf5' : '#fffbeb',
                          color: sub.payment_status === 'PAID' ? '#15803d' : '#b45309',
                        }}
                      >
                        {sub.payment_status}
                      </span>
                      {sub.payment_reference && (
                        <div style={{ fontSize: '10px', color: 'var(--t-500)', marginTop: '2px', fontFamily: 'monospace' }}>
                          Ref: {sub.payment_reference}
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenExtend(sub)}
                          className="btn btn-secondary"
                          style={{
                            fontSize: '11.5px',
                            padding: '4px 10px',
                            fontWeight: '600',
                            borderRadius: '6px',
                          }}
                        >
                          Extend Validity
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenAssign(sub.hotel, sub.package)}
                          className="btn btn-secondary"
                          style={{
                            fontSize: '11.5px',
                            padding: '4px 10px',
                            fontWeight: '600',
                            borderRadius: '6px',
                          }}
                        >
                          Change Plan
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ================= MODAL: ASSIGN PACKAGE TO HOTEL ================= */}
      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '620px', padding: '28px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'var(--brand-50, #eef2ff)',
                  color: 'var(--brand, #4f46e5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Building2 size={20} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--t-900)' }}>
                Assign Subscription Package to Hotel Property
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--t-500)', marginBottom: '20px' }}>
              Sales team action: Activating this contract will immediately turn on all included modules for the hotel property.
            </p>

            {error && (
              <div
                style={{
                  background: 'var(--error-bg)',
                  border: '1px solid var(--error-border)',
                  color: 'var(--error)',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  marginBottom: '16px',
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleAssignSubmit}>
              {/* Hotel Selector */}
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontWeight: '700', fontSize: '12px' }}>
                  Target Hotel Property *
                </label>
                <select
                  required
                  className="form-select"
                  value={assignForm.hotel_id}
                  onChange={(e) => setAssignForm({ ...assignForm, hotel_id: e.target.value })}
                >
                  <option value="">-- Select Hotel Property --</option>
                  {hotels.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.hotel_code}) • {h.city || 'Property'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Package Selector */}
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontWeight: '700', fontSize: '12px' }}>
                  Select SaaS Package / Plan *
                </label>
                <select
                  required
                  className="form-select"
                  value={assignForm.package_id}
                  onChange={(e) => handlePackageChangeInAssign(e.target.value)}
                >
                  <option value="">-- Select Package --</option>
                  {packages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Monthly: ₹{parseFloat(p.monthly_price).toLocaleString('en-IN')} • Yearly: ₹{parseFloat(p.yearly_price).toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>

              {/* Billing Cycle Selector Pills */}
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontWeight: '700', fontSize: '12px', display: 'block', marginBottom: '8px' }}>
                  Billing Cycle / Period *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {[
                    { id: 'YEARLY', label: '📅 Yearly', sub: '+365 Days' },
                    { id: 'MONTHLY', label: '🗓️ Monthly', sub: '+30 Days' },
                    { id: 'ONETIME', label: '♾️ Lifetime', sub: 'Perpetual' },
                    { id: 'TRIAL', label: '⏳ 14d Trial', sub: 'Free Access' },
                  ].map((cycle) => (
                    <div
                      key={cycle.id}
                      onClick={() => handleCycleChangeInAssign(cycle.id)}
                      style={{
                        padding: '10px 8px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        textAlign: 'center',
                        border: assignForm.billing_cycle === cycle.id ? '2px solid var(--brand)' : '1px solid var(--border)',
                        background: assignForm.billing_cycle === cycle.id ? 'var(--brand-50, #eef2ff)' : 'var(--surface)',
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--t-900)' }}>{cycle.label}</div>
                      <div style={{ fontSize: '10px', color: 'var(--t-500)' }}>{cycle.sub}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Agreed Price & Payment Status */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: '700', fontSize: '12px' }}>
                    Agreed Deal Price (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    className="form-control"
                    placeholder="e.g. 39990"
                    value={assignForm.agreed_price}
                    onChange={(e) => setAssignForm({ ...assignForm, agreed_price: e.target.value })}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--t-500)', marginTop: '2px', display: 'block' }}>
                    Sales flexibility: Modify to offer client custom discount.
                  </span>
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: '700', fontSize: '12px' }}>
                    Payment Status *
                  </label>
                  <select
                    className="form-select"
                    value={assignForm.payment_status}
                    onChange={(e) => setAssignForm({ ...assignForm, payment_status: e.target.value })}
                  >
                    <option value="PAID">✅ Paid (Payment Received)</option>
                    <option value="PENDING">⏳ Pending Invoice</option>
                    <option value="PARTIAL">🌓 Partial Payment</option>
                    <option value="WAIVED">🎁 Waived / Complimentary</option>
                  </select>
                </div>
              </div>

              {/* Payment Mode & Reference */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: '600', fontSize: '12px' }}>
                    Payment Method
                  </label>
                  <select
                    className="form-select"
                    value={assignForm.payment_method}
                    onChange={(e) => setAssignForm({ ...assignForm, payment_method: e.target.value })}
                  >
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT / IMPS</option>
                    <option value="UPI_QR">UPI / QR Code</option>
                    <option value="CHEQUE">Bank Cheque</option>
                    <option value="CASH">Cash Deposit</option>
                    <option value="CREDIT_CARD">Credit / Debit Card</option>
                    <option value="COMPLIMENTARY">Complimentary / Demo</option>
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: '600', fontSize: '12px' }}>
                    Payment Ref / UTR / Cheque No
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. UTR-9821873812"
                    value={assignForm.payment_reference}
                    onChange={(e) => setAssignForm({ ...assignForm, payment_reference: e.target.value })}
                  />
                </div>
              </div>

              {/* Sales Deal Notes */}
              <div style={{ marginBottom: '22px' }}>
                <label className="form-label" style={{ fontWeight: '600', fontSize: '12px' }}>
                  Sales Deal & Handover Notes
                </label>
                <textarea
                  rows={2}
                  className="form-control"
                  placeholder="e.g. Approved 10% annual prepay discount by Sales Head. Client onboarded for 1 year."
                  value={assignForm.sales_notes}
                  onChange={(e) => setAssignForm({ ...assignForm, sales_notes: e.target.value })}
                />
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="btn btn-secondary"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-brand"
                  disabled={saving}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700' }}
                >
                  <ShieldCheck size={16} />
                  {saving ? 'Assigning...' : 'Assign & Activate Modules'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EXTEND VALIDITY ================= */}
      {showExtendModal && selectedSubForExtend && (
        <div className="modal-overlay" onClick={() => setShowExtendModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '500px', padding: '28px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: '#ecfdf5',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Calendar size={20} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--t-900)' }}>
                Extend Contract Validity
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--t-500)', marginBottom: '18px' }}>
              Property: <strong>{selectedSubForExtend.hotel?.name} ({selectedSubForExtend.hotel?.hotel_code})</strong>
            </p>

            <form onSubmit={handleExtendSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontWeight: '700', fontSize: '12px', display: 'block', marginBottom: '8px' }}>
                  Quick Extension Period
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {[
                    { months: 1, label: '+1 Month' },
                    { months: 3, label: '+3 Months' },
                    { months: 12, label: '+1 Year' },
                  ].map((opt) => (
                    <button
                      key={opt.months}
                      type="button"
                      onClick={() => setExtendForm({ ...extendForm, months_to_add: opt.months, new_expires_at: '' })}
                      style={{
                        padding: '10px 8px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '700',
                        fontSize: '12px',
                        border: extendForm.months_to_add === opt.months && !extendForm.new_expires_at ? '2px solid var(--brand)' : '1px solid var(--border)',
                        background: extendForm.months_to_add === opt.months && !extendForm.new_expires_at ? 'var(--brand-50, #eef2ff)' : 'var(--surface)',
                        color: 'var(--t-900)',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontWeight: '600', fontSize: '12px' }}>
                  Or Pick Custom Expiry Date
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={extendForm.new_expires_at}
                  onChange={(e) => setExtendForm({ ...extendForm, new_expires_at: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontWeight: '600', fontSize: '12px' }}>
                  Payment Reference / Renewal Receipt
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. RENEWAL-TXN-2027"
                  value={extendForm.payment_reference}
                  onChange={(e) => setExtendForm({ ...extendForm, payment_reference: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: '22px' }}>
                <label className="form-label" style={{ fontWeight: '600', fontSize: '12px' }}>
                  Renewal Notes
                </label>
                <textarea
                  rows={2}
                  className="form-control"
                  placeholder="e.g. Payment verified via bank statement."
                  value={extendForm.sales_notes}
                  onChange={(e) => setExtendForm({ ...extendForm, sales_notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowExtendModal(false)}
                  className="btn btn-secondary"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-brand"
                  disabled={saving}
                  style={{ fontWeight: '700' }}
                >
                  {saving ? 'Extending...' : 'Confirm Extension'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
