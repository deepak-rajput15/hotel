import React, { useState } from 'react';
import {
  Package,
  Plus,
  Check,
  Edit2,
  Trash2,
  Sparkles,
  Layers,
  Building2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Users,
  Bed,
  Utensils,
  ChefHat,
  Boxes,
  ShoppingCart,
  Calendar,
  IndianRupee,
} from 'lucide-react';
import { adminApi } from '../../api';

const MODULE_DEFINITIONS = [
  { code: 'front_office', name: 'Front Office PMS', icon: Layers, desc: 'Guest check-in, room allocations, walk-ins, folios & night audit' },
  { code: 'rooms', name: 'Housekeeping & Rooms', icon: Bed, desc: 'Housekeeping turnover statuses, room rack, floor plans' },
  { code: 'restaurant', name: 'Restaurant & POS', icon: Utensils, desc: 'Table management, dine-in/takeaway billing, room folio charges' },
  { code: 'kitchen', name: 'Kitchen KDS', icon: ChefHat, desc: 'Live kitchen order tickets queue & chef preparation station' },
  { code: 'store', name: 'Store & Inventory', icon: Boxes, desc: 'Stock inventory tracking, low stock alerts & material issues' },
  { code: 'purchase', name: 'Purchase & Vendors', icon: ShoppingCart, desc: 'Purchase orders, vendor quotes & Goods Receipt Notes (GRN)' },
];

export default function PackagesTab({ packages, modules, onReload, onOpenAssignModal }) {
  const [showModal, setShowModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [featureInput, setFeatureInput] = useState('');

  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    monthly_price: '',
    yearly_price: '',
    onetime_price: '',
    setup_fee: '0',
    currency: 'INR',
    billing_cycle: 'ALL',
    max_rooms: '',
    max_staff_accounts: '',
    max_pos_terminals: '',
    included_modules: ['front_office', 'rooms'],
    features_list: [],
    is_featured: false,
    badge_text: '',
    is_active: true,
  });

  const handleOpenCreate = () => {
    setEditingPackage(null);
    setForm({
      name: '',
      slug: '',
      description: '',
      monthly_price: '',
      yearly_price: '',
      onetime_price: '',
      setup_fee: '0',
      currency: 'INR',
      billing_cycle: 'ALL',
      max_rooms: '',
      max_staff_accounts: '',
      max_pos_terminals: '',
      included_modules: ['front_office', 'rooms'],
      features_list: [
        'Guest Check-In, Check-Out & Reservation Calendar',
        'Instant Room Rack & Housekeeping Status',
        'Guest Folios, Tax Invoices & Shift Register',
      ],
      is_featured: false,
      badge_text: '',
      is_active: true,
    });
    setError('');
    setShowModal(true);
  };

  const handleOpenEdit = (pkg) => {
    setEditingPackage(pkg);
    setForm({
      name: pkg.name || '',
      slug: pkg.slug || '',
      description: pkg.description || '',
      monthly_price: pkg.monthly_price ? pkg.monthly_price.toString() : '',
      yearly_price: pkg.yearly_price ? pkg.yearly_price.toString() : '',
      onetime_price: pkg.onetime_price ? pkg.onetime_price.toString() : '',
      setup_fee: pkg.setup_fee ? pkg.setup_fee.toString() : '0',
      currency: pkg.currency || 'INR',
      billing_cycle: pkg.billing_cycle || 'ALL',
      max_rooms: pkg.max_rooms ? pkg.max_rooms.toString() : '',
      max_staff_accounts: pkg.max_staff_accounts ? pkg.max_staff_accounts.toString() : '',
      max_pos_terminals: pkg.max_pos_terminals ? pkg.max_pos_terminals.toString() : '',
      included_modules: Array.isArray(pkg.included_modules) ? pkg.included_modules : [],
      features_list: Array.isArray(pkg.features_list) ? pkg.features_list : [],
      is_featured: !!pkg.is_featured,
      badge_text: pkg.badge_text || '',
      is_active: pkg.is_active !== false,
    });
    setError('');
    setShowModal(true);
  };

  const handleToggleModule = (code) => {
    setForm((prev) => {
      const exists = prev.included_modules.includes(code);
      return {
        ...prev,
        included_modules: exists
          ? prev.included_modules.filter((c) => c !== code)
          : [...prev.included_modules, code],
      };
    });
  };

  const handleAddFeature = (e) => {
    e.preventDefault();
    if (!featureInput.trim()) return;
    setForm((prev) => ({
      ...prev,
      features_list: [...prev.features_list, featureInput.trim()],
    }));
    setFeatureInput('');
  };

  const handleRemoveFeature = (idx) => {
    setForm((prev) => ({
      ...prev,
      features_list: prev.features_list.filter((_, i) => i !== idx),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.included_modules.length === 0) {
      setError('Please select at least 1 module to include in this package.');
      return;
    }

    setSaving(true);
    setError('');

    const payload = {
      ...form,
      monthly_price: parseFloat(form.monthly_price) || 0,
      yearly_price: parseFloat(form.yearly_price) || 0,
      onetime_price: form.onetime_price ? parseFloat(form.onetime_price) : null,
      setup_fee: parseFloat(form.setup_fee) || 0,
      max_rooms: form.max_rooms ? parseInt(form.max_rooms, 10) : null,
      max_staff_accounts: form.max_staff_accounts ? parseInt(form.max_staff_accounts, 10) : null,
      max_pos_terminals: form.max_pos_terminals ? parseInt(form.max_pos_terminals, 10) : null,
    };

    try {
      if (editingPackage) {
        const res = await adminApi.updatePackage(editingPackage.id, payload);
        if (res.success) {
          setShowModal(false);
          if (onReload) onReload();
        }
      } else {
        const res = await adminApi.createPackage(payload);
        if (res.success) {
          setShowModal(false);
          if (onReload) onReload();
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to save package');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (pkg) => {
    if (!window.confirm(`Are you sure you want to deactivate package "${pkg.name}"?`)) return;
    try {
      await adminApi.deletePackage(pkg.id);
      if (onReload) onReload();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '28px',
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
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <Package size={18} />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--t-900)' }}>
              SaaS Packages & Pricing Management
            </h2>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--t-500)', marginTop: '4px' }}>
            Design subscription tiers with Monthly, Yearly, and One-Time buyout pricing. Define module inclusions and quotas for sales team.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
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
          Create New Package
        </button>
      </div>

      {/* Pricing Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '24px',
          alignItems: 'stretch',
          marginBottom: '36px',
        }}
      >
        {packages.map((pkg) => {
          const monthly = parseFloat(pkg.monthly_price) || 0;
          const yearly = parseFloat(pkg.yearly_price) || 0;
          const onetime = parseFloat(pkg.onetime_price) || 0;
          const annualDiscount = monthly > 0 && yearly > 0
            ? Math.round(((monthly * 12 - yearly) / (monthly * 12)) * 100)
            : 0;

          return (
            <div
              key={pkg.id}
              className="card"
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '24px',
                border: pkg.is_featured ? '2px solid var(--brand)' : '1px solid var(--border)',
                background: 'var(--surface)',
                boxShadow: pkg.is_featured ? '0 12px 30px -10px rgba(99, 102, 241, 0.25)' : 'var(--shadow-sm)',
                borderRadius: '16px',
              }}
            >
              {/* Badge */}
              {pkg.badge_text && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-12px',
                    right: '24px',
                    background: pkg.is_featured
                      ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
                      : 'var(--surface-sub)',
                    color: pkg.is_featured ? '#ffffff' : 'var(--t-700)',
                    border: pkg.is_featured ? 'none' : '1px solid var(--border)',
                    fontSize: '11px',
                    fontWeight: '800',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                  }}
                >
                  {pkg.badge_text}
                </div>
              )}

              <div>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--t-900)', margin: '0 0 4px 0' }}>
                      {pkg.name}
                    </h3>
                    <div style={{ fontSize: '11.5px', color: 'var(--t-500)', fontFamily: 'monospace' }}>
                      slug: {pkg.slug}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(pkg)}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--border)',
                        color: 'var(--t-600)',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                      title="Edit Package"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(pkg)}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--border)',
                        color: 'var(--error)',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                      title="Deactivate Package"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <p style={{ fontSize: '12.5px', color: 'var(--t-600)', lineHeight: '1.5', minHeight: '38px', marginBottom: '20px' }}>
                  {pkg.description || 'No description provided.'}
                </p>

                {/* Pricing Tiers Box */}
                <div
                  style={{
                    background: 'var(--surface-sub)',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    marginBottom: '20px',
                    border: '1px solid var(--border-sub)',
                  }}
                >
                  {/* Monthly Price */}
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--t-500)', fontWeight: '600' }}>Monthly Cycle:</span>
                    <div>
                      <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--t-900)' }}>
                        ₹{monthly.toLocaleString('en-IN')}
                      </span>
                      <span style={{ fontSize: '11.5px', color: 'var(--t-500)', marginLeft: '2px' }}>/mo</span>
                    </div>
                  </div>

                  {/* Yearly Price */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--t-500)', fontWeight: '600' }}>Yearly Billing:</span>
                      {annualDiscount > 0 && (
                        <span
                          style={{
                            background: '#dcfce7',
                            color: '#15803d',
                            fontSize: '10px',
                            fontWeight: '700',
                            padding: '2px 6px',
                            borderRadius: '4px',
                          }}
                        >
                          Save {annualDiscount}%
                        </span>
                      )}
                    </div>
                    <div>
                      <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--t-900)' }}>
                        ₹{yearly.toLocaleString('en-IN')}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--t-500)', marginLeft: '2px' }}>/yr</span>
                    </div>
                  </div>

                  {/* One-time Price */}
                  {onetime > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px dashed var(--border)' }}>
                      <span style={{ fontSize: '12px', color: 'var(--t-500)', fontWeight: '600' }}>One-Time Buyout:</span>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: '#0d9488' }}>
                        ₹{onetime.toLocaleString('en-IN')} (Lifetime)
                      </span>
                    </div>
                  )}
                </div>

                {/* Quotas & Capacity Limits */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '18px', flexWrap: 'wrap' }}>
                  <div style={{ background: 'var(--surface-sub)', padding: '6px 10px', borderRadius: '6px', fontSize: '11.5px', color: 'var(--t-700)', fontWeight: '600' }}>
                    🛏️ Rooms: <strong>{pkg.max_rooms ? `${pkg.max_rooms} Rooms` : 'Unlimited'}</strong>
                  </div>
                  <div style={{ background: 'var(--surface-sub)', padding: '6px 10px', borderRadius: '6px', fontSize: '11.5px', color: 'var(--t-700)', fontWeight: '600' }}>
                    👥 Staff: <strong>{pkg.max_staff_accounts ? `${pkg.max_staff_accounts} Logins` : 'Unlimited'}</strong>
                  </div>
                  {pkg.max_pos_terminals !== null && (
                    <div style={{ background: 'var(--surface-sub)', padding: '6px 10px', borderRadius: '6px', fontSize: '11.5px', color: 'var(--t-700)', fontWeight: '600' }}>
                      🖥️ POS: <strong>{pkg.max_pos_terminals > 0 ? `${pkg.max_pos_terminals} Terminals` : 'None'}</strong>
                    </div>
                  )}
                </div>

                {/* Included Modules Badges */}
                <div style={{ marginBottom: '18px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--t-500)', marginBottom: '8px' }}>
                    Included Modules ({pkg.included_modules?.length || 0}):
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {MODULE_DEFINITIONS.map((m) => {
                      const isIncluded = (pkg.included_modules || []).includes(m.code);
                      const Icon = m.icon;
                      return (
                        <div
                          key={m.code}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: isIncluded ? '700' : '500',
                            background: isIncluded ? 'var(--brand-50, #eef2ff)' : 'var(--surface-sub)',
                            color: isIncluded ? 'var(--brand, #4f46e5)' : 'var(--t-400)',
                            border: `1px solid ${isIncluded ? 'rgba(99, 102, 241, 0.3)' : 'var(--border-sub)'}`,
                            opacity: isIncluded ? 1 : 0.45,
                          }}
                        >
                          <Icon size={12} />
                          <span>{m.name}</span>
                          {isIncluded && <Check size={11} strokeWidth={3} />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Features Checklist */}
                {Array.isArray(pkg.features_list) && pkg.features_list.length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--t-500)', marginBottom: '8px' }}>
                      Key Capabilities:
                    </div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {pkg.features_list.map((f, i) => (
                        <li
                          key={i}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '8px',
                            fontSize: '12px',
                            color: 'var(--t-700)',
                            marginBottom: '6px',
                            lineHeight: '1.4',
                          }}
                        >
                          <CheckCircle2 size={13} color="var(--success, #16a34a)" style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Bottom Card Footer */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--t-500)' }}>
                    Active Properties:
                  </span>
                  <span
                    style={{
                      background: 'var(--surface-sub)',
                      color: 'var(--t-800)',
                      fontSize: '12px',
                      fontWeight: '800',
                      padding: '2px 8px',
                      borderRadius: '12px',
                    }}
                  >
                    {pkg.active_hotels_count || 0} Hotels Subscribed
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenAssignModal && onOpenAssignModal(pkg)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: pkg.is_featured
                      ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
                      : 'var(--surface-sub)',
                    color: pkg.is_featured ? '#ffffff' : 'var(--t-800)',
                    fontSize: '12.5px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    border: pkg.is_featured ? 'none' : '1px solid var(--border)',
                  }}
                >
                  <Building2 size={14} />
                  Assign / Subscribe Hotel
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE / EDIT PACKAGE MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto', padding: '28px' }}
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
                <Package size={20} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--t-900)' }}>
                {editingPackage ? 'Edit SaaS Package' : 'Create New Subscription Package'}
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--t-500)', marginBottom: '20px' }}>
              Define pricing terms, billing cycles, included modules, and operational quotas for hotel owners.
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

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: '600', fontSize: '12px' }}>Package Name *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="e.g. Hotel & Restaurant Dining POS"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: '600', fontSize: '12px' }}>Badge (Optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Most Popular"
                    value={form.badge_text}
                    onChange={(e) => setForm({ ...form, badge_text: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontWeight: '600', fontSize: '12px' }}>Description / Sales Pitch</label>
                <textarea
                  rows={2}
                  className="form-control"
                  placeholder="Target audience and brief summary of what this package solves for hotel owners."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              {/* Pricing Grid */}
              <div
                style={{
                  background: 'var(--surface-sub)',
                  borderRadius: '10px',
                  padding: '16px',
                  marginBottom: '18px',
                  border: '1px solid var(--border-sub)',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--t-700)', marginBottom: '10px', textTransform: 'uppercase' }}>
                  Billing Cycles & Pricing (INR ₹)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '11.5px', fontWeight: '600' }}>Monthly Price (₹) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="1"
                      className="form-control"
                      placeholder="e.g. 4499"
                      value={form.monthly_price}
                      onChange={(e) => setForm({ ...form, monthly_price: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '11.5px', fontWeight: '600' }}>Yearly Price (₹) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="1"
                      className="form-control"
                      placeholder="e.g. 44990"
                      value={form.yearly_price}
                      onChange={(e) => setForm({ ...form, yearly_price: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '11.5px', fontWeight: '600' }}>One-Time Buyout (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="form-control"
                      placeholder="e.g. 99990 (Optional)"
                      value={form.onetime_price}
                      onChange={(e) => setForm({ ...form, onetime_price: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Quotas */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '18px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '11.5px', fontWeight: '600' }}>Max Rooms (Blank = Unlimited)</label>
                  <input
                    type="number"
                    min="1"
                    className="form-control"
                    placeholder="e.g. 50"
                    value={form.max_rooms}
                    onChange={(e) => setForm({ ...form, max_rooms: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '11.5px', fontWeight: '600' }}>Max Staff (Blank = Unlimited)</label>
                  <input
                    type="number"
                    min="1"
                    className="form-control"
                    placeholder="e.g. 15"
                    value={form.max_staff_accounts}
                    onChange={(e) => setForm({ ...form, max_staff_accounts: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '11.5px', fontWeight: '600' }}>Max POS Terminals</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    placeholder="e.g. 2"
                    value={form.max_pos_terminals}
                    onChange={(e) => setForm({ ...form, max_pos_terminals: e.target.value })}
                  />
                </div>
              </div>

              {/* Included Modules Checkbox Grid */}
              <div style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ fontWeight: '700', fontSize: '12px', marginBottom: '8px', display: 'block' }}>
                  Select Included Modules for this Package *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  {MODULE_DEFINITIONS.map((m) => {
                    const isChecked = form.included_modules.includes(m.code);
                    const Icon = m.icon;
                    return (
                      <div
                        key={m.code}
                        onClick={() => handleToggleModule(m.code)}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          border: isChecked ? '2px solid var(--brand)' : '1px solid var(--border)',
                          background: isChecked ? 'var(--brand-50, #eef2ff)' : 'var(--surface)',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // handled by parent onClick
                          style={{ marginTop: '3px', cursor: 'pointer' }}
                        />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Icon size={14} color={isChecked ? 'var(--brand)' : 'var(--t-500)'} />
                            <span style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--t-900)' }}>
                              {m.name}
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--t-500)', marginTop: '2px', lineHeight: '1.3' }}>
                            {m.desc}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Features List Checklist Builder */}
              <div style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ fontWeight: '600', fontSize: '12px' }}>
                  Marketing Bullet Points & Capabilities (Optional)
                </label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Free Room QR Code Menu setup"
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddFeature(e);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="btn btn-secondary"
                    style={{ whiteSpace: 'nowrap', fontSize: '12px', fontWeight: '600' }}
                  >
                    Add Point
                  </button>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {form.features_list.map((f, i) => (
                    <div
                      key={i}
                      style={{
                        background: 'var(--surface-sub)',
                        padding: '4px 10px',
                        borderRadius: '16px',
                        fontSize: '11.5px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <span>✓ {f}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFeature(i)}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--error)', fontSize: '14px', lineHeight: 1 }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    checked={form.is_featured}
                    onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                  />
                  <strong>Feature this package</strong> (Highlight with border & glow)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  />
                  <strong>Active for Sales</strong>
                </label>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
                  {saving ? 'Saving...' : editingPackage ? 'Update Package' : 'Create Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
