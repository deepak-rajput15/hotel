import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { api } from '../../api/client';
import { COLORS } from '../../theme/colors';
import { X, Utensils, IndianRupee, Bed, CreditCard, CheckCircle2, AlertCircle } from 'lucide-react-native';

const METHODS = [
  { key: 'CASH', label: 'Cash Drawer' },
  { key: 'UPI_QR', label: 'UPI QR Pay' },
  { key: 'CARD', label: 'Card Swipe' },
  { key: 'ROOM_FOLIO', label: '🏨 Room Folio' },
];

export default function SettleOrderModal({
  visible,
  order,
  onClose,
  onOrderSettled,
}) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [settlementMethod, setSettlementMethod] = useState('CASH');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [transactionRef, setTransactionRef] = useState('');
  const [inHouseRooms, setInHouseRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');

  useEffect(() => {
    if (visible && order) {
      setErrorMessage('');
      setDiscountAmount('0');
      setTransactionRef('');
      setSettlementMethod('CASH');
      fetchInHouseRooms();
    }
  }, [visible, order]);

  const fetchInHouseRooms = async () => {
    try {
      const res = await api.getInHouseRooms();
      const rooms = res.rooms || res.data?.rooms || res || [];
      setInHouseRooms(rooms);
      if (rooms.length > 0) {
        setSelectedRoomId(rooms[0].id);
      }
    } catch (e) {
      console.warn('Failed to load in-house rooms', e);
    }
  };

  const handleSettleSubmit = async () => {
    if (!order?.id) return;
    if (settlementMethod === 'ROOM_FOLIO' && !selectedRoomId) {
      Alert.alert('Required', 'Please select a hotel room to charge this dining bill.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      const payload = {
        settlement_method: settlementMethod,
        discount_amount: parseFloat(discountAmount) || 0,
        transaction_reference: transactionRef.trim(),
        room_id: settlementMethod === 'ROOM_FOLIO' ? selectedRoomId : null,
      };

      const res = await api.settleRestaurantOrder(order.id, payload);
      Alert.alert('Bill Settled 🎉', res.message || 'Restaurant order settled and closed.');
      if (onOrderSettled) onOrderSettled();
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to settle order.');
    } finally {
      setLoading(false);
    }
  };

  if (!visible || !order) return null;

  const originalTotal = parseFloat(order.total_amount || 0);
  const discountNum = parseFloat(discountAmount) || 0;
  const finalPayable = Math.max(0, originalTotal - discountNum);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Settle Bill • Order #{order.order_number}</Text>
              <Text style={styles.subtitle}>
                {order.order_type === 'DINE_IN'
                  ? `Table ${order.table?.table_no || 'T-?'}`
                  : order.order_type === 'ROOM_SERVICE'
                  ? `Room ${order.room?.room_number || 'Room'}`
                  : `Takeaway: ${order.customer_name || 'Walk-In'}`}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {errorMessage ? (
            <View style={styles.errorBanner}>
              <AlertCircle size={15} color={COLORS.danger} style={{ marginRight: 6 }} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {/* Bill Calculation Box */}
            <View style={styles.billBox}>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Order Subtotal:</Text>
                <Text style={styles.billVal}>₹{Number(order.subtotal || 0).toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>GST Taxes:</Text>
                <Text style={styles.billVal}>₹{Number(order.tax_amount || 0).toLocaleString('en-IN')}</Text>
              </View>
              {discountNum > 0 && (
                <View style={styles.billRow}>
                  <Text style={[styles.billLabel, { color: COLORS.clean }]}>Discount:</Text>
                  <Text style={[styles.billVal, { color: COLORS.clean }]}>
                    -₹{discountNum.toLocaleString('en-IN')}
                  </Text>
                </View>
              )}
              <View style={[styles.billRow, styles.billTotalRow]}>
                <Text style={styles.billTotalLabel}>Final Amount Payable:</Text>
                <Text style={styles.billTotalVal}>₹{finalPayable.toLocaleString('en-IN')}</Text>
              </View>
            </View>

            {/* Payment Method Selector */}
            <Text style={styles.inputLabel}>Select Settlement Mode *</Text>
            <View style={styles.methodsGrid}>
              {METHODS.map((m) => (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.methodBtn, settlementMethod === m.key && styles.methodBtnActive]}
                  onPress={() => setSettlementMethod(m.key)}
                >
                  <Text
                    style={[
                      styles.methodBtnText,
                      settlementMethod === m.key && styles.methodBtnTextActive,
                    ]}
                  >
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Room Folio Selection */}
            {settlementMethod === 'ROOM_FOLIO' && (
              <View style={styles.roomSelectBox}>
                <Text style={styles.inputLabel}>Charge to In-House Guest Room *</Text>
                {inHouseRooms.length === 0 ? (
                  <Text style={styles.noRoomsText}>No in-house guests currently available.</Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {inHouseRooms.map((r) => (
                        <TouchableOpacity
                          key={r.id}
                          style={[styles.roomPill, selectedRoomId === r.id && styles.roomPillActive]}
                          onPress={() => setSelectedRoomId(r.id)}
                        >
                          <Bed size={13} color={selectedRoomId === r.id ? 'white' : COLORS.brand} />
                          <Text
                            style={[
                              styles.roomPillText,
                              selectedRoomId === r.id && styles.roomPillTextActive,
                            ]}
                          >
                            Room {r.room_number} ({r.current_guest?.guest_name || 'Guest'})
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                )}
              </View>
            )}

            {/* Discount Input */}
            <Text style={styles.inputLabel}>Courtesy Discount (₹)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="0"
              value={discountAmount}
              onChangeText={setDiscountAmount}
            />

            {/* Reference */}
            {settlementMethod !== 'CASH' && settlementMethod !== 'ROOM_FOLIO' && (
              <>
                <Text style={styles.inputLabel}>Transaction / Reference #</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. UPI Ref / Card Last 4"
                  value={transactionRef}
                  onChangeText={setTransactionRef}
                />
              </>
            )}

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: COLORS.clean }]}
                onPress={handleSettleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Settle & Close Bill</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: COLORS.bg,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.dangerBg,
    padding: 10,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 8,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  billBox: {
    backgroundColor: COLORS.bg,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  billLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  billVal: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  billTotalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
    marginTop: 4,
    marginBottom: 0,
  },
  billTotalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  billTotalVal: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.clean,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginTop: 10,
  },
  methodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  methodBtn: {
    flexBasis: '48%',
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  methodBtnActive: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  methodBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  methodBtnTextActive: {
    color: 'white',
  },
  roomSelectBox: {
    marginTop: 6,
  },
  noRoomsText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  roomPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roomPillActive: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  roomPillText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  roomPillTextActive: {
    color: 'white',
    fontWeight: '700',
  },
  input: {
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 20,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
});

