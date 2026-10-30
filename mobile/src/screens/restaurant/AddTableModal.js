import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { api } from '../../api/client';
import { COLORS } from '../../theme/colors';
import { X, Utensils, AlertCircle } from 'lucide-react-native';

const AREAS = ['Main Dining Hall', 'AC Family Section', 'Poolside Deck', 'Rooftop Lounge', 'Garden Terrace'];

export default function AddTableModal({ visible, onClose, onTableCreated }) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [tableNo, setTableNo] = useState('');
  const [capacity, setCapacity] = useState('4');
  const [seatingArea, setSeatingArea] = useState('Main Dining Hall');
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    if (!tableNo.trim()) {
      Alert.alert('Required', 'Please enter table number.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      const res = await api.createTable({
        table_no: tableNo.trim(),
        capacity: parseInt(capacity, 10) || 4,
        seating_area: seatingArea,
        notes: notes.trim(),
      });

      Alert.alert('Table Created 🎉', `Table ${tableNo} added to ${seatingArea}.`);
      if (onTableCreated) onTableCreated(res.table);
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to create table. Number may already exist.');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Utensils size={18} color={COLORS.brand} style={{ marginRight: 8 }} />
              <Text style={styles.title}>Add Dining Table</Text>
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

          <View style={styles.body}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Table Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. T-12"
                  value={tableNo}
                  onChangeText={setTableNo}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Seating Capacity</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="e.g. 4"
                  value={capacity}
                  onChangeText={setCapacity}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Seating Area / Zone</Text>
            <View style={styles.pillsWrap}>
              {AREAS.map((a) => (
                <TouchableOpacity
                  key={a}
                  style={[styles.pill, seatingArea === a && styles.pillActive]}
                  onPress={() => setSeatingArea(a)}
                >
                  <Text style={[styles.pillText, seatingArea === a && styles.pillTextActive]}>
                    {a}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Notes / Table Characteristics</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Corner window booth, near garden"
              value={notes}
              onChangeText={setNotes}
            />

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Save Table</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
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
    paddingBottom: 30,
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
  body: {
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
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
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

