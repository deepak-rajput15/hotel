import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import Header from '../../components/Header';
import RoomCard from '../../components/RoomCard';
import ShiftRegisterModal from '../../components/ShiftRegisterModal';
import FolioDetailModal from './FolioDetailModal';
import AddRoomModal from './AddRoomModal';
import { COLORS } from '../../theme/colors';
import {
  UserPlus,
  Search,
  Bed,
  CheckCircle2,
  Phone,
  IndianRupee,
  Clock,
  Layers,
  Calendar,
  PlusCircle,
  FileText,
  Filter,
} from 'lucide-react-native';

const RACK_FILTERS = [
  { key: 'ALL', label: 'All Rooms' },
  { key: 'AVAILABLE', label: '🟢 Clean' },
  { key: 'OCCUPIED', label: '🔵 Occupied' },
  { key: 'DIRTY', label: '🟠 Dirty' },
  { key: 'MAINTENANCE', label: '🔴 Repair' },
];

export default function FrontDeskScreen({ navigation }) {
  const { currentHotel } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('in_house'); // 'in_house' | 'rack' | 'calendar' | 'history'
  const [rackFilter, setRackFilter] = useState('ALL');

  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);

  // Modals
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);

  const fetchData = async () => {
    try {
      const [bookingsRes, roomsRes] = await Promise.allSettled([
        api.getBookings('ALL'),
        api.getRooms(),
      ]);

      if (bookingsRes.status === 'fulfilled') {
        const bData =
          bookingsRes.value?.bookings ||
          bookingsRes.value?.data?.bookings ||
          bookingsRes.value?.data ||
          bookingsRes.value ||
          [];
        setBookings(Array.isArray(bData) ? bData : []);
      }

      if (roomsRes.status === 'fulfilled') {
        const rData =
          roomsRes.value?.rooms ||
          roomsRes.value?.data?.rooms ||
          roomsRes.value?.data ||
          roomsRes.value ||
          [];
        setRooms(Array.isArray(rData) ? rData : []);
      }
    } catch (e) {
      console.warn('Error fetching front desk data', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentHotel]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Filter in-house bookings
  const inHouseGuests = bookings.filter((b) => {
    const isCheckedIn =
      b.status === 'CHECKED_IN' || b.status === 'ACTIVE' || (!b.check_out_at && b.status !== 'CANCELLED' && b.status !== 'CHECKED_OUT');
    if (!isCheckedIn) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const guestName = (
      b.guest?.first_name ? `${b.guest.first_name} ${b.guest.last_name || ''}` : b.guest_name || ''
    ).toLowerCase();
    const roomNum = (b.room?.room_number || '').toString();
    const phone = (b.guest?.phone || '').toLowerCase();
    return guestName.includes(q) || roomNum.includes(q) || phone.includes(q);
  });

  // Filter rooms on rack
  const filteredRooms = rooms.filter((r) => {
    if (rackFilter !== 'ALL' && r.status !== rackFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const roomNum = (r.room_number || '').toString();
    const roomType = (r.room_type || '').toLowerCase();
    const guest = (r.current_guest?.guest_name || '').toLowerCase();
    return roomNum.includes(q) || roomType.includes(q) || guest.includes(q);
  });

  // Filter all bookings history
  const filteredHistory = bookings.filter((b) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const guestName = (
      b.guest?.first_name ? `${b.guest.first_name} ${b.guest.last_name || ''}` : b.guest_name || ''
    ).toLowerCase();
    const roomNum = (b.room?.room_number || '').toString();
    const bkgNum = (b.booking_number || '').toLowerCase();
    return guestName.includes(q) || roomNum.includes(q) || bkgNum.includes(q);
  });

  const handleRoomCardClick = (room) => {
    if (room.status === 'AVAILABLE') {
      navigation.navigate('QuickCheckIn', { preSelectedRoom: room, onCheckInSuccess: fetchData });
    } else if (room.status === 'OCCUPIED' && room.current_guest?.booking_id) {
      setSelectedBookingId(room.current_guest.booking_id);
    } else {
      Alert.alert(
        `Room ${room.room_number}`,
        `Current Status: ${room.status}\nType: ${room.room_type} • Floor: ${room.floor}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Mark Clean',
            onPress: async () => {
              try {
                await api.updateRoomStatus(room.id, 'AVAILABLE');
                fetchData();
              } catch (e) {
                Alert.alert('Error', e.message);
              }
            },
          },
          {
            text: 'Mark Dirty',
            onPress: async () => {
              try {
                await api.updateRoomStatus(room.id, 'DIRTY');
                fetchData();
              } catch (e) {
                Alert.alert('Error', e.message);
              }
            },
          },
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Front Desk Terminal"
        subtitle={`Live Operations • ${currentHotel?.name || 'GrandStay'}`}
      />

      {/* Top Action Buttons: Check-In & Cash Drawer & Add Room */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.newCheckInBtn}
          onPress={() => navigation.navigate('QuickCheckIn', { onCheckInSuccess: fetchData })}
        >
          <UserPlus size={15} color="white" style={{ marginRight: 6 }} />
          <Text style={styles.newCheckInBtnText}>+ Walk-In Check-In</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.drawerBtn}
          onPress={() => setShowShiftModal(true)}
        >
          <Clock size={14} color={COLORS.brand} style={{ marginRight: 4 }} />
          <Text style={styles.drawerBtnText}>Cash Drawer</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addRoomBtn}
          onPress={() => setShowAddRoomModal(true)}
        >
          <PlusCircle size={14} color={COLORS.textPrimary} style={{ marginRight: 4 }} />
          <Text style={styles.addRoomBtnText}>+ Room</Text>
        </TouchableOpacity>
      </View>

      {/* Sub Tabs: In-House, Rack, Tape Chart, History */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'in_house' && styles.tabItemActive]}
          onPress={() => setActiveTab('in_house')}
        >
          <Text style={[styles.tabText, activeTab === 'in_house' && styles.tabTextActive]}>
            In-House ({inHouseGuests.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'rack' && styles.tabItemActive]}
          onPress={() => setActiveTab('rack')}
        >
          <Text style={[styles.tabText, activeTab === 'rack' && styles.tabTextActive]}>
            Room Rack ({rooms.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'calendar' && styles.tabItemActive]}
          onPress={() => setActiveTab('calendar')}
        >
          <Text style={[styles.tabText, activeTab === 'calendar' && styles.tabTextActive]}>
            Tape Chart
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'history' && styles.tabItemActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            History ({bookings.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Input Box */}
      <View style={styles.searchBox}>
        <Search size={15} color={COLORS.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by Guest Name, Room #, Phone or Booking ID..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Rack Filter Pills if on Rack Tab */}
      {activeTab === 'rack' && (
        <View style={styles.filterBarWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            {RACK_FILTERS.map((rf) => (
              <TouchableOpacity
                key={rf.key}
                style={[styles.filterPill, rackFilter === rf.key && styles.filterPillActive]}
                onPress={() => setRackFilter(rf.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    rackFilter === rf.key && styles.filterPillTextActive,
                  ]}
                >
                  {rf.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.brand} />
          <Text style={styles.loadingText}>Syncing Front Desk ledger...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand} />
          }
        >
          {/* TAB 1: IN-HOUSE GUESTS & FOLIOS */}
          {activeTab === 'in_house' && (
            inHouseGuests.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Bed size={40} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>No In-House Guests</Text>
                <Text style={styles.emptySub}>
                  No active checked-in stays found for this property currently.
                </Text>
                <TouchableOpacity
                  style={styles.emptyCheckInBtn}
                  onPress={() => navigation.navigate('QuickCheckIn', { onCheckInSuccess: fetchData })}
                >
                  <Text style={styles.emptyCheckInBtnText}>+ Check-In First Guest</Text>
                </TouchableOpacity>
              </View>
            ) : (
              inHouseGuests.map((b) => {
                const guestName = b.guest?.first_name
                  ? `${b.guest.first_name} ${b.guest.last_name || ''}`
                  : b.guest_name || 'Guest';
                const balance = Number(b.balance_amount || 0);

                return (
                  <TouchableOpacity
                    key={b.id}
                    style={styles.guestCard}
                    onPress={() => setSelectedBookingId(b.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.cardTop}>
                      <View>
                        <Text style={styles.guestName}>{guestName}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                          <Phone size={12} color={COLORS.textMuted} style={{ marginRight: 4 }} />
                          <Text style={styles.guestPhone}>{b.guest?.phone || 'No Phone'}</Text>
                        </View>
                      </View>
                      <View style={styles.roomBadge}>
                        <Text style={styles.roomBadgeText}>Room {b.room?.room_number}</Text>
                      </View>
                    </View>

                    <View style={styles.cardMid}>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>Total Bill</Text>
                        <Text style={styles.metricVal}>
                          ₹{Number(b.grand_total || 0).toLocaleString('en-IN')}
                        </Text>
                      </View>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>Advance Paid</Text>
                        <Text style={[styles.metricVal, { color: COLORS.clean }]}>
                          ₹{Number(b.paid_amount || 0).toLocaleString('en-IN')}
                        </Text>
                      </View>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>Balance Due</Text>
                        <Text
                          style={[
                            styles.metricVal,
                            { color: balance > 0 ? COLORS.danger : COLORS.clean },
                          ]}
                        >
                          ₹{balance.toLocaleString('en-IN')}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.cardActions}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.folioLinkText}>View Ledger & Charges →</Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          balance > 0 ? { backgroundColor: COLORS.dangerBg } : { backgroundColor: COLORS.successBg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            balance > 0 ? { color: COLORS.danger } : { color: COLORS.clean },
                          ]}
                        >
                          {balance > 0 ? 'PAYMENT DUE' : 'CLEARED'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )
          )}

          {/* TAB 2: ROOM RACK */}
          {activeTab === 'rack' && (
            filteredRooms.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Bed size={40} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>No Rooms Match Filter</Text>
                <TouchableOpacity
                  style={styles.emptyCheckInBtn}
                  onPress={() => setShowAddRoomModal(true)}
                >
                  <Text style={styles.emptyCheckInBtnText}>+ Add New Room</Text>
                </TouchableOpacity>
              </View>
            ) : (
              filteredRooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  onPress={() => handleRoomCardClick(room)}
                />
              ))
            )
          )}

          {/* TAB 3: TAPE CHART SUMMARY */}
          {activeTab === 'calendar' && (
            <View style={styles.tapeChartCard}>
              <View style={styles.tapeChartHeader}>
                <Calendar size={18} color={COLORS.brand} style={{ marginRight: 6 }} />
                <Text style={styles.tapeChartTitle}>Next 30-Day Tape Chart & Rack Matrix</Text>
              </View>
              <Text style={styles.tapeChartSub}>
                Live property availability across room categories
              </Text>

              <View style={styles.tapeGrid}>
                {rooms.map((room) => {
                  const isOccupied = room.status === 'OCCUPIED';
                  const isClean = room.status === 'AVAILABLE';
                  return (
                    <TouchableOpacity
                      key={room.id}
                      style={[
                        styles.tapeRoomRow,
                        isOccupied && { borderColor: COLORS.infoBorder },
                      ]}
                      onPress={() => handleRoomCardClick(room)}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.tapeRoomNumber}>Room {room.room_number}</Text>
                          <Text style={styles.tapeRoomType}>{room.room_type} • {room.floor}</Text>
                        </View>
                        <Text style={styles.tapeGuestText}>
                          {isOccupied
                            ? `Stay: ${room.current_guest?.guest_name || 'Guest'}`
                            : `Rate: ₹${room.base_price}/nt`}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.tapeStatusPill,
                          isClean
                            ? { backgroundColor: COLORS.successBg }
                            : isOccupied
                            ? { backgroundColor: COLORS.infoBg }
                            : { backgroundColor: COLORS.warningBg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.tapeStatusPillText,
                            isClean
                              ? { color: COLORS.clean }
                              : isOccupied
                              ? { color: COLORS.occupied }
                              : { color: COLORS.warning },
                          ]}
                        >
                          {room.status}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* TAB 4: BOOKINGS HISTORY */}
          {activeTab === 'history' && (
            filteredHistory.length === 0 ? (
              <View style={styles.emptyContainer}>
                <FileText size={40} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>No Booking History</Text>
              </View>
            ) : (
              filteredHistory.map((b) => (
                <TouchableOpacity
                  key={b.id}
                  style={styles.historyCard}
                  onPress={() => setSelectedBookingId(b.id)}
                >
                  <View style={styles.historyTopRow}>
                    <View>
                      <Text style={styles.historyGuest}>
                        {b.guest?.first_name} {b.guest?.last_name || ''}
                      </Text>
                      <Text style={styles.historyBookingNum}>
                        #{b.booking_number} • Room {b.room?.room_number}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.historyStatusPill,
                        b.status === 'CHECKED_IN'
                          ? { backgroundColor: COLORS.infoBg }
                          : b.status === 'CHECKED_OUT'
                          ? { backgroundColor: COLORS.bg }
                          : { backgroundColor: COLORS.warningBg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.historyStatusText,
                          b.status === 'CHECKED_IN'
                            ? { color: COLORS.occupied }
                            : b.status === 'CHECKED_OUT'
                            ? { color: COLORS.textMuted }
                            : { color: COLORS.warning },
                        ]}
                      >
                        {b.status}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.historyBottomRow}>
                    <Text style={styles.historyDates}>
                      {new Date(b.check_in_at).toLocaleDateString([], { month: 'short', day: 'numeric' })} → {new Date(b.expected_check_out_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </Text>
                    <Text style={styles.historyAmount}>
                      ₹{Number(b.grand_total || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )
          )}
        </ScrollView>
      )}

      {/* Guest Folio Modal */}
      <FolioDetailModal
        visible={!!selectedBookingId}
        bookingId={selectedBookingId}
        onClose={() => setSelectedBookingId(null)}
        onBookingUpdated={fetchData}
      />

      {/* Add Room Modal */}
      <AddRoomModal
        visible={showAddRoomModal}
        onClose={() => setShowAddRoomModal(false)}
        onRoomCreated={() => {
          fetchData();
          setShowAddRoomModal(false);
        }}
      />

      {/* Shift Register Modal */}
      <ShiftRegisterModal
        visible={showShiftModal}
        onClose={() => setShowShiftModal(false)}
        defaultDepartment="FRONT_DESK"
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
  newCheckInBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.brand,
    paddingVertical: 10,
    borderRadius: 10,
  },
  newCheckInBtnText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '800',
  },
  drawerBtn: {
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
  drawerBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.brand,
  },
  addRoomBtn: {
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
  addRoomBtnText: {
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 14,
    height: 44,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  filterBarWrapper: {
    backgroundColor: 'white',
    height: 48,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    justifyContent: 'center',
    marginBottom: 4,
  },
  filterScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterPillActive: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  filterPillTextActive: {
    color: 'white',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
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
  emptySub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  emptyCheckInBtn: {
    backgroundColor: COLORS.brand,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyCheckInBtnText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
  },

  // Guest Card
  guestCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  guestName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  guestPhone: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  roomBadge: {
    backgroundColor: COLORS.bg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roomBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  cardMid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  metricVal: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  folioLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.brand,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },

  // Tape Chart Card
  tapeChartCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tapeChartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  tapeChartTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  tapeChartSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 14,
  },
  tapeGrid: {
    gap: 8,
  },
  tapeRoomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tapeRoomNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  tapeRoomType: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  tapeGuestText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  tapeStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tapeStatusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },

  // History Card
  historyCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  historyTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  historyGuest: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  historyBookingNum: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  historyStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  historyStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  historyBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  historyDates: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  historyAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
});
