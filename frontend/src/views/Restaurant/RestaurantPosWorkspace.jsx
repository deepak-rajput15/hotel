import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { restaurantApi } from '../../api';
import UpiQrPaymentDisplay from '../../components/Payments/UpiQrPaymentDisplay';
import {
  Utensils,
  Plus,
  Search,
  CheckCircle2,
  Lock,
  Clock,
  Printer,
  ShoppingBag,
  CreditCard,
  DollarSign,
  QrCode,
  Bed,
  Users,
  Filter,
  Check,
  X,
  AlertCircle,
  FileText,
  RotateCcw,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Receipt,
  Trash2,
  Briefcase,
} from 'lucide-react';
import ShiftRegisterModal from '../../components/Finance/ShiftRegisterModal';

const STANDARD_AREAS = ['ALL', 'AC Dining Hall', 'Family Lounge', 'Sea View Terrace', 'VIP Private Dining'];

export default function RestaurantPosWorkspace() {
  const { currentHotel, user } = useAuth();

  const [activeTab, setActiveTab] = useState('tables'); // 'tables', 'pos', 'orders', 'menu_management'
  const [loading, setLoading] = useState(true);
  const [showShiftRegisterModal, setShowShiftRegisterModal] = useState(false);

  // 1. Tables State
  const [tables, setTables] = useState([]);
  const [tablesSummary, setTablesSummary] = useState({});
  const [areaFilter, setAreaFilter] = useState('ALL');
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [newTableForm, setNewTableForm] = useState({
    table_no: '',
    capacity: 4,
    seating_area: 'AC Dining Hall',
    notes: '',
  });

  // 2. Menu State
  const [menuItems, setMenuItems] = useState([]);
  const [menuCategories, setMenuCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [foodTypeFilter, setFoodTypeFilter] = useState('ALL'); // ALL, VEG, NON_VEG
  const [menuSearchTerm, setMenuSearchTerm] = useState('');
  const [showAddDishModal, setShowAddDishModal] = useState(false);
  const [newDishForm, setNewDishForm] = useState({
    category_name: 'Main Course',
    item_code: '',
    name: '',
    price: '',
    food_type: 'VEG',
    description: '',
    preparation_time_minutes: 15,
  });

  // 3. POS Order Cart State
  const [posOrderType, setPosOrderType] = useState('DINE_IN'); // DINE_IN, ROOM_SERVICE, TAKEAWAY
  const [selectedTableForOrder, setSelectedTableForOrder] = useState(null);
  const [selectedRoomForOrder, setSelectedRoomForOrder] = useState(null);
  const [inHouseRooms, setInHouseRooms] = useState([]);
  const [takeawayCustomer, setTakeawayCustomer] = useState({ name: '', phone: '' });
  const [coversCount, setCoversCount] = useState(2);
  const [cartItems, setCartItems] = useState([]); // [{ menuItem, quantity, special_notes }]
  const [existingOrderId, setExistingOrderId] = useState(null); // when adding items to open order
  const [punchingOrder, setPunchingOrder] = useState(false);

  // 4. Live Orders State
  const [orders, setOrders] = useState([]);
  const [ordersStatusFilter, setOrdersStatusFilter] = useState('ALL');
  const [selectedOrderForModal, setSelectedOrderForModal] = useState(null);

  // 5. Settlement State
  const [showSettleModal, setShowSettleModal] = useState(null); // order object
  const [settlementMethod, setSettlementMethod] = useState('CASH'); // ROOM_FOLIO, CASH, UPI_QR, CARD
  const [settlementRoomId, setSettlementRoomId] = useState('');
  const [settlementDiscount, setSettlementDiscount] = useState(0);
  const [transactionRef, setTransactionRef] = useState('');
  const [settling, setSettling] = useState(false);
  const [printReceiptData, setPrintReceiptData] = useState(null);

  // Load Initial Data
  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [tablesRes, menuRes, roomsRes, ordersRes] = await Promise.all([
        restaurantApi.getTables(),
        restaurantApi.getMenu(),
        restaurantApi.getInHouseRooms(),
        restaurantApi.getOrders({ status: ordersStatusFilter }),
      ]);

      setTables(tablesRes.tables || []);
      setTablesSummary(tablesRes.summary || {});
      setMenuItems(menuRes.items || []);
      setMenuCategories(menuRes.categories || []);
      setInHouseRooms(roomsRes.rooms || []);
      setOrders(ordersRes.orders?.data || []);
    } catch (err) {
      console.error('Failed to load restaurant data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [currentHotel?.id, ordersStatusFilter]);

  // Add Item to Cart
  const handleAddToCart = (item) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.menuItem.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.menuItem.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { menuItem: item, quantity: 1, special_notes: '' }];
    });
  };

  // Update Cart Quantity
  const handleUpdateQuantity = (itemId, delta) => {
    setCartItems((prev) => {
      return prev
        .map((i) => {
          if (i.menuItem.id === itemId) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean);
    });
  };

  // Cart Calculations
  const cartSubtotal = cartItems.reduce(
    (sum, i) => sum + Number(i.menuItem.price) * i.quantity,
    0
  );
  const cartGst = cartItems.reduce(
    (sum, i) =>
      sum + (Number(i.menuItem.price) * i.quantity * (i.menuItem.gst_percentage || 5)) / 100,
    0
  );
  const cartGrandTotal = cartSubtotal + cartGst;

  // Punch KOT (Send Order to Kitchen)
  const handlePunchOrder = async () => {
    if (cartItems.length === 0) {
      alert('Please add at least one item to the cart.');
      return;
    }

    try {
      setPunchingOrder(true);
      const itemsPayload = cartItems.map((i) => ({
        menu_item_id: i.menuItem.id,
        quantity: i.quantity,
        special_notes: i.special_notes || null,
      }));

      if (existingOrderId) {
        // Adding items to existing order
        await restaurantApi.addOrderItems(existingOrderId, { items: itemsPayload });
        alert('Extra items sent to kitchen with next KOT ticket!');
      } else {
        // Creating new order
        const payload = {
          order_type: posOrderType,
          table_id: posOrderType === 'DINE_IN' ? selectedTableForOrder?.id : null,
          room_id: posOrderType === 'ROOM_SERVICE' ? selectedRoomForOrder?.room_id : null,
          booking_id: posOrderType === 'ROOM_SERVICE' ? selectedRoomForOrder?.booking_id : null,
          customer_name:
            posOrderType === 'TAKEAWAY'
              ? takeawayCustomer.name
              : posOrderType === 'ROOM_SERVICE'
              ? selectedRoomForOrder?.guest_name
              : null,
          customer_phone:
            posOrderType === 'TAKEAWAY'
              ? takeawayCustomer.phone
              : posOrderType === 'ROOM_SERVICE'
              ? selectedRoomForOrder?.guest_phone
              : null,
          covers: coversCount,
          items: itemsPayload,
        };

        await restaurantApi.createOrder(payload);
        alert('Order punched successfully! KOT ticket sent to Kitchen.');
      }

      // Reset POS Cart
      setCartItems([]);
      setExistingOrderId(null);
      setSelectedTableForOrder(null);
      setSelectedRoomForOrder(null);
      setTakeawayCustomer({ name: '', phone: '' });

      // Refresh Tables & Orders
      fetchAllData();
      setActiveTab('tables');
    } catch (err) {
      alert('Failed to punch order: ' + (err.data?.message || err.message));
    } finally {
      setPunchingOrder(false);
    }
  };

  // Open POS for specific Table
  const handleOpenTableOrder = (tbl) => {
    setSelectedTableForOrder(tbl);
    setPosOrderType('DINE_IN');
    setCoversCount(tbl.capacity || 2);

    if (tbl.active_order) {
      // Load existing active order
      setExistingOrderId(tbl.active_order.id);
    } else {
      setExistingOrderId(null);
    }
    setCartItems([]);
    setActiveTab('pos');
  };

  // Settle Order
  const handleConfirmSettlement = async () => {
    if (!showSettleModal) return;

    try {
      setSettling(true);
      const payload = {
        settlement_method: settlementMethod,
        discount_amount: Number(settlementDiscount) || 0,
        transaction_reference: transactionRef || null,
        room_id: settlementMethod === 'ROOM_FOLIO' ? settlementRoomId : null,
      };

      const res = await restaurantApi.settleOrder(showSettleModal.id, payload);
      alert(res.message || 'Order settled successfully!');

      setPrintReceiptData(res.order);
      setShowSettleModal(null);
      setSettlementDiscount(0);
      setTransactionRef('');
      fetchAllData();
    } catch (err) {
      alert('Settlement failed: ' + (err.data?.message || err.message));
    } finally {
      setSettling(false);
    }
  };

  // Add Table Form Submit
  const handleCreateTable = async (e) => {
    e.preventDefault();
    try {
      await restaurantApi.createTable(newTableForm);
      setShowAddTableModal(false);
      setNewTableForm({ table_no: '', capacity: 4, seating_area: 'AC Dining Hall', notes: '' });
      fetchAllData();
    } catch (err) {
      alert('Failed to create table: ' + (err.data?.message || err.message));
    }
  };

  // Add Dish Form Submit
  const handleCreateDish = async (e) => {
    e.preventDefault();
    try {
      await restaurantApi.createMenuItem(newDishForm);
      setShowAddDishModal(false);
      setNewDishForm({
        category_name: 'Main Course',
        item_code: '',
        name: '',
        price: '',
        food_type: 'VEG',
        description: '',
        preparation_time_minutes: 15,
      });
      fetchAllData();
    } catch (err) {
      alert('Failed to add dish: ' + (err.data?.message || err.message));
    }
  };

  // Filtered Tables
  const filteredTables = tables.filter((t) => {
    if (areaFilter !== 'ALL' && t.seating_area !== areaFilter) return false;
    return true;
  });

  // Filtered Menu Items
  const filteredMenuItems = menuItems.filter((i) => {
    if (selectedCategory !== 'ALL' && i.category_name !== selectedCategory) return false;
    if (foodTypeFilter !== 'ALL' && i.food_type !== foodTypeFilter) return false;
    if (menuSearchTerm) {
      const term = menuSearchTerm.toLowerCase();
      return (
        i.name.toLowerCase().includes(term) ||
        i.item_code.toLowerCase().includes(term) ||
        (i.description && i.description.toLowerCase().includes(term))
      );
    }
    return true;
  });

  const formatCurrency = (amt) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amt || 0);
  };

  return (
    <div className="restaurant-pos-workspace" style={{ paddingBottom: '50px' }}>
      {/* 1. Module Header */}
      <div
        className="card"
        style={{
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-brand">{currentHotel?.hotel_code || 'HTL-1002'}</span>
            <span style={{ fontSize: '12px', color: 'var(--t-500)' }}>
              Dining Terminal &bull; Property: <strong>{currentHotel?.name}</strong>
            </span>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--t-900)' }}>
            Restaurant & Dining POS Terminal
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--t-600)', marginTop: '2px' }}>
            Table floor map, Kitchen Order Ticket (KOT) punching, F&B menu catalog, and Room Folio cross-billing.
          </p>
        </div>

        {/* Quick Module Navigation Tabs */}
        <div style={{ display: 'flex', gap: '6px', background: 'var(--surface-sub)', padding: '4px', borderRadius: 'var(--r-sm)' }}>
          <button
            onClick={() => setActiveTab('tables')}
            style={{
              padding: '7px 14px',
              borderRadius: 'var(--r-sm)',
              fontSize: '13px',
              fontWeight: activeTab === 'tables' ? '700' : '500',
              background: activeTab === 'tables' ? 'var(--white)' : 'transparent',
              color: activeTab === 'tables' ? 'var(--brand)' : 'var(--t-700)',
              border: activeTab === 'tables' ? '1px solid var(--border)' : '1px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Utensils size={15} />
            Tables Rack ({tables.length})
          </button>

          <button
            onClick={() => setActiveTab('pos')}
            style={{
              padding: '7px 14px',
              borderRadius: 'var(--r-sm)',
              fontSize: '13px',
              fontWeight: activeTab === 'pos' ? '700' : '500',
              background: activeTab === 'pos' ? 'var(--white)' : 'transparent',
              color: activeTab === 'pos' ? 'var(--brand)' : 'var(--t-700)',
              border: activeTab === 'pos' ? '1px solid var(--border)' : '1px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ShoppingBag size={15} />
            POS Ordering {cartItems.length > 0 && `(${cartItems.length})`}
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            style={{
              padding: '7px 14px',
              borderRadius: 'var(--r-sm)',
              fontSize: '13px',
              fontWeight: activeTab === 'orders' ? '700' : '500',
              background: activeTab === 'orders' ? 'var(--white)' : 'transparent',
              color: activeTab === 'orders' ? 'var(--brand)' : 'var(--t-700)',
              border: activeTab === 'orders' ? '1px solid var(--border)' : '1px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Clock size={15} />
            Live Orders ({orders.length})
          </button>

          <button
            onClick={() => setActiveTab('menu_management')}
            style={{
              padding: '7px 14px',
              borderRadius: 'var(--r-sm)',
              fontSize: '13px',
              fontWeight: activeTab === 'menu_management' ? '700' : '500',
              background: activeTab === 'menu_management' ? 'var(--white)' : 'transparent',
              color: activeTab === 'menu_management' ? 'var(--brand)' : 'var(--t-700)',
              border: activeTab === 'menu_management' ? '1px solid var(--border)' : '1px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <FileText size={15} />
            Menu Catalog ({menuItems.length})
          </button>

          <button
            onClick={() => setActiveTab('room_dining_qr')}
            style={{
              padding: '7px 14px',
              borderRadius: 'var(--r-sm)',
              fontSize: '13px',
              fontWeight: activeTab === 'room_dining_qr' ? '700' : '500',
              background: activeTab === 'room_dining_qr' ? 'var(--white)' : 'transparent',
              color: activeTab === 'room_dining_qr' ? 'var(--brand)' : 'var(--t-700)',
              border: activeTab === 'room_dining_qr' ? '1px solid var(--border)' : '1px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Bed size={15} />
            In-Room QR Dining
          </button>

          <button
            onClick={() => setShowShiftRegisterModal(true)}
            style={{
              padding: '7px 14px',
              borderRadius: 'var(--r-sm)',
              fontSize: '13px',
              fontWeight: '700',
              background: '#ecfdf5',
              color: '#065f46',
              border: '1px solid #a7f3d0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Briefcase size={15} />
            💼 Shift & Cash Drawer
          </button>
        </div>
      </div>

      {/* 2. TAB 1: Tables Rack & Floor Plan */}
      {activeTab === 'tables' && (
        <div>
          {/* Summary Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '20px' }}>
            <TableMetricCard label="Total Tables" count={tablesSummary.total || 0} color="var(--brand)" />
            <TableMetricCard label="Available Clean" count={tablesSummary.available || 0} color="var(--success)" />
            <TableMetricCard label="Occupied Dining" count={tablesSummary.occupied || 0} color="#ef4444" />
            <TableMetricCard label="Reserved Tables" count={tablesSummary.reserved || 0} color="#0284c7" />
            <TableMetricCard label="Needs Cleaning" count={tablesSummary.cleaning || 0} color="#f59e0b" />
          </div>

          {/* Area Filter & Actions Bar */}
          <div
            className="card"
            style={{
              padding: '12px 18px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--t-500)', textTransform: 'uppercase', marginRight: '6px' }}>
                Dining Area:
              </span>
              {STANDARD_AREAS.map((area) => (
                <button
                  key={area}
                  onClick={() => setAreaFilter(area)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 'var(--r-sm)',
                    fontSize: '12.5px',
                    fontWeight: areaFilter === area ? '700' : '500',
                    background: areaFilter === area ? 'var(--brand)' : 'var(--white)',
                    color: areaFilter === area ? 'white' : 'var(--t-700)',
                    border: '1px solid',
                    borderColor: areaFilter === area ? 'var(--brand)' : 'var(--border)',
                    cursor: 'pointer',
                  }}
                >
                  {area}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowAddTableModal(true)}
              className="btn btn-primary"
              style={{ fontSize: '12.5px', padding: '7px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={15} />
              Add Dining Table
            </button>
          </div>

          {/* Tables Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
            {filteredTables.map((tbl) => {
              const isOccupied = tbl.status === 'OCCUPIED';
              const isAvailable = tbl.status === 'AVAILABLE';
              const activeOrder = tbl.active_order;

              return (
                <div
                  key={tbl.id}
                  className="card"
                  style={{
                    padding: '16px',
                    borderTop: `4px solid ${
                      isOccupied ? '#ef4444' : isAvailable ? 'var(--success)' : tbl.status === 'RESERVED' ? '#0284c7' : '#f59e0b'
                    }`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '18px', fontWeight: '800', color: 'var(--t-900)' }}>
                        {tbl.table_no}
                      </strong>
                      <span
                        className={`badge ${
                          isAvailable
                            ? 'badge-success'
                            : isOccupied
                            ? 'badge-inactive'
                            : 'badge-brand'
                        }`}
                        style={{
                          background: isOccupied ? '#fee2e2' : undefined,
                          color: isOccupied ? '#b91c1c' : undefined,
                        }}
                      >
                        {tbl.status}
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--t-500)', marginBottom: '4px' }}>
                      {tbl.seating_area} &bull; Capacity: <strong>{tbl.capacity} Covers</strong>
                    </div>

                    {/* Active Order Details if Occupied */}
                    {isOccupied && activeOrder ? (
                      <div
                        style={{
                          background: 'var(--surface-sub)',
                          padding: '10px 12px',
                          borderRadius: 'var(--r-sm)',
                          marginTop: '10px',
                          marginBottom: '12px',
                          border: '1px solid var(--border-sub)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '2px' }}>
                          <span style={{ color: 'var(--t-500)' }}>Order:</span>
                          <strong style={{ color: 'var(--brand)' }}>{activeOrder.order_number}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '2px' }}>
                          <span style={{ color: 'var(--t-500)' }}>Running Bill:</span>
                          <strong style={{ color: 'var(--t-900)' }}>{formatCurrency(activeOrder.grand_total)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--t-500)' }}>
                          <span>{activeOrder.items_count} Items &bull; {activeOrder.covers} Guests</span>
                          <span>{activeOrder.opened_at}</span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '14px 0', fontSize: '12px', color: 'var(--t-500)', textAlign: 'center' }}>
                        Table ready for new guests
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-sub)' }}>
                    {isAvailable ? (
                      <button
                        onClick={() => handleOpenTableOrder(tbl)}
                        className="btn btn-primary"
                        style={{ flex: 1, fontSize: '12px', padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                      >
                        <Plus size={14} />
                        New Order
                      </button>
                    ) : isOccupied && activeOrder ? (
                      <>
                        <button
                          onClick={() => handleOpenTableOrder(tbl)}
                          className="btn btn-outline"
                          style={{ flex: 1, fontSize: '11.5px', padding: '6px 8px' }}
                        >
                          + KOT Items
                        </button>
                        <button
                          onClick={() => setShowSettleModal(activeOrder)}
                          className="btn btn-primary"
                          style={{ flex: 1, fontSize: '11.5px', padding: '6px 8px', background: 'var(--success)', borderColor: 'var(--success)' }}
                        >
                          Settle Bill
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={async () => {
                          await restaurantApi.updateTableStatus(tbl.id, 'AVAILABLE');
                          fetchAllData();
                        }}
                        className="btn btn-outline"
                        style={{ flex: 1, fontSize: '12px', padding: '6px 10px' }}
                      >
                        Mark Available
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. TAB 2: Touch POS Ordering Desk */}
      {activeTab === 'pos' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px', alignItems: 'flex-start' }}>
          {/* Left Panel: Menu Items Catalog */}
          <div>
            {/* Context Selector: Dine-In Table vs Room Service vs Takeaway */}
            <div
              className="card"
              style={{
                marginBottom: '16px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--t-500)', textTransform: 'uppercase' }}>
                  Order Channel:
                </span>
                <select
                  className="form-select"
                  value={posOrderType}
                  onChange={(e) => setPosOrderType(e.target.value)}
                  style={{ fontSize: '12.5px', padding: '5px 10px' }}
                >
                  <option value="DINE_IN">🍽️ Dine-In Table</option>
                  <option value="ROOM_SERVICE">🛎️ In-House Room Service</option>
                  <option value="TAKEAWAY">🛍️ Takeaway / Direct</option>
                </select>
              </div>

              {/* Channel-Specific Selectors */}
              {posOrderType === 'DINE_IN' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--t-600)' }}>Select Table:</span>
                  <select
                    className="form-select"
                    value={selectedTableForOrder?.id || ''}
                    onChange={(e) => {
                      const tbl = tables.find((t) => t.id === e.target.value);
                      setSelectedTableForOrder(tbl);
                      if (tbl?.active_order) {
                        setExistingOrderId(tbl.active_order.id);
                      } else {
                        setExistingOrderId(null);
                      }
                    }}
                    style={{ fontSize: '12.5px', padding: '5px 10px', minWidth: '130px' }}
                  >
                    <option value="">-- Choose Table --</option>
                    {tables.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.table_no} ({t.seating_area}) {t.status === 'OCCUPIED' ? '[OCCUPIED]' : ''}
                      </option>
                    ))}
                  </select>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--t-600)' }}>Covers:</span>
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      value={coversCount}
                      onChange={(e) => setCoversCount(Math.max(1, parseInt(e.target.value) || 1))}
                      style={{ width: '55px', padding: '4px 6px', fontSize: '12px' }}
                    />
                  </div>
                </div>
              )}

              {posOrderType === 'ROOM_SERVICE' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--t-600)' }}>Guest Room:</span>
                  <select
                    className="form-select"
                    value={selectedRoomForOrder?.room_id || ''}
                    onChange={(e) => {
                      const r = inHouseRooms.find((rm) => rm.room_id === e.target.value);
                      setSelectedRoomForOrder(r);
                    }}
                    style={{ fontSize: '12.5px', padding: '5px 10px', minWidth: '180px' }}
                  >
                    <option value="">-- Select In-House Room --</option>
                    {inHouseRooms.map((rm) => (
                      <option key={rm.room_id} value={rm.room_id}>
                        Room {rm.room_number} - {rm.guest_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {posOrderType === 'TAKEAWAY' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Customer Name"
                    className="form-input"
                    value={takeawayCustomer.name}
                    onChange={(e) => setTakeawayCustomer({ ...takeawayCustomer, name: e.target.value })}
                    style={{ fontSize: '12px', padding: '5px 8px', width: '130px' }}
                  />
                  <input
                    type="text"
                    placeholder="Phone Number"
                    className="form-input"
                    value={takeawayCustomer.phone}
                    onChange={(e) => setTakeawayCustomer({ ...takeawayCustomer, phone: e.target.value })}
                    style={{ fontSize: '12px', padding: '5px 8px', width: '120px' }}
                  />
                </div>
              )}
            </div>

            {/* Category Navigation & Search */}
            <div
              className="card"
              style={{
                marginBottom: '16px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              {/* Category Pills */}
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', flex: 1, paddingBottom: '2px' }}>
                <button
                  onClick={() => setSelectedCategory('ALL')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 'var(--r-sm)',
                    fontSize: '12px',
                    fontWeight: selectedCategory === 'ALL' ? '700' : '500',
                    background: selectedCategory === 'ALL' ? 'var(--brand)' : 'var(--surface-sub)',
                    color: selectedCategory === 'ALL' ? 'white' : 'var(--t-700)',
                    border: 'none',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  All Items
                </button>
                {menuCategories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategory(c.name)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 'var(--r-sm)',
                      fontSize: '12px',
                      fontWeight: selectedCategory === c.name ? '700' : '500',
                      background: selectedCategory === c.name ? 'var(--brand)' : 'var(--surface-sub)',
                      color: selectedCategory === c.name ? 'white' : 'var(--t-700)',
                      border: 'none',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {c.name}
                  </button>
                ))}
              </div>

              {/* Veg / Non-Veg Toggle & Search */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', overflow: 'hidden' }}>
                  <button
                    onClick={() => setFoodTypeFilter('ALL')}
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: foodTypeFilter === 'ALL' ? '700' : '500',
                      background: foodTypeFilter === 'ALL' ? 'var(--surface-sub)' : 'white',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFoodTypeFilter('VEG')}
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: foodTypeFilter === 'VEG' ? '700' : '500',
                      background: foodTypeFilter === 'VEG' ? '#dcfce7' : 'white',
                      color: foodTypeFilter === 'VEG' ? '#166534' : 'var(--t-600)',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    🟢 Veg
                  </button>
                  <button
                    onClick={() => setFoodTypeFilter('NON_VEG')}
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: foodTypeFilter === 'NON_VEG' ? '700' : '500',
                      background: foodTypeFilter === 'NON_VEG' ? '#fee2e2' : 'white',
                      color: foodTypeFilter === 'NON_VEG' ? '#991b1b' : 'var(--t-600)',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    🔴 Non-Veg
                  </button>
                </div>

                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: '8px', top: '8px', color: 'var(--t-500)' }} />
                  <input
                    type="text"
                    placeholder="Search dish..."
                    className="form-input"
                    value={menuSearchTerm}
                    onChange={(e) => setMenuSearchTerm(e.target.value)}
                    style={{ padding: '4px 8px 4px 28px', fontSize: '12px', width: '130px' }}
                  />
                </div>
              </div>
            </div>

            {/* Menu Items Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
              {filteredMenuItems.map((dish) => {
                const inCart = cartItems.find((i) => i.menuItem.id === dish.id);

                return (
                  <div
                    key={dish.id}
                    className="card"
                    style={{
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      borderLeft: `4px solid ${
                        dish.food_type === 'VEG' ? '#10b981' : dish.food_type === 'NON_VEG' ? '#ef4444' : '#f59e0b'
                      }`,
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--t-500)' }}>
                          {dish.item_code}
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: '700',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: dish.food_type === 'VEG' ? '#dcfce7' : '#fee2e2',
                            color: dish.food_type === 'VEG' ? '#166534' : '#991b1b',
                          }}
                        >
                          {dish.food_type === 'VEG' ? '🟢 VEG' : '🔴 NON-VEG'}
                        </span>
                      </div>

                      <strong style={{ fontSize: '14px', color: 'var(--t-900)', display: 'block', marginBottom: '4px' }}>
                        {dish.name}
                      </strong>
                      <p style={{ fontSize: '11.5px', color: 'var(--t-500)', lineHeight: '1.3', marginBottom: '10px' }}>
                        {dish.description || 'Prepared fresh on order.'}
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                      <strong style={{ fontSize: '15px', color: 'var(--t-900)', fontWeight: '800' }}>
                        {formatCurrency(dish.price)}
                      </strong>

                      {inCart ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            onClick={() => handleUpdateQuantity(dish.id, -1)}
                            className="btn btn-outline"
                            style={{ padding: '2px 8px', fontSize: '12px' }}
                          >
                            -
                          </button>
                          <span style={{ fontSize: '13px', fontWeight: '800', minWidth: '16px', textAlign: 'center' }}>
                            {inCart.quantity}
                          </span>
                          <button
                            onClick={() => handleUpdateQuantity(dish.id, 1)}
                            className="btn btn-primary"
                            style={{ padding: '2px 8px', fontSize: '12px' }}
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAddToCart(dish)}
                          className="btn btn-outline"
                          style={{ fontSize: '12px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Plus size={13} />
                          Add
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Panel: Live Cart & KOT Desk */}
          <div
            className="card"
            style={{
              position: 'sticky',
              top: '20px',
              padding: '18px',
              borderTop: '4px solid var(--brand)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--t-900)' }}>
                  Current Order Cart
                </h3>
                <span style={{ fontSize: '11.5px', color: 'var(--t-500)' }}>
                  {posOrderType === 'DINE_IN'
                    ? selectedTableForOrder
                      ? `Table: ${selectedTableForOrder.table_no}`
                      : 'No table selected'
                    : posOrderType === 'ROOM_SERVICE'
                    ? selectedRoomForOrder
                      ? `Room ${selectedRoomForOrder.room_number}`
                      : 'No room selected'
                    : 'Takeaway Order'}
                </span>
              </div>

              {cartItems.length > 0 && (
                <button
                  onClick={() => setCartItems([])}
                  style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                >
                  <Trash2 size={12} /> Clear
                </button>
              )}
            </div>

            {/* Cart Item List */}
            {cartItems.length === 0 ? (
              <div style={{ padding: '36px 12px', textAlign: 'center', color: 'var(--t-500)', fontSize: '12.5px' }}>
                <ShoppingBag size={28} style={{ opacity: 0.3, margin: '0 auto 8px' }} />
                Your order cart is empty.<br />Click items on the left to add dishes.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '360px', overflowY: 'auto', marginBottom: '16px' }}>
                {cartItems.map((ci) => (
                  <div
                    key={ci.menuItem.id}
                    style={{
                      background: 'var(--surface-sub)',
                      padding: '10px 12px',
                      borderRadius: 'var(--r-sm)',
                      border: '1px solid var(--border-sub)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '13px', color: 'var(--t-900)' }}>
                        {ci.menuItem.name}
                      </strong>
                      <span style={{ fontSize: '13px', fontWeight: '700' }}>
                        {formatCurrency(Number(ci.menuItem.price) * ci.quantity)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          onClick={() => handleUpdateQuantity(ci.menuItem.id, -1)}
                          style={{ width: '22px', height: '22px', borderRadius: '4px', border: '1px solid var(--border)', background: 'white', cursor: 'pointer' }}
                        >
                          -
                        </button>
                        <span style={{ fontSize: '12px', fontWeight: '700' }}>{ci.quantity}</span>
                        <button
                          onClick={() => handleUpdateQuantity(ci.menuItem.id, 1)}
                          style={{ width: '22px', height: '22px', borderRadius: '4px', border: '1px solid var(--border)', background: 'white', cursor: 'pointer' }}
                        >
                          +
                        </button>
                      </div>

                      <input
                        type="text"
                        placeholder="Cooking notes..."
                        value={ci.special_notes}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCartItems((prev) =>
                            prev.map((item) =>
                              item.menuItem.id === ci.menuItem.id ? { ...item, special_notes: val } : item
                            )
                          );
                        }}
                        style={{
                          fontSize: '11px',
                          padding: '3px 6px',
                          border: '1px solid var(--border)',
                          borderRadius: '4px',
                          width: '130px',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Price Breakdown */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '4px' }}>
                <span style={{ color: 'var(--t-500)' }}>Food Subtotal:</span>
                <span style={{ fontWeight: '600' }}>{formatCurrency(cartSubtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '4px' }}>
                <span style={{ color: 'var(--t-500)' }}>GST Output (5%):</span>
                <span style={{ fontWeight: '600' }}>{formatCurrency(cartGst)}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '15px',
                  fontWeight: '800',
                  color: 'var(--t-900)',
                  borderTop: '1px dashed var(--border)',
                  paddingTop: '8px',
                  marginTop: '6px',
                }}
              >
                <span>Estimated Bill:</span>
                <span style={{ color: 'var(--brand)' }}>{formatCurrency(cartGrandTotal)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <button
              onClick={handlePunchOrder}
              disabled={punchingOrder || cartItems.length === 0}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '13px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <Utensils size={16} />
              {punchingOrder
                ? 'Punching Order...'
                : existingOrderId
                ? 'Punch Additional KOT'
                : 'Send KOT to Kitchen'}
            </button>
          </div>
        </div>
      )}

      {/* 4. TAB 3: Live Orders Registry */}
      {activeTab === 'orders' && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--t-900)' }}>
                Restaurant Orders & KOT History
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--t-500)' }}>
                Track table dining orders, kitchen tickets, and billing settlements.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                className="form-select"
                value={ordersStatusFilter}
                onChange={(e) => setOrdersStatusFilter(e.target.value)}
                style={{ fontSize: '12px', padding: '6px 10px' }}
              >
                <option value="ALL">All Order Statuses</option>
                <option value="OPEN">Open (Active Dining)</option>
                <option value="BILLED">Billed</option>
                <option value="SETTLED">Settled / Paid</option>
              </select>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '10px 12px' }}>Order #</th>
                  <th style={{ padding: '10px 12px' }}>Channel / Table</th>
                  <th style={{ padding: '10px 12px' }}>Guest Details</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Items Count</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Grand Total</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '10px 12px' }}>Settlement</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((ord) => (
                  <tr key={ord.id} style={{ borderBottom: '1px solid var(--border-sub)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: '700', color: 'var(--brand)' }}>
                      {ord.order_number}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className="badge badge-brand" style={{ fontSize: '10.5px' }}>
                        {ord.order_type === 'DINE_IN'
                          ? `Table ${ord.table?.table_no || '--'}`
                          : ord.order_type === 'ROOM_SERVICE'
                          ? `Room ${ord.room?.room_number || '--'}`
                          : 'Takeaway'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: '600' }}>
                        {ord.customer_name || ord.booking?.guest?.first_name || 'Walk-in Guest'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--t-500)' }}>
                        {ord.customer_phone || ord.booking?.guest?.phone || ''}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      {ord.items?.length || 0} items
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '800', color: 'var(--t-900)' }}>
                      {formatCurrency(ord.grand_total)}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <span
                        className={`badge ${
                          ord.status === 'SETTLED'
                            ? 'badge-success'
                            : ord.status === 'OPEN'
                            ? 'badge-inactive'
                            : 'badge-brand'
                        }`}
                        style={{
                          background: ord.status === 'OPEN' ? '#fee2e2' : undefined,
                          color: ord.status === 'OPEN' ? '#b91c1c' : undefined,
                        }}
                      >
                        {ord.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: '12px' }}>
                      {ord.settlement_method ? (
                        <div>
                          <strong>{ord.settlement_method}</strong>
                          <div style={{ fontSize: '10.5px', color: 'var(--t-500)' }}>{ord.settlement_reference}</div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--t-500)' }}>Unpaid</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => setPrintReceiptData(ord)}
                          className="btn btn-outline"
                          style={{ padding: '4px 8px', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Printer size={12} />
                          Receipt
                        </button>
                        {ord.status !== 'SETTLED' && (
                          <button
                            onClick={() => setShowSettleModal(ord)}
                            className="btn btn-primary"
                            style={{ padding: '4px 10px', fontSize: '11.5px', background: 'var(--success)', borderColor: 'var(--success)' }}
                          >
                            Settle
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. TAB 4: Menu Catalog Management */}
      {activeTab === 'menu_management' && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--t-900)' }}>
                Food & Beverage Menu Catalog
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--t-500)' }}>
                Configure dishes, standard restaurant 5% GST, and instant 86 out-of-stock toggles.
              </p>
            </div>

            <button
              onClick={() => setShowAddDishModal(true)}
              className="btn btn-primary"
              style={{ fontSize: '12.5px', padding: '7px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={15} />
              Add Menu Dish
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '10px 12px' }}>Dish Code</th>
                  <th style={{ padding: '10px 12px' }}>Name & Description</th>
                  <th style={{ padding: '10px 12px' }}>Category</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Type</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Price (INR)</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>GST Rate</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Availability</th>
                </tr>
              </thead>
              <tbody>
                {menuItems.map((dish) => (
                  <tr key={dish.id} style={{ borderBottom: '1px solid var(--border-sub)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: '700', color: 'var(--brand)' }}>
                      {dish.item_code}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <strong style={{ color: 'var(--t-900)' }}>{dish.name}</strong>
                      <div style={{ fontSize: '11px', color: 'var(--t-500)', marginTop: '2px' }}>
                        {dish.description}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--t-700)' }}>{dish.category_name}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: dish.food_type === 'VEG' ? '#dcfce7' : '#fee2e2',
                          color: dish.food_type === 'VEG' ? '#166534' : '#991b1b',
                        }}
                      >
                        {dish.food_type === 'VEG' ? '🟢 VEG' : '🔴 NON-VEG'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '800', color: 'var(--t-900)' }}>
                      {formatCurrency(dish.price)}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--t-600)' }}>
                      {dish.gst_percentage}%
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <button
                        onClick={async () => {
                          await restaurantApi.updateMenuItem(dish.id, { is_available: !dish.is_available });
                          fetchAllData();
                        }}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          background: dish.is_available ? '#dcfce7' : '#fee2e2',
                          color: dish.is_available ? '#166534' : '#991b1b',
                          border: 'none',
                        }}
                      >
                        {dish.is_available ? 'In Stock' : 'Out of Stock (86)'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. TAB 5: In-Room Dining & QR Tent Cards */}
      {activeTab === 'room_dining_qr' && (
        <div>
          {/* Header Card */}
          <div
            className="card"
            style={{
              marginBottom: '20px',
              background: 'linear-gradient(135deg, var(--brand-50) 0%, var(--white) 100%)',
              border: '1px solid var(--brand-200)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span className="badge badge-brand" style={{ fontWeight: '700' }}>
                  24/7 Digital Room Service
                </span>
                <span className="badge badge-success">Mobile Self-Ordering Active</span>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--t-900)' }}>
                In-Room Dining Digital QR Menu & Mobile Ordering
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--t-600)', marginTop: '2px', maxWidth: '680px' }}>
                Hotel guests scan the bedside QR code on their personal smartphone to browse the restaurant menu, place orders directly to the Kitchen KDS, and automatically post charges to their room folio.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => window.print()}
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', padding: '8px 14px' }}
              >
                <Printer size={15} />
                <span>Print All Room Cards</span>
              </button>
            </div>
          </div>

          {/* Room Standees Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '16px',
            }}
          >
            {(inHouseRooms.length > 0
              ? inHouseRooms
              : [
                  { room_number: '101', room_type: 'Deluxe Sea View', guest_name: 'Rahul Verma (In-House)' },
                  { room_number: '102', room_type: 'Executive Suite', guest_name: 'Priya Sharma (In-House)' },
                  { room_number: '201', room_type: 'Presidential Suite', guest_name: 'Ananya Roy (In-House)' },
                  { room_number: '202', room_type: 'Standard King', guest_name: null },
                ]
            ).map((r, idx) => {
              const hotelCode = currentHotel?.hotel_code || 'HTL-1002';
              const orderUrl = `https://sas.u2tech.in/room-order/${hotelCode}/${r.room_number}`;
              const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                orderUrl
              )}`;

              return (
                <div
                  key={idx}
                  className="card"
                  style={{
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-sm)',
                    position: 'relative',
                  }}
                >
                  {/* Top Badge */}
                  <div
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '12px',
                    }}
                  >
                    <span
                      style={{
                        background: 'var(--brand-50)',
                        color: 'var(--brand)',
                        fontSize: '11px',
                        fontWeight: '800',
                        padding: '3px 8px',
                        borderRadius: '6px',
                      }}
                    >
                      Room {r.room_number}
                    </span>
                    <span
                      className={`badge ${r.guest_name ? 'badge-success' : 'badge-inactive'}`}
                      style={{ fontSize: '10px' }}
                    >
                      {r.guest_name ? 'Occupied' : 'Vacant'}
                    </span>
                  </div>

                  {/* QR Code Container */}
                  <div
                    style={{
                      background: '#ffffff',
                      border: '2px solid var(--border-sub)',
                      borderRadius: '12px',
                      padding: '12px',
                      margin: '6px 0 12px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    }}
                  >
                    <img
                      src={qrImageUrl}
                      alt={`QR Code Room ${r.room_number}`}
                      style={{ width: '130px', height: '130px', display: 'block' }}
                    />
                  </div>

                  <strong style={{ fontSize: '15px', color: 'var(--t-900)' }}>
                    Scan for In-Room Dining
                  </strong>
                  <p style={{ fontSize: '11.5px', color: 'var(--t-500)', margin: '2px 0 12px' }}>
                    {r.room_type || 'Hotel Room'} &bull; {currentHotel?.name || 'Hotel'}
                  </p>

                  {r.guest_name && (
                    <div
                      style={{
                        width: '100%',
                        background: 'var(--surface-sub)',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        color: 'var(--t-700)',
                        marginBottom: '14px',
                      }}
                    >
                      Guest: <strong>{r.guest_name}</strong>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <a
                      href={`/room-order/${hotelCode}/${r.room_number}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                      style={{
                        textDecoration: 'none',
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        padding: '6px',
                      }}
                    >
                      <span>📱 Test View</span>
                    </a>
                    <button
                      onClick={() => window.open(orderUrl, '_blank')}
                      className="btn btn-primary btn-sm"
                      style={{
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        padding: '6px',
                      }}
                    >
                      <span>Open Link ➔</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. MODAL: Settle Bill */}
      {showSettleModal && (
        <div className="modal-overlay" onClick={() => setShowSettleModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--t-900)' }}>
                Settle Food Bill #{showSettleModal.order_number}
              </h3>
              <button onClick={() => setShowSettleModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {/* Bill Summary */}
            <div style={{ background: 'var(--surface-sub)', padding: '12px 16px', borderRadius: 'var(--r-sm)', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                <span style={{ color: 'var(--t-500)' }}>Subtotal:</span>
                <span>{formatCurrency(showSettleModal.subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                <span style={{ color: 'var(--t-500)' }}>5% GST:</span>
                <span>{formatCurrency(showSettleModal.tax_amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '800', color: 'var(--brand)', borderTop: '1px solid var(--border)', paddingTop: '6px', marginTop: '6px' }}>
                <span>Grand Total:</span>
                <span>{formatCurrency(showSettleModal.grand_total)}</span>
              </div>
            </div>

            {/* Method Tabs */}
            <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--t-500)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
              Settlement Method:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '16px' }}>
              {[
                { id: 'ROOM_FOLIO', label: '🏨 Room Folio' },
                { id: 'UPI_QR', label: '📱 UPI QR' },
                { id: 'CASH', label: '💵 Cash' },
                { id: 'CARD', label: '💳 Card' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSettlementMethod(m.id)}
                  style={{
                    padding: '8px 4px',
                    borderRadius: 'var(--r-sm)',
                    fontSize: '11.5px',
                    fontWeight: settlementMethod === m.id ? '700' : '500',
                    background: settlementMethod === m.id ? 'var(--brand)' : 'white',
                    color: settlementMethod === m.id ? 'white' : 'var(--t-700)',
                    border: '1px solid',
                    borderColor: settlementMethod === m.id ? 'var(--brand)' : 'var(--border)',
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Room Folio Selector */}
            {settlementMethod === 'ROOM_FOLIO' && (
              <div style={{ marginBottom: '16px', background: '#eff6ff', padding: '14px', borderRadius: 'var(--r-sm)', border: '1px solid #bfdbfe' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#1e40af', display: 'block', marginBottom: '4px' }}>
                  Select Checked-In Guest Room:
                </label>
                <select
                  className="form-select"
                  value={settlementRoomId}
                  onChange={(e) => setSettlementRoomId(e.target.value)}
                  style={{ fontSize: '12.5px' }}
                >
                  <option value="">-- Choose In-House Room --</option>
                  {inHouseRooms.map((rm) => (
                    <option key={rm.room_id} value={rm.room_id}>
                      Room {rm.room_number} &bull; {rm.guest_name} ({rm.room_type})
                    </option>
                  ))}
                </select>
                <p style={{ fontSize: '11px', color: '#1e40af', marginTop: '6px' }}>
                  Charge of <strong>{formatCurrency(showSettleModal.grand_total)}</strong> will be automatically posted to this guest's Front Office checkout folio!
                </p>
              </div>
            )}

            {/* Dynamic Scannable UPI QR Display & Configuration */}
            {settlementMethod === 'UPI_QR' && (
              <UpiQrPaymentDisplay
                amount={showSettleModal.grand_total}
                orderNumber={showSettleModal.order_number}
                hotelId={currentHotel?.id}
                hotelName={currentHotel?.name}
                onUtrChange={(utrVal) => setTransactionRef(utrVal)}
                initialUtr={transactionRef}
                canConfigure={true}
              />
            )}

            <button
              onClick={handleConfirmSettlement}
              disabled={settling || (settlementMethod === 'ROOM_FOLIO' && !settlementRoomId)}
              className="btn btn-primary"
              style={{ width: '100%', padding: '10px', fontSize: '13px', fontWeight: '700' }}
            >
              {settling ? 'Settling Payment...' : 'Confirm & Settle Bill'}
            </button>
          </div>
        </div>
      )}

      {/* 7. MODAL: Add Table */}
      {showAddTableModal && (
        <div className="modal-overlay" onClick={() => setShowAddTableModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--t-900)', marginBottom: '14px' }}>
              Add New Dining Table
            </h3>
            <form onSubmit={handleCreateTable}>
              <div style={{ marginBottom: '12px' }}>
                <label className="form-label">Table Number / Label *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. T-07, VIP-02"
                  className="form-input"
                  value={newTableForm.table_no}
                  onChange={(e) => setNewTableForm({ ...newTableForm, table_no: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label className="form-label">Seating Capacity *</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    required
                    className="form-input"
                    value={newTableForm.capacity}
                    onChange={(e) => setNewTableForm({ ...newTableForm, capacity: parseInt(e.target.value) || 2 })}
                  />
                </div>
                <div>
                  <label className="form-label">Dining Area *</label>
                  <select
                    className="form-select"
                    value={newTableForm.seating_area}
                    onChange={(e) => setNewTableForm({ ...newTableForm, seating_area: e.target.value })}
                  >
                    <option value="AC Dining Hall">AC Dining Hall</option>
                    <option value="Family Lounge">Family Lounge</option>
                    <option value="Sea View Terrace">Sea View Terrace</option>
                    <option value="VIP Private Dining">VIP Private Dining</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '9px', fontSize: '13px', marginTop: '6px' }}>
                Create Table
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 8. MODAL: Add Menu Dish */}
      {showAddDishModal && (
        <div className="modal-overlay" onClick={() => setShowAddDishModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--t-900)', marginBottom: '14px' }}>
              Add Dish to Food Menu
            </h3>
            <form onSubmit={handleCreateDish}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label className="form-label">Item Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MNU-CUR-10"
                    className="form-input"
                    value={newDishForm.item_code}
                    onChange={(e) => setNewDishForm({ ...newDishForm, item_code: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Category *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Main Course, Starters"
                    className="form-input"
                    value={newDishForm.category_name}
                    onChange={(e) => setNewDishForm({ ...newDishForm, category_name: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label className="form-label">Dish Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kadhai Paneer Special"
                  className="form-input"
                  value={newDishForm.name}
                  onChange={(e) => setNewDishForm({ ...newDishForm, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label className="form-label">Price (INR) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    className="form-input"
                    value={newDishForm.price}
                    onChange={(e) => setNewDishForm({ ...newDishForm, price: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Dietary Type *</label>
                  <select
                    className="form-select"
                    value={newDishForm.food_type}
                    onChange={(e) => setNewDishForm({ ...newDishForm, food_type: e.target.value })}
                  >
                    <option value="VEG">🟢 Vegetarian (Veg)</option>
                    <option value="NON_VEG">🔴 Non-Vegetarian</option>
                    <option value="EGG">🟡 Contains Egg</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="form-label">Description / Ingredients</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="Optional brief notes or taste profile..."
                  value={newDishForm.description}
                  onChange={(e) => setNewDishForm({ ...newDishForm, description: e.target.value })}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '9px', fontSize: '13px' }}>
                Add to Menu
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 9. Printable GST Dining Tax Invoice Modal */}
      {printReceiptData && (
        <div className="modal-overlay" onClick={() => setPrintReceiptData(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', padding: '24px' }}>
            <div style={{ textAlign: 'center', borderBottom: '1px dashed var(--border)', paddingBottom: '12px', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0 }}>{currentHotel?.name}</h3>
              <div style={{ fontSize: '11px', color: 'var(--t-500)', marginTop: '2px' }}>
                Restaurant & Dining POS Invoice
              </div>
              <div style={{ fontSize: '11px', color: 'var(--t-500)' }}>
                GSTIN: 27AABCR1234D1Z2 &bull; Bill #: {printReceiptData.order_number}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--t-500)' }}>
                {new Date().toLocaleString()} &bull; {printReceiptData.table ? `Table ${printReceiptData.table.table_no}` : 'Room Service'}
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              {printReceiptData.items?.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span>{item.quantity} x {item.item_name}</span>
                  <span style={{ fontWeight: '600' }}>{formatCurrency(item.total_price)}</span>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '8px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span>Subtotal:</span>
                <span>{formatCurrency(printReceiptData.subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span>CGST (2.5%):</span>
                <span>{formatCurrency(Number(printReceiptData.tax_amount) / 2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span>SGST (2.5%):</span>
                <span>{formatCurrency(Number(printReceiptData.tax_amount) / 2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '800', marginTop: '6px', borderTop: '1px solid var(--border)', paddingTop: '6px' }}>
                <span>Grand Total:</span>
                <span>{formatCurrency(printReceiptData.grand_total)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--t-500)', marginTop: '4px' }}>
                <span>Paid via:</span>
                <strong>{printReceiptData.settlement_method}</strong>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '11px', color: 'var(--t-500)', borderTop: '1px dashed var(--border)', paddingTop: '10px' }}>
              Thank you for dining with us!
            </div>

            <button
              onClick={() => window.print()}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '14px', fontSize: '12.5px', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <Printer size={14} />
              Print Invoice
            </button>
          </div>
        </div>
      )}

      {/* Restaurant Shift Handover & Cash Drawer Modal */}
      <ShiftRegisterModal
        isOpen={showShiftRegisterModal}
        onClose={() => setShowShiftRegisterModal(false)}
        defaultDepartment="RESTAURANT_POS"
        hotelId={currentHotel?.id}
      />
    </div>
  );
}

function TableMetricCard({ label, count, color }) {
  return (
    <div className="card" style={{ padding: '12px 14px', borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--t-500)', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--t-900)', marginTop: '2px' }}>
        {count}
      </div>
    </div>
  );
}

