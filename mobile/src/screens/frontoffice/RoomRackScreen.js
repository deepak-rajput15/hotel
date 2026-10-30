import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import Header from '../../components/Header';
import RoomCard from '../../components/RoomCard';
import AddRoomModal from './AddRoomModal';
import { COLORS } from '../../theme/colors';
import { PlusCircle, Bed } from 'lucide-react-native';

const FILTERS = [
  { key: 'ALL', label: 'All Rooms' },
  { key: 'AVAILABLE', label: '🟢 Clean' },
  { key: 'OCCUPIED', label: '🔵 Occupied' },
  { key: 'DIRTY', label: '🟠 Dirty' },
  { key: 'MAINTENANCE', label: '🔴 Repair' },
];

export default function RoomRackScreen({ navigation }) {
  const { currentHotel } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);

  const fetchRooms = async () => {
    try {
      const res = await api.getRooms();
      const rData = res.rooms || res.data?.rooms || res.data || res || [];
      setRooms(Array.isArray(rData) ? rData : []);
    } catch (e) {
      console.warn('Error fetching rooms', e);
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

  const filteredRooms = rooms.filter((r) => {
    if (filter === 'ALL') return true;
    if (filter === 'AVAILABLE') return r.status === 'AVAILABLE';
    if (filter === 'OCCUPIED') return r.status === 'OCCUPIED';
    if (filter === 'DIRTY') return r.status === 'DIRTY' || r.status === 'NEEDS_CLEANING';
    if (filter === 'MAINTENANCE') return r.status === 'MAINTENANCE';
    return true;
  });

  return (
    <View style={styles.container}>
      <Header
        title="Visual Room Rack"
        subtitle={`All Rooms & Turnover • ${currentHotel?.name || 'GrandStay'}`}
      />

      {/* Top Action Row with + Add Room */}
      <View style={styles.topActionRow}>
        <Text style={styles.roomCountText}>{filteredRooms.length} Rooms Found</Text>
        <TouchableOpacity
          style={styles.addRoomBtn}
          onPress={() => setShowAddRoomModal(true)}
        >
          <PlusCircle size={14} color="white" style={{ marginRight: 4 }} />
          <Text style={styles.addRoomBtnText}>+ Add Room</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterBarWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {FILTERS.map((st) => (
            <TouchableOpacity
              key={st.key}
              style={[styles.filterPill, filter === st.key && styles.filterPillActive]}
              onPress={() => setFilter(st.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterPillText, filter === st.key && styles.filterPillTextActive]}>
                {st.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.brand} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand} />
          }
        >
          {filteredRooms.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Bed size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No Rooms Match Filter</Text>
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={() => setShowAddRoomModal(true)}
              >
                <Text style={styles.emptyAddBtnText}>+ Add New Room</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredRooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                onPress={() => {
                  if (room.status === 'AVAILABLE') {
                    navigation.navigate('QuickCheckIn', {
                      preSelectedRoom: room,
                      onCheckInSuccess: fetchRooms,
                    });
                  }
                }}
              />
            ))
          )}
        </ScrollView>
      )}

      <AddRoomModal
        visible={showAddRoomModal}
        onClose={() => setShowAddRoomModal(false)}
        onRoomCreated={() => {
          fetchRooms();
          setShowAddRoomModal(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  topActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  roomCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  addRoomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.brand,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addRoomBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'white',
  },
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
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 10,
    marginBottom: 14,
  },
  emptyAddBtn: {
    backgroundColor: COLORS.brand,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyAddBtnText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
  },
});
