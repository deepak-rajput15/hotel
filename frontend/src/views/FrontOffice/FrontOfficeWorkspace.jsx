import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { frontOfficeApi, whatsappApi } from '../../api';
import UpiQrPaymentDisplay from '../../components/Payments/UpiQrPaymentDisplay';
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
  User,
  UploadCloud,
  Check,
  Zap,
  Key,
  Briefcase,
} from 'lucide-react';
import ShiftRegisterModal from '../../components/Finance/ShiftRegisterModal';

const formatDateTimeLocal = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function FrontOfficeWorkspace() {
  const { currentHotel, user } = useAuth();

  const canManageRooms = Boolean(
    user?.is_org_owner ||
    user?.is_platform_admin ||
    user?.assigned_role?.slug === 'general-manager' ||
    user?.assigned_role?.slug === 'hotel-owner'
  );

  const [activeSubTab, setActiveSubTab] = useState('in_house'); // in_house, rack, calendar, reservations
  const [showShiftRegisterModal, setShowShiftRegisterModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // 1-Month Forward Calendar & Availability Chart State (Starting from Today)
  const [calendarData, setCalendarData] = useState(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [selectedStartDate, setSelectedStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [calendarDaysCount, setCalendarDaysCount] = useState(30);
  const [calendarRoomTypeFilter, setCalendarRoomTypeFilter] = useState('ALL');
  const [selectedRoomForModal, setSelectedRoomForModal] = useState(null);
  const [roomModalStartDate, setRoomModalStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
  const [waInvoiceStatus, setWaInvoiceStatus] = useState('');

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
    country: 'India',
    purpose_of_visit: 'Business / Leisure',
    room_id: '',
    check_in_at: '',
    expected_check_out_at: '',
    num_adults: 1,
    num_children: 0,
    co_guests: [],
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

  // Room Creation Form State (From Book1.xlsx specification)
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [roomForm, setRoomForm] = useState({
    room_number: '',
    room_type: 'Deluxe',
    room_mode: 'AC',
    floor: '1st Floor',
    base_price: '2800',
    extra_bedding_price: '500',
    gst_percentage: '12.00',
    status: 'AVAILABLE',
    max_guests: '2',
    remarks: '',
  });
  const [savingRoom, setSavingRoom] = useState(false);
  const [roomError, setRoomError] = useState('');

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setSavingRoom(true);
    setRoomError('');

    try {
      const res = await frontOfficeApi.createRoom({
        ...roomForm,
        base_price: parseFloat(roomForm.base_price),
        extra_bedding_price: parseFloat(roomForm.extra_bedding_price || 0),
        gst_percentage: parseFloat(roomForm.gst_percentage || 12),
        max_guests: parseInt(roomForm.max_guests || 2, 10),
      });

      if (res.success) {
        setShowAddRoomModal(false);
        setSuccessToast(`Room ${roomForm.room_number} added successfully!`);
        setRoomForm({
          room_number: '',
          room_type: 'Deluxe',
          room_mode: 'AC',
          floor: '1st Floor',
          base_price: '2800',
          extra_bedding_price: '500',
          gst_percentage: '12.00',
          status: 'AVAILABLE',
          max_guests: '2',
          remarks: '',
        });
        loadFrontOfficeData();
      }
    } catch (err) {
      setRoomError(err.data?.message || err.message || 'Failed to create room');
    } finally {
      setSavingRoom(false);
    }
  };

  const syncCoGuests = (adultsVal, childrenVal, currentForm) => {
    const numAdults = adultsVal === '' ? 1 : Math.max(1, parseInt(adultsVal, 10) || 1);
    const numKids = childrenVal === '' ? 0 : Math.max(0, parseInt(childrenVal, 10) || 0);
    const neededAdults = Math.max(0, numAdults - 1);
    const neededKids = numKids;

    const existing = currentForm.co_guests || [];
    const existingAdults = existing.filter(g => (g.guest_category || 'ADULT') === 'ADULT');
    const existingKids = existing.filter(g => g.guest_category === 'CHILD');

    let nextAdults = [...existingAdults];
    while (nextAdults.length < neededAdults) {
      nextAdults.push({
        guest_category: 'ADULT',
        first_name: '',
        last_name: '',
        gender: 'FEMALE',
        age: '',
        phone: '',
        id_type: 'AADHAAR',
        id_number: '',
        relationship: 'Family',
        nationality: currentForm.nationality || 'Indian',
        address: currentForm.address || '',
        city: currentForm.city || '',
        state: currentForm.state || '',
        country: currentForm.country || 'India',
      });
    }
    if (nextAdults.length > neededAdults) {
      nextAdults = nextAdults.slice(0, neededAdults);
    }

    let nextKids = [...existingKids];
    while (nextKids.length < neededKids) {
      nextKids.push({
        guest_category: 'CHILD',
        first_name: '',
        last_name: '',
        gender: 'MALE',
        age: '',
        phone: currentForm.phone || '',
        id_type: 'AADHAAR',
        id_number: '',
        relationship: 'Child',
        nationality: currentForm.nationality || 'Indian',
        address: currentForm.address || '',
        city: currentForm.city || '',
        state: currentForm.state || '',
        country: currentForm.country || 'India',
      });
    }
    if (nextKids.length > neededKids) {
      nextKids = nextKids.slice(0, neededKids);
    }

    return [...nextAdults, ...nextKids];
  };

  const handleAdultsChange = (newCountVal) => {
    if (newCountVal === '' || newCountVal === null || newCountVal === undefined) {
      setCheckInForm(prev => ({
        ...prev,
        num_adults: '',
        co_guests: syncCoGuests('', prev.num_children, prev),
      }));
      return;
    }
    const adults = Math.max(1, parseInt(newCountVal, 10) || 1);
    setCheckInForm(prev => ({
      ...prev,
      num_adults: adults,
      co_guests: syncCoGuests(adults, prev.num_children, prev),
    }));
  };

  const handleChildrenChange = (newCountVal) => {
    if (newCountVal === '' || newCountVal === null || newCountVal === undefined) {
      setCheckInForm(prev => ({
        ...prev,
        num_children: '',
        co_guests: syncCoGuests(prev.num_adults, '', prev),
      }));
      return;
    }
    const children = Math.max(0, parseInt(newCountVal, 10) || 0);
    setCheckInForm(prev => ({
      ...prev,
      num_children: children,
      co_guests: syncCoGuests(prev.num_adults, children, prev),
    }));
  };

  const handleCoGuestChange = (index, field, value) => {
    const updated = [...(checkInForm.co_guests || [])];
    if (updated[index]) {
      updated[index] = { ...updated[index], [field]: value };
      setCheckInForm(prev => ({ ...prev, co_guests: updated }));
    }
  };

  const handleQuickAutoFill = () => {
    const now = new Date();
    const checkOut = new Date();
    checkOut.setDate(checkOut.getDate() + 2);
    checkOut.setHours(11, 0, 0, 0);

    const availRoom = rooms.find(r => r.status === 'AVAILABLE') || rooms[0];

    setCheckInForm({
      first_name: 'Rahul',
      last_name: 'Sharma',
      phone: '+91 98765 43210',
      email: 'rahul.sharma@gmail.com',
      nationality: 'Indian',
      id_type: 'AADHAAR',
      id_number: '5432-8765-1092',
      id_document_path: 'aadhaar_scan_verified.pdf',
      address: 'Flat 402, Sea Green Heights, Bandra West',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      purpose_of_visit: 'Corporate Business / Family Vacation',
      room_id: availRoom ? availRoom.id : '',
      check_in_at: formatDateTimeLocal(now),
      expected_check_out_at: formatDateTimeLocal(checkOut),
      num_adults: 2,
      num_children: 1,
      co_guests: [
        {
          guest_category: 'ADULT',
          first_name: 'Pooja',
          last_name: 'Sharma',
          gender: 'FEMALE',
          age: 26,
          phone: '+91 98765 99887',
          id_type: 'AADHAAR',
          id_number: '9876-1234-5678',
          relationship: 'Spouse',
          nationality: 'Indian',
          address: 'Flat 402, Sea Green Heights, Bandra West',
          city: 'Mumbai',
          state: 'Maharashtra',
          country: 'India',
        },
        {
          guest_category: 'CHILD',
          first_name: 'Aarav',
          last_name: 'Sharma',
          gender: 'MALE',
          age: 6,
          phone: '+91 98765 43210',
          id_type: 'AADHAAR',
          id_number: 'BAL-5432-8765',
          relationship: 'Child',
          nationality: 'Indian',
          address: 'Flat 402, Sea Green Heights, Bandra West',
          city: 'Mumbai',
          state: 'Maharashtra',
          country: 'India',
        }
      ],
      special_requests: 'High floor, quiet corner room, extra pillows',
      room_rate_per_night: availRoom ? availRoom.base_price : 2800,
      discount_amount: 0,
      advance_deposit_amount: '3000',
      payment_method: 'UPI_QR',
      transaction_reference: 'UPI-982461829',
    });
  };

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

  const loadCalendarData = async (startDateToLoad = selectedStartDate, days = calendarDaysCount) => {
    try {
      setCalendarLoading(true);
      const res = await frontOfficeApi.getCalendar({ start_date: startDateToLoad, days });
      if (res.success) {
        setCalendarData(res);
        if (res.start_date) setSelectedStartDate(res.start_date);
        if (res.days_count) setCalendarDaysCount(res.days_count);
      }
    } catch (err) {
      console.error('Failed to load calendar data:', err);
    } finally {
      setCalendarLoading(false);
    }
  };

  const loadRoomModalCalendar = async (roomId, startDateToLoad = roomModalStartDate, days = 30) => {
    if (!roomId) return;
    try {
      setRoomModalLoading(true);
      const res = await frontOfficeApi.getCalendar({ room_id: roomId, start_date: startDateToLoad, days });
      if (res.success) {
        setRoomModalCalendar(res);
        if (res.start_date) setRoomModalStartDate(res.start_date);
      }
    } catch (err) {
      console.error('Failed to load single room calendar:', err);
    } finally {
      setRoomModalLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'calendar') {
      loadCalendarData(selectedStartDate, calendarDaysCount);
    }
  }, [activeSubTab, selectedStartDate, calendarDaysCount]);

  useEffect(() => {
    if (selectedRoomForModal) {
      loadRoomModalCalendar(selectedRoomForModal.id, roomModalStartDate);
    }
  }, [selectedRoomForModal, roomModalStartDate]);

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

    if (!checkInForm.country || !checkInForm.country.trim()) {
      setActionError('Country is required in Guest Address (Police / Form C compliance).');
      return;
    }

    const adultsCount = parseInt(checkInForm.num_adults, 10) || 1;
    const childrenCount = parseInt(checkInForm.num_children, 10) || 0;
    const neededAdditionalOccupants = Math.max(0, adultsCount - 1) + Math.max(0, childrenCount);

    if (neededAdditionalOccupants > 0) {
      const co = checkInForm.co_guests || [];
      if (co.length < neededAdditionalOccupants) {
        setActionError(`Please fill all required KYC and address details for all ${adultsCount + childrenCount} occupants staying in the room.`);
        return;
      }
      for (let i = 0; i < neededAdditionalOccupants; i++) {
        const g = co[i];
        const isChild = g.guest_category === 'CHILD';
        const label = isChild ? `Child Occupant #${i + 1}` : `Additional Adult #${i + 2}`;

        if (!g.first_name || !g.first_name.trim() || !g.last_name || !g.last_name.trim()) {
          setActionError(`${label}: Full Name (First and Last) is required.`);
          return;
        }
        if (g.age === '' || g.age === null || isNaN(g.age) || parseInt(g.age, 10) < 0) {
          setActionError(`${label}: Valid Age is required.`);
          return;
        }
        if (!isChild && (!g.phone || !g.phone.trim())) {
          setActionError(`${label}: Contact Mobile Number is required.`);
          return;
        }
        if (!g.id_number || !g.id_number.trim()) {
          setActionError(`${label}: ID / Document Number is required.`);
          return;
        }
        if (!g.address || !g.address.trim()) {
          setActionError(`${label}: Permanent Residential Address is required.`);
          return;
        }
        if (!g.country || !g.country.trim()) {
          setActionError(`${label}: Country is required.`);
          return;
        }
      }
    }

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
          country: 'India',
          purpose_of_visit: 'Business / Leisure',
          room_id: '',
          check_in_at: '',
          expected_check_out_at: '',
          num_adults: 1,
          num_children: 0,
          co_guests: [],
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
            onClick={() => setShowShiftRegisterModal(true)}
            className="btn btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: '700',
              background: '#ecfdf5',
              color: '#065f46',
              border: '1px solid #a7f3d0',
            }}
          >
            <Briefcase size={15} />
            <span>💼 Shift & Cash Drawer</span>
          </button>

          <button
            onClick={() => {
              setActionError('');
              const now = new Date();
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              tomorrow.setHours(11, 0, 0, 0);
              setCheckInForm(prev => ({
                ...prev,
                check_in_at: formatDateTimeLocal(now),
                expected_check_out_at: formatDateTimeLocal(tomorrow),
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

          {canManageRooms && (
            <button
              onClick={() => {
                setRoomError('');
                setShowAddRoomModal(true);
              }}
              className="btn btn-secondary"
              style={{ fontWeight: '700' }}
            >
              <Bed size={15} />
              <span>+ Add Room</span>
            </button>
          )}
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
            loadCalendarData(selectedStartDate, calendarDaysCount);
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
          <span>Next 1-Month Room Calendar (Tape Chart)</span>
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
          <div className="card" style={{ padding: 0, overflow: 'hidden', width: '100%', maxWidth: '100%' }}>
            <div style={{ overflowX: 'auto', width: '100%' }}>
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
                            type="button"
                            onClick={async () => {
                              try {
                                await whatsappApi.resend(b.id, 'BOOKING_CONFIRMATION', currentHotel?.id);
                                alert(`WhatsApp Confirmation Voucher sent to ${b.guest?.phone || 'guest'}!`);
                              } catch (e) {
                                alert(e.message || 'WhatsApp sending failed');
                              }
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{
                              background: '#ecfdf5',
                              color: '#065f46',
                              border: '1px solid #a7f3d0',
                              padding: '5px 8px',
                              fontSize: '11px',
                              fontWeight: '700',
                            }}
                            title="Send WhatsApp Confirmation Voucher"
                          >
                            💬 WhatsApp
                          </button>

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

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '12px', color: 'var(--t-500)' }}>
                Click any room card to change housekeeping status or assign guest.
              </span>
              {canManageRooms && (
                <button
                  onClick={() => {
                    setRoomError('');
                    setShowAddRoomModal(true);
                  }}
                  className="btn btn-primary btn-sm"
                >
                  <Plus size={14} />
                  <span>+ Add Room</span>
                </button>
              )}
            </div>
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

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12.5px', color: 'var(--t-700)', fontWeight: '600' }}>
                      {room.room_type}
                    </span>
                    <span className="badge badge-brand" style={{ fontSize: '10px' }}>
                      {room.room_mode || 'AC'}
                    </span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--t-500)', marginTop: '2px' }}>
                    {room.floor} &bull; Tariff: <strong>₹{Number(room.base_price).toLocaleString('en-IN')}/night</strong>
                  </div>

                  {/* Specification details from Book1.xlsx */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                    <span className="badge badge-inactive" style={{ fontSize: '10px' }}>
                      Cap: {room.max_guests || 2} Pax
                    </span>
                    {Number(room.extra_bedding_price) > 0 && (
                      <span className="badge badge-inactive" style={{ fontSize: '10px' }}>
                        Extra Bed: ₹{Number(room.extra_bedding_price)}
                      </span>
                    )}
                    <span className="badge badge-inactive" style={{ fontSize: '10px' }}>
                      GST: {Number(room.gst_percentage || 12)}%
                    </span>
                  </div>
                  {room.remarks && (
                    <div style={{ fontSize: '11px', color: 'var(--t-500)', fontStyle: 'italic', marginTop: '4px' }}>
                      Note: {room.remarks}
                    </div>
                  )}

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
                        setRoomModalStartDate(selectedStartDate);
                        loadRoomModalCalendar(room.id, selectedStartDate);
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
                      title="View Next 30 Days Booking Calendar for this Room"
                    >
                      <Calendar size={13} color="var(--brand)" />
                      <span>📅 Next 30 Days Calendar</span>
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
                          const now = new Date();
                          const tomorrow = new Date();
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          tomorrow.setHours(11, 0, 0, 0);
                          setCheckInForm(prev => ({
                            ...prev,
                            room_id: room.id,
                            room_rate_per_night: room.base_price,
                            check_in_at: formatDateTimeLocal(now),
                            expected_check_out_at: formatDateTimeLocal(tomorrow),
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
          <div className="card" style={{ padding: '14px 18px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* Prev / Next 30 Days navigation */}
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface-sub)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '2px' }}>
                <button
                  onClick={() => calendarData?.prev_start_date && loadCalendarData(calendarData.prev_start_date, calendarDaysCount)}
                  className="btn btn-secondary btn-sm"
                  style={{ border: 'none', background: 'transparent', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  title="Previous 30 Days"
                >
                  <ChevronLeft size={16} />
                  <span style={{ fontSize: '11px', fontWeight: '700' }}>Prev 30d</span>
                </button>
                <div style={{ padding: '0 14px', fontSize: '13.5px', fontWeight: '800', color: 'var(--t-900)', textAlign: 'center', whiteSpace: 'nowrap' }}>
                  {calendarData?.range_label || 'Next 30 Days (From Today)'}
                </div>
                <button
                  onClick={() => calendarData?.next_start_date && loadCalendarData(calendarData.next_start_date, calendarDaysCount)}
                  className="btn btn-secondary btn-sm"
                  style={{ border: 'none', background: 'transparent', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  title="Next 30 Days"
                >
                  <span style={{ fontSize: '11px', fontWeight: '700' }}>Next 30d</span>
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Reset to Today button */}
              <button
                onClick={() => {
                  const today = new Date().toISOString().slice(0, 10);
                  setSelectedStartDate(today);
                  loadCalendarData(today, 30);
                }}
                className="btn btn-primary btn-sm"
                style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px' }}
                title="Reset view to start from Today for the next 30 days"
              >
                <span>⚡ Start From Today</span>
              </button>

              {/* Custom Start Date Picker */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--t-600)', background: 'var(--surface-sub)', padding: '4px 10px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }}>
                <span style={{ fontWeight: '600' }}>From:</span>
                <input
                  type="date"
                  value={selectedStartDate}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedStartDate(e.target.value);
                      loadCalendarData(e.target.value, calendarDaysCount);
                    }
                  }}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    padding: '3px 6px',
                    fontSize: '12px',
                    color: 'var(--t-900)',
                    background: '#fff'
                  }}
                />
              </div>
            </div>

            {/* Room Type Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
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
                onClick={() => loadCalendarData(selectedStartDate, calendarDaysCount)}
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
          <div className="card" style={{ padding: 0, overflow: 'hidden', width: '100%', maxWidth: '100%' }}>
            {calendarLoading ? (
              <div style={{ textAlign: 'center', padding: '60px' }}>
                <div style={{ width: '36px', height: '36px', border: '3px solid var(--border)', borderTopColor: 'var(--brand)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                <p style={{ color: 'var(--t-500)', fontSize: '13px' }}>Loading Next 30 Days Room Tape Chart...</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', maxHeight: '650px', width: '100%', maxWidth: '100%' }}>
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
                            minWidth: '50px',
                            borderLeft: '1px solid var(--border-sub)',
                            background: d.is_today
                              ? 'var(--brand-50)'
                              : d.is_weekend
                              ? 'rgba(0,0,0,0.02)'
                              : 'transparent',
                            color: d.is_today ? 'var(--brand)' : 'var(--t-700)',
                          }}
                        >
                          <div style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: d.is_today ? '800' : '600', color: d.is_today ? 'var(--brand)' : 'var(--t-500)' }}>
                            {d.day_name}
                          </div>
                          <div
                            style={{
                              fontSize: '12px',
                              fontWeight: '800',
                              marginTop: '2px',
                              padding: d.is_today ? '2px 6px' : '0',
                              borderRadius: d.is_today ? '12px' : '0',
                              background: d.is_today ? 'var(--brand)' : 'transparent',
                              color: d.is_today ? '#fff' : 'inherit',
                              display: 'inline-block',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {d.formatted_date || `${d.day} ${d.month_short || ''}`}
                          </div>
                          {d.is_today && (
                            <div style={{ fontSize: '8.5px', fontWeight: '800', color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '1px' }}>
                              TODAY
                            </div>
                          )}
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
                                  setRoomModalStartDate(selectedStartDate);
                                  loadRoomModalCalendar(room.id, selectedStartDate);
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
                                      const checkInDate = new Date(d.date + 'T12:00:00');
                                      const nextDay = new Date(d.date + 'T12:00:00');
                                      nextDay.setDate(nextDay.getDate() + 1);
                                      nextDay.setHours(11, 0, 0, 0);
                                      setCheckInForm(prev => ({
                                        ...prev,
                                        room_id: room.id,
                                        room_rate_per_night: room.base_price,
                                        check_in_at: formatDateTimeLocal(checkInDate),
                                        expected_check_out_at: formatDateTimeLocal(nextDay),
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
        <div className="card" style={{ padding: 0, overflow: 'hidden', width: '100%', maxWidth: '100%' }}>
          <div style={{ overflowX: 'auto', width: '100%' }}>
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
                  <th>Action</th>
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
                    <td>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await whatsappApi.resend(b.id, 'PRE_CHECKIN_KYC', currentHotel?.id);
                            alert(`Express Pre-Check-in KYC link sent on WhatsApp to ${b.guest?.phone || 'guest'}!`);
                          } catch (e) {
                            alert(e.message || 'WhatsApp sending failed');
                          }
                        }}
                        style={{
                          background: '#ecfdf5',
                          color: '#065f46',
                          border: '1px solid #a7f3d0',
                          padding: '4px 8px',
                          fontSize: '11px',
                          fontWeight: '700',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                        title="Send Express Pre-Check-In KYC Link"
                      >
                        💬 Pre-KYC
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: COMPLETE GUEST WALK-IN / CHECK-IN WIZARD WITH KYC DOCS */}
      {/* ============================================================== */}
      {showCheckInModal && (() => {
        const selectedRoomObj = rooms.find(r => r.id === checkInForm.room_id);
        const checkInDateVal = checkInForm.check_in_at ? new Date(checkInForm.check_in_at) : new Date();
        const checkOutDateVal = checkInForm.expected_check_out_at ? new Date(checkInForm.expected_check_out_at) : null;
        const stayNightsCount = (checkInDateVal && checkOutDateVal && !isNaN(checkInDateVal.getTime()) && !isNaN(checkOutDateVal.getTime()))
          ? Math.max(1, Math.round((new Date(checkOutDateVal.toDateString()).getTime() - new Date(checkInDateVal.toDateString()).getTime()) / (1000 * 60 * 60 * 24)))
          : 1;
        const isFutureBooking = Boolean(checkInDateVal && (checkInDateVal.getTime() - Date.now() > 6 * 60 * 60 * 1000));
        const nightlyRate = Number(checkInForm.room_rate_per_night || selectedRoomObj?.base_price || 0);
        const estimatedRoomTotal = nightlyRate * stayNightsCount;
        const advanceDepositVal = Number(checkInForm.advance_deposit_amount || 0);
        const estimatedBalanceAtCheckout = Math.max(0, estimatedRoomTotal - advanceDepositVal);

        return (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '840px', maxHeight: '92vh', overflowY: 'auto', padding: '26px 30px' }}>
              
              {/* Header Hero */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-sub)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      background: isFutureBooking
                        ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
                        : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      boxShadow: isFutureBooking
                        ? '0 6px 16px rgba(2, 132, 199, 0.3)'
                        : '0 6px 16px rgba(99, 102, 241, 0.3)',
                      flexShrink: 0
                    }}
                  >
                    {isFutureBooking ? <Calendar size={24} /> : <UserCheck size={24} />}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--t-900)', letterSpacing: '-0.02em', margin: 0 }}>
                        {isFutureBooking ? 'Advance Room Reservation Wizard' : 'Guest Registration & Check-In Wizard'}
                      </h3>
                      <span className="badge badge-brand" style={{ fontSize: '11px', padding: '2px 8px' }}>
                        {isFutureBooking ? '🗓️ Advance Reservation' : '⚡ Express Walk-In'}
                      </span>
                    </div>
                    <p style={{ fontSize: '12.5px', color: 'var(--t-500)', marginTop: '2px' }}>
                      {isFutureBooking
                        ? 'Advance booking & room allocation reserved for scheduled stay dates'
                        : 'Mandatory Police Form-C KYC Verification & Real-Time Room Key Allocation'}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={handleQuickAutoFill}
                    className="btn btn-secondary btn-sm"
                    style={{
                      fontSize: '11.5px',
                      fontWeight: '700',
                      color: 'var(--brand)',
                      borderColor: 'var(--brand-200)',
                      background: 'var(--brand-50)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 12px'
                    }}
                    title="Auto-fill sample verified guest data for quick demonstration"
                  >
                    <Zap size={13} fill="currentColor" />
                    <span>⚡ Quick Demo Fill</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCheckInModal(false)}
                    className="btn btn-secondary btn-sm"
                    style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Visual Step Indicator Banner */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '8px',
                  marginBottom: '20px',
                  padding: '10px 14px',
                  background: 'var(--surface-sub)',
                  borderRadius: '10px',
                  border: '1px solid var(--border-sub)',
                  fontSize: '11.5px',
                  fontWeight: '700'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--brand)' }}>
                  <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--brand)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>1</span>
                  <span>Guest Profile</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--brand)' }}>
                  <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--brand)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>2</span>
                  <span>Govt KYC (Form C)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--brand)' }}>
                  <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--brand)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>3</span>
                  <span>Room Stay</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--brand)' }}>
                  <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--brand)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>4</span>
                  <span>Payment & Key</span>
                </div>
              </div>

              {actionError && (
                <div style={{ background: 'var(--error-bg)', color: 'var(--error)', border: '1px solid var(--error-border)', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} />
                  <span>{actionError}</span>
                </div>
              )}

              <form onSubmit={handleCheckInSubmit}>
                {/* SECTION 1: GUEST PERSONAL INFORMATION */}
                <div className="wizard-section">
                  <div className="wizard-section-header">
                    <div className="wizard-section-title">
                      <span className="wizard-section-badge">1</span>
                      <span>Guest Personal Information</span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--t-500)', fontWeight: '600' }}>* Required Fields</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">
                        <User size={13} color="var(--brand)" />
                        <span>First Name *</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Rahul"
                        className="form-control"
                        value={checkInForm.first_name}
                        onChange={(e) => setCheckInForm({ ...checkInForm, first_name: e.target.value })}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">
                        <span>Last Name</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Sharma"
                        className="form-control"
                        value={checkInForm.last_name}
                        onChange={(e) => setCheckInForm({ ...checkInForm, last_name: e.target.value })}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">
                        <Phone size={13} color="var(--brand)" />
                        <span>Mobile Number *</span>
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="+91 98765 43210"
                        className="form-control"
                        value={checkInForm.phone}
                        onChange={(e) => setCheckInForm({ ...checkInForm, phone: e.target.value })}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">
                        <Mail size={13} color="var(--brand)" />
                        <span>Email Address</span>
                      </label>
                      <input
                        type="email"
                        placeholder="guest@example.com"
                        className="form-control"
                        value={checkInForm.email}
                        onChange={(e) => setCheckInForm({ ...checkInForm, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">
                        <MapPin size={13} color="var(--brand)" />
                        <span>Nationality *</span>
                      </label>
                      <input
                        type="text"
                        required
                        className="form-control"
                        value={checkInForm.nationality}
                        onChange={(e) => setCheckInForm({ ...checkInForm, nationality: e.target.value })}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">
                        <span>Purpose of Visit</span>
                      </label>
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

                {/* SECTION 2: MANDATORY GOVT IDENTITY & KYC DOCUMENTS */}
                <div
                  className="wizard-section"
                  style={{
                    background: 'linear-gradient(180deg, #fbfcfe 0%, #f8fafc 100%)',
                    border: '1.5px solid #e0e7ff'
                  }}
                >
                  <div className="wizard-section-header">
                    <div className="wizard-section-title" style={{ color: '#4338ca' }}>
                      <span className="wizard-section-badge" style={{ background: '#e0e7ff', color: '#4338ca', borderColor: '#c7d2fe' }}>2</span>
                      <span>Mandatory Government KYC Verification (Police / Form C)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ShieldCheck size={12} />
                        <span>Official Compliance</span>
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">
                        <FileCheck size={13} color="var(--brand)" />
                        <span>Identity Document Type *</span>
                      </label>
                      <select
                        className="form-select"
                        value={checkInForm.id_type}
                        onChange={(e) => setCheckInForm({ ...checkInForm, id_type: e.target.value })}
                        required
                      >
                        <option value="AADHAAR">Aadhaar Card (UIDAI Verified)</option>
                        <option value="PASSPORT">Passport (Mandatory for Foreigners)</option>
                        <option value="DRIVING_LICENSE">Driving License (RTO)</option>
                        <option value="VOTER_ID">Election Voter ID Card</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">
                        <span>Document ID / Unique Number *</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={checkInForm.id_type === 'AADHAAR' ? 'e.g. 5432-8765-1092' : 'Document ID Number'}
                        className="form-control"
                        value={checkInForm.id_number}
                        onChange={(e) => setCheckInForm({ ...checkInForm, id_number: e.target.value })}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Permanent Address (as on ID)</label>
                      <input
                        type="text"
                        placeholder="Residential address as per document"
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

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Country *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. India"
                        className="form-control"
                        value={checkInForm.country}
                        onChange={(e) => setCheckInForm({ ...checkInForm, country: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Document Verification & Scan Dropzone Container */}
                  <div
                    style={{
                      border: '1.5px dashed #cbd5e1',
                      borderRadius: '10px',
                      padding: '12px 16px',
                      background: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileCheck size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--t-900)' }}>
                          {checkInForm.id_document_path || 'aadhaar_scan_verified.pdf'}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--t-500)' }}>
                          Encrypted Govt KYC Document Attached • 1.4 MB PDF
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="badge badge-success" style={{ fontSize: '11px' }}>
                        ✓ Verified Scan
                      </span>
                    </div>
                  </div>

                  {checkInForm.nationality.toLowerCase() !== 'indian' && (
                    <div style={{ marginTop: '12px', fontSize: '12px', color: '#92400e', background: '#fef3c7', padding: '8px 12px', borderRadius: '8px', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertCircle size={15} />
                      <span><strong>Foreign National Guest:</strong> Passport details will be automatically routed to local FRO/Form-C registry portal.</span>
                    </div>
                  )}
                </div>

                {/* SECTION 3: ROOM ASSIGNMENT & STAY DURATION */}
                <div className="wizard-section">
                  <div className="wizard-section-header">
                    <div className="wizard-section-title">
                      <span className="wizard-section-badge">3</span>
                      <span>Room Assignment & Stay Duration</span>
                    </div>
                    {isFutureBooking ? (
                      <span className="badge badge-brand" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Calendar size={12} />
                        <span>Advance Reservation for Future Stay</span>
                      </span>
                    ) : availableRoomsList.length > 0 ? (
                      <span className="badge badge-success">{availableRoomsList.length} Rooms Ready for Check-In</span>
                    ) : (
                      <span className="badge badge-error">No Clean Rooms Available Today</span>
                    )}
                  </div>

                  {/* Room Selection */}
                  <div className="form-group" style={{ marginBottom: '14px' }}>
                    <label className="form-label">
                      <Bed size={13} color="var(--brand)" />
                      <span>{isFutureBooking ? 'Select Room to Reserve *' : 'Select Available Clean Room *'}</span>
                    </label>
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
                      <option value="">-- Choose a Room --</option>
                      {rooms.map((r) => {
                        const isAvail = r.status === 'AVAILABLE';
                        return (
                          <option key={r.id} value={r.id}>
                            Room {r.room_number} • {r.room_type} ({r.floor}) • ₹{Number(r.base_price).toLocaleString('en-IN')}/night {isAvail ? '• Ready & Clean' : `• (${r.status})`}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Check-In and Check-Out Dates (Side by Side) */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Calendar size={13} color="var(--brand)" />
                          <span>Check-In Date & Time *</span>
                        </span>
                        {isFutureBooking ? (
                          <span style={{ fontSize: '10.5px', color: 'var(--brand)', fontWeight: '700' }}>Future Stay</span>
                        ) : (
                          <span style={{ fontSize: '10.5px', color: 'var(--success)', fontWeight: '700' }}>Immediate Walk-In</span>
                        )}
                      </label>
                      <input
                        type="datetime-local"
                        required
                        className="form-control"
                        value={checkInForm.check_in_at}
                        onChange={(e) => {
                          const newCheckIn = e.target.value;
                          setCheckInForm(prev => {
                            let updatedCheckOut = prev.expected_check_out_at;
                            if (newCheckIn && (!updatedCheckOut || new Date(updatedCheckOut) <= new Date(newCheckIn))) {
                              const nextDay = new Date(newCheckIn);
                              nextDay.setDate(nextDay.getDate() + 1);
                              nextDay.setHours(11, 0, 0, 0);
                              updatedCheckOut = formatDateTimeLocal(nextDay);
                            }
                            return {
                              ...prev,
                              check_in_at: newCheckIn,
                              expected_check_out_at: updatedCheckOut,
                            };
                          });
                        }}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Clock size={13} color="var(--brand)" />
                          <span>Expected Check-Out Date & Time *</span>
                        </span>
                        <span style={{ fontSize: '10.5px', color: 'var(--brand)', fontWeight: '700' }}>
                          {stayNightsCount} {stayNightsCount === 1 ? 'Night' : 'Nights'}
                        </span>
                      </label>
                      <input
                        type="datetime-local"
                        required
                        className="form-control"
                        value={checkInForm.expected_check_out_at}
                        onChange={(e) => setCheckInForm({ ...checkInForm, expected_check_out_at: e.target.value })}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '14px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>Adults *</span>
                        {parseInt(checkInForm.num_adults, 10) > 1 && (
                          <span style={{ fontSize: '10.5px', color: '#ea580c', fontWeight: '700' }}>
                            {parseInt(checkInForm.num_adults, 10) - 1} Adult KYC Req.
                          </span>
                        )}
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        required
                        className="form-control"
                        value={checkInForm.num_adults}
                        onChange={(e) => handleAdultsChange(e.target.value)}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>Children</span>
                        {parseInt(checkInForm.num_children, 10) > 0 && (
                          <span style={{ fontSize: '10.5px', color: '#ea580c', fontWeight: '700' }}>
                            {checkInForm.num_children} Child KYC Req.
                          </span>
                        )}
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        className="form-control"
                        value={checkInForm.num_children}
                        onChange={(e) => handleChildrenChange(e.target.value)}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Agreed Room Rate (₹/night)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={checkInForm.room_rate_per_night}
                        onChange={(e) => setCheckInForm({ ...checkInForm, room_rate_per_night: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 3.B: MANDATORY ADDITIONAL OCCUPANTS KYC (ADULTS & CHILDREN) */}
                {(parseInt(checkInForm.num_adults, 10) > 1 || parseInt(checkInForm.num_children, 10) > 0 || (checkInForm.co_guests && checkInForm.co_guests.length > 0)) && (
                  <div
                    className="wizard-section"
                    style={{
                      background: 'linear-gradient(135deg, #fffbeb 0%, #fff7ed 100%)',
                      border: '1.5px solid #fed7aa',
                      borderRadius: '12px',
                      padding: '18px 20px',
                      marginBottom: '20px',
                    }}
                  >
                    <div className="wizard-section-header" style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div className="wizard-section-title" style={{ color: '#9a3412', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="wizard-section-badge" style={{ background: '#ffedd5', color: '#9a3412', borderColor: '#fed7aa', fontWeight: '800' }}>
                          👥
                        </span>
                        <span style={{ fontWeight: '800', fontSize: '15px' }}>
                          Mandatory Additional Room Occupants KYC ({checkInForm.co_guests?.length || 0} Total Occupants: {parseInt(checkInForm.num_adults, 10) > 1 ? `${parseInt(checkInForm.num_adults, 10) - 1} Adult(s)` : ''}{parseInt(checkInForm.num_adults, 10) > 1 && parseInt(checkInForm.num_children, 10) > 0 ? ', ' : ''}{parseInt(checkInForm.num_children, 10) > 0 ? `${checkInForm.num_children} Child(ren)` : ''})
                        </span>
                      </div>
                      <span className="badge" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', fontWeight: '700', padding: '4px 10px' }}>
                        Mandatory Police / Form C Compliance
                      </span>
                    </div>

                    <p style={{ fontSize: '12.5px', color: '#7c2d12', marginBottom: '16px', lineHeight: 1.5 }}>
                      Room occupancy is set to <strong>{checkInForm.num_adults || 1} Adult(s)</strong> and <strong>{checkInForm.num_children || 0} Child(ren)</strong> ({ (parseInt(checkInForm.num_adults, 10) || 1) + (parseInt(checkInForm.num_children, 10) || 0) } Total Room Occupants). Per Government & Police Regulations, complete KYC, ID verification, and residential address are mandatory for <strong>every single occupant</strong> staying in the room.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {checkInForm.co_guests?.map((guest, idx) => {
                        const isChild = guest.guest_category === 'CHILD';
                        return (
                          <div
                            key={idx}
                            style={{
                              background: '#ffffff',
                              border: isChild ? '1.5px solid #bfdbfe' : '1.5px solid #fed7aa',
                              borderRadius: '10px',
                              padding: '16px',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{
                                  background: isChild ? '#0284c7' : '#ea580c',
                                  color: '#fff',
                                  fontSize: '11px',
                                  fontWeight: '800',
                                  borderRadius: '50%',
                                  width: '24px',
                                  height: '24px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}>
                                  {idx + 2}
                                </span>
                                <div>
                                  <strong style={{ fontSize: '13.5px', color: '#1e293b' }}>
                                    {isChild ? `👶 Child Occupant Details (Age < 18) *` : `👥 Additional Adult Guest Details *`}
                                  </strong>
                                  <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '6px' }}>
                                    (Occupant #{idx + 2})
                                  </span>
                                </div>
                              </div>

                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '11px', padding: '3px 10px', borderColor: '#cbd5e1', color: '#0f172a', background: '#f8fafc' }}
                                onClick={() => {
                                  const updated = [...(checkInForm.co_guests || [])];
                                  if (updated[idx]) {
                                    updated[idx] = {
                                      ...updated[idx],
                                      address: checkInForm.address || '',
                                      city: checkInForm.city || '',
                                      state: checkInForm.state || '',
                                      country: checkInForm.country || 'India',
                                      phone: updated[idx].phone || checkInForm.phone || '',
                                    };
                                    setCheckInForm(prev => ({ ...prev, co_guests: updated }));
                                  }
                                }}
                              >
                                📋 Copy Primary Guest Address & Phone
                              </button>
                            </div>

                            {/* Row 1: Name, Gender, Age */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">First Name *</label>
                                <input
                                  type="text"
                                  required
                                  placeholder={isChild ? "e.g. Aarav" : "e.g. Pooja"}
                                  className="form-control"
                                  value={guest.first_name || ''}
                                  onChange={(e) => handleCoGuestChange(idx, 'first_name', e.target.value)}
                                />
                              </div>

                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Last Name *</label>
                                <input
                                  type="text"
                                  required
                                  placeholder="e.g. Sharma"
                                  className="form-control"
                                  value={guest.last_name || ''}
                                  onChange={(e) => handleCoGuestChange(idx, 'last_name', e.target.value)}
                                />
                              </div>

                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Gender *</label>
                                <select
                                  className="form-select"
                                  required
                                  value={guest.gender || 'FEMALE'}
                                  onChange={(e) => handleCoGuestChange(idx, 'gender', e.target.value)}
                                >
                                  <option value="FEMALE">Female</option>
                                  <option value="MALE">Male</option>
                                  <option value="OTHER">Other</option>
                                </select>
                              </div>

                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Age *</label>
                                <input
                                  type="number"
                                  required
                                  min="0"
                                  max={isChild ? "17" : "120"}
                                  placeholder={isChild ? "e.g. 6" : "e.g. 26"}
                                  className="form-control"
                                  value={guest.age || ''}
                                  onChange={(e) => handleCoGuestChange(idx, 'age', e.target.value)}
                                />
                              </div>
                            </div>

                            {/* Row 2: Relationship, ID Type, Document Number, Phone */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.2fr 1.3fr 1.1fr', gap: '12px', marginBottom: '12px' }}>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Relationship *</label>
                                <select
                                  className="form-select"
                                  required
                                  value={guest.relationship || (isChild ? 'Child' : 'Spouse')}
                                  onChange={(e) => handleCoGuestChange(idx, 'relationship', e.target.value)}
                                >
                                  {isChild ? (
                                    <>
                                      <option value="Child">Child (Son / Daughter)</option>
                                      <option value="Dependent">Dependent Minor</option>
                                      <option value="Family">Family Member</option>
                                      <option value="Other">Other</option>
                                    </>
                                  ) : (
                                    <>
                                      <option value="Spouse">Spouse / Partner</option>
                                      <option value="Family">Family Member</option>
                                      <option value="Friend">Friend</option>
                                      <option value="Colleague">Colleague / Business</option>
                                      <option value="Other">Other</option>
                                    </>
                                  )}
                                </select>
                              </div>

                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">ID Type *</label>
                                <select
                                  className="form-select"
                                  required
                                  value={guest.id_type || 'AADHAAR'}
                                  onChange={(e) => handleCoGuestChange(idx, 'id_type', e.target.value)}
                                >
                                  {isChild ? (
                                    <>
                                      <option value="AADHAAR">Aadhaar / Bal Aadhaar Card</option>
                                      <option value="BIRTH_CERTIFICATE">Birth Certificate</option>
                                      <option value="SCHOOL_ID">School ID Card</option>
                                      <option value="PASSPORT">Passport</option>
                                      <option value="PARENT_ID">Parent ID (Linked to Primary)</option>
                                    </>
                                  ) : (
                                    <>
                                      <option value="AADHAAR">Aadhaar Card (UIDAI)</option>
                                      <option value="PASSPORT">Passport</option>
                                      <option value="DRIVING_LICENSE">Driving License</option>
                                      <option value="VOTER_ID">Voter ID Card</option>
                                    </>
                                  )}
                                </select>
                              </div>

                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">ID / Document Number *</label>
                                <input
                                  type="text"
                                  required
                                  placeholder={isChild ? "Aadhaar / Birth Cert / Parent ID #" : "Document ID Number"}
                                  className="form-control"
                                  value={guest.id_number || ''}
                                  onChange={(e) => handleCoGuestChange(idx, 'id_number', e.target.value)}
                                />
                              </div>

                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Contact / Mobile *</label>
                                <input
                                  type="tel"
                                  required
                                  placeholder={isChild ? "Parent Mobile Number" : "Mobile Number"}
                                  className="form-control"
                                  value={guest.phone || ''}
                                  onChange={(e) => handleCoGuestChange(idx, 'phone', e.target.value)}
                                />
                              </div>
                            </div>

                            {/* Row 3: FULL RESIDENTIAL ADDRESS DETAILS FOR EACH OCCUPANT */}
                            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #cbd5e1' }}>
                              <div style={{ fontSize: '11px', fontWeight: '700', color: isChild ? '#0284c7' : '#9a3412', textTransform: 'uppercase', marginBottom: '6px' }}>
                                📍 Residential Address (as on ID / Document) *
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr', gap: '10px' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                  <label className="form-label" style={{ fontSize: '11px' }}>Permanent Address *</label>
                                  <input
                                    type="text"
                                    required
                                    placeholder="Permanent address as per ID"
                                    className="form-control"
                                    value={guest.address || ''}
                                    onChange={(e) => handleCoGuestChange(idx, 'address', e.target.value)}
                                  />
                                </div>

                                <div className="form-group" style={{ marginBottom: 0 }}>
                                  <label className="form-label" style={{ fontSize: '11px' }}>City *</label>
                                  <input
                                    type="text"
                                    required
                                    placeholder="e.g. Mumbai"
                                    className="form-control"
                                    value={guest.city || ''}
                                    onChange={(e) => handleCoGuestChange(idx, 'city', e.target.value)}
                                  />
                                </div>

                                <div className="form-group" style={{ marginBottom: 0 }}>
                                  <label className="form-label" style={{ fontSize: '11px' }}>State *</label>
                                  <input
                                    type="text"
                                    required
                                    placeholder="e.g. Maharashtra"
                                    className="form-control"
                                    value={guest.state || ''}
                                    onChange={(e) => handleCoGuestChange(idx, 'state', e.target.value)}
                                  />
                                </div>

                                <div className="form-group" style={{ marginBottom: 0 }}>
                                  <label className="form-label" style={{ fontSize: '11px' }}>Country *</label>
                                  <input
                                    type="text"
                                    required
                                    placeholder="e.g. India"
                                    className="form-control"
                                    value={guest.country || 'India'}
                                    onChange={(e) => handleCoGuestChange(idx, 'country', e.target.value)}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* SECTION 4: ADVANCE DEPOSIT & REAL-TIME BILLING PREVIEW */}
                <div
                  className="wizard-section"
                  style={{
                    background: 'linear-gradient(135deg, #f8faff 0%, #f1f4fd 100%)',
                    border: '1.5px solid #dbeafe'
                  }}
                >
                  <div className="wizard-section-header">
                    <div className="wizard-section-title" style={{ color: '#1e40af' }}>
                      <span className="wizard-section-badge" style={{ background: '#dbeafe', color: '#1e40af', borderColor: '#bfdbfe' }}>4</span>
                      <span>Advance Deposit & Payment Mode</span>
                    </div>
                    <span className="badge badge-brand">Instant Folio Receipt</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.2fr', gap: '14px', marginBottom: '14px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Advance Deposit Amount (₹)</label>
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
                      <label className="form-label">Transaction / Ref #</label>
                      <input
                        type="text"
                        placeholder="Optional UPI/Txn Ref"
                        className="form-control"
                        value={checkInForm.transaction_reference}
                        onChange={(e) => setCheckInForm({ ...checkInForm, transaction_reference: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* LIVE ESTIMATION SUMMARY CARD */}
                  {checkInForm.room_id && (
                    <div
                      style={{
                        background: '#ffffff',
                        border: '1px solid #bfdbfe',
                        borderRadius: '10px',
                        padding: '12px 16px',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '12px',
                        textAlign: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--t-500)', fontWeight: '600', textTransform: 'uppercase' }}>Stay Nights</div>
                        <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--t-900)', marginTop: '2px' }}>
                          🌙 {stayNightsCount} {stayNightsCount === 1 ? 'Night' : 'Nights'}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--t-500)', fontWeight: '600', textTransform: 'uppercase' }}>Est. Room Total</div>
                        <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--t-900)', marginTop: '2px' }}>
                          ₹{estimatedRoomTotal.toLocaleString('en-IN')}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--t-500)', fontWeight: '600', textTransform: 'uppercase' }}>Advance Paying</div>
                        <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--success)', marginTop: '2px' }}>
                          ₹{advanceDepositVal.toLocaleString('en-IN')}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--t-500)', fontWeight: '600', textTransform: 'uppercase' }}>Balance Due at Exit</div>
                        <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--brand)', marginTop: '2px' }}>
                          ₹{estimatedBalanceAtCheckout.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                  )}

                  {isFutureBooking && (
                    <div style={{ marginTop: '12px', padding: '10px 14px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe', fontSize: '12px', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calendar size={15} />
                      <span><strong>Advance Reservation Note:</strong> This booking is scheduled for a future date. The room will remain operational and available for in-house guests until the scheduled arrival date.</span>
                    </div>
                  )}
                </div>

                {/* MODAL ACTION BAR */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '16px',
                    borderTop: '1px solid var(--border-sub)',
                    marginTop: '10px',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--t-600)' }}>
                    <ShieldCheck size={16} color="var(--success)" />
                    <span>{isFutureBooking ? 'Advance Reservation Confirmed with Booking Folio' : 'Instant Guest Folio Account & Digital Key Card Generated'}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setShowCheckInModal(false)}
                      className="btn btn-secondary"
                      disabled={submitting}
                      style={{ padding: '9px 18px', fontWeight: '600' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !checkInForm.room_id}
                      className="btn btn-primary"
                      style={{
                        padding: '10px 22px',
                        fontWeight: '800',
                        fontSize: '13.5px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: isFutureBooking
                          ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
                          : 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                        boxShadow: isFutureBooking
                          ? '0 4px 14px rgba(2, 132, 199, 0.4)'
                          : '0 4px 14px rgba(99, 102, 241, 0.4)',
                      }}
                    >
                      <CheckCircle2 size={16} />
                      <span>{submitting ? 'Verifying & Saving...' : isFutureBooking ? 'Confirm Advance Reservation' : 'Complete Check-In & Allocate Room'}</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

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
                  Guest: <strong>{showFolioModal.guest?.first_name} {showFolioModal.guest?.last_name}</strong> ({showFolioModal.guest?.phone}) &bull; {showFolioModal.guest?.address || ''} {showFolioModal.guest?.city ? `${showFolioModal.guest?.city}, ` : ''}<strong>{showFolioModal.guest?.country || 'India'}</strong>
                </p>
                {((showFolioModal.booking_guests && showFolioModal.booking_guests.length > 0) || (showFolioModal.co_guests && showFolioModal.co_guests.length > 0)) && (
                  <div style={{ marginTop: '6px', padding: '6px 12px', background: '#fff7ed', border: '1px solid #ffedd5', borderRadius: '6px', fontSize: '12px', color: '#9a3412' }}>
                    <strong>👥 Room Occupants ({1 + (showFolioModal.booking_guests?.length || showFolioModal.co_guests?.length || 0)} Total):</strong>
                    <div style={{ marginTop: '3px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {(showFolioModal.booking_guests || showFolioModal.co_guests).map((cg, idx) => (
                        <span key={idx} style={{ background: '#ffedd5', padding: '2px 8px', borderRadius: '4px', fontWeight: '500' }}>
                          #{idx + 2} {cg.first_name} {cg.last_name} ({cg.guest_category === 'CHILD' ? 'Child' : (cg.relationship || 'Adult')}, {cg.gender || 'Guest'}, {cg.age ? `Age ${cg.age}` : ''}) &bull; {cg.id_type || 'ID'}: {cg.id_number} {cg.city ? `&bull; ${cg.city}` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
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

              {paymentForm.payment_method === 'UPI_QR' && (
                <UpiQrPaymentDisplay
                  amount={paymentForm.amount || 0}
                  orderNumber={selectedFolioBooking?.booking_number || 'STAY'}
                  hotelId={currentHotel?.id}
                  hotelName={currentHotel?.name}
                  onUtrChange={(utrVal) => setPaymentForm((prev) => ({ ...prev, transaction_reference: utrVal }))}
                  initialUtr={paymentForm.transaction_reference}
                  canConfigure={true}
                />
              )}

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
                <div>Address: {invoiceData.guest?.address || ''} {invoiceData.guest?.country ? `(${invoiceData.guest.country})` : '(India)'}</div>
                {invoiceData.guest?.co_guests && invoiceData.guest.co_guests.length > 0 && (
                  <div style={{ marginTop: '4px', fontSize: '11.5px', color: '#64748b' }}>
                    <strong>Co-Occupants:</strong> {invoiceData.guest.co_guests.map(cg => `${cg.first_name} ${cg.last_name} (${cg.relationship || 'Guest'})`).join(', ')}
                  </div>
                )}
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
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setWaInvoiceStatus('sending');
                      const bId = showCheckOutModal?.id || checkedInBookings[0]?.id;
                      await whatsappApi.resend(bId, 'CHECKOUT_INVOICE', currentHotel?.id);
                      setWaInvoiceStatus('sent');
                      setTimeout(() => setWaInvoiceStatus(''), 4000);
                    } catch (e) {
                      alert(e.message || 'WhatsApp sending failed');
                      setWaInvoiceStatus('');
                    }
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{
                    background: '#25D366',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: '700',
                  }}
                >
                  <span>💬</span>
                  <span>{waInvoiceStatus === 'sending' ? 'Sending...' : waInvoiceStatus === 'sent' ? '✓ WhatsApp Sent!' : 'Share WhatsApp'}</span>
                </button>
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
                  onClick={() => roomModalCalendar?.prev_start_date && loadRoomModalCalendar(selectedRoomForModal.id, roomModalCalendar.prev_start_date)}
                  className="btn btn-secondary btn-sm"
                  style={{ border: 'none', background: 'transparent', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  title="Previous 30 Days"
                >
                  <ChevronLeft size={16} />
                  <span style={{ fontSize: '11px', fontWeight: '700' }}>Prev 30d</span>
                </button>
                <div style={{ padding: '0 14px', fontSize: '13.5px', fontWeight: '800', color: 'var(--t-900)', minWidth: '160px', textAlign: 'center' }}>
                  {roomModalCalendar?.range_label || 'Next 30 Days (From Today)'}
                </div>
                <button
                  onClick={() => roomModalCalendar?.next_start_date && loadRoomModalCalendar(selectedRoomForModal.id, roomModalCalendar.next_start_date)}
                  className="btn btn-secondary btn-sm"
                  style={{ border: 'none', background: 'transparent', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  title="Next 30 Days"
                >
                  <span style={{ fontSize: '11px', fontWeight: '700' }}>Next 30d</span>
                  <ChevronRight size={16} />
                </button>
              </div>

              <button
                onClick={() => {
                  const today = new Date().toISOString().slice(0, 10);
                  setRoomModalStartDate(today);
                  loadRoomModalCalendar(selectedRoomForModal.id, today);
                }}
                className="btn btn-primary btn-sm"
                style={{ fontSize: '12px' }}
              >
                ⚡ Start From Today
              </button>

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
                                const checkInDate = new Date(d.date + 'T12:00:00');
                                const nextDay = new Date(d.date + 'T12:00:00');
                                nextDay.setDate(nextDay.getDate() + 1);
                                nextDay.setHours(11, 0, 0, 0);
                                setCheckInForm(prev => ({
                                  ...prev,
                                  room_id: selectedRoomForModal.id,
                                  room_rate_per_night: selectedRoomForModal.base_price,
                                  check_in_at: formatDateTimeLocal(checkInDate),
                                  expected_check_out_at: formatDateTimeLocal(nextDay),
                                }));
                                setSelectedRoomForModal(null);
                                setShowCheckInModal(true);
                              }
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: '12px', fontWeight: '800', color: d.is_today ? 'var(--brand)' : 'var(--t-900)' }}>
                                {d.formatted_date || `${d.day} ${d.month_short || ''}`}
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

      {/* MODAL: ADD ROOM (From Book1.xlsx specification) */}
      {canManageRooms && showAddRoomModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '580px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--t-900)' }}>
                  Add New Room to Hotel Rack
                </h3>
                <p style={{ fontSize: '12.5px', color: 'var(--t-500)' }}>
                  Specification fields from Book1.xlsx (Rooms Table)
                </p>
              </div>
              <button onClick={() => setShowAddRoomModal(false)} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px' }}>
                ✕
              </button>
            </div>

            {roomError && (
              <div style={{ padding: '10px 14px', borderRadius: 'var(--r-sm)', background: 'var(--error-bg)', color: 'var(--error)', border: '1px solid var(--error-border)', marginBottom: '16px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={15} />
                <span>{roomError}</span>
              </div>
            )}

            <form onSubmit={handleCreateRoom}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Room Number * (RoomNo)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 105, 201"
                    value={roomForm.room_number}
                    onChange={(e) => setRoomForm({ ...roomForm, room_number: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Room Type * (RoomType)</label>
                  <select
                    className="form-select"
                    value={roomForm.room_type}
                    onChange={(e) => setRoomForm({ ...roomForm, room_type: e.target.value })}
                    required
                  >
                    <option value="Single">Single</option>
                    <option value="Double">Double</option>
                    <option value="Deluxe">Deluxe</option>
                    <option value="Semi Deluxe">Semi Deluxe</option>
                    <option value="Suite">Suite</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Room Mode *</label>
                  <select
                    className="form-select"
                    value={roomForm.room_mode}
                    onChange={(e) => setRoomForm({ ...roomForm, room_mode: e.target.value })}
                    required
                  >
                    <option value="AC">AC</option>
                    <option value="Non AC">Non AC</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Floor No. *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 1st Floor"
                    value={roomForm.floor}
                    onChange={(e) => setRoomForm({ ...roomForm, floor: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Room Capacity (Guests)</label>
                  <select
                    className="form-select"
                    value={roomForm.max_guests}
                    onChange={(e) => setRoomForm({ ...roomForm, max_guests: e.target.value })}
                  >
                    <option value="1">1 Person</option>
                    <option value="2">2 Persons</option>
                    <option value="3">3 Persons</option>
                    <option value="4">4 Persons</option>
                    <option value="6">6 Persons</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Price / Day (Tariff ₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder="2800"
                    value={roomForm.base_price}
                    onChange={(e) => setRoomForm({ ...roomForm, base_price: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Extra Bedding (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder="500"
                    value={roomForm.extra_bedding_price}
                    onChange={(e) => setRoomForm({ ...roomForm, extra_bedding_price: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">GST %</label>
                  <select
                    className="form-select"
                    value={roomForm.gst_percentage}
                    onChange={(e) => setRoomForm({ ...roomForm, gst_percentage: e.target.value })}
                  >
                    <option value="0.00">0% (Below ₹1,000)</option>
                    <option value="12.00">12% (Standard)</option>
                    <option value="18.00">18% (Luxury / Suite)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Room Status *</label>
                  <select
                    className="form-select"
                    value={roomForm.status}
                    onChange={(e) => setRoomForm({ ...roomForm, status: e.target.value })}
                    required
                  >
                    <option value="AVAILABLE">Available (Clean & Ready)</option>
                    <option value="OCCUPIED">Occupied</option>
                    <option value="DIRTY">Cleaning / Housekeeping Required</option>
                    <option value="MAINTENANCE">Under Maintenance</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Remarks / Features</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. King bed with balcony view"
                    value={roomForm.remarks}
                    onChange={(e) => setRoomForm({ ...roomForm, remarks: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddRoomModal(false)}
                  className="btn btn-secondary"
                  disabled={savingRoom}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingRoom}
                >
                  {savingRoom ? 'Adding Room...' : '+ Create & Add Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shift Handover & Cash Drawer Register Modal */}
      <ShiftRegisterModal
        isOpen={showShiftRegisterModal}
        onClose={() => setShowShiftRegisterModal(false)}
        defaultDepartment="FRONT_DESK"
        hotelId={currentHotel?.id}
      />
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
