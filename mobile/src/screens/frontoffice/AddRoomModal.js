import React, { useState } from 'react';
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
import { X, Bed, IndianRupee, Layers, CheckCircle2, AlertCircle } from 'lucide-react-native';

const ROOM_TYPES = [
  'Deluxe',
  'Suite',
  'Super Deluxe',
  'Semi Deluxe',
  'Double',
  'Single',
  'Standard',
  'Executive',
];

const ROOM_MODES = ['AC', 'Non AC'];

const FLOORS = ['Ground Floor', '1st Floor', '2nd Floor', '3rd Floor', '4th Floor', '5th Floor'];

const GST_RATES = ['12.00', '18.00', '5.00', '0.00'];

const STATUSES = [
  { key: 'AVAILABLE', label: 'Available (Clean)' },
  { key: 'DIRTY', label: 'Dirty (Turnover)' },
  { key: 'MAINTENANCE', label: 'Maintenance' },
];

export default function AddRoomModal({ visible, onClose, onRoomCreated }) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form State
  const [roomNumber, setRoomNumber] = useState('');
  const [roomType, setRoomType] = useState('Deluxe');
  const [roomMode, setRoomMode] = useState('AC');
  const [floor, setFloor] = useState('1st Floor');
  const [basePrice, setBasePrice] = useState('2800');
  const [extraBeddingPrice, setExtraBeddingPrice] = useState('500');
  const [gstPercentage, setGstPercentage] = useState('12.00');
  const [status, setStatus] = useState('AVAILABLE');
  const [maxGuests, setMaxGuests] = useState('2');
  const [remarks, setRemarks] = useState('');

  const handleSubmit = async () => {
    if (!roomNumber.trim()) {
      Alert.alert('Required', 'Please enter room number.');
      return;
    }
    if (!basePrice || parseFloat(basePrice) < 0) {
      Alert.alert('Required', 'Please enter a valid base price.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      const payload = {
        room_number: roomNumber.trim(),
        room_type: roomType,
        room_mode: roomMode,
        floor: floor,
        base_price: parseFloat(basePrice),
        extra_bedding_price: parseFloat(extraBeddingPrice) || 0,
        gst_percentage: parseFloat(gstPercentage) || 12.0,
        status: status,
        max_guests: parseInt(maxGuests, 10) || 2,
        remarks: remarks.trim(),
      };

      const res = await api.createRoom(payload);
      Alert.alert('Room Created 🎉', `Room ${roomNumber} (${roomType}) is now live on the room rack.`);
      if (onRoomCreated) onRoomCreated(res.room);
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to create room. Room number may already exist.');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Bed size={20} color={COLORS.brand} style={{ marginRight: 8 }} />
              <View>
                <Text style={styles.title}>Add New Hotel Room</Text>
                <Text style={styles.subtitle}>Inventory Master & Pricing</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {errorMessage ? (
            <View style={styles.errorBanner}>
              <AlertCircle size={15} color={COLORS.danger} style={{ marginRight: 6 }} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {/* Room Number & Floor */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Room Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 101"
                  value={roomNumber}
                  onChangeText={setRoomNumber}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Max Guests</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="e.g. 2"
                  value={maxGuests}
                  onChangeText={setMaxGuests}
                />
              </View>
            </View>

            {/* Room Type */}
            <Text style={styles.inputLabel}>Room Category / Type *</Text>
            <View style={styles.pillsWrap}>
              {ROOM_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.pill, roomType === t && styles.pillActive]}
                  onPress={() => setRoomType(t)}
                >
                  <Text style={[styles.pillText, roomType === t && styles.pillTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Room Mode (AC / Non-AC) */}
            <Text style={styles.inputLabel}>Air Conditioning Mode</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {ROOM_MODES.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.modeBtn, roomMode === m && styles.modeBtnActive]}
                  onPress={() => setRoomMode(m)}
                >
                  <Text style={[styles.modeBtnText, roomMode === m && styles.modeBtnTextActive]}>
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Floor Selection */}
            <Text style={styles.inputLabel}>Building Floor</Text>
            <View style={styles.pillsWrap}>
              {FLOORS.map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.pill, floor === f && styles.pillActive]}
                  onPress={() => setFloor(f)}
                >
                  <Text style={[styles.pillText, floor === f && styles.pillTextActive]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Pricing Section */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Base Rate / Night (₹) *</Text>
                <View style={styles.inputWithIcon}>
                  <IndianRupee size={15} color={COLORS.textMuted} style={{ marginRight: 4 }} />
                  <TextInput
                    style={styles.iconInput}
                    keyboardType="numeric"
                    placeholder="2800"
                    value={basePrice}
                    onChangeText={setBasePrice}
                  />
                </View>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Extra Bedding (₹)</Text>
                <View style={styles.inputWithIcon}>
                  <IndianRupee size={15} color={COLORS.textMuted} style={{ marginRight: 4 }} />
                  <TextInput
                    style={styles.iconInput}
                    keyboardType="numeric"
                    placeholder="500"
                    value={extraBeddingPrice}
                    onChangeText={setExtraBeddingPrice}
                  />
                </View>
              </View>
            </View>

            {/* GST Rate */}
            <Text style={styles.inputLabel}>GST Slab Rate</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {GST_RATES.map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.modeBtn, gstPercentage === g && styles.modeBtnActive]}
                  onPress={() => setGstPercentage(g)}
                >
                  <Text
                    style={[styles.modeBtnText, gstPercentage === g && styles.modeBtnTextActive]}
                  >
                    {g}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Initial Status */}
            <Text style={styles.inputLabel}>Initial Operational Status</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {STATUSES.map((s) => (
                <TouchableOpacity
                  key={s.key}
                  style={[styles.modeBtn, status === s.key && styles.modeBtnActive]}
                  onPress={() => setStatus(s.key)}
                >
                  <Text style={[styles.modeBtnText, status === s.key && styles.modeBtnTextActive]}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Remarks */}
            <Text style={styles.inputLabel}>Room Features / Bedding Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              multiline
              numberOfLines={2}
              placeholder="e.g. King Bed, Sea Facing Balcony, Attached Bath"
              value={remarks}
              onChangeText={setRemarks}
            />

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Create Room</Text>
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
    maxHeight: '92%',
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
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginTop: 10,
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
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    height: 44,
  },
  iconInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  textArea: {
    height: 60,
    textAlignVertical: 'top',
    paddingTop: 8,
  },
  pillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pillActive: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  pillTextActive: {
    color: 'white',
    fontWeight: '700',
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modeBtnActive: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  modeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  modeBtnTextActive: {
    color: 'white',
    fontWeight: '700',
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
    backgroundColor: COLORS.brand,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
});

