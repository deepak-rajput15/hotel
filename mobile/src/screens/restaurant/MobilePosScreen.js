import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import Header from '../../components/Header';
import AddTableModal from './AddTableModal';
import AddDishModal from './AddDishModal';
import SettleOrderModal from './SettleOrderModal';
import ShiftRegisterModal from '../../components/ShiftRegisterModal';
import { COLORS } from '../../theme/colors';
import {
  Utensils,
  Plus,
  Minus,
  CheckCircle2,
  Search,
  ShoppingCart,
  Send,
  IndianRupee,
  Bed,
  Clock,
  PlusCircle,
  FileText,
  CreditCard,
  User,
} from 'lucide-react-native';

const ORDER_TYPES = [
  { key: 'DINE_IN', label: '🍽️ Dine-In Table' },
  { key: 'ROOM_SERVICE', label: '🏨 Room Service' },
  { key: 'TAKEAWAY', label: '🛍️ Takeaway' },
];

export default function MobilePosScreen() {
  const { currentHotel } = useAuth();
  const [activeTab, setActiveTab] = useState('tables'); // 'tables' | 'pos' | 'orders' | 'menu_mgmt'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [tables, setTables] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [inHouseRooms, setInHouseRooms] = useState([]);

  // POS State
  const [orderType, setOrderType] = useState('DINE_IN');
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [coversCount, setCoversCount] = useState(2);
  const [cart, setCart] = useState({}); // { itemId: { item, qty, notes } }
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [foodTypeFilter, setFoodTypeFilter] = useState('ALL'); // 'ALL' | 'VEG' | 'NON_VEG'
  const [punching, setPunching] = useState(false);

  // Modals
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [showAddDishModal, setShowAddDishModal] = useState(false);
  const [orderToSettle, setOrderToSettle] = useState(null);
  const [showShiftModal, setShowShiftModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, [currentHotel]);

  const fetchData = async () => {
    try {
      const [tRes, mRes, oRes, rRes] = await Promise.allSettled([
        api.getTables(),
        api.getMenuItems(),
        api.getActiveOrders(),
        api.getInHouseRooms(),
      ]);

      if (tRes.status === 'fulfilled') {
        const tData = tRes.value?.tables || tRes.value?.data?.tables || tRes.value?.data || tRes.value || [];
        setTables(Array.isArray(tData) ? tData : []);
        if (tData.length > 0 && !selectedTable) setSelectedTable(tData[0]);
      }
      if (mRes.status === 'fulfilled') {
        const mData = mRes.value?.items || mRes.value?.data?.items || mRes.value?.data || mRes.value || [];
        setMenuItems(Array.isArray(mData) ? mData : []);
      }
      if (oRes.status === 'fulfilled') {
        const oData =
          oRes.value?.orders?.data ||
          oRes.value?.orders ||
          oRes.value?.data?.orders ||
          oRes.value?.data ||
          oRes.value ||
          [];
        setOrders(Array.isArray(oData) ? oData : []);
      }
      if (rRes.status === 'fulfilled') {
        const rData = rRes.value?.rooms || rRes.value?.data?.rooms || rRes.value?.data || rRes.value || [];
        setInHouseRooms(Array.isArray(rData) ? rData : []);
        if (rData.length > 0 && !selectedRoom) setSelectedRoom(rData[0]);
      }
    } catch (e) {
      console.warn('Error fetching POS data', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Cart operations
  const updateCart = (item, delta) => {
    setCart((prev) => {
      const currentQty = prev[item.id]?.qty || 0;
      const newQty = Math.max(0, currentQty + delta);
      if (newQty === 0) {
        const copy = { ...prev };
        delete copy[item.id];
        return copy;
      }
      return {
        ...prev,
        [item.id]: {
          item,
          qty: newQty,
        },
      };
    });
  };

  const cartItemsList = Object.values(cart);
  const cartSubtotal = cartItemsList.reduce(
    (acc, curr) => acc + (curr.item.price || 0) * curr.qty,
    0
  );
  const cartTax = Math.round(cartSubtotal * 0.05); // 5% GST
  const cartGrandTotal = cartSubtotal + cartTax;

  const handlePunchKot = async () => {
    if (cartItemsList.length === 0) {
      Alert.alert('Empty Order', 'Please select dishes from the menu to punch order.');
      return;
    }

    if (orderType === 'DINE_IN' && !selectedTable) {
      Alert.alert('Table Required', 'Please select a dining table.');
      return;
    }
    if (orderType === 'ROOM_SERVICE' && !selectedRoom) {
      Alert.alert('Room Required', 'Please select a room for room service.');
      return;
    }

    setPunching(true);
    try {
      const payload = {
        order_type: orderType,
        table_id: orderType === 'DINE_IN' ? selectedTable?.id : null,
        room_id: orderType === 'ROOM_SERVICE' ? selectedRoom?.id : null,
        customer_name: orderType === 'TAKEAWAY' ? customerName : null,
        customer_phone: orderType === 'TAKEAWAY' ? customerPhone : null,
        covers: coversCount,
        items: cartItemsList.map((c) => ({
          menu_item_id: c.item.id,
          quantity: c.qty,
        })),
      };

      const res = await api.createRestaurantOrder(payload);
      Alert.alert('Order Created 🎉', `Order #${res.order?.order_number || ''} punched to Kitchen.`);
      setCart({});
      fetchData();
      setActiveTab('orders');
    } catch (err) {
      Alert.alert('Order Error', err.message || 'Failed to create order.');
    } finally {
      setPunching(false);
    }
  };

  // Categories list
  const categoriesList = ['ALL', ...new Set(menuItems.map((m) => m.category_name).filter(Boolean))];

  // Filtered menu
  const filteredMenuItems = menuItems.filter((item) => {
    if (selectedCategory !== 'ALL' && item.category_name !== selectedCategory) return false;
    if (foodTypeFilter !== 'ALL' && item.food_type !== foodTypeFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.name || '').toLowerCase().includes(q) ||
      (item.item_code || '').toLowerCase().includes(q) ||
      (item.category_name || '').toLowerCase().includes(q)
    );
  });

  return (
    <View style={styles.container}>
      <Header
        title="Restaurant POS"
        subtitle={`Dining & Billing • ${currentHotel?.name || 'GrandStay'}`}
      />

      {/* Top Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.actionBtnPrimary}
          onPress={() => setActiveTab('pos')}
        >
          <Utensils size={15} color="white" style={{ marginRight: 6 }} />
          <Text style={styles.actionBtnPrimaryText}>+ New KOT Order</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtnSecondary}
          onPress={() => setShowShiftModal(true)}
        >
          <Clock size={14} color={COLORS.brand} style={{ marginRight: 4 }} />
          <Text style={styles.actionBtnSecondaryText}>Cash Drawer</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtnIcon}
          onPress={() => (activeTab === 'menu_mgmt' ? setShowAddDishModal(true) : setShowAddTableModal(true))}
        >
          <PlusCircle size={15} color={COLORS.textPrimary} style={{ marginRight: 4 }} />
          <Text style={styles.actionBtnIconText}>
            {activeTab === 'menu_mgmt' ? '+ Dish' : '+ Table'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 4 Tabs matching web */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'tables' && styles.tabItemActive]}
          onPress={() => setActiveTab('tables')}
        >
          <Text style={[styles.tabText, activeTab === 'tables' && styles.tabTextActive]}>
            Tables ({tables.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'pos' && styles.tabItemActive]}
          onPress={() => setActiveTab('pos')}
        >
          <Text style={[styles.tabText, activeTab === 'pos' && styles.tabTextActive]}>
            POS Cart {cartItemsList.length > 0 ? `(${cartItemsList.length})` : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'orders' && styles.tabItemActive]}
          onPress={() => setActiveTab('orders')}
        >
          <Text style={[styles.tabText, activeTab === 'orders' && styles.tabTextActive]}>
            Orders ({orders.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'menu_mgmt' && styles.tabItemActive]}
          onPress={() => setActiveTab('menu_mgmt')}
        >
          <Text style={[styles.tabText, activeTab === 'menu_mgmt' && styles.tabTextActive]}>
            Menu ({menuItems.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.brand} />
          <Text style={styles.loadingText}>Loading restaurant console...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand} />
          }
        >
          {/* TAB 1: TABLES GRID */}
          {activeTab === 'tables' && (
            <View>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>Dining Tables Floor Plan</Text>
                <TouchableOpacity
                  style={styles.addSmallBtn}
                  onPress={() => setShowAddTableModal(true)}
                >
                  <PlusCircle size={13} color="white" style={{ marginRight: 4 }} />
                  <Text style={styles.addSmallBtnText}>+ Add Table</Text>
                </TouchableOpacity>
              </View>

              {tables.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Utensils size={40} color={COLORS.textMuted} />
                  <Text style={styles.emptyTitle}>No Dining Tables Added</Text>
                  <TouchableOpacity
                    style={styles.emptyActionBtn}
                    onPress={() => setShowAddTableModal(true)}
                  >
                    <Text style={styles.emptyActionBtnText}>+ Add First Dining Table</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.tablesGrid}>
                  {tables.map((t) => {
                    const isOccupied = t.status === 'OCCUPIED' || !!t.active_order;
                    const isBilled = t.status === 'BILLED';
                    return (
                      <TouchableOpacity
                        key={t.id}
                        style={[
                          styles.tableCard,
                          isOccupied && styles.tableCardOccupied,
                          isBilled && styles.tableCardBilled,
                        ]}
                        onPress={() => {
                          if (t.active_order) {
                            setOrderToSettle(t.active_order);
                          } else {
                            setSelectedTable(t);
                            setOrderType('DINE_IN');
                            setActiveTab('pos');
                          }
                        }}
                      >
                        <View style={styles.tableCardTop}>
                          <Text style={styles.tableNumber}>{t.table_no}</Text>
                          <View
                            style={[
                              styles.tableStatusDot,
                              isOccupied
                                ? { backgroundColor: COLORS.occupied }
                                : isBilled
                                ? { backgroundColor: COLORS.warning }
                                : { backgroundColor: COLORS.clean },
                            ]}
                          />
                        </View>
                        <Text style={styles.tableArea}>{t.seating_area || 'Main Hall'}</Text>
                        <Text style={styles.tableCapacity}>{t.capacity || 4} Covers</Text>

                        {t.active_order ? (
                          <View style={styles.tableActiveOrderBox}>
                            <Text style={styles.tableOrderNum}>
                              #{t.active_order.order_number}
                            </Text>
                            <Text style={styles.tableOrderTotal}>
                              ₹{Number(t.active_order.grand_total || 0).toLocaleString('en-IN')}
                            </Text>
                            <Text style={styles.tableSettleText}>Tap to Settle Bill →</Text>
                          </View>
                        ) : (
                          <Text style={styles.tableFreeText}>🟢 Free • Tap to Order</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* TAB 2: POS MENU & CART */}
          {activeTab === 'pos' && (
            <View>
              {/* Order Destination Selector */}
              <View style={styles.orderTypeCard}>
                <Text style={styles.orderTypeLabel}>Order Destination</Text>
                <View style={styles.orderTypeRow}>
                  {ORDER_TYPES.map((ot) => (
                    <TouchableOpacity
                      key={ot.key}
                      style={[styles.orderTypeBtn, orderType === ot.key && styles.orderTypeBtnActive]}
                      onPress={() => setOrderType(ot.key)}
                    >
                      <Text
                        style={[
                          styles.orderTypeBtnText,
                          orderType === ot.key && styles.orderTypeBtnTextActive,
                        ]}
                      >
                        {ot.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {orderType === 'DINE_IN' && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={styles.subSelectorLabel}>Select Table:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {tables.map((t) => (
                          <TouchableOpacity
                            key={t.id}
                            style={[
                              styles.selectorPill,
                              selectedTable?.id === t.id && styles.selectorPillActive,
                            ]}
                            onPress={() => setSelectedTable(t)}
                          >
                            <Text
                              style={[
                                styles.selectorPillText,
                                selectedTable?.id === t.id && styles.selectorPillTextActive,
                              ]}
                            >
                              {t.table_no} ({t.status})
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                )}

                {orderType === 'ROOM_SERVICE' && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={styles.subSelectorLabel}>Select In-House Room:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {inHouseRooms.map((r) => (
                          <TouchableOpacity
                            key={r.id}
                            style={[
                              styles.selectorPill,
                              selectedRoom?.id === r.id && styles.selectorPillActive,
                            ]}
                            onPress={() => setSelectedRoom(r)}
                          >
                            <Text
                              style={[
                                styles.selectorPillText,
                                selectedRoom?.id === r.id && styles.selectorPillTextActive,
                              ]}
                            >
                              Room {r.room_number} ({r.current_guest?.guest_name || 'Guest'})
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                )}

                {orderType === 'TAKEAWAY' && (
                  <View style={{ marginTop: 10, gap: 8 }}>
                    <TextInput
                      style={styles.input}
                      placeholder="Customer Name (e.g. Rahul Verma)"
                      value={customerName}
                      onChangeText={setCustomerName}
                    />
                    <TextInput
                      style={styles.input}
                      keyboardType="phone-pad"
                      placeholder="Mobile Number"
                      value={customerPhone}
                      onChangeText={setCustomerPhone}
                    />
                  </View>
                )}
              </View>

              {/* Menu Categories Horizontal Bar */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {categoriesList.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.catPill, selectedCategory === cat && styles.catPillActive]}
                      onPress={() => setSelectedCategory(cat)}
                    >
                      <Text
                        style={[
                          styles.catPillText,
                          selectedCategory === cat && styles.catPillTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Veg / Non-Veg Filter & Search */}
              <View style={styles.filterSearchRow}>
                <View style={styles.searchWrap}>
                  <Search size={14} color={COLORS.textMuted} style={{ marginRight: 6 }} />
                  <TextInput
                    style={styles.searchMiniInput}
                    placeholder="Search dishes..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>

                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {['ALL', 'VEG', 'NON_VEG'].map((ft) => (
                    <TouchableOpacity
                      key={ft}
                      style={[styles.ftPill, foodTypeFilter === ft && styles.ftPillActive]}
                      onPress={() => setFoodTypeFilter(ft)}
                    >
                      <Text style={[styles.ftPillText, foodTypeFilter === ft && styles.ftPillTextActive]}>
                        {ft === 'VEG' ? '🟢 Veg' : ft === 'NON_VEG' ? '🔴 Non-Veg' : 'All'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Menu Items List */}
              {filteredMenuItems.map((item) => {
                const inCartQty = cart[item.id]?.qty || 0;
                return (
                  <View key={item.id} style={styles.menuItemCard}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 12 }}>
                          {item.food_type === 'NON_VEG' ? '🔴' : '🟢'}
                        </Text>
                        <Text style={styles.menuItemName}>{item.name}</Text>
                      </View>
                      <Text style={styles.menuItemDesc} numberOfLines={2}>
                        {item.description || item.category_name}
                      </Text>
                      <Text style={styles.menuItemPrice}>₹{Number(item.price).toLocaleString('en-IN')}</Text>
                    </View>

                    {/* Qty Controls */}
                    <View style={styles.qtyControlRow}>
                      {inCartQty > 0 ? (
                        <>
                          <TouchableOpacity
                            style={styles.qtyBtn}
                            onPress={() => updateCart(item, -1)}
                          >
                            <Minus size={14} color={COLORS.textPrimary} />
                          </TouchableOpacity>
                          <Text style={styles.qtyNum}>{inCartQty}</Text>
                          <TouchableOpacity
                            style={[styles.qtyBtn, { backgroundColor: COLORS.brand }]}
                            onPress={() => updateCart(item, 1)}
                          >
                            <Plus size={14} color="white" />
                          </TouchableOpacity>
                        </>
                      ) : (
                        <TouchableOpacity
                          style={styles.addDishBtn}
                          onPress={() => updateCart(item, 1)}
                        >
                          <Plus size={13} color="white" style={{ marginRight: 2 }} />
                          <Text style={styles.addDishBtnText}>Add</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}

              {/* Sticky Cart Checkout Bar */}
              {cartItemsList.length > 0 && (
                <View style={styles.cartStickyBar}>
                  <View>
                    <Text style={styles.cartStickyItems}>
                      {cartItemsList.length} Item(s) Selected
                    </Text>
                    <Text style={styles.cartStickyTotal}>
                      ₹{cartGrandTotal.toLocaleString('en-IN')}{' '}
                      <Text style={{ fontSize: 11, fontWeight: '500', color: 'rgba(255,255,255,0.7)' }}>
                        (incl. 5% GST)
                      </Text>
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.punchKotBtn}
                    onPress={handlePunchKot}
                    disabled={punching}
                  >
                    {punching ? (
                      <ActivityIndicator color={COLORS.brand} size="small" />
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Send size={15} color={COLORS.brand} style={{ marginRight: 6 }} />
                        <Text style={styles.punchKotBtnText}>Punch KOT</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* TAB 3: ORDERS */}
          {activeTab === 'orders' && (
            <View>
              <Text style={styles.sectionTitle}>Active Orders & Billing</Text>
              {orders.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <FileText size={40} color={COLORS.textMuted} />
                  <Text style={styles.emptyTitle}>No Open Orders</Text>
                </View>
              ) : (
                orders.map((o) => (
                  <View key={o.id} style={styles.orderCard}>
                    <View style={styles.orderTopRow}>
                      <View>
                        <Text style={styles.orderNumber}>Order #{o.order_number}</Text>
                        <Text style={styles.orderTarget}>
                          {o.order_type === 'DINE_IN'
                            ? `Table ${o.table?.table_no || 'T-?'}`
                            : o.order_type === 'ROOM_SERVICE'
                            ? `Room ${o.room?.room_number || 'Room'}`
                            : `Takeaway: ${o.customer_name || 'Guest'}`}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.orderStatusPill,
                          o.status === 'OPEN'
                            ? { backgroundColor: COLORS.infoBg }
                            : o.status === 'BILLED'
                            ? { backgroundColor: COLORS.warningBg }
                            : { backgroundColor: COLORS.successBg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.orderStatusText,
                            o.status === 'OPEN'
                              ? { color: COLORS.occupied }
                              : o.status === 'BILLED'
                              ? { color: COLORS.warning }
                              : { color: COLORS.clean },
                          ]}
                        >
                          {o.status}
                        </Text>
                      </View>
                    </View>

                    {/* Order Items */}
                    <View style={styles.orderItemsBox}>
                      {(o.items || []).map((it, idx) => (
                        <Text key={it.id || idx} style={styles.orderItemRow}>
                          • {it.quantity}x {it.item_name || it.menu_item?.name || 'Dish'}
                        </Text>
                      ))}
                    </View>

                    <View style={styles.orderBottomRow}>
                      <Text style={styles.orderTotal}>
                        Total: ₹{Number(o.grand_total || o.total_amount || 0).toLocaleString('en-IN')}
                      </Text>

                      {o.status !== 'SETTLED' && (
                        <TouchableOpacity
                          style={styles.settleBtn}
                          onPress={() => setOrderToSettle(o)}
                        >
                          <CreditCard size={14} color="white" style={{ marginRight: 4 }} />
                          <Text style={styles.settleBtnText}>Settle Bill</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* TAB 4: MENU MANAGEMENT */}
          {activeTab === 'menu_mgmt' && (
            <View>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>Menu Master Dishes</Text>
                <TouchableOpacity
                  style={styles.addSmallBtn}
                  onPress={() => setShowAddDishModal(true)}
                >
                  <PlusCircle size={13} color="white" style={{ marginRight: 4 }} />
                  <Text style={styles.addSmallBtnText}>+ Add Dish</Text>
                </TouchableOpacity>
              </View>

              {menuItems.map((item) => (
                <View key={item.id} style={styles.menuMgmtCard}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 12 }}>
                        {item.food_type === 'NON_VEG' ? '🔴' : '🟢'}
                      </Text>
                      <Text style={styles.menuItemName}>{item.name}</Text>
                      <Text style={styles.menuItemSku}>({item.item_code})</Text>
                    </View>
                    <Text style={styles.menuItemDesc}>
                      {item.category_name} • Prep: {item.preparation_time_minutes || 15} mins
                    </Text>
                  </View>
                  <Text style={styles.menuItemPrice}>₹{Number(item.price).toLocaleString('en-IN')}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Modals */}
      <AddTableModal
        visible={showAddTableModal}
        onClose={() => setShowAddTableModal(false)}
        onTableCreated={fetchData}
      />

      <AddDishModal
        visible={showAddDishModal}
        onClose={() => setShowAddDishModal(false)}
        onDishCreated={fetchData}
      />

      <SettleOrderModal
        visible={!!orderToSettle}
        order={orderToSettle}
        onClose={() => setOrderToSettle(null)}
        onOrderSettled={fetchData}
      />

      <ShiftRegisterModal
        visible={showShiftModal}
        onClose={() => setShowShiftModal(false)}
        defaultDepartment="RESTAURANT"
        onShiftUpdated={fetchData}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  actionBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'white',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  actionBtnPrimary: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.brand,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionBtnPrimaryText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '800',
  },
  actionBtnSecondary: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.brand,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionBtnSecondaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.brand,
  },
  actionBtnIcon: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionBtnIconText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: COLORS.brand,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.brand,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  centerContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  addSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.brand,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addSmallBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'white',
  },
  tablesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tableCard: {
    flexBasis: '48%',
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tableCardOccupied: {
    borderColor: COLORS.occupied,
    backgroundColor: '#f8fafc',
  },
  tableCardBilled: {
    borderColor: COLORS.warning,
  },
  tableCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  tableNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  tableStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tableArea: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  tableCapacity: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  tableActiveOrderBox: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  tableOrderNum: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.brand,
  },
  tableOrderTotal: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  tableSettleText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.clean,
    marginTop: 4,
  },
  tableFreeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.clean,
    marginTop: 10,
  },

  // POS Menu
  orderTypeCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  orderTypeLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  orderTypeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  orderTypeBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  orderTypeBtnActive: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  orderTypeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  orderTypeBtnTextActive: {
    color: 'white',
  },
  subSelectorLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  selectorPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectorPillActive: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  selectorPillText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  selectorPillTextActive: {
    color: 'white',
    fontWeight: '700',
  },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  catPillActive: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  catPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  catPillTextActive: {
    color: 'white',
    fontWeight: '700',
  },
  filterSearchRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 10,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchMiniInput: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  ftPill: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ftPillActive: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  ftPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  ftPillTextActive: {
    color: 'white',
  },
  menuItemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  menuItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  menuItemDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  menuItemPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  qtyControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyNum: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    minWidth: 18,
    textAlign: 'center',
  },
  addDishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.brand,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  addDishBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'white',
  },
  cartStickyBar: {
    position: 'absolute',
    bottom: 10,
    left: 16,
    right: 16,
    backgroundColor: COLORS.textPrimary,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  cartStickyItems: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
  cartStickyTotal: {
    fontSize: 18,
    fontWeight: '900',
    color: 'white',
  },
  punchKotBtn: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  punchKotBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.brand,
  },

  // Orders
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  orderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  orderTarget: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  orderStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  orderStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  orderItemsBox: {
    paddingVertical: 6,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    marginVertical: 6,
  },
  orderItemRow: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  orderBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  orderTotal: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  settleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.clean,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  settleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'white',
  },

  // Menu Mgmt
  menuMgmtCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  menuItemSku: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  input: {
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 10,
  },
  emptyActionBtn: {
    backgroundColor: COLORS.brand,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 12,
  },
  emptyActionBtnText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
  },
});
