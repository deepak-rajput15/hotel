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
import { X, Utensils, IndianRupee, AlertCircle } from 'lucide-react-native';

const CATEGORIES = ['Starters', 'Main Course', 'Tandoor & Breads', 'Beverages', 'Desserts', 'Snacks'];

const FOOD_TYPES = [
  { key: 'VEG', label: '🟢 Pure Veg' },
  { key: 'NON_VEG', label: '🔴 Non-Veg' },
  { key: 'EGG', label: '🟡 Contains Egg' },
];

export default function AddDishModal({ visible, onClose, onDishCreated }) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [name, setName] = useState('');
  const [itemCode, setItemCode] = useState(() => `DISH-${Math.floor(100 + Math.random() * 900)}`);
  const [categoryName, setCategoryName] = useState('Main Course');
  const [foodType, setFoodType] = useState('VEG');
  const [price, setPrice] = useState('280');
  const [prepTime, setPrepTime] = useState('15');
  const [description, setDescription] = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter dish name.');
      return;
    }
    if (!price || parseFloat(price) <= 0) {
      Alert.alert('Required', 'Please enter a valid price.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      const res = await api.createMenuItem({
        name: name.trim(),
        item_code: itemCode.trim(),
        category_name: categoryName,
        food_type: foodType,
        price: parseFloat(price),
        gst_percentage: 5.0,
        preparation_time_minutes: parseInt(prepTime, 10) || 15,
        description: description.trim(),
      });

      Alert.alert('Dish Added 🎉', `${name} added to the restaurant menu.`);
      if (onDishCreated) onDishCreated(res.item);
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save menu item.');
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
              <Text style={styles.title}>Add Restaurant Dish</Text>
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
            <Text style={styles.inputLabel}>Dish / Item Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Paneer Butter Masala"
              value={name}
              onChangeText={setName}
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Item Code / SKU</Text>
                <TextInput
                  style={styles.input}
                  placeholder="DISH-101"
                  value={itemCode}
                  onChangeText={setItemCode}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Prep Time (Mins)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="15"
                  value={prepTime}
                  onChangeText={setPrepTime}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Menu Category</Text>
            <View style={styles.pillsWrap}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.pill, categoryName === c && styles.pillActive]}
                  onPress={() => setCategoryName(c)}
                >
                  <Text style={[styles.pillText, categoryName === c && styles.pillTextActive]}>
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Food Dietary Type</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {FOOD_TYPES.map((ft) => (
                <TouchableOpacity
                  key={ft.key}
                  style={[styles.modeBtn, foodType === ft.key && styles.modeBtnActive]}
                  onPress={() => setFoodType(ft.key)}
                >
                  <Text style={[styles.modeBtnText, foodType === ft.key && styles.modeBtnTextActive]}>
                    {ft.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Selling Price (₹) *</Text>
            <View style={styles.inputWithIcon}>
              <IndianRupee size={15} color={COLORS.textMuted} style={{ marginRight: 4 }} />
              <TextInput
                style={styles.iconInput}
                keyboardType="numeric"
                placeholder="280"
                value={price}
                onChangeText={setPrice}
              />
            </View>

            <Text style={styles.inputLabel}>Description & Ingredients</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              multiline
              numberOfLines={2}
              placeholder="e.g. Rich cottage cheese cubes in aromatic tomato butter gravy"
              value={description}
              onChangeText={setDescription}
            />

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Save Dish</Text>
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
    fontSize: 11,
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

