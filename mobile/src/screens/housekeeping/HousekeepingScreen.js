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
import { COLORS } from '../../theme/colors';
import {
  Sparkles,
  Bed,
  Wrench,
  CheckCircle2,
  Search,
  Clock,
  AlertTriangle,
  Layers,
} from 'lucide-react-native';

export default function HousekeepingScreen() {
  const { currentHotel } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('DIRTY'); // 'ALL' | 'DIRTY' | 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE'
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRooms = async () => {
    try {
      const res = await api.getRooms();
      const rData = res.rooms || res.data?.rooms || res.data || res || [];
      setRooms(Array.isArray(rData) ? rData : []);
    } catch (e) {
      console.warn('Error fetching housekeeping rooms', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [currentHotel]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRooms();
  };

  const handleUpdateStatus = async (room, newStatus) => {
    try {
      await api.updateRoomStatus(room.id, newStatus);
      Alert.alert(
        'Status Updated ✨',
        `Room ${room.room_number} is now marked ${newStatus}.`
      );
      fetchRooms();
    } catch (err) {
      Alert.alert('Update Failed', err.message || 'Cannot update room status.');
    }
  };

  const dirtyCount = rooms.filter((r) => r.status === 'DIRTY' || r.status === 'NEEDS_CLEANING').length;
  const cleanCount = rooms.filter((r) => r.status === 'AVAILABLE').length;
  const occupiedCount = rooms.filter((r) => r.status === 'OCCUPIED').length;
  const maintenanceCount = rooms.filter((r) => r.status === 'MAINTENANCE').length;

  const filtersList = [
    { key: 'ALL', label: `All (${rooms.length})` },
    { key: 'DIRTY', label: `🟠 Dirty (${dirtyCount})` },
    { key: 'AVAILABLE', label: `🟢 Clean (${cleanCount})` },
    { key: 'OCCUPIED', label: `🔵 Occupied (${occupiedCount})` },
    { key: 'MAINTENANCE', label: `🔴 Repair (${maintenanceCount})` },
  ];

  const filteredRooms = rooms.filter((r) => {
    if (filter === 'DIRTY' && !(r.status === 'DIRTY' || r.status === 'NEEDS_CLEANING')) return false;
    if (filter === 'AVAILABLE' && r.status !== 'AVAILABLE') return false;
    if (filter === 'OCCUPIED' && r.status !== 'OCCUPIED') return false;
    if (filter === 'MAINTENANCE' && r.status !== 'MAINTENANCE') return false;

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const roomNum = (r.room_number || '').toString();
    const roomType = (r.room_type || '').toLowerCase();
    const guest = (r.current_guest?.guest_name || '').toLowerCase();
    return roomNum.includes(q) || roomType.includes(q) || guest.includes(q);
  });

  return (
    <View style={styles.container}>
      <Header
        title="Housekeeping Turnover"
        subtitle={`Room Cleaning Terminal • ${currentHotel?.name || 'GrandStay'}`}
      />

      {/* KPI Cards Row (Tap to filter) */}
      <View style={styles.kpiRow}>
        <TouchableOpacity
          style={[
            styles.kpiCard,
            { backgroundColor: '#fffbeb', borderColor: filter === 'DIRTY' ? COLORS.warning : '#fde68a' },
          ]}
          onPress={() => setFilter('DIRTY')}
          activeOpacity={0.8}
        >
          <Text style={[styles.kpiNumber, { color: '#b45309' }]}>{dirtyCount}</Text>
          <Text style={[styles.kpiLabel, { color: '#92400e' }]}>Needs Cleaning</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.kpiCard,
            { backgroundColor: '#f0fdf4', borderColor: filter === 'AVAILABLE' ? COLORS.clean : '#bbf7d0' },
          ]}
          onPress={() => setFilter('AVAILABLE')}
          activeOpacity={0.8}
        >
          <Text style={[styles.kpiNumber, { color: '#15803d' }]}>{cleanCount}</Text>
          <Text style={[styles.kpiLabel, { color: '#166534' }]}>Clean Ready</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.kpiCard,
            { backgroundColor: '#eff6ff', borderColor: filter === 'OCCUPIED' ? COLORS.occupied : '#bfdbfe' },
          ]}
          onPress={() => setFilter('OCCUPIED')}
          activeOpacity={0.8}
        >
          <Text style={[styles.kpiNumber, { color: '#1d4ed8' }]}>{occupiedCount}</Text>
          <Text style={[styles.kpiLabel, { color: '#1e40af' }]}>Occupied</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.kpiCard,
            { backgroundColor: '#fef2f2', borderColor: filter === 'MAINTENANCE' ? COLORS.danger : '#fecaca' },
          ]}
          onPress={() => setFilter('MAINTENANCE')}
          activeOpacity={0.8}
        >
          <Text style={[styles.kpiNumber, { color: '#b91c1c' }]}>{maintenanceCount}</Text>
          <Text style={[styles.kpiLabel, { color: '#991b1b' }]}>Repair</Text>
        </TouchableOpacity>
      </View>

      {/* Sleek Horizontal Filter Pills Bar */}
      <View style={styles.filterBarWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {filtersList.map((f) => {
            const isActive = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
                onPress={() => setFilter(f.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Search Input Box */}
      <View style={styles.searchBox}>
        <Search size={15} color={COLORS.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by Room Number or Category..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.brand} />
          <Text style={styles.loadingText}>Syncing housekeeping rooms...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand} />
          }
        >
          {filteredRooms.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Sparkles size={44} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>Queue Cleared!</Text>
              <Text style={styles.emptySub}>No rooms match this housekeeping filter.</Text>
            </View>
          ) : (
            filteredRooms.map((room) => {
              const isDirty = room.status === 'DIRTY' || room.status === 'NEEDS_CLEANING';
              const isClean = room.status === 'AVAILABLE';
              const isOccupied = room.status === 'OCCUPIED';
              const isMaintenance = room.status === 'MAINTENANCE';

              return (
                <View key={room.id} style={styles.roomCard}>
                  {/* Top Row: Room Number & Status Badge */}
                  <View style={styles.cardTopRow}>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.roomNum}>Room {room.room_number}</Text>
                        <View style={styles.typeTag}>
                          <Text style={styles.typeTagText}>{room.room_type} • {room.floor}</Text>
                        </View>
                      </View>

                      {room.current_guest ? (
                        <Text style={styles.guestInfoText}>
                          👤 Occupant: {room.current_guest.guest_name} ({room.current_guest.phone})
                        </Text>
                      ) : (
                        <Text style={styles.remarksText}>
                          {room.remarks ? `Note: ${room.remarks}` : `${room.room_mode || 'AC'} • Base Rate ₹${room.base_price}/night`}
                        </Text>
                      )}
                    </View>

                    {/* Status Badge */}
                    <View
                      style={[
                        styles.statusBadge,
                        isClean
                          ? { backgroundColor: '#dcfce7', borderColor: '#bbf7d0' }
                          : isDirty
                          ? { backgroundColor: '#fef3c7', borderColor: '#fde68a' }
                          : isOccupied
                          ? { backgroundColor: '#e0e7ff', borderColor: '#c7d2fe' }
                          : { backgroundColor: '#fee2e2', borderColor: '#fecaca' },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor: isClean
                              ? '#16a34a'
                              : isDirty
                              ? '#d97706'
                              : isOccupied
                              ? '#4f46e5'
                              : '#dc2626',
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusBadgeText,
                          {
                            color: isClean
                              ? '#15803d'
                              : isDirty
                              ? '#b45309'
                              : isOccupied
                              ? '#3730a3'
                              : '#b91c1c',
                          },
                        ]}
                      >
                        {isClean
                          ? 'CLEAN READY'
                          : isDirty
                          ? 'DIRTY'
                          : isOccupied
                          ? 'OCCUPIED'
                          : 'REPAIR'}
                      </Text>
                    </View>
                  </View>

                  {/* Actions Bar */}
                  <View style={styles.cardActionsRow}>
                    {/* Mark Clean Button */}
                    {!isClean && !isOccupied && (
                      <TouchableOpacity
                        style={styles.cleanBtn}
                        onPress={() => handleUpdateStatus(room, 'AVAILABLE')}
                        activeOpacity={0.8}
                      >
                        <CheckCircle2 size={15} color="white" style={{ marginRight: 5 }} />
                        <Text style={styles.cleanBtnText}>Mark Clean & Inspected</Text>
                      </TouchableOpacity>
                    )}

                    {/* Mark Dirty Button */}
                    {!isDirty && !isOccupied && (
                      <TouchableOpacity
                        style={styles.dirtyBtn}
                        onPress={() => handleUpdateStatus(room, 'DIRTY')}
                        activeOpacity={0.8}
                      >
                        <Sparkles size={14} color="#b45309" style={{ marginRight: 4 }} />
                        <Text style={styles.dirtyBtnText}>Mark Dirty</Text>
                      </TouchableOpacity>
                    )}

                    {/* Send to Maintenance Button */}
                    {!isMaintenance && (
                      <TouchableOpacity
                        style={styles.maintBtn}
                        onPress={() => handleUpdateStatus(room, 'MAINTENANCE')}
                        activeOpacity={0.8}
                      >
                        <Wrench size={13} color="#b91c1c" style={{ marginRight: 4 }} />
                        <Text style={styles.maintBtnText}>Send to Maintenance</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  // KPI Row
  kpiRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 8,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  kpiCard: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  kpiNumber: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
    textAlign: 'center',
  },

  // Filter Pills Bar (Strictly Fixed Height & Centered)
  filterBarWrapper: {
    backgroundColor: 'white',
    height: 48,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    justifyContent: 'center',
  },
  filterScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
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

  // Search Box
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 14,
    height: 42,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary,
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
    paddingVertical: 50,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  // Room Card
  roomCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  roomNum: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  typeTag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  guestInfoText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.occupied,
    marginTop: 4,
  },
  remarksText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // Card Actions
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  cleanBtn: {
    flex: 1.6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 10,
    borderRadius: 10,
  },
  cleanBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '800',
  },
  dirtyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    paddingVertical: 10,
    borderRadius: 10,
  },
  dirtyBtnText: {
    color: '#b45309',
    fontSize: 12,
    fontWeight: '700',
  },
  maintBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingVertical: 10,
    borderRadius: 10,
  },
  maintBtnText: {
    color: '#b91c1c',
    fontSize: 11,
    fontWeight: '700',
  },
});
