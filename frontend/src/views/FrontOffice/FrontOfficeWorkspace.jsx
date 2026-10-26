import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { frontOfficeApi } from '../../api';
import {
  ConciergeBell,
  Bed,
  Users,
  CheckCircle2,
  Calendar,
  Clock,
  FileText,
  CreditCard,
  Plus,
  Search,
  Eye,
  LogOut,
  AlertCircle,
  Receipt,
  UserCheck,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  QrCode,
  DollarSign,
  Printer,
  ChevronRight,
  ChevronLeft,
  MapPin,
  FileCheck,
  Phone,
  Mail,
  Building,
  ArrowRight,
  TrendingUp,
  BarChart3,
  CalendarDays,
} from 'lucide-react';

export default function FrontOfficeWorkspace() {
  const { currentHotel } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState('in_house'); // in_house, rack, calendar, reservations
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // 1-Month Calendar & Availability Chart State
  const [calendarData, setCalendarData] = useState(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [calendarRoomTypeFilter, setCalendarRoomTypeFilter] = useState('ALL');
  const [selectedRoomForModal, setSelectedRoomForModal] = useState(null);
  const [roomModalMonth, setRoomModalMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [roomModalCalendar, setRoomModalCalendar] = useState(null);
  const [roomModalLoading, setRoomModalLoading] = useState(false);

  // Modals
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showFolioModal, setShowFolioModal] = useState(null); // booking object
  const [showAddChargeModal, setShowAddChargeModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCheckOutModal, setShowCheckOutModal] = useState(null); // booking object
  const [invoiceData, setInvoiceData] = useState(null);

  // Check-In Form State (with complete Mandatory KYC & Document Fields)
  const [checkInForm, setCheckInForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    nationality: 'Indian',
    id_type: 'AADHAAR',
    id_number: '',
    id_document_path: 'id_scan_uploaded.pdf',
    address: '',
    city: '',
    state: '',
    purpose_of_visit: 'Business / Leisure',
    room_id: '',
    expected_check_out_at: '',
    num_adults: 1,
    num_children: 0,
    special_requests: '',
    room_rate_per_night: '',
    discount_amount: 0,
    advance_deposit_amount: '',
    payment_method: 'UPI_QR',
    transaction_reference: '',
  });

  // Add Folio Charge Form State
  const [chargeForm, setChargeForm] = useState({
    item_type: 'FOOD_BEVERAGE',
    description: '',
    quantity: 1,
    unit_price: '',
  });

  // Record Payment Form State
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'UPI_QR',
    transaction_reference: '',
    notes: '',
  });

  // Checkout settlement Form State
  const [checkOutForm, setCheckOutForm] = useState({
    settlement_amount: '',
    payment_method: 'UPI_QR',
    transaction_reference: '',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  useEffect(() => {
    loadFrontOfficeData();
  }, [currentHotel]);

  const loadFrontOfficeData = async () => {
    try {
      setLoading(true);
      const [ovRes, roomsRes, bookingsRes] = await Promise.all([
        frontOfficeApi.getOverview(),
        frontOfficeApi.getRooms(),
        frontOfficeApi.getBookings('ALL'),
      ]);

      if (ovRes.success) setOverview(ovRes.metrics);
      if (roomsRes.success) setRooms(roomsRes.rooms || []);
      if (bookingsRes.success) setBookings(bookingsRes.bookings || []);
    } catch (err) {
      console.error('Failed to load front office data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCalendarData = async (monthToLoad = selectedMonth) => {
    try {
      setCalendarLoading(true);
      const res = await frontOfficeApi.getCalendar({ month: monthToLoad });
      if (res.success) {
        setCalendarData(res);
        setSelectedMonth(res.month);
      }
    } catch (err) {
      console.error('Failed to load calendar data:', err);
    } finally {
      setCalendarLoading(false);
    }
  };

  const loadRoomModalCalendar = async (roomId, monthToLoad = roomModalMonth) => {
    if (!roomId) return;
    try {
      setRoomModalLoading(true);
      const res = await frontOfficeApi.getCalendar({ room_id: roomId, month: monthToLoad });
      if (res.success) {
        setRoomModalCalendar(res);
        setRoomModalMonth(res.month);
      }
    } catch (err) {
      console.error('Failed to load single room calendar:', err);
    } finally {
      setRoomModalLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'calendar') {
      loadCalendarData(selectedMonth);
    }
  }, [activeSubTab, selectedMonth]);

  useEffect(() => {
    if (selectedRoomForModal) {
      loadRoomModalCalendar(selectedRoomForModal.id, roomModalMonth);
    }
  }, [selectedRoomForModal, roomModalMonth]);

  const handleRoomStatusUpdate = async (roomId, newStatus) => {
    try {
      const res = await frontOfficeApi.updateRoomStatus(roomId, newStatus);
      if (res.success) {
        showToast(`Room marked as ${newStatus}`);
        loadFrontOfficeData();
      }
    } catch (err) {
      alert(err.message || 'Failed to update room status');
    }
  };

  const showToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 3500);
  };

  // Submit New Check-In
  const handleCheckInSubmit = async (e) => {
    e.preventDefault();
    setActionError('');
    try {
      setSubmitting(true);
      const res = await frontOfficeApi.checkIn(checkInForm);
      if (res.success) {
        setShowCheckInModal(false);
        showToast(res.message || 'Guest checked in successfully!');
        // Reset form
        setCheckInForm({
          first_name: '',
          last_name: '',
          phone: '',
          email: '',
          nationality: 'Indian',
          id_type: 'AADHAAR',
          id_number: '',
          id_document_path: 'id_scan_uploaded.pdf',
          address: '',
          city: '',
          state: '',
          purpose_of_visit: 'Business / Leisure',
          room_id: '',
          expected_check_out_at: '',
          num_adults: 1,
          num_children: 0,
          special_requests: '',
          room_rate_per_night: '',
          discount_amount: 0,
          advance_deposit_amount: '',
          payment_method: 'UPI_QR',
          transaction_reference: '',
        });
        loadFrontOfficeData();
      }
    } catch (err) {
      setActionError(err.data?.message || err.message || 'Check-in failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Post Folio Extra Charge
  const handleAddChargeSubmit = async (e) => {
    e.preventDefault();
    if (!showFolioModal) return;
    setActionError('');
    try {
      setSubmitting(true);
      const res = await frontOfficeApi.addFolioCharge(showFolioModal.id, chargeForm);
      if (res.success) {
        setShowAddChargeModal(false);
        setChargeForm({ item_type: 'FOOD_BEVERAGE', description: '', quantity: 1, unit_price: '' });
        showToast(res.message);
        // Refresh active folio modal
        setShowFolioModal(res.updated_booking);
        loadFrontOfficeData();
      }
    } catch (err) {
      setActionError(err.data?.message || err.message || 'Failed to post charge');
    } finally {
      setSubmitting(false);
    }
  };

  // Record Payment
  const handleRecordPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!showFolioModal) return;
    setActionError('');
    try {
      setSubmitting(true);
      const res = await frontOfficeApi.recordPayment(showFolioModal.id, paymentForm);
      if (res.success) {
        setShowPaymentModal(false);
        setPaymentForm({ amount: '', payment_method: 'UPI_QR', transaction_reference: '', notes: '' });
        showToast(res.message);
        setShowFolioModal(res.updated_booking);
        loadFrontOfficeData();
      }
    } catch (err) {
      setActionError(err.data?.message || err.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  // Process Check-Out & Generate Invoice
  const handleCheckOutSubmit = async (e) => {
    e.preventDefault();
    if (!showCheckOutModal) return;
    setActionError('');
    try {
      setSubmitting(true);
      const res = await frontOfficeApi.checkOut(showCheckOutModal.id, checkOutForm);
      if (res.success) {
        setShowCheckOutModal(null);
        setInvoiceData(res.invoice);
        showToast('Guest checked out successfully! Tax invoice generated.');
        loadFrontOfficeData();
      }
    } catch (err) {
      setActionError(err.data?.message || err.message || 'Failed to process checkout');
    } finally {
      setSubmitting(false);
    }
  };

  // Available Rooms for Check-In Dropdown
  const availableRoomsList = rooms.filter(r => r.status === 'AVAILABLE');

  // Filtered in-house bookings
  const checkedInBookings = bookings.filter(b => b.status === 'CHECKED_IN');
  const filteredInHouse = checkedInBookings.filter(b => {
    const q = searchTerm.toLowerCase();
    return (
      b.booking_number?.toLowerCase().includes(q) ||
      b.guest?.first_name?.toLowerCase().includes(q) ||
      b.guest?.last_name?.toLowerCase().includes(q) ||
      b.guest?.phone?.toLowerCase().includes(q) ||
      b.room?.room_number?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* Toast Notification */}
      {successToast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 9999,
            background: 'var(--white)',
            border: '1px solid var(--success-border)',
            boxShadow: 'var(--shadow-lg)',
            padding: '12px 18px',
            borderRadius: 'var(--r-card)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#065f46',
            fontWeight: '600',
            fontSize: '13.5px',
          }}
        >
          <CheckCircle2 size={18} color="var(--success)" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Front Office Header Banner */}
      <div
        className="card"
        style={{
          marginBottom: '20px',
          background: 'linear-gradient(135deg, var(--white) 0%, var(--surface-sub) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-brand">{currentHotel?.hotel_code || 'HTL-1001'}</span>
            <span className="badge badge-success">Front Office Module Live</span>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--t-900)' }}>
            Front Desk Operations & Guest Terminal
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--t-600)', marginTop: '2px' }}>
            Instant guest check-in, mandatory government KYC document verification, room rack, folio billing & checkout.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => loadFrontOfficeData()}
            className="btn btn-secondary btn-sm"
            title="Refresh Data"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => {
              setActionError('');
              // Set default expected checkout to tomorrow 11 AM
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              tomorrow.setHours(11, 0, 0, 0);
              const formattedDate = tomorrow.toISOString().slice(0, 16);
              setCheckInForm(prev => ({
                ...prev,
                expected_check_out_at: formattedDate,
                room_id: availableRoomsList[0]?.id || '',
              }));
              setShowCheckInModal(true);
            }}
            className="btn btn-primary"
            style={{ fontWeight: '700' }}
          >
            <Plus size={16} />
            <span>+ New Guest Walk-In / Check-In</span>
          </button>
        </div>
      </div>

      {/* Realtime Front Desk KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        <MetricBox
          icon={Users}
          label="In-House Guests"
          value={overview?.in_house_guests ?? checkedInBookings.length}
          subtext="Occupied Guest Stays"
          color="var(--brand)"
          bg="var(--brand-50)"
        />
        <MetricBox
          icon={Bed}
          label="Available Clean Rooms"
          value={overview?.available_rooms ?? availableRoomsList.length}
          subtext="Ready for Check-In"
          color="var(--success)"
          bg="var(--success-bg)"
        />
        <MetricBox
          icon={TrendingUp}
          label="Occupancy Rate"
          value={overview?.occupancy_rate ?? '0%'}
          subtext={`${overview?.occupied_rooms ?? 0} of ${overview?.total_rooms ?? 0} Rooms`}
          color="#0891b2"
          bg="#ecfeff"
        />
        <MetricBox
          icon={LogOut}
          label="Departures Today"
          value={overview?.today_departures ?? 0}
          subtext="Check-Outs Due"
          color="#d97706"
          bg="#fef3c7"
        />
        <MetricBox
          icon={Receipt}
          label="Today's Collections"
          value={`₹ ${Number(overview?.today_collections || 0).toLocaleString('en-IN')}`}
          subtext="Advance + Settlements"
          color="#9333ea"
          bg="#faf5ff"
        />
      </div>

      {/* Real-time Available Rooms Inventory Chart */}
      <div className="card" style={{ marginBottom: '22px', padding: '18px 20px', background: 'var(--white)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'var(--brand-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand)' }}>
              <BarChart3 size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--t-900)' }}>
                Real-Time Room Inventory & Availability Distribution
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--t-500)' }}>
                Live property availability across categories & housekeeping turnover
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px', fontWeight: '600', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
              <span style={{ color: 'var(--t-700)' }}>Available Clean: {overview?.available_rooms ?? 0}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#6366f1' }} />
              <span style={{ color: 'var(--t-700)' }}>Occupied: {overview?.occupied_rooms ?? 0}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
              <span style={{ color: 'var(--t-700)' }}>Needs Cleaning: {overview?.dirty_rooms ?? 0}</span>
            </div>
            {overview?.maintenance_rooms > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
                <span style={{ color: 'var(--t-700)' }}>Maintenance: {overview?.maintenance_rooms}</span>
              </div>
            )}
          </div>
        </div>

        {/* Multi-segment visual progress bar */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ height: '10px', width: '100%', borderRadius: '5px', overflow: 'hidden', display: 'flex', background: 'var(--border-sub)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)' }}>
            <div style={{ width: `${overview?.status_breakdown?.available?.pct || 0}%`, background: '#10b981', transition: 'width 0.4s ease' }} title={`Available: ${overview?.status_breakdown?.available?.count || 0}`} />
            <div style={{ width: `${overview?.status_breakdown?.occupied?.pct || 0}%`, background: '#6366f1', transition: 'width 0.4s ease' }} title={`Occupied: ${overview?.status_breakdown?.occupied?.count || 0}`} />
            <div style={{ width: `${overview?.status_breakdown?.dirty?.pct || 0}%`, background: '#f59e0b', transition: 'width 0.4s ease' }} title={`Needs Cleaning: ${overview?.status_breakdown?.dirty?.count || 0}`} />
            <div style={{ width: `${overview?.status_breakdown?.maintenance?.pct || 0}%`, background: '#ef4444', transition: 'width 0.4s ease' }} title={`Maintenance: ${overview?.status_breakdown?.maintenance?.count || 0}`} />
          </div>
        </div>

        {/* Category Breakdown Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          {(overview?.room_types || []).map((rt) => {
            const availPct = rt.total > 0 ? Math.round((rt.available / rt.total) * 100) : 0;
            return (
              <div
                key={rt.room_type}
                style={{
                  background: 'var(--surface-sub)',
                  borderRadius: 'var(--r-sm)',
                  padding: '12px 14px',
                  border: '1px solid var(--border-sub)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--t-900)' }}>
                    {rt.room_type}
                  </span>
                  <span
                    className="badge"
                    style={{
                      fontSize: '10px',
                      background: rt.available > 0 ? 'var(--success-bg)' : 'var(--error-bg)',
                      color: rt.available > 0 ? 'var(--success)' : 'var(--error)',
                      borderColor: rt.available > 0 ? 'var(--success-border)' : 'var(--error-border)',
                      fontWeight: '700',
                    }}
                  >
                    {rt.available > 0 ? `${rt.available} Ready` : '0 Available'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--t-500)', marginBottom: '5px' }}>
                  <span>{rt.available} Clean / {rt.total} Total</span>
                  <strong style={{ color: rt.available > 0 ? 'var(--success)' : 'var(--t-600)' }}>{availPct}% Ready</strong>
                </div>

                <div style={{ height: '6px', width: '100%', borderRadius: '3px', background: 'var(--border)', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${availPct}%`,
                      height: '100%',
                      background: rt.available > 0 ? 'var(--success)' : 'var(--t-400)',
                      borderRadius: '3px',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-sub)', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveSubTab('in_house')}
          className={`tab-btn ${activeSubTab === 'in_house' ? 'tab-btn-active' : ''}`}
          style={{
            padding: '10px 18px',
            fontSize: '13.5px',
            fontWeight: activeSubTab === 'in_house' ? '700' : '500',
            borderBottom: activeSubTab === 'in_house' ? '2px solid var(--brand)' : '2px solid transparent',
            color: activeSubTab === 'in_house' ? 'var(--brand)' : 'var(--t-600)',
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Users size={16} />
          <span>In-House Guests & Folios ({checkedInBookings.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('rack')}
          className={`tab-btn ${activeSubTab === 'rack' ? 'tab-btn-active' : ''}`}
          style={{
            padding: '10px 18px',
            fontSize: '13.5px',
            fontWeight: activeSubTab === 'rack' ? '700' : '500',
            borderBottom: activeSubTab === 'rack' ? '2px solid var(--brand)' : '2px solid transparent',
            color: activeSubTab === 'rack' ? 'var(--brand)' : 'var(--t-600)',
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Bed size={16} />
          <span>Visual Room Rack ({rooms.length} Rooms)</span>
        </button>

        <button
          onClick={() => {
            setActiveSubTab('calendar');
            loadCalendarData(selectedMonth);
          }}
          className={`tab-btn ${activeSubTab === 'calendar' ? 'tab-btn-active' : ''}`}
          style={{
            padding: '10px 18px',
            fontSize: '13.5px',
            fontWeight: activeSubTab === 'calendar' ? '700' : '500',
            borderBottom: activeSubTab === 'calendar' ? '2px solid var(--brand)' : '2px solid transparent',
            color: activeSubTab === 'calendar' ? 'var(--brand)' : 'var(--t-600)',
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Calendar size={16} />
          <span>1-Month Room Calendar (Tape Chart)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('reservations')}
          className={`tab-btn ${activeSubTab === 'reservations' ? 'tab-btn-active' : ''}`}
          style={{
            padding: '10px 18px',
            fontSize: '13.5px',
            fontWeight: activeSubTab === 'reservations' ? '700' : '500',
            borderBottom: activeSubTab === 'reservations' ? '2px solid var(--brand)' : '2px solid transparent',
            color: activeSubTab === 'reservations' ? 'var(--brand)' : 'var(--t-600)',
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <FileText size={16} />
          <span>Booking & Checkout History ({bookings.length})</span>
        </button>
      </div>

      {/* TAB 1: IN-HOUSE GUESTS & FOLIO BILLING */}
      {activeSubTab === 'in_house' && (
        <div>
          {/* Search bar */}
          <div className="card" style={{ padding: '12px 18px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--t-500)' }} />
              <input
                type="text"
                placeholder="Search guest by name, room #, phone, booking ID..."
                className="form-control"
                style={{ paddingLeft: '34px' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div style={{ fontSize: '12.5px', color: 'var(--t-500)' }}>
              Showing <strong>{filteredInHouse.length}</strong> In-House Guest Stays
            </div>
          </div>

          {/* In-House Guests Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '90px' }}>Room</th>
                  <th>Guest Details & KYC</th>
                  <th>Check-In & Stay</th>
                  <th>Charges & Taxes</th>
                  <th>Advance Paid</th>
                  <th>Balance Due</th>
                  <th style={{ textAlign: 'right', width: '220px' }}>Front Desk Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInHouse.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>
                      <Users size={32} color="var(--t-400)" style={{ margin: '0 auto 10px', display: 'block' }} />
                      <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--t-800)' }}>No In-House Guests Currently</div>
                      <p style={{ fontSize: '13px', color: 'var(--t-500)', marginTop: '4px' }}>
                        Click <strong>"+ New Guest Walk-In / Check-In"</strong> above to check in a guest with ID proof verification.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredInHouse.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                          <span
                            style={{
                              fontSize: '15px',
                              fontWeight: '800',
                              color: 'var(--brand)',
                              background: 'var(--brand-50)',
                              border: '1px solid var(--brand-200)',
                              padding: '4px 10px',
                              borderRadius: 'var(--r-sm)',
                              fontFamily: 'monospace',
                            }}
                          >
                            {b.room?.room_number}
                          </span>
                          <span style={{ fontSize: '10.5px', color: 'var(--t-500)', marginTop: '3px' }}>
                            {b.room?.floor}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div>
                          <div style={{ fontWeight: '700', color: 'var(--t-900)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{b.guest?.first_name} {b.guest?.last_name}</span>
                            <span className="badge badge-brand" style={{ fontSize: '9.5px', padding: '1px 6px' }}>
                              {b.guest?.nationality}
                            </span>
                          </div>
                          <div style={{ fontSize: '11.5px', color: 'var(--t-600)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Phone size={11} color="var(--t-400)" /> {b.guest?.phone}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--t-500)', marginTop: '3px' }}>
                            <strong style={{ color: 'var(--t-700)' }}>{b.guest?.id_type}:</strong> {b.guest?.id_number}
                            <span style={{ color: 'var(--success)', marginLeft: '6px' }}>✓ Verified</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '12.5px', color: 'var(--t-800)' }}>
                          <div><strong>In:</strong> {new Date(b.check_in_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                          <div style={{ color: 'var(--t-600)', marginTop: '2px' }}>
                            <strong>Out:</strong> {new Date(b.expected_check_out_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <span className="badge badge-brand" style={{ fontSize: '10px', marginTop: '4px' }}>
                            {b.total_nights} Nights Stay
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '13px' }}>
                          <strong style={{ color: 'var(--t-900)' }}>₹ {Number(b.grand_total).toLocaleString('en-IN')}</strong>
                          <div style={{ fontSize: '11px', color: 'var(--t-500)', marginTop: '2px' }}>
                            Room: ₹{Number(b.total_room_charges).toLocaleString('en-IN')} + Ext: ₹{Number(b.total_extra_charges).toLocaleString('en-IN')}
                          </div>
                        </div>
                      </td>
                      <td>
                        <strong style={{ color: 'var(--success)', fontSize: '13px' }}>
                          ₹ {Number(b.paid_amount).toLocaleString('en-IN')}
                        </strong>
                      </td>
                      <td>
                        <strong style={{ color: b.balance_amount > 0 ? 'var(--error)' : 'var(--success)', fontSize: '14px' }}>
                          ₹ {Number(b.balance_amount).toLocaleString('en-IN')}
                        </strong>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            onClick={() => {
                              setActionError('');
                              setShowFolioModal(b);
                            }}
                            className="btn btn-secondary btn-sm"
                            title="View Folio & Add Charges"
                          >
                            <FileText size={13} />
                            <span>Folio Bill</span>
                          </button>

                          <button
                            onClick={() => {
                              setActionError('');
                              setCheckOutForm({
                                settlement_amount: b.balance_amount > 0 ? b.balance_amount : 0,
                                payment_method: 'UPI_QR',
                                transaction_reference: '',
                                notes: '',
                              });
                              setShowCheckOutModal(b);
                            }}
                            className="btn btn-primary btn-sm"
                            style={{ background: 'var(--t-900)', borderColor: 'var(--t-900)' }}
                          >
                            <LogOut size={13} />
                            <span>Check-Out</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: VISUAL ROOM RACK */}
      {activeSubTab === 'rack' && (
        <div>
          {/* Room Rack Legend */}
          <div className="card" style={{ padding: '12px 18px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12.5px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--success)' }} />
                <span>Available Clean ({rooms.filter(r => r.status === 'AVAILABLE').length})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--brand)' }} />
                <span>Occupied ({rooms.filter(r => r.status === 'OCCUPIED').length})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#d97706' }} />
                <span>Dirty / Housekeeping ({rooms.filter(r => r.status === 'DIRTY').length})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#e11d48' }} />
                <span>Maintenance ({rooms.filter(r => r.status === 'MAINTENANCE').length})</span>
              </div>
            </div>

            <span style={{ fontSize: '12px', color: 'var(--t-500)' }}>
              Click any room card to change housekeeping status or assign guest.
            </span>
          </div>

          {/* Visual Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
            {rooms.map((room) => {
              const isOccupied = room.status === 'OCCUPIED';
              const isAvailable = room.status === 'AVAILABLE';
              const isDirty = room.status === 'DIRTY';

              return (
                <div
                  key={room.id}
                  className="card"
                  style={{
                    padding: '16px',
                    position: 'relative',
                    borderLeft: `4px solid ${
                      isOccupied ? 'var(--brand)' : isAvailable ? 'var(--success)' : isDirty ? '#d97706' : '#e11d48'
                    }`,
                    background: isOccupied ? 'var(--brand-50)' : isAvailable ? 'var(--white)' : 'var(--surface-sub)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--t-900)', fontFamily: 'monospace' }}>
                      Room {room.room_number}
                    </div>

                    <span
                      className={`badge ${
                        isOccupied ? 'badge-brand' : isAvailable ? 'badge-success' : isDirty ? 'badge-inactive' : 'badge-inactive'
                      }`}
                      style={{ fontSize: '10.5px' }}
                    >
                      {room.status}
                    </span>
                  </div>

                  <div style={{ fontSize: '12.5px', color: 'var(--t-700)', fontWeight: '600' }}>
                    {room.room_type}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--t-500)', marginTop: '2px' }}>
                    {room.floor} &bull; Base Tariff: <strong>₹{Number(room.base_price).toLocaleString('en-IN')}/night</strong>
                  </div>

                  {/* If occupied, show in-house guest snapshot */}
                  {isOccupied && room.current_guest && (
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '10px',
                        background: 'var(--white)',
                        borderRadius: 'var(--r-sm)',
                        border: '1px solid var(--brand-200)',
                        fontSize: '12px',
                      }}
                    >
                      <div style={{ fontWeight: '700', color: 'var(--t-900)' }}>
                        👤 {room.current_guest.guest_name}
                      </div>
                      <div style={{ color: 'var(--t-500)', fontSize: '11px', marginTop: '2px' }}>
                        Due Checkout: {room.current_guest.expected_check_out_at}
                      </div>
                    </div>
                  )}

                  {/* Actions: Room 1-Month Calendar & Check-in / Housekeeping */}
                  <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <button
                      onClick={() => {
                        setSelectedRoomForModal(room);
                        setRoomModalMonth(selectedMonth);
                        loadRoomModalCalendar(room.id, selectedMonth);
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{
                        width: '100%',
                        fontSize: '11.5px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        background: 'var(--white)',
                      }}
                      title="View 1-Month Booking Calendar for this Room"
                    >
                      <Calendar size={13} color="var(--brand)" />
                      <span>📅 1-Month Calendar</span>
                    </button>

                    {isDirty && (
                      <button
                        onClick={() => handleRoomStatusUpdate(room.id, 'AVAILABLE')}
                        className="btn btn-secondary btn-sm"
                        style={{ width: '100%', color: 'var(--success)', borderColor: 'var(--success-border)', background: 'var(--white)' }}
                      >
                        <CheckCircle2 size={13} />
                        <span>Mark Cleaned / Available</span>
                      </button>
                    )}

                    {isAvailable && (
                      <button
                        onClick={() => {
                          setCheckInForm(prev => ({
                            ...prev,
                            room_id: room.id,
                            room_rate_per_night: room.base_price,
                          }));
                          setShowCheckInModal(true);
                        }}
                        className="btn btn-primary btn-sm"
                        style={{ width: '100%' }}
                      >
                        <UserCheck size={13} />
                        <span>Check-In Guest</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: 1-MONTH PROPERTY AVAILABILITY CALENDAR (TAPE CHART) */}
      {activeSubTab === 'calendar' && (
        <div>
          {/* Calendar Toolbar */}
          <div className="card" style={{ padding: '14px 18px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface-sub)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '2px' }}>
                <button
                  onClick={() => calendarData?.prev_month && loadCalendarData(calendarData.prev_month)}
                  className="btn btn-secondary btn-sm"
                  style={{ border: 'none', background: 'transparent', padding: '6px 10px' }}
                  title="Previous Month"
                >
                  <ChevronLeft size={16} />
                </button>
                <div style={{ padding: '0 12px', fontSize: '14px', fontWeight: '800', color: 'var(--t-900)', minWidth: '130px', textAlign: 'center' }}>
                  {calendarData?.month_label || 'October 2026'}
                </div>
                <button
                  onClick={() => calendarData?.next_month && loadCalendarData(calendarData.next_month)}
                  className="btn btn-secondary btn-sm"
                  style={{ border: 'none', background: 'transparent', padding: '6px 10px' }}
                  title="Next Month"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <button
                onClick={() => {
                  const now = new Date();
                  const mStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                  loadCalendarData(mStr);
                }}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '12px' }}
              >
                Today
              </button>
            </div>

            {/* Room Type Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '12.5px', color: 'var(--t-600)', fontWeight: '600' }}>Filter Category:</span>
              <select
                className="form-select"
                style={{ fontSize: '12.5px', padding: '6px 12px', width: 'auto' }}
                value={calendarRoomTypeFilter}
                onChange={(e) => setCalendarRoomTypeFilter(e.target.value)}
              >
                <option value="ALL">All Categories ({rooms.length} Rooms)</option>
                {[...new Set(rooms.map(r => r.room_type))].map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>

              <button
                onClick={() => loadCalendarData(selectedMonth)}
                className="btn btn-secondary btn-sm"
                title="Refresh Calendar"
              >
                <RefreshCw size={13} className={calendarLoading ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* Status Legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#10b981' }} />
                <span>Available to Book</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--brand)' }} />
                <span>Booked Stay</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#f59e0b' }} />
                <span>Dirty / Cleaning</span>
              </div>
            </div>
          </div>

          {/* Calendar Grid Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {calendarLoading ? (
              <div style={{ textAlign: 'center', padding: '60px' }}>
                <div style={{ width: '36px', height: '36px', border: '3px solid var(--border)', borderTopColor: 'var(--brand)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                <p style={{ color: 'var(--t-500)', fontSize: '13px' }}>Loading 1-Month Room Tape Chart...</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', maxHeight: '650px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-sub)', borderBottom: '2px solid var(--border)' }}>
                      <th
                        style={{
                          position: 'sticky',
                          left: 0,
                          zIndex: 20,
                          background: 'var(--surface-sub)',
                          padding: '10px 14px',
                          textAlign: 'left',
                          minWidth: '180px',
                          boxShadow: '2px 0 4px rgba(0,0,0,0.04)',
                          fontSize: '12px',
                          fontWeight: '800',
                          color: 'var(--t-800)',
                        }}
                      >
                        Room & Tariff
                      </th>
                      {(calendarData?.days || []).map((d) => (
                        <th
                          key={d.date}
                          style={{
                            padding: '8px 4px',
                            textAlign: 'center',
                            minWidth: '42px',
                            borderLeft: '1px solid var(--border-sub)',
                            background: d.is_today ? 'var(--brand-50)' : 'transparent',
                            color: d.is_today ? 'var(--brand)' : 'var(--t-700)',
                          }}
                        >
                          <div style={{ fontSize: '11px', fontWeight: d.is_today ? '800' : '600' }}>
                            {d.day_name}
                          </div>
                          <div
                            style={{
                              fontSize: '13px',
                              fontWeight: '800',
                              marginTop: '2px',
                              display: 'inline-block',
                              width: d.is_today ? '22px' : 'auto',
                              height: d.is_today ? '22px' : 'auto',
                              lineHeight: d.is_today ? '22px' : 'normal',
                              borderRadius: d.is_today ? '50%' : 'none',
                              background: d.is_today ? 'var(--brand)' : 'transparent',
                              color: d.is_today ? '#fff' : 'inherit',
                            }}
                          >
                            {d.day}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {(calendarData?.rooms || [])
                      .filter(r => calendarRoomTypeFilter === 'ALL' || r.room_type === calendarRoomTypeFilter)
                      .map((room) => (
                        <tr key={room.id} style={{ borderBottom: '1px solid var(--border-sub)' }}>
                          {/* Sticky Room Details Column */}
                          <td
                            style={{
                              position: 'sticky',
                              left: 0,
                              zIndex: 10,
                              background: 'var(--white)',
                              padding: '10px 14px',
                              boxShadow: '2px 0 4px rgba(0,0,0,0.04)',
                              borderRight: '1px solid var(--border)',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div>
                                <span style={{ fontWeight: '800', fontSize: '14px', color: 'var(--t-900)' }}>
                                  Room {room.room_number}
                                </span>
                                <div style={{ fontSize: '11px', color: 'var(--t-500)', marginTop: '1px' }}>
                                  {room.room_type}
                                </div>
                                <div style={{ fontSize: '10.5px', color: 'var(--brand)', fontWeight: '700' }}>
                                  ₹{Number(room.base_price).toLocaleString('en-IN')}/n
                                </div>
                              </div>

                              <button
                                onClick={() => {
                                  setSelectedRoomForModal(room);
                                  setRoomModalMonth(selectedMonth);
                                  loadRoomModalCalendar(room.id, selectedMonth);
                                }}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '3px 8px', fontSize: '10.5px' }}
                                title="Open Single Room Calendar"
                              >
                                📅 View
                              </button>
                            </div>
                          </td>

                          {/* Day-by-Day Calendar Cells */}
                          {room.days.map((d) => {
                            const isBooked = d.status === 'BOOKED';
                            const isDirty = d.status === 'DIRTY';
                            const isMaint = d.status === 'MAINTENANCE';

                            return (
                              <td
                                key={d.date}
                                style={{
                                  padding: '4px 2px',
                                  textAlign: 'center',
                                  borderLeft: '1px solid var(--border-sub)',
                                  background: isBooked
                                    ? 'var(--brand-50)'
                                    : isDirty
                                    ? '#fffbeb'
                                    : isMaint
                                    ? '#fef2f2'
                                    : d.is_today
                                    ? 'rgba(99, 102, 241, 0.05)'
                                    : '#fff',
                                  verticalAlign: 'middle',
                                }}
                              >
                                {isBooked ? (
                                  <div
                                    onClick={() => {
                                      if (d.booking?.id) {
                                        const found = bookings.find(b => b.id === d.booking.id);
                                        if (found) setShowFolioModal(found);
                                        else {
                                          frontOfficeApi.getBookingDetail(d.booking.id).then(res => {
                                            if (res.success) setShowFolioModal(res.booking);
                                          });
                                        }
                                      }
                                    }}
                                    style={{
                                      background: 'var(--brand)',
                                      color: 'white',
                                      borderRadius: '4px',
                                      padding: '4px 2px',
                                      fontSize: '9.5px',
                                      fontWeight: '700',
                                      cursor: 'pointer',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                    }}
                                    title={`Booked by: ${d.booking?.guest_name} (${d.booking?.booking_number})\nCheck-in: ${d.booking?.check_in_at} | Checkout: ${d.booking?.expected_check_out_at}`}
                                  >
                                    👤 {d.booking?.guest_name ? d.booking.guest_name.split(' ')[0] : 'Booked'}
                                  </div>
                                ) : isDirty ? (
                                  <div
                                    onClick={() => handleRoomStatusUpdate(room.id, 'AVAILABLE')}
                                    style={{
                                      background: '#fef3c7',
                                      color: '#b45309',
                                      border: '1px solid #fde68a',
                                      borderRadius: '4px',
                                      padding: '3px 1px',
                                      fontSize: '9.5px',
                                      fontWeight: '700',
                                      cursor: 'pointer',
                                    }}
                                    title="Dirty - Click to Mark Clean"
                                  >
                                    🧹 Dirty
                                  </div>
                                ) : isMaint ? (
                                  <div
                                    style={{
                                      background: '#fee2e2',
                                      color: '#b91c1c',
                                      borderRadius: '4px',
                                      padding: '3px 1px',
                                      fontSize: '9.5px',
                                      fontWeight: '700',
                                    }}
                                    title="Under Maintenance"
                                  >
                                    🛠️
                                  </div>
                                ) : (
                                  <div
                                    onClick={() => {
                                      const nextDay = new Date(d.date);
                                      nextDay.setDate(nextDay.getDate() + 1);
                                      nextDay.setHours(11, 0, 0, 0);
                                      setCheckInForm(prev => ({
                                        ...prev,
                                        room_id: room.id,
                                        room_rate_per_night: room.base_price,
                                        expected_check_out_at: nextDay.toISOString().slice(0, 16),
                                      }));
                                      setShowCheckInModal(true);
                                    }}
                                    style={{
                                      height: '28px',
                                      borderRadius: '4px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'pointer',
                                      background: '#f0fdf4',
                                      color: '#15803d',
                                      fontSize: '11px',
                                      fontWeight: '700',
                                      transition: 'all 0.15s ease',
                                    }}
                                    title={`Available for ₹${Number(room.base_price).toLocaleString('en-IN')}/night. Click to Check-In / Reserve.`}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = '#dcfce7';
                                      e.currentTarget.innerText = '+';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = '#f0fdf4';
                                      e.currentTarget.innerText = '✓';
                                    }}
                                  >
                                    ✓
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                  </tbody>

                  {/* Daily Occupancy Summary Footers */}
                  <tfoot>
                    <tr style={{ background: 'var(--surface-sub)', borderTop: '2px solid var(--border)' }}>
                      <td
                        style={{
                          position: 'sticky',
                          left: 0,
                          zIndex: 20,
                          background: 'var(--surface-sub)',
                          padding: '10px 14px',
                          fontWeight: '800',
                          fontSize: '11.5px',
                          color: 'var(--t-800)',
                          boxShadow: '2px 0 4px rgba(0,0,0,0.04)',
                        }}
                      >
                        Daily Occupancy %
                      </td>
                      {(calendarData?.daily_aggregates || []).map((agg) => (
                        <td
                          key={agg.date}
                          style={{
                            padding: '6px 2px',
                            textAlign: 'center',
                            borderLeft: '1px solid var(--border-sub)',
                            fontSize: '10px',
                            fontWeight: '700',
                            color: agg.occupancy_rate > 0 ? 'var(--brand)' : 'var(--t-500)',
                          }}
                        >
                          <div>{agg.occupancy_rate}%</div>
                          <div style={{ fontSize: '9px', color: 'var(--t-400)' }}>
                            {agg.booked_rooms}/{agg.total_rooms}
                          </div>
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: BOOKING REGISTER & CHECKOUT HISTORY */}
      {activeSubTab === 'reservations' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Booking #</th>
                <th>Guest Name</th>
                <th>Room</th>
                <th>Check-In</th>
                <th>Check-Out</th>
                <th>Total Bill</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td>
                    <span className="badge badge-brand" style={{ fontFamily: 'monospace' }}>
                      {b.booking_number}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: '700', color: 'var(--t-900)' }}>
                      {b.guest?.first_name} {b.guest?.last_name}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--t-500)' }}>{b.guest?.phone}</div>
                  </td>
                  <td>
                    <strong>Room {b.room?.room_number}</strong>
                    <div style={{ fontSize: '11px', color: 'var(--t-500)' }}>{b.room?.room_type}</div>
                  </td>
                  <td>{new Date(b.check_in_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td>
                    {b.check_out_at
                      ? new Date(b.check_out_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                      : new Date(b.expected_check_out_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td>
                    <strong>₹ {Number(b.grand_total).toLocaleString('en-IN')}</strong>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        b.status === 'CHECKED_IN' ? 'badge-success' : b.status === 'CHECKED_OUT' ? 'badge-inactive' : 'badge-brand'
                      }`}
                    >
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: COMPLETE GUEST WALK-IN / CHECK-IN WIZARD WITH KYC DOCS */}
      {/* ============================================================== */}
      {showCheckInModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '19px', fontWeight: '800', color: 'var(--t-900)' }}>
                  Guest Registration & Check-In Wizard
                </h3>
                <p style={{ fontSize: '12.5px', color: 'var(--t-500)' }}>
                  Mandatory Government KYC Verification & Immediate Room Allocation
                </p>
              </div>
              <button onClick={() => setShowCheckInModal(false)} className="btn btn-secondary btn-sm">✕</button>
            </div>

            {actionError && (
              <div style={{ background: 'var(--error-bg)', color: 'var(--error)', border: '1px solid var(--error-border)', padding: '10px 14px', borderRadius: 'var(--r-sm)', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleCheckInSubmit}>
              {/* SECTION A: GUEST PERSONAL INFORMATION */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--brand)', letterSpacing: '0.04em', marginBottom: '10px' }}>
                  1. Guest Personal Information
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">First Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh"
                      className="form-control"
                      value={checkInForm.first_name}
                      onChange={(e) => setCheckInForm({ ...checkInForm, first_name: e.target.value })}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Last Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Verma"
                      className="form-control"
                      value={checkInForm.last_name}
                      onChange={(e) => setCheckInForm({ ...checkInForm, last_name: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Mobile Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 9876543210"
                      className="form-control"
                      value={checkInForm.phone}
                      onChange={(e) => setCheckInForm({ ...checkInForm, phone: e.target.value })}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      placeholder="guest@example.com"
                      className="form-control"
                      value={checkInForm.email}
                      onChange={(e) => setCheckInForm({ ...checkInForm, email: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Nationality *</label>
                    <input
                      type="text"
                      required
                      className="form-control"
                      value={checkInForm.nationality}
                      onChange={(e) => setCheckInForm({ ...checkInForm, nationality: e.target.value })}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Purpose of Visit</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Corporate Business / Leisure"
                      value={checkInForm.purpose_of_visit}
                      onChange={(e) => setCheckInForm({ ...checkInForm, purpose_of_visit: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION B: MANDATORY GOVT IDENTITY & KYC DOCUMENTS */}
              <div style={{ marginBottom: '18px', padding: '14px', background: 'var(--surface-sub)', borderRadius: 'var(--r-card)', border: '1px solid var(--border-sub)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--brand)', letterSpacing: '0.04em' }}>
                    2. Mandatory Govt. KYC Documents (Police / Form C)
                  </div>
                  <span className="badge badge-success">ID Verification Required</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Identity Document Type *</label>
                    <select
                      className="form-select"
                      value={checkInForm.id_type}
                      onChange={(e) => setCheckInForm({ ...checkInForm, id_type: e.target.value })}
                      required
                    >
                      <option value="AADHAAR">Aadhaar Card (UIDAI)</option>
                      <option value="PASSPORT">Passport (Mandatory for Foreigners)</option>
                      <option value="DRIVING_LICENSE">Driving License</option>
                      <option value="VOTER_ID">Voter Identity Card</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Document Identification Number *</label>
                    <input
                      type="text"
                      required
                      placeholder={checkInForm.id_type === 'AADHAAR' ? 'e.g. 5432-8765-1092' : 'Document Number'}
                      className="form-control"
                      value={checkInForm.id_number}
                      onChange={(e) => setCheckInForm({ ...checkInForm, id_number: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Permanent Address</label>
                    <input
                      type="text"
                      placeholder="Residential address as per ID"
                      className="form-control"
                      value={checkInForm.address}
                      onChange={(e) => setCheckInForm({ ...checkInForm, address: e.target.value })}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">City</label>
                    <input
                      type="text"
                      placeholder="e.g. Mumbai"
                      className="form-control"
                      value={checkInForm.city}
                      onChange={(e) => setCheckInForm({ ...checkInForm, city: e.target.value })}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">State</label>
                    <input
                      type="text"
                      placeholder="e.g. Maharashtra"
                      className="form-control"
                      value={checkInForm.state}
                      onChange={(e) => setCheckInForm({ ...checkInForm, state: e.target.value })}
                    />
                  </div>
                </div>

                {checkInForm.nationality.toLowerCase() !== 'indian' && (
                  <div style={{ marginTop: '10px', fontSize: '11.5px', color: '#b45309', background: '#fef3c7', padding: '6px 10px', borderRadius: '4px' }}>
                    ⚠️ Foreign National detected: Passport number & Form C compliance is recorded for local authorities.
                  </div>
                )}
              </div>

              {/* SECTION C: ROOM SELECTION & STAY DURATION */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--brand)', letterSpacing: '0.04em', marginBottom: '10px' }}>
                  3. Room Assignment & Stay Dates
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Select Available Room *</label>
                    <select
                      className="form-select"
                      required
                      value={checkInForm.room_id}
                      onChange={(e) => {
                        const sel = rooms.find(r => r.id === e.target.value);
                        setCheckInForm({
                          ...checkInForm,
                          room_id: e.target.value,
                          room_rate_per_night: sel?.base_price || '',
                        });
                      }}
                    >
                      <option value="">-- Choose an Available Room --</option>
                      {availableRoomsList.map((r) => (
                        <option key={r.id} value={r.id}>
                          Room {r.room_number} - {r.room_type} ({r.floor}) - ₹{r.base_price}/nt
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Expected Check-Out Date & Time *</label>
                    <input
                      type="datetime-local"
                      required
                      className="form-control"
                      value={checkInForm.expected_check_out_at}
                      onChange={(e) => setCheckInForm({ ...checkInForm, expected_check_out_at: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Adults</label>
                    <input
                      type="number"
                      min="1"
                      className="form-control"
                      value={checkInForm.num_adults}
                      onChange={(e) => setCheckInForm({ ...checkInForm, num_adults: e.target.value })}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Children</label>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      value={checkInForm.num_children}
                      onChange={(e) => setCheckInForm({ ...checkInForm, num_children: e.target.value })}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Tariff/Night (₹)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={checkInForm.room_rate_per_night}
                      onChange={(e) => setCheckInForm({ ...checkInForm, room_rate_per_night: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION D: ADVANCE DEPOSIT & PAYMENT */}
              <div style={{ marginBottom: '22px', padding: '14px', background: 'var(--brand-50)', borderRadius: 'var(--r-card)', border: '1px solid var(--brand-200)' }}>
                <div style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--brand)', letterSpacing: '0.04em', marginBottom: '10px' }}>
                  4. Advance Deposit Collection (Optional / Recommended)
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Advance Amount (₹)</label>
                    <input
                      type="number"
                      placeholder="e.g. 3000"
                      className="form-control"
                      value={checkInForm.advance_deposit_amount}
                      onChange={(e) => setCheckInForm({ ...checkInForm, advance_deposit_amount: e.target.value })}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Payment Mode</label>
                    <select
                      className="form-select"
                      value={checkInForm.payment_method}
                      onChange={(e) => setCheckInForm({ ...checkInForm, payment_method: e.target.value })}
                    >
                      <option value="UPI_QR">UPI / QR Code</option>
                      <option value="CASH">Cash</option>
                      <option value="CARD">Debit / Credit Card</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Txn / Ref #</label>
                    <input
                      type="text"
                      placeholder="Optional Txn ID"
                      className="form-control"
                      value={checkInForm.transaction_reference}
                      onChange={(e) => setCheckInForm({ ...checkInForm, transaction_reference: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowCheckInModal(false)}
                  className="btn btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !checkInForm.room_id}
                  className="btn btn-primary"
                  style={{ fontWeight: '700' }}
                >
                  {submitting ? 'Verifying & Registering...' : '✓ Complete Check-In & Allocate Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: GUEST FOLIO BILLING (VIEW CHARGES, ADD EXTRAS & ADVANCES) */}
      {/* ============================================================== */}
      {showFolioModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--border-sub)', paddingBottom: '12px' }}>
              <div>
                <span className="badge badge-brand">Folio #{showFolioModal.booking_number}</span>
                <h3 style={{ fontSize: '19px', fontWeight: '800', color: 'var(--t-900)', marginTop: '4px' }}>
                  Guest Folio & Billing Ledger &bull; Room {showFolioModal.room?.room_number}
                </h3>
                <p style={{ fontSize: '12.5px', color: 'var(--t-500)' }}>
                  Guest: <strong>{showFolioModal.guest?.first_name} {showFolioModal.guest?.last_name}</strong> ({showFolioModal.guest?.phone})
                </p>
              </div>
              <button onClick={() => setShowFolioModal(null)} className="btn btn-secondary btn-sm">✕</button>
            </div>

            {/* Folio Summary Totals */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
              <div style={{ background: 'var(--surface-sub)', padding: '10px 14px', borderRadius: 'var(--r-sm)' }}>
                <div style={{ fontSize: '11px', color: 'var(--t-500)', textTransform: 'uppercase', fontWeight: '700' }}>Total Room Charges</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--t-900)' }}>₹{Number(showFolioModal.total_room_charges).toLocaleString('en-IN')}</div>
              </div>
              <div style={{ background: 'var(--surface-sub)', padding: '10px 14px', borderRadius: 'var(--r-sm)' }}>
                <div style={{ fontSize: '11px', color: 'var(--t-500)', textTransform: 'uppercase', fontWeight: '700' }}>Extra Services</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--t-900)' }}>₹{Number(showFolioModal.total_extra_charges).toLocaleString('en-IN')}</div>
              </div>
              <div style={{ background: 'var(--success-bg)', padding: '10px 14px', borderRadius: 'var(--r-sm)' }}>
                <div style={{ fontSize: '11px', color: 'var(--success)', textTransform: 'uppercase', fontWeight: '700' }}>Total Paid</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--success)' }}>₹{Number(showFolioModal.paid_amount).toLocaleString('en-IN')}</div>
              </div>
              <div style={{ background: showFolioModal.balance_amount > 0 ? 'var(--error-bg)' : 'var(--success-bg)', padding: '10px 14px', borderRadius: 'var(--r-sm)' }}>
                <div style={{ fontSize: '11px', color: showFolioModal.balance_amount > 0 ? 'var(--error)' : 'var(--success)', textTransform: 'uppercase', fontWeight: '700' }}>Balance Due</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: showFolioModal.balance_amount > 0 ? 'var(--error)' : 'var(--success)' }}>₹{Number(showFolioModal.balance_amount).toLocaleString('en-IN')}</div>
              </div>
            </div>

            {/* Action Bar */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button
                onClick={() => {
                  setActionError('');
                  setShowAddChargeModal(true);
                }}
                className="btn btn-secondary btn-sm"
              >
                <Plus size={14} />
                <span>+ Post Extra Charge (F&B / Laundry / Extras)</span>
              </button>

              <button
                onClick={() => {
                  setActionError('');
                  setPaymentForm({
                    amount: showFolioModal.balance_amount > 0 ? showFolioModal.balance_amount : '',
                    payment_method: 'UPI_QR',
                    transaction_reference: '',
                    notes: '',
                  });
                  setShowPaymentModal(true);
                }}
                className="btn btn-secondary btn-sm"
              >
                <CreditCard size={14} />
                <span>+ Collect Payment</span>
              </button>
            </div>

            {/* Itemized Folio Table */}
            <div style={{ border: '1px solid var(--border-sub)', borderRadius: 'var(--r-sm)', overflow: 'hidden', marginBottom: '18px' }}>
              <table className="data-table" style={{ fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-sub)' }}>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                    <th style={{ textAlign: 'right' }}>Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {(!showFolioModal.folio_items || showFolioModal.folio_items.length === 0) ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '16px', color: 'var(--t-500)' }}>
                        No charges posted yet.
                      </td>
                    </tr>
                  ) : (
                    showFolioModal.folio_items.map((item) => (
                      <tr key={item.id}>
                        <td>{new Date(item.charged_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                        <td>
                          <span className="badge badge-brand" style={{ fontSize: '10px' }}>
                            {item.item_type.replace('_', ' ')}
                          </span>
                        </td>
                        <td style={{ fontWeight: '600', color: 'var(--t-900)' }}>{item.description}</td>
                        <td>{item.quantity}</td>
                        <td>₹{Number(item.unit_price).toLocaleString('en-IN')}</td>
                        <td style={{ textAlign: 'right', fontWeight: '700' }}>₹{Number(item.total_price).toLocaleString('en-IN')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Payments History Table */}
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--t-900)', marginBottom: '8px' }}>
              Payment Receipts Collected ({showFolioModal.payments?.length || 0})
            </div>
            <div style={{ border: '1px solid var(--border-sub)', borderRadius: 'var(--r-sm)', overflow: 'hidden', marginBottom: '20px' }}>
              <table className="data-table" style={{ fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-sub)' }}>
                    <th>Receipt #</th>
                    <th>Method</th>
                    <th>Reference / Notes</th>
                    <th>Date</th>
                    <th style={{ textAlign: 'right' }}>Amount Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {(!showFolioModal.payments || showFolioModal.payments.length === 0) ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '16px', color: 'var(--t-500)' }}>
                        No payments recorded yet.
                      </td>
                    </tr>
                  ) : (
                    showFolioModal.payments.map((p) => (
                      <tr key={p.id}>
                        <td><span className="badge badge-success">{p.receipt_number}</span></td>
                        <td><strong>{p.payment_method.replace('_', ' ')}</strong></td>
                        <td style={{ color: 'var(--t-600)' }}>{p.transaction_reference || p.notes || '-'}</td>
                        <td>{new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                        <td style={{ textAlign: 'right', fontWeight: '800', color: 'var(--success)' }}>₹{Number(p.amount).toLocaleString('en-IN')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowFolioModal(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-MODAL: POST EXTRA INCIDENTAL CHARGE TO ROOM FOLIO */}
      {/* ============================================================== */}
      {showAddChargeModal && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h4 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--t-900)' }}>
                Post Charge to Room {showFolioModal?.room?.room_number}
              </h4>
              <button onClick={() => setShowAddChargeModal(false)} className="btn btn-secondary btn-sm">✕</button>
            </div>

            <form onSubmit={handleAddChargeSubmit}>
              <div className="form-group">
                <label className="form-label">Charge Category *</label>
                <select
                  className="form-select"
                  value={chargeForm.item_type}
                  onChange={(e) => setChargeForm({ ...chargeForm, item_type: e.target.value })}
                  required
                >
                  <option value="FOOD_BEVERAGE">Food & Beverage (Room Service / Dining)</option>
                  <option value="LAUNDRY">Laundry Service</option>
                  <option value="EXTRA_BED">Extra Bed / Rollaway Mattress</option>
                  <option value="MISC">Airport Transfer / Minibar / Misc</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Club Sandwich + Cold Coffee"
                  className="form-control"
                  value={chargeForm.description}
                  onChange={(e) => setChargeForm({ ...chargeForm, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    className="form-control"
                    value={chargeForm.quantity}
                    onChange={(e) => setChargeForm({ ...chargeForm, quantity: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Unit Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 450"
                    className="form-control"
                    value={chargeForm.unit_price}
                    onChange={(e) => setChargeForm({ ...chargeForm, unit_price: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button type="button" onClick={() => setShowAddChargeModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Posting...' : '✓ Add to Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-MODAL: COLLECT MID-STAY PAYMENT */}
      {/* ============================================================== */}
      {showPaymentModal && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal-content" style={{ maxWidth: '460px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h4 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--t-900)' }}>
                Collect Payment &bull; Room {showFolioModal?.room?.room_number}
              </h4>
              <button onClick={() => setShowPaymentModal(false)} className="btn btn-secondary btn-sm">✕</button>
            </div>

            <form onSubmit={handleRecordPaymentSubmit}>
              <div className="form-group">
                <label className="form-label">Amount to Collect (₹) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  className="form-control"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Payment Method *</label>
                <select
                  className="form-select"
                  value={paymentForm.payment_method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                  required
                >
                  <option value="UPI_QR">UPI / QR Code (GPay / PhonePe / Paytm)</option>
                  <option value="CARD">Credit / Debit Card</option>
                  <option value="CASH">Cash at Desk</option>
                  <option value="BANK_TRANSFER">Direct Bank Transfer</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Txn / UTR Reference</label>
                <input
                  type="text"
                  placeholder="e.g. UPI/12345678"
                  className="form-control"
                  value={paymentForm.transaction_reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, transaction_reference: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button type="button" onClick={() => setShowPaymentModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Recording...' : '✓ Record Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: CHECK-OUT, SETTLEMENT & PRINT TAX INVOICE */}
      {/* ============================================================== */}
      {showCheckOutModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '540px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--t-900)' }}>
                  Guest Check-Out & Bill Settlement
                </h3>
                <p style={{ fontSize: '12.5px', color: 'var(--t-500)' }}>
                  Room {showCheckOutModal.room?.room_number} &bull; Guest: {showCheckOutModal.guest?.first_name} {showCheckOutModal.guest?.last_name}
                </p>
              </div>
              <button onClick={() => setShowCheckOutModal(null)} className="btn btn-secondary btn-sm">✕</button>
            </div>

            {/* Bill Settlement Overview */}
            <div style={{ background: 'var(--surface-sub)', padding: '16px', borderRadius: 'var(--r-card)', marginBottom: '18px', border: '1px solid var(--border-sub)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span style={{ color: 'var(--t-600)' }}>Room Rent ({showCheckOutModal.total_nights} Nights):</span>
                <strong>₹{Number(showCheckOutModal.total_room_charges).toLocaleString('en-IN')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span style={{ color: 'var(--t-600)' }}>Extra Charges (F&B / Laundry):</span>
                <strong>₹{Number(showCheckOutModal.total_extra_charges).toLocaleString('en-IN')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span style={{ color: 'var(--t-600)' }}>GST (12% Included):</span>
                <strong>₹{Number(showCheckOutModal.tax_amount).toLocaleString('en-IN')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', paddingTop: '8px', borderTop: '1px solid var(--border-sub)', marginBottom: '8px' }}>
                <strong style={{ color: 'var(--t-900)' }}>Grand Total Bill:</strong>
                <strong style={{ color: 'var(--t-900)', fontSize: '16px' }}>₹{Number(showCheckOutModal.grand_total).toLocaleString('en-IN')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--success)', marginBottom: '6px' }}>
                <span>Already Paid in Advance:</span>
                <strong>- ₹{Number(showCheckOutModal.paid_amount).toLocaleString('en-IN')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', paddingTop: '8px', borderTop: '1px solid var(--border-sub)', color: showCheckOutModal.balance_amount > 0 ? 'var(--error)' : 'var(--success)' }}>
                <strong>Net Balance Due:</strong>
                <strong>₹{Number(showCheckOutModal.balance_amount).toLocaleString('en-IN')}</strong>
              </div>
            </div>

            <form onSubmit={handleCheckOutSubmit}>
              {showCheckOutModal.balance_amount > 0 && (
                <div>
                  <div className="form-group">
                    <label className="form-label">Settlement Amount to Collect (₹) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      className="form-control"
                      value={checkOutForm.settlement_amount}
                      onChange={(e) => setCheckOutForm({ ...checkOutForm, settlement_amount: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Payment Mode *</label>
                    <select
                      className="form-select"
                      value={checkOutForm.payment_method}
                      onChange={(e) => setCheckOutForm({ ...checkOutForm, payment_method: e.target.value })}
                      required
                    >
                      <option value="UPI_QR">UPI / QR Code</option>
                      <option value="CARD">Credit / Debit Card</option>
                      <option value="CASH">Cash</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                    </select>
                  </div>
                </div>
              )}

              <div style={{ fontSize: '12px', color: 'var(--t-500)', marginBottom: '18px', background: 'var(--brand-50)', padding: '10px 12px', borderRadius: 'var(--r-sm)' }}>
                ℹ️ Completing check-out will automatically mark <strong>Room {showCheckOutModal.room?.room_number} as DIRTY</strong> for housekeeping inspection.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowCheckOutModal(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary" style={{ fontWeight: '700' }}>
                  {submitting ? 'Settling...' : '✓ Settle Bill, Check-Out & Generate Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* PRINTABLE GST TAX INVOICE POPUP */}
      {/* ============================================================== */}
      {invoiceData && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px', padding: '32px' }}>
            <div style={{ textAlign: 'right', marginBottom: '10px' }}>
              <button onClick={() => setInvoiceData(null)} className="btn btn-secondary btn-sm">✕ Close</button>
            </div>

            {/* Print Header */}
            <div style={{ textAlign: 'center', borderBottom: '2px solid var(--t-900)', paddingBottom: '16px', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--t-900)' }}>{invoiceData.hotel?.name}</h2>
              <p style={{ fontSize: '12px', color: 'var(--t-600)', margin: '2px 0' }}>
                {invoiceData.hotel?.city}, India &bull; Phone: {invoiceData.hotel?.phone}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--t-800)', fontWeight: '700' }}>
                GSTIN / Tax No: {invoiceData.hotel?.tax_number}
              </p>
              <div style={{ display: 'inline-block', marginTop: '6px', padding: '3px 12px', background: 'var(--t-900)', color: 'white', borderRadius: '4px', fontSize: '11px', fontWeight: '700', letterSpacing: '0.04em' }}>
                ORIGINAL TAX INVOICE
              </div>
            </div>

            {/* Invoice Meta Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '12.5px', marginBottom: '20px' }}>
              <div>
                <div style={{ color: 'var(--t-500)', fontSize: '11px', textTransform: 'uppercase', fontWeight: '700' }}>Guest Details:</div>
                <div style={{ fontWeight: '800', color: 'var(--t-900)', fontSize: '14px' }}>{invoiceData.guest?.name}</div>
                <div>Phone: {invoiceData.guest?.phone}</div>
                <div>ID Proof: {invoiceData.guest?.id_type} ({invoiceData.guest?.id_number})</div>
                <div>Address: {invoiceData.guest?.address || 'India'}</div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div>Invoice #: <strong>{invoiceData.invoice_number}</strong></div>
                <div>Date: {invoiceData.date}</div>
                <div>Room: <strong>{invoiceData.stay?.room_number} ({invoiceData.stay?.room_type})</strong></div>
                <div>Duration: <strong>{invoiceData.stay?.nights} Night(s)</strong></div>
              </div>
            </div>

            {/* Itemized Line Items */}
            <div style={{ border: '1px solid var(--border-sub)', borderRadius: 'var(--r-sm)', overflow: 'hidden', marginBottom: '20px' }}>
              <table className="data-table" style={{ fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-sub)' }}>
                    <th>Particulars</th>
                    <th>Qty</th>
                    <th style={{ textAlign: 'right' }}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceData.folio_items?.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.description}</td>
                      <td>{item.quantity}</td>
                      <td style={{ textAlign: 'right' }}>₹{Number(item.total_price).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tax and Total Calculations */}
            <div style={{ width: '280px', marginLeft: 'auto', fontSize: '12.5px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Taxable Amount:</span>
                <strong>₹{Number(invoiceData.charges?.taxable_amount).toLocaleString('en-IN')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>CGST (6%):</span>
                <strong>₹{(invoiceData.charges?.gst_12_percent / 2).toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span>SGST (6%):</span>
                <strong>₹{(invoiceData.charges?.gst_12_percent / 2).toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: '800', borderTop: '2px solid var(--t-900)', paddingTop: '6px', color: 'var(--t-900)' }}>
                <span>Invoice Total:</span>
                <span>₹{Number(invoiceData.charges?.grand_total).toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)', marginTop: '4px', fontWeight: '700' }}>
                <span>Total Amount Paid:</span>
                <span>₹{Number(invoiceData.charges?.total_paid).toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Paid Stamp & Action */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-sub)', paddingTop: '16px' }}>
              <div style={{ border: '2px solid var(--success)', padding: '6px 14px', borderRadius: '6px', color: 'var(--success)', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '14px', transform: 'rotate(-4deg)' }}>
                PAID &amp; SETTLED
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => window.print()} className="btn btn-primary btn-sm">
                  <Printer size={14} />
                  <span>Print Tax Invoice</span>
                </button>
                <button onClick={() => setInvoiceData(null)} className="btn btn-secondary btn-sm">
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 6: INDIVIDUAL ROOM 1-MONTH CALENDAR & OCCUPANCY VIEW */}
      {/* ============================================================== */}
      {selectedRoomForModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '840px', maxHeight: '92vh', overflowY: 'auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', borderBottom: '1px solid var(--border-sub)', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span
                  style={{
                    fontSize: '18px',
                    fontWeight: '800',
                    color: 'var(--brand)',
                    background: 'var(--brand-50)',
                    border: '1px solid var(--brand-200)',
                    padding: '4px 12px',
                    borderRadius: 'var(--r-sm)',
                    fontFamily: 'monospace',
                  }}
                >
                  Room {selectedRoomForModal.room_number}
                </span>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--t-900)' }}>
                    {selectedRoomForModal.room_type} • 1-Month Booking Calendar
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--t-500)', marginTop: '2px' }}>
                    {selectedRoomForModal.floor} • Base Rate: <strong>₹{Number(selectedRoomForModal.base_price).toLocaleString('en-IN')}/night</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedRoomForModal(null)}
                className="btn btn-secondary btn-sm"
              >
                ✕
              </button>
            </div>

            {/* Navigation & Summary Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface-sub)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '2px' }}>
                <button
                  onClick={() => roomModalCalendar?.prev_month && loadRoomModalCalendar(selectedRoomForModal.id, roomModalCalendar.prev_month)}
                  className="btn btn-secondary btn-sm"
                  style={{ border: 'none', background: 'transparent', padding: '6px 10px' }}
                >
                  <ChevronLeft size={16} />
                </button>
                <div style={{ padding: '0 14px', fontSize: '14px', fontWeight: '800', color: 'var(--t-900)', minWidth: '140px', textAlign: 'center' }}>
                  {roomModalCalendar?.month_label || 'October 2026'}
                </div>
                <button
                  onClick={() => roomModalCalendar?.next_month && loadRoomModalCalendar(selectedRoomForModal.id, roomModalCalendar.next_month)}
                  className="btn btn-secondary btn-sm"
                  style={{ border: 'none', background: 'transparent', padding: '6px 10px' }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Quick stats for this room */}
              {roomModalCalendar?.rooms?.[0] && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', fontWeight: '600', flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--brand)', background: 'var(--brand-50)', padding: '4px 10px', borderRadius: 'var(--r-pill)' }}>
                    🟣 Booked: {roomModalCalendar.rooms[0].booked_days_count} Nights
                  </span>
                  <span style={{ color: 'var(--success)', background: 'var(--success-bg)', padding: '4px 10px', borderRadius: 'var(--r-pill)' }}>
                    🟢 Available: {roomModalCalendar.rooms[0].available_days_count} Nights
                  </span>
                  <span style={{ color: 'var(--t-700)', background: 'var(--surface-sub)', padding: '4px 10px', borderRadius: 'var(--r-pill)' }}>
                    Occupancy: {roomModalCalendar.rooms[0].occupancy_pct}
                  </span>
                </div>
              )}
            </div>

            {/* 7-Column Monthly Calendar Grid (Sun - Sat) */}
            {roomModalLoading ? (
              <div style={{ textAlign: 'center', padding: '60px' }}>
                <div style={{ width: '32px', height: '32px', border: '3px solid var(--border)', borderTopColor: 'var(--brand)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                <p style={{ color: 'var(--t-500)', fontSize: '13px' }}>Loading room monthly availability...</p>
              </div>
            ) : (
              <div>
                {/* Days of week header */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', textAlign: 'center', fontWeight: '700', fontSize: '12px', color: 'var(--t-600)', marginBottom: '8px' }}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} style={{ padding: '6px 0', background: 'var(--surface-sub)', borderRadius: 'var(--r-xs)' }}>
                      {day}
                    </div>
                  ))}
                </div>

                {/* Day Cells Grid */}
                {(() => {
                  const roomCal = roomModalCalendar?.rooms?.[0];
                  if (!roomCal) return null;

                  const firstDateStr = roomCal.days[0]?.date;
                  const firstDayOfWeek = firstDateStr ? new Date(firstDateStr).getDay() : 0;
                  const emptyLeadingSlots = Array.from({ length: firstDayOfWeek });

                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                      {/* Leading Empty Cells */}
                      {emptyLeadingSlots.map((_, i) => (
                        <div key={`empty-${i}`} style={{ minHeight: '74px', background: 'transparent' }} />
                      ))}

                      {/* Actual Month Days */}
                      {roomCal.days.map((d) => {
                        const isBooked = d.status === 'BOOKED';
                        const isDirty = d.status === 'DIRTY';

                        return (
                          <div
                            key={d.date}
                            style={{
                              minHeight: '74px',
                              padding: '8px',
                              borderRadius: 'var(--r-sm)',
                              border: d.is_today
                                ? '2px solid var(--brand)'
                                : isBooked
                                ? '1px solid var(--brand-200)'
                                : '1px solid var(--border-sub)',
                              background: isBooked
                                ? 'var(--brand-50)'
                                : isDirty
                                ? '#fef3c7'
                                : '#f0fdf4',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              transition: 'all 0.15s ease',
                              cursor: 'pointer',
                            }}
                            onClick={() => {
                              if (isBooked && d.booking?.id) {
                                const found = bookings.find(b => b.id === d.booking.id);
                                if (found) {
                                  setSelectedRoomForModal(null);
                                  setShowFolioModal(found);
                                } else {
                                  frontOfficeApi.getBookingDetail(d.booking.id).then(res => {
                                    if (res.success) {
                                      setSelectedRoomForModal(null);
                                      setShowFolioModal(res.booking);
                                    }
                                  });
                                }
                              } else if (!isBooked) {
                                const nextDay = new Date(d.date);
                                nextDay.setDate(nextDay.getDate() + 1);
                                nextDay.setHours(11, 0, 0, 0);
                                setCheckInForm(prev => ({
                                  ...prev,
                                  room_id: selectedRoomForModal.id,
                                  room_rate_per_night: selectedRoomForModal.base_price,
                                  expected_check_out_at: nextDay.toISOString().slice(0, 16),
                                }));
                                setSelectedRoomForModal(null);
                                setShowCheckInModal(true);
                              }
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: '13px', fontWeight: '800', color: d.is_today ? 'var(--brand)' : 'var(--t-900)' }}>
                                {d.day}
                              </span>
                              {d.is_today && (
                                <span className="badge badge-brand" style={{ fontSize: '8.5px', padding: '1px 5px' }}>
                                  TODAY
                                </span>
                              )}
                            </div>

                            {isBooked ? (
                              <div style={{ marginTop: '4px' }}>
                                <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--brand)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  👤 {d.booking?.guest_name}
                                </div>
                                <div style={{ fontSize: '9.5px', color: 'var(--t-500)', marginTop: '1px' }}>
                                  {d.booking?.is_check_in_day ? 'Arrival' : d.booking?.is_check_out_day ? 'Departure' : 'Stay'}
                                </div>
                              </div>
                            ) : isDirty ? (
                              <div style={{ fontSize: '10px', color: '#b45309', fontWeight: '700', marginTop: '4px' }}>
                                🧹 Dirty
                              </div>
                            ) : (
                              <div style={{ marginTop: '4px' }}>
                                <div style={{ fontSize: '10px', color: '#15803d', fontWeight: '700' }}>
                                  ✓ Available
                                </div>
                                <div style={{ fontSize: '9.5px', color: 'var(--t-500)' }}>
                                  ₹{selectedRoomForModal.base_price}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Modal Footer */}
            <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid var(--border-sub)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ fontSize: '12px', color: 'var(--t-500)' }}>
                Tip: Click on any <strong>green available date</strong> to check in guest to this room.
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setSelectedRoomForModal(null)}
                  className="btn btn-secondary"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setCheckInForm(prev => ({
                      ...prev,
                      room_id: selectedRoomForModal.id,
                      room_rate_per_night: selectedRoomForModal.base_price,
                    }));
                    setSelectedRoomForModal(null);
                    setShowCheckInModal(true);
                  }}
                  className="btn btn-primary"
                >
                  <UserCheck size={14} />
                  <span>+ Check-In to Room {selectedRoomForModal.room_number}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricBox({ icon: Icon, label, value, subtext, color, bg }) {
  return (
    <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
      <div style={{ width: '42px', height: '42px', borderRadius: 'var(--r-card)', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: color }}>
        <Icon size={20} />
      </div>
      <div>
        <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--t-500)', textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--t-900)', marginTop: '1px' }}>{value}</div>
        <div style={{ fontSize: '11px', color: 'var(--t-500)', marginTop: '1px' }}>{subtext}</div>
      </div>
    </div>
  );
}
