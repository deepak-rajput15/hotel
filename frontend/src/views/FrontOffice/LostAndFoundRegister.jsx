import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { frontOfficeApi } from '../../api';
import {
  Search,
  Plus,
  Filter,
  Tag,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Printer,
  Trash2,
  Edit3,
  X,
  User,
  Phone,
  MapPin,
  Calendar,
  Archive,
  RefreshCw,
  Box,
  FileText,
  BadgeAlert,
  Smartphone,
  Watch,
  FileCheck,
  Shirt,
  Luggage,
  HelpCircle,
} from 'lucide-react';

const CATEGORIES = [
  { id: 'ALL', label: 'All Categories' },
  { id: 'ELECTRONICS', label: '📱 Electronics & Gadgets' },
  { id: 'VALUABLES', label: '💍 Valuables & Jewelry' },
  { id: 'DOCUMENTS', label: '📄 Documents & Wallets' },
  { id: 'CLOTHING', label: '👕 Clothing & Apparel' },
  { id: 'BAGGAGE', label: '🧳 Bags & Luggage' },
  { id: 'OTHERS', label: '📦 Other Miscellaneous' },
];

const LOCATION_TYPES = [
  { id: 'ROOM', label: '🏨 Guest Room' },
  { id: 'RESTAURANT', label: '🍽️ Restaurant / Dining' },
  { id: 'LOBBY', label: '🛋️ Reception / Lobby' },
  { id: 'POOL_GARDEN', label: '🏊 Garden / Poolside' },
  { id: 'BANQUET', label: '🎉 Banquet / Event Hall' },
  { id: 'OTHER', label: '📍 Other Hotel Area' },
];

export default function LostAndFoundRegister({ rooms = [] }) {
  const { currentHotel, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({
    total_items: 0,
    in_custody: 0,
    claimed: 0,
    disposed: 0,
  });

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showLogModal, setShowLogModal] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(null); // item object
  const [showDisposeModal, setShowDisposeModal] = useState(null); // item object
  const [printItemTag, setPrintItemTag] = useState(null); // item object
  const [saving, setSaving] = useState(false);

  // Form State: Log New Item
  const [logForm, setLogForm] = useState({
    item_name: '',
    category: 'ELECTRONICS',
    found_location_type: 'ROOM',
    room_id: '',
    specific_location: '',
    found_at: new Date().toISOString().slice(0, 16),
    found_by_name: '',
    storage_location: 'Front Desk Safe Locker #01',
    description: '',
    estimated_value: '',
    guest_name: '',
    guest_phone: '',
    guest_email: '',
  });

  // Form State: Claim Handover
  const [claimForm, setClaimForm] = useState({
    claimed_by_name: '',
    claimed_by_phone: '',
    claimed_by_id_proof: '',
    handover_by_staff_name: '',
    handover_notes: '',
  });

  // Form State: Dispose
  const [disposeForm, setDisposeForm] = useState({
    disposal_reason: 'Unclaimed item retained past 90 days policy',
    handover_by_staff_name: '',
    handover_notes: '',
  });

  // Fetch Items from Backend API
  const fetchItems = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (categoryFilter !== 'ALL') params.category = categoryFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await frontOfficeApi.getLostAndFoundItems(params);
      if (res.success) {
        setItems(res.items.data || res.items || []);
        if (res.summary) setSummary(res.summary);
      }
    } catch (err) {
      console.error('Failed to load lost and found items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [statusFilter, categoryFilter, currentHotel?.id]);

  // Handle Search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchItems();
  };

  // Log Form Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        ...logForm,
        found_by_name: logForm.found_by_name.trim() || user?.name || 'Front Desk Staff',
        room_id: logForm.found_location_type === 'ROOM' && logForm.room_id ? logForm.room_id : null,
        estimated_value: logForm.estimated_value ? Number(logForm.estimated_value) : null,
      };

      const res = await frontOfficeApi.createLostAndFoundItem(payload);
      alert(res.message || 'Lost item logged successfully!');
      setShowLogModal(false);
      resetLogForm();
      fetchItems();
    } catch (err) {
      alert('Failed to log item: ' + (err.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  // Claim Submit
  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    if (!showClaimModal) return;
    try {
      setSaving(true);
      const payload = {
        ...claimForm,
        handover_by_staff_name: claimForm.handover_by_staff_name.trim() || user?.name || 'Duty Manager',
      };

      const res = await frontOfficeApi.claimLostAndFoundItem(showClaimModal.id, payload);
      alert(res.message || 'Item successfully marked as Claimed & Handed over!');
      setShowClaimModal(null);
      fetchItems();
    } catch (err) {
      alert('Failed to claim item: ' + (err.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  // Dispose Submit
  const handleDisposeSubmit = async (e) => {
    e.preventDefault();
    if (!showDisposeModal) return;
    try {
      setSaving(true);
      const res = await frontOfficeApi.disposeLostAndFoundItem(showDisposeModal.id, disposeForm);
      alert(res.message || 'Item marked as Disposed.');
      setShowDisposeModal(null);
      fetchItems();
    } catch (err) {
      alert('Failed to dispose item: ' + (err.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  // Delete Item
  const handleDelete = async (id, refNo) => {
    if (!window.confirm(`Are you sure you want to remove item #${refNo} from the register?`)) return;
    try {
      await frontOfficeApi.deleteLostAndFoundItem(id);
      fetchItems();
    } catch (err) {
      alert('Delete failed: ' + (err.data?.message || err.message));
    }
  };

  const resetLogForm = () => {
    setLogForm({
      item_name: '',
      category: 'ELECTRONICS',
      found_location_type: 'ROOM',
      room_id: '',
      specific_location: '',
      found_at: new Date().toISOString().slice(0, 16),
      found_by_name: user?.name || '',
      storage_location: 'Front Desk Safe Locker #01',
      description: '',
      estimated_value: '',
      guest_name: '',
      guest_phone: '',
      guest_email: '',
    });
  };

  // Dedicated Thermal / Baggage Tag Print Handler
  const handlePrintDocket = (item) => {
    if (!item) return;
    const printWindow = window.open('', '_blank', 'width=420,height=600');
    if (!printWindow) {
      window.print();
      return;
    }

    const foundDate = new Date(item.found_at).toLocaleString('en-IN');
    const locationStr = item.room?.room_number
      ? `Room ${item.room.room_number} (${item.specific_location || 'Inside Room'})`
      : `${item.found_location_type} ${item.specific_location ? `• ${item.specific_location}` : ''}`;

    const tagHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Lost Item Tag #${item.reference_no}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
            width: 78mm;
            margin: 0 auto;
            padding: 8mm 4mm;
            color: #111;
            font-size: 12px;
            line-height: 1.4;
            background: #fff;
          }
          .center { text-align: center; }
          .bold { font-weight: 700; }
          .divider { border-top: 1px dashed #777; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; margin: 3px 0; font-size: 11.5px; }
          .badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 700;
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
          }
          @media print {
            body { width: 100%; margin: 0; padding: 4mm; }
          }
        </style>
      </head>
      <body>
        <div class="center bold" style="font-size: 15px; text-transform: uppercase;">${currentHotel?.name || 'GrandStay Hotel'}</div>
        <div class="center" style="font-size: 11px; color: #555;">HOTEL LOST & FOUND CUSTODY TAG</div>
        
        <div class="divider"></div>
        
        <div class="center">
          <div style="font-size: 16px; font-weight: 800; letter-spacing: 1px;">${item.reference_no}</div>
          <div style="font-size: 10px; color: #666; margin-top: 2px;">Attach this slip to item storage bag</div>
        </div>

        <div class="divider"></div>

        <div class="row"><span><strong>Item:</strong></span><span>${item.item_name}</span></div>
        <div class="row"><span><strong>Category:</strong></span><span>${item.category}</span></div>
        <div class="row"><span><strong>Found At:</strong></span><span>${foundDate}</span></div>
        <div class="row"><span><strong>Location:</strong></span><span>${locationStr}</span></div>
        <div class="row"><span><strong>Found By:</strong></span><span>${item.found_by_name}</span></div>
        <div class="row"><span><strong>Locker Safe:</strong></span><span>${item.storage_location}</span></div>
        ${item.estimated_value ? `<div class="row"><span><strong>Est. Value:</strong></span><span>₹${Number(item.estimated_value).toLocaleString('en-IN')}</span></div>` : ''}

        ${item.guest_name ? `
          <div class="divider"></div>
          <div class="row"><span><strong>Suspected Guest:</strong></span><span>${item.guest_name}</span></div>
          ${item.guest_phone ? `<div class="row"><span><strong>Guest Phone:</strong></span><span>${item.guest_phone}</span></div>` : ''}
        ` : ''}

        ${item.description ? `
          <div class="divider"></div>
          <div style="font-size: 11px;"><strong>Description / Marks:</strong> ${item.description}</div>
        ` : ''}

        ${item.status === 'CLAIMED' ? `
          <div class="divider"></div>
          <div class="center bold" style="color: green; font-size: 13px;">[ HANDOVER COMPLETED ]</div>
          <div class="row"><span>Claimed By:</span><span>${item.claimed_by_name}</span></div>
          <div class="row"><span>Phone:</span><span>${item.claimed_by_phone}</span></div>
          <div class="row"><span>ID Proof:</span><span>${item.claimed_by_id_proof || 'Verified'}</span></div>
          <div class="row"><span>Handed By:</span><span>${item.handover_by_staff_name}</span></div>
          <div class="row"><span>Date:</span><span>${new Date(item.claimed_at).toLocaleString('en-IN')}</span></div>
        ` : ''}

        <div class="divider"></div>
        <div class="center" style="font-size: 10px; color: #666; margin-top: 6px;">
          Retain in hotel safe locker until claimed.<br/>Standard retention: 90 Days.
        </div>

        <script>
          window.onload = function() {
            window.focus();
            window.print();
            setTimeout(function() { window.close(); }, 750);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(tagHtml);
    printWindow.document.close();
  };

  const getCategoryBadge = (cat) => {
    switch (cat) {
      case 'ELECTRONICS':
        return { label: 'Electronics', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' };
      case 'VALUABLES':
        return { label: 'Valuables', color: '#b45309', bg: '#fef3c7', border: '#fde68a' };
      case 'DOCUMENTS':
        return { label: 'Documents / ID', color: '#0d9488', bg: '#f0fdfa', border: '#99f6e4' };
      case 'CLOTHING':
        return { label: 'Clothing', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' };
      case 'BAGGAGE':
        return { label: 'Luggage / Bag', color: '#4338ca', bg: '#e0e7ff', border: '#c7d2fe' };
      default:
        return { label: 'General', color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' };
    }
  };

  return (
    <div>
      {/* 1. Header & Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid var(--brand)' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--t-500)' }}>
            Total Recorded Items
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--t-900)', marginTop: '2px' }}>
            {summary.total_items}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--t-500)', marginTop: '2px' }}>
            All-time found belongings
          </div>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#b45309' }}>
            In Safe Custody
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#b45309', marginTop: '2px' }}>
            {summary.in_custody}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--t-500)', marginTop: '2px' }}>
            Awaiting guest claim in safe
          </div>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid var(--success)' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--success)' }}>
            Claimed & Handed Over
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--success)', marginTop: '2px' }}>
            {summary.claimed}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--t-500)', marginTop: '2px' }}>
            Returned to verified guests
          </div>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #64748b' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b' }}>
            Disposed / Donated
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#64748b', marginTop: '2px' }}>
            {summary.disposed}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--t-500)', marginTop: '2px' }}>
            Perishable or post-90 days policy
          </div>
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: '1 1 300px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--t-500)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search by Item name, Ref #, Room, Guest or Staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '34px', fontSize: '12.5px', height: '36px' }}
            />
          </div>
          <button type="submit" className="btn btn-secondary" style={{ padding: '0 14px', height: '36px', fontSize: '12.5px' }}>
            Search
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Status Tabs */}
          <div style={{ display: 'flex', background: 'var(--surface-sub)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            {[
              { id: 'ALL', label: 'All Status' },
              { id: 'IN_CUSTODY', label: '🔒 In Custody' },
              { id: 'CLAIMED', label: '✓ Claimed' },
              { id: 'DISPOSED', label: '🗑️ Disposed' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id)}
                style={{
                  padding: '5px 10px',
                  fontSize: '11.5px',
                  fontWeight: statusFilter === st.id ? '700' : '500',
                  background: statusFilter === st.id ? 'var(--white)' : 'transparent',
                  color: statusFilter === st.id ? 'var(--brand)' : 'var(--t-600)',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  boxShadow: statusFilter === st.id ? 'var(--shadow-xs)' : 'none',
                }}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Category Dropdown */}
          <select
            className="form-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ width: '180px', height: '36px', fontSize: '12px' }}
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>

          {/* Refresh & Log Found Item Button */}
          <button
            onClick={fetchItems}
            className="btn btn-secondary"
            title="Refresh List"
            style={{ padding: '0 10px', height: '36px' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>

          <button
            onClick={() => {
              resetLogForm();
              setShowLogModal(true);
            }}
            className="btn btn-primary"
            style={{
              height: '36px',
              padding: '0 16px',
              fontSize: '12.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Plus size={15} />
            <span>Log Found Item</span>
          </button>
        </div>
      </div>

      {/* 3. Items Data Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
            <thead>
              <tr style={{ background: 'var(--surface-sub)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--t-600)', width: '130px' }}>Ref #</th>
                <th style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--t-600)' }}>Item & Category</th>
                <th style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--t-600)' }}>Location Found</th>
                <th style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--t-600)' }}>Found By & Time</th>
                <th style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--t-600)' }}>Storage Locker</th>
                <th style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--t-600)' }}>Suspected Guest</th>
                <th style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--t-600)' }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--t-600)', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: 'var(--t-500)' }}>
                    Loading Lost & Found items...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--t-500)' }}>
                    <Archive size={36} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--t-700)' }}>No items found</div>
                    <p style={{ fontSize: '12px', marginTop: '4px' }}>
                      {searchTerm || statusFilter !== 'ALL' || categoryFilter !== 'ALL'
                        ? 'Try clearing the search query or status filter.'
                        : 'No lost belongings have been logged yet for this hotel.'}
                    </p>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const catBadge = getCategoryBadge(item.category);
                  const isClaimed = item.status === 'CLAIMED';
                  const isDisposed = item.status === 'DISPOSED';
                  const isInCustody = item.status === 'IN_CUSTODY';

                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-sub)' }}>
                      {/* Ref # */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                        <span style={{ fontWeight: '800', fontFamily: 'monospace', color: 'var(--brand)' }}>
                          {item.reference_no}
                        </span>
                        {item.estimated_value && (
                          <div style={{ fontSize: '11px', color: 'var(--t-500)', marginTop: '2px' }}>
                            Est. ₹{Number(item.estimated_value).toLocaleString('en-IN')}
                          </div>
                        )}
                      </td>

                      {/* Item & Category */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'top', maxWidth: '240px' }}>
                        <div style={{ fontWeight: '700', color: 'var(--t-900)' }}>{item.item_name}</div>
                        <span
                          style={{
                            display: 'inline-block',
                            marginTop: '4px',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600',
                            color: catBadge.color,
                            background: catBadge.bg,
                            border: `1px solid ${catBadge.border}`,
                          }}
                        >
                          {catBadge.label}
                        </span>
                        {item.description && (
                          <div style={{ fontSize: '11.5px', color: 'var(--t-600)', marginTop: '4px', whiteSpace: 'pre-wrap' }}>
                            {item.description}
                          </div>
                        )}
                      </td>

                      {/* Location Found */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                        {item.room ? (
                          <div>
                            <span className="badge badge-brand" style={{ fontSize: '11px' }}>
                              Room {item.room.room_number}
                            </span>
                            {item.specific_location && (
                              <div style={{ fontSize: '11px', color: 'var(--t-500)', marginTop: '2px' }}>
                                {item.specific_location}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <span style={{ fontWeight: '600', color: 'var(--t-800)' }}>
                              {item.found_location_type}
                            </span>
                            {item.specific_location && (
                              <div style={{ fontSize: '11px', color: 'var(--t-500)', marginTop: '2px' }}>
                                {item.specific_location}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Found By & Time */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: '600', color: 'var(--t-900)' }}>{item.found_by_name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--t-500)', marginTop: '2px' }}>
                          {new Date(item.found_at).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </div>
                      </td>

                      {/* Storage Locker */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#1e40af', background: '#eff6ff', padding: '3px 8px', borderRadius: '4px', border: '1px solid #bfdbfe' }}>
                          🔒 {item.storage_location || 'Safe Locker'}
                        </span>
                      </td>

                      {/* Suspected Guest */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                        {item.guest_name ? (
                          <div>
                            <div style={{ fontWeight: '700', color: 'var(--t-900)' }}>{item.guest_name}</div>
                            {item.guest_phone && (
                              <div style={{ fontSize: '11px', color: 'var(--t-500)', marginTop: '2px' }}>
                                📞 {item.guest_phone}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--t-400)', fontStyle: 'italic', fontSize: '11px' }}>
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                        {isInCustody && (
                          <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={11} />
                            In Custody
                          </span>
                        )}
                        {isClaimed && (
                          <div>
                            <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle2 size={11} />
                              Claimed
                            </span>
                            <div style={{ fontSize: '10.5px', color: 'var(--t-600)', marginTop: '3px' }}>
                              To: <strong>{item.claimed_by_name}</strong>
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--t-400)' }}>
                              {new Date(item.claimed_at).toLocaleDateString('en-IN')}
                            </div>
                          </div>
                        )}
                        {isDisposed && (
                          <div>
                            <span style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>
                              Disposed
                            </span>
                            <div style={{ fontSize: '10px', color: 'var(--t-500)', marginTop: '2px' }}>
                              {item.disposal_reason}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'top', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          {/* Print Docket Tag */}
                          <button
                            onClick={() => handlePrintDocket(item)}
                            className="btn btn-secondary"
                            title="Print Baggage Tag / Custody Slip"
                            style={{ padding: '5px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Printer size={13} />
                            <span>Tag</span>
                          </button>

                          {/* Handover / Claim Button (if In Custody) */}
                          {isInCustody && (
                            <button
                              onClick={() => {
                                setClaimForm({
                                  claimed_by_name: item.guest_name || '',
                                  claimed_by_phone: item.guest_phone || '',
                                  claimed_by_id_proof: '',
                                  handover_by_staff_name: user?.name || 'Front Desk Staff',
                                  handover_notes: '',
                                });
                                setShowClaimModal(item);
                              }}
                              className="btn btn-primary"
                              title="Handover to Guest"
                              style={{ padding: '5px 10px', fontSize: '11px', background: 'var(--success)', borderColor: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <CheckCircle2 size={13} />
                              <span>Handover</span>
                            </button>
                          )}

                          {/* Dispose Button (if In Custody) */}
                          {isInCustody && (
                            <button
                              onClick={() => {
                                setDisposeForm({
                                  disposal_reason: 'Unclaimed item past retention policy',
                                  handover_by_staff_name: user?.name || 'Duty Manager',
                                  handover_notes: '',
                                });
                                setShowDisposeModal(item);
                              }}
                              className="btn btn-outline"
                              title="Dispose / Donate"
                              style={{ padding: '5px 8px', fontSize: '11px', color: '#64748b', borderColor: '#cbd5e1' }}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}

                          {/* Delete Item */}
                          <button
                            onClick={() => handleDelete(item.id, item.reference_no)}
                            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                            title="Delete entry"
                          >
                            <X size={14} />
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
      </div>

      {/* 4. MODAL: Log New Found Item */}
      {showLogModal && (
        <div className="modal-overlay" onClick={() => setShowLogModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: '800', margin: 0, color: 'var(--t-900)' }}>
                  Log Found Belonging / Lost Item
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--t-500)', marginTop: '2px' }}>
                  Register item found on property into front desk safe custody.
                </div>
              </div>
              <button onClick={() => setShowLogModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: '700' }}>Item Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apple iPhone 14 Pro"
                    value={logForm.item_name}
                    onChange={(e) => setLogForm({ ...logForm, item_name: e.target.value })}
                    className="form-input"
                    style={{ fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: '700' }}>Category *</label>
                  <select
                    className="form-select"
                    value={logForm.category}
                    onChange={(e) => setLogForm({ ...logForm, category: e.target.value })}
                    style={{ fontSize: '13px' }}
                  >
                    {CATEGORIES.filter(c => c.id !== 'ALL').map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: '700' }}>Found Location Area *</label>
                  <select
                    className="form-select"
                    value={logForm.found_location_type}
                    onChange={(e) => setLogForm({ ...logForm, found_location_type: e.target.value })}
                    style={{ fontSize: '13px' }}
                  >
                    {LOCATION_TYPES.map(l => (
                      <option key={l.id} value={l.id}>{l.label}</option>
                    ))}
                  </select>
                </div>

                {logForm.found_location_type === 'ROOM' ? (
                  <div>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: '700' }}>Select Guest Room</label>
                    <select
                      className="form-select"
                      value={logForm.room_id}
                      onChange={(e) => setLogForm({ ...logForm, room_id: e.target.value })}
                      style={{ fontSize: '13px' }}
                    >
                      <option value="">-- Choose Room --</option>
                      {rooms.map(r => (
                        <option key={r.id} value={r.id}>
                          Room {r.room_number} ({r.room_type?.name || 'Deluxe'})
                        </option>
                      ))}
                    </select>
                    <div style={{ fontSize: '10.5px', color: 'var(--brand)', marginTop: '2px' }}>
                      Auto-links last guest staying in this room
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: '700' }}>Specific Spot</label>
                    <input
                      type="text"
                      placeholder="e.g. Table T-04 / Near elevator"
                      value={logForm.specific_location}
                      onChange={(e) => setLogForm({ ...logForm, specific_location: e.target.value })}
                      className="form-input"
                      style={{ fontSize: '13px' }}
                    />
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: '700' }}>Found By (Staff / Person) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar (Housekeeping)"
                    value={logForm.found_by_name}
                    onChange={(e) => setLogForm({ ...logForm, found_by_name: e.target.value })}
                    className="form-input"
                    style={{ fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: '700' }}>Found Date & Time</label>
                  <input
                    type="datetime-local"
                    value={logForm.found_at}
                    onChange={(e) => setLogForm({ ...logForm, found_at: e.target.value })}
                    className="form-input"
                    style={{ fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: '700' }}>Storage Locker / Safe Box</label>
                  <input
                    type="text"
                    placeholder="e.g. Front Desk Safe Locker #01"
                    value={logForm.storage_location}
                    onChange={(e) => setLogForm({ ...logForm, storage_location: e.target.value })}
                    className="form-input"
                    style={{ fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: '700' }}>Estimated Value (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 15000"
                    value={logForm.estimated_value}
                    onChange={(e) => setLogForm({ ...logForm, estimated_value: e.target.value })}
                    className="form-input"
                    style={{ fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: '700' }}>Item Description / Distinguishing Marks</label>
                <textarea
                  rows="2"
                  placeholder="e.g. Dark blue silicone cover, cracked screen protector on top left, initials 'RK' engraved on backside."
                  value={logForm.description}
                  onChange={(e) => setLogForm({ ...logForm, description: e.target.value })}
                  className="form-input"
                  style={{ fontSize: '12.5px' }}
                />
              </div>

              {/* Suspected Guest Details */}
              <div style={{ background: 'var(--surface-sub)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--t-800)', marginBottom: '8px' }}>
                  Suspected Guest Details (Optional)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="Guest Name (e.g. Rajesh Sharma)"
                    value={logForm.guest_name}
                    onChange={(e) => setLogForm({ ...logForm, guest_name: e.target.value })}
                    className="form-input"
                    style={{ fontSize: '12px' }}
                  />
                  <input
                    type="tel"
                    placeholder="Guest Phone Number"
                    value={logForm.guest_phone}
                    onChange={(e) => setLogForm({ ...logForm, guest_phone: e.target.value })}
                    className="form-input"
                    style={{ fontSize: '12px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="btn btn-secondary"
                  style={{ padding: '8px 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                  style={{ padding: '8px 20px', fontWeight: '700' }}
                >
                  {saving ? 'Logging...' : 'Save & Print Tag'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL: Claim & Handover to Guest */}
      {showClaimModal && (
        <div className="modal-overlay" onClick={() => setShowClaimModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: '800', margin: 0, color: 'var(--success)' }}>
                  ✓ Handover & Return to Guest
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--t-500)', marginTop: '2px' }}>
                  Item #{showClaimModal.reference_no} &bull; <strong>{showClaimModal.item_name}</strong>
                </div>
              </div>
              <button onClick={() => setShowClaimModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleClaimSubmit}>
              <div style={{ background: 'var(--surface-sub)', padding: '10px 14px', borderRadius: '6px', marginBottom: '14px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span style={{ color: 'var(--t-500)' }}>Storage Location:</span>
                  <strong style={{ color: 'var(--brand)' }}>{showClaimModal.storage_location}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--t-500)' }}>Found At:</span>
                  <span>{new Date(showClaimModal.found_at).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: '700' }}>Claimed By (Guest / Representative Name) *</label>
                <input
                  type="text"
                  required
                  placeholder="Full name of receiver"
                  value={claimForm.claimed_by_name}
                  onChange={(e) => setClaimForm({ ...claimForm, claimed_by_name: e.target.value })}
                  className="form-input"
                  style={{ fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: '700' }}>Receiver Phone No *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 9876543210"
                    value={claimForm.claimed_by_phone}
                    onChange={(e) => setClaimForm({ ...claimForm, claimed_by_phone: e.target.value })}
                    className="form-input"
                    style={{ fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: '700' }}>ID Proof Verification</label>
                  <input
                    type="text"
                    placeholder="Aadhaar / Passport / DL No"
                    value={claimForm.claimed_by_id_proof}
                    onChange={(e) => setClaimForm({ ...claimForm, claimed_by_id_proof: e.target.value })}
                    className="form-input"
                    style={{ fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: '700' }}>Handed Over By (Staff Name) *</label>
                <input
                  type="text"
                  required
                  value={claimForm.handover_by_staff_name}
                  onChange={(e) => setClaimForm({ ...claimForm, handover_by_staff_name: e.target.value })}
                  className="form-input"
                  style={{ fontSize: '13px' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: '700' }}>Verification Remarks / Signature Notes</label>
                <textarea
                  rows="2"
                  placeholder="e.g. Guest verified phone lock passcode / verified signature on ID card."
                  value={claimForm.handover_notes}
                  onChange={(e) => setClaimForm({ ...claimForm, handover_notes: e.target.value })}
                  className="form-input"
                  style={{ fontSize: '12.5px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowClaimModal(null)}
                  className="btn btn-secondary"
                  style={{ padding: '8px 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                  style={{ padding: '8px 20px', background: 'var(--success)', borderColor: 'var(--success)', fontWeight: '700' }}
                >
                  {saving ? 'Confirming...' : 'Confirm Handover & Release'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: Dispose Item */}
      {showDisposeModal && (
        <div className="modal-overlay" onClick={() => setShowDisposeModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: '800', margin: 0, color: '#dc2626' }}>
                  🗑️ Dispose / Donate Unclaimed Item
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--t-500)', marginTop: '2px' }}>
                  Ref #{showDisposeModal.reference_no} &bull; {showDisposeModal.item_name}
                </div>
              </div>
              <button onClick={() => setShowDisposeModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleDisposeSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: '700' }}>Reason for Disposal *</label>
                <select
                  className="form-select"
                  value={disposeForm.disposal_reason}
                  onChange={(e) => setDisposeForm({ ...disposeForm, disposal_reason: e.target.value })}
                  style={{ fontSize: '13px' }}
                >
                  <option value="Unclaimed item retained past 90 days policy">Unclaimed item retained past 90 days policy</option>
                  <option value="Perishable food item expired">Perishable food item expired</option>
                  <option value="Donated to local charity / NGO">Donated to local charity / NGO</option>
                  <option value="Damaged / Broken / Unusable item discarded">Damaged / Broken / Unusable item discarded</option>
                  <option value="Handed over to local Police station">Handed over to local Police station</option>
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: '700' }}>Manager Remarks / Notes</label>
                <textarea
                  rows="2"
                  placeholder="Additional disposal or auction notes..."
                  value={disposeForm.handover_notes}
                  onChange={(e) => setDisposeForm({ ...disposeForm, handover_notes: e.target.value })}
                  className="form-input"
                  style={{ fontSize: '12.5px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowDisposeModal(null)}
                  className="btn btn-secondary"
                  style={{ padding: '8px 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                  style={{ padding: '8px 20px', background: '#dc2626', borderColor: '#dc2626', fontWeight: '700' }}
                >
                  {saving ? 'Processing...' : 'Confirm Disposal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

