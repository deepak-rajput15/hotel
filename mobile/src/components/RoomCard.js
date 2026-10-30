import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../theme/colors';
import { Bed, UserCheck, Sparkles, Wrench } from 'lucide-react-native';

export default function RoomCard({ room, onPress }) {
  const getStatusConfig = (status) => {
    switch (status?.toUpperCase()) {
      case 'AVAILABLE':
        return {
          label: 'Ready / Clean',
          color: COLORS.clean,
          bg: COLORS.successBg,
          icon: Sparkles,
        };
      case 'OCCUPIED':
        return {
          label: 'Occupied',
          color: COLORS.occupied,
          bg: 'rgba(59, 130, 246, 0.15)',
          icon: UserCheck,
        };
      case 'DIRTY':
      case 'NEEDS_CLEANING':
        return {
          label: 'Needs Cleaning',
          color: COLORS.dirty,
          bg: COLORS.warningBg,
          icon: Bed,
        };
      case 'MAINTENANCE':
        return {
          label: 'Maintenance',
          color: COLORS.maintenance,
          bg: COLORS.dangerBg,
          icon: Wrench,
        };
      default:
        return {
          label: status || 'Unknown',
          color: COLORS.textSecondary,
          bg: COLORS.surfaceCard,
          icon: Bed,
        };
    }
  };

  const statusConfig = getStatusConfig(room.status);
  const StatusIcon = statusConfig.icon;
  const currentBooking = room.current_booking;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[styles.card, { borderColor: statusConfig.color }]}
      onPress={() => onPress && onPress(room)}
    >
      <View style={styles.topRow}>
        <Text style={styles.roomNumber}>Room {room.room_number}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
          <StatusIcon size={11} color={statusConfig.color} style={{ marginRight: 4 }} />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>
      </View>

      <Text style={styles.roomType}>{room.room_type || room.category || 'Standard Room'}</Text>

      {currentBooking ? (
        <View style={styles.guestRow}>
          <Text style={styles.guestName} numberOfLines={1}>
            👤 {currentBooking.guest?.full_name || currentBooking.guest_name || 'In-House Guest'}
          </Text>
          <Text style={styles.folioBalance}>
            Bal: ₹{currentBooking.balance_amount || 0}
          </Text>
        </View>
      ) : (
        <View style={styles.rateRow}>
          <Text style={styles.rateText}>Base Tariff: ₹{room.base_price || room.price_per_night || 2500}/night</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roomNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10.5,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  roomType: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSub,
  },
  guestName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.brand,
    flex: 1,
  },
  folioBalance: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.warning,
  },
  rateRow: {
    marginTop: 6,
  },
  rateText: {
    fontSize: 11.5,
    color: COLORS.textMuted,
  },
});

