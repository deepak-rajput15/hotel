import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../api/client';
import { COLORS } from '../../theme/colors';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Bed,
  IndianRupee,
  ArrowLeft,
  Calendar,
  ShieldCheck,
  PlusCircle,
  Trash2,
  Users,
} from 'lucide-react-native';

const ID_TYPES = [
  { key: 'AADHAAR', label: 'Aadhaar Card' },
  { key: 'PASSPORT', label: 'Passport' },
  { key: 'DRIVING_LICENSE', label: 'Driving License' },
  { key: 'VOTER_ID', label: 'Voter ID' },
];

const PAYMENT_METHODS = [
  { key: 'UPI_QR', label: 'UPI / QR' },
  { key: 'CASH', label: 'Cash' },
  { key: 'CARD', label: 'Card Swipe' },
];

export default function QuickCheckInScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const preSelectedRoom = route.params?.preSelectedRoom;
  const onCheckInSuccess = route.params?.onCheckInSuccess;

  // KYC Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [nationality, setNationality] = useState('Indian');
  const [idType, setIdType] = useState('AADHAAR');
  const [idNumber, setIdNumber] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('India');
  const [purposeOfVisit, setPurposeOfVisit] = useState('Business / Leisure');

  // Stay & Room Details
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(preSelectedRoom?.id || null);
  const [selectedRoomRate, setSelectedRoomRate] = useState(
    preSelectedRoom?.base_price ? String(preSelectedRoom.base_price) : ''
  );
  const [numAdults, setNumAdults] = useState('1');
  const [numChildren, setNumChildren] = useState('0');
  const [specialRequests, setSpecialRequests] = useState('');

  // Dates
  const [checkInAt, setCheckInAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [expectedCheckOutAt, setExpectedCheckOutAt] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  });

  // Billing & Payment
  const [roomRate, setRoomRate] = useState('');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [advanceDeposit, setAdvanceDeposit] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI_QR');
  const [transactionRef, setTransactionRef] = useState('');

  // Co-Guests
  const [coGuests, setCoGuests] = useState([]);
  const [newCoGuestFirst, setNewCoGuestFirst] = useState('');
  const [newCoGuestLast, setNewCoGuestLast] = useState('');
  const [newCoGuestGender, setNewCoGuestGender] = useState('MALE');
  const [newCoGuestAge, setNewCoGuestAge] = useState('28');
  const [newCoGuestId, setNewCoGuestId] = useState('');
  const [showAddCoGuest, setShowAddCoGuest] = useState(false);

  const [loading, setLoading] = useState(false);
  const [fetchingRooms, setFetchingRooms] = useState(true);

  useEffect(() => {
    fetchAvailableRooms();
  }, []);

  const fetchAvailableRooms = async () => {
    try {
      const res = await api.getRooms();
      const rData = res.rooms || res.data?.rooms || res.data || res || [];
      const cleanRooms = Array.isArray(rData) ? rData.filter((r) => r.status === 'AVAILABLE') : [];
      setRooms(cleanRooms);

      if (!selectedRoomId && cleanRooms.length > 0) {
        setSelectedRoomId(cleanRooms[0].id);
        setRoomRate(String(cleanRooms[0].base_price || '2800'));
      } else if (preSelectedRoom) {
        setRoomRate(String(preSelectedRoom.base_price || '2800'));
      }
    } catch (e) {
      console.warn('Failed to load rooms for check-in', e);
    } finally {
      setFetchingRooms(false);
    }
  };

  const handleRoomSelect = (room) => {
    setSelectedRoomId(room.id);
    setRoomRate(String(room.base_price || ''));
  };

  const handleAddCoGuest = () => {
    if (!newCoGuestFirst.trim() || !newCoGuestLast.trim() || !newCoGuestId.trim()) {
      Alert.alert('Required', 'Please enter Co-Guest first name, last name, and ID number.');
      return;
    }

    setCoGuests([
      ...coGuests,
      {
        first_name: newCoGuestFirst.trim(),
        last_name: newCoGuestLast.trim(),
        gender: newCoGuestGender,
        age: parseInt(newCoGuestAge, 10) || 25,
        id_type: 'AADHAAR',
        id_number: newCoGuestId.trim(),
      },
    ]);

    setNewCoGuestFirst('');
    setNewCoGuestLast('');
    setNewCoGuestId('');
    setShowAddCoGuest(false);
  };

  const removeCoGuest = (idx) => {
    setCoGuests(coGuests.filter((_, i) => i !== idx));
  };

  const handleCheckInSubmit = async () => {
    if (!firstName.trim()) {
      Alert.alert('Required', 'Please enter guest first name.');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Required', 'Please enter guest contact mobile number.');
      return;
    }
    if (!idNumber.trim()) {
      Alert.alert('Required', 'Please enter guest ID proof number.');
      return;
    }
    if (!selectedRoomId) {
      Alert.alert('Required', 'Please select an available room.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        nationality: nationality.trim() || 'Indian',
        id_type: idType,
        id_number: idNumber.trim(),
        address: address.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        country: country.trim() || 'India',
        purpose_of_visit: purposeOfVisit.trim(),
        room_id: selectedRoomId,
        check_in_at: `${checkInAt} 12:00:00`,
        expected_check_out_at: `${expectedCheckOutAt} 11:00:00`,
        num_adults: parseInt(numAdults, 10) || 1,
        num_children: parseInt(numChildren, 10) || 0,
        special_requests: specialRequests.trim() || null,
        room_rate_per_night: parseFloat(roomRate) || 0,
        discount_amount: parseFloat(discountAmount) || 0,
        advance_deposit_amount: parseFloat(advanceDeposit) || 0,
        payment_method: paymentMethod,
        transaction_reference: transactionRef.trim() || null,
        co_guests: coGuests.length > 0 ? coGuests : null,
      };

      const res = await api.checkInGuest(payload);
      Alert.alert('Check-In Complete 🎉', `Guest ${firstName} ${lastName} checked in successfully.`);
      if (onCheckInSuccess) onCheckInSuccess();
      navigation.goBack();
    } catch (err) {
      Alert.alert('Check-In Failed', err.message || 'Validation error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 8, 16) }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Walk-In Guest Check-In</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Section 1: Guest KYC */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <ShieldCheck size={18} color={COLORS.brand} style={{ marginRight: 6 }} />
            <Text style={styles.cardHeader}>1. Guest KYC & Identity</Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>First Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Ramesh"
                value={firstName}
                onChangeText={setFirstName}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Last Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Patel"
                value={lastName}
                onChangeText={setLastName}
              />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Mobile Phone *</Text>
              <TextInput
                style={styles.input}
                keyboardType="phone-pad"
                placeholder="+91 9876543210"
                value={phone}
                onChangeText={setPhone}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Email (Optional)</Text>
              <TextInput
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="guest@mail.com"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          <Text style={styles.inputLabel}>ID Document Type *</Text>
          <View style={styles.pillsWrap}>
            {ID_TYPES.map((t) => (
              <TouchableOpacity
                key={t.key}
                style={[styles.pill, idType === t.key && styles.pillActive]}
                onPress={() => setIdType(t.key)}
              >
                <Text style={[styles.pillText, idType === t.key && styles.pillTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.inputLabel}>ID Document Proof Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 1234 5678 9012"
            value={idNumber}
            onChangeText={setIdNumber}
          />

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>City</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Mumbai"
                value={city}
                onChangeText={setCity}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Nationality</Text>
              <TextInput
                style={styles.input}
                placeholder="Indian"
                value={nationality}
                onChangeText={setNationality}
              />
            </View>
          </View>

          <Text style={styles.inputLabel}>Residential Address</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Flat 402, Sunset Heights, Bandra West"
            value={address}
            onChangeText={setAddress}
          />
        </View>

        {/* Section 2: Room Selection */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Bed size={18} color={COLORS.brand} style={{ marginRight: 6 }} />
            <Text style={styles.cardHeader}>2. Room Selection & Stay</Text>
          </View>

          <Text style={styles.inputLabel}>Available Clean Rooms *</Text>
          {fetchingRooms ? (
            <ActivityIndicator size="small" color={COLORS.brand} style={{ marginVertical: 10 }} />
          ) : rooms.length === 0 ? (
            <Text style={styles.noRoomsWarning}>No clean available rooms found for walk-in.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {rooms.map((r) => {
                  const isSelected = selectedRoomId === r.id;
                  return (
                    <TouchableOpacity
                      key={r.id}
                      style={[styles.roomCardSelect, isSelected && styles.roomCardSelected]}
                      onPress={() => handleRoomSelect(r)}
                    >
                      <Text style={[styles.roomCardNum, isSelected && { color: 'white' }]}>
                        Room {r.room_number}
                      </Text>
                      <Text style={[styles.roomCardType, isSelected && { color: 'rgba(255,255,255,0.8)' }]}>
                        {r.room_type} • {r.floor}
                      </Text>
                      <Text style={[styles.roomCardRate, isSelected && { color: 'white' }]}>
                        ₹{r.base_price}/nt
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          )}

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Check-In Date</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={checkInAt}
                onChangeText={setCheckInAt}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Expected Check-Out</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={expectedCheckOutAt}
                onChangeText={setExpectedCheckOutAt}
              />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Adults Count</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={numAdults}
                onChangeText={setNumAdults}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Children Count</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={numChildren}
                onChangeText={setNumChildren}
              />
            </View>
          </View>

          {/* Co-Guests Section */}
          <View style={styles.coGuestsBox}>
            <View style={styles.coGuestsHeaderRow}>
              <Text style={styles.coGuestsTitle}>Co-Guests / Occupants ({coGuests.length})</Text>
              <TouchableOpacity
                style={styles.addCoGuestBtn}
                onPress={() => setShowAddCoGuest(!showAddCoGuest)}
              >
                <PlusCircle size={13} color={COLORS.brand} style={{ marginRight: 4 }} />
                <Text style={styles.addCoGuestBtnText}>+ Add Co-Guest</Text>
              </TouchableOpacity>
            </View>

            {coGuests.map((cg, idx) => (
              <View key={idx} style={styles.coGuestItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.coGuestName}>
                    {cg.first_name} {cg.last_name} ({cg.gender}, {cg.age} yrs)
                  </Text>
                  <Text style={styles.coGuestId}>Aadhaar: {cg.id_number}</Text>
                </View>
                <TouchableOpacity onPress={() => removeCoGuest(idx)}>
                  <Trash2 size={16} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            ))}

            {showAddCoGuest && (
              <View style={styles.addCoGuestForm}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="First Name"
                    value={newCoGuestFirst}
                    onChangeText={setNewCoGuestFirst}
                  />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Last Name"
                    value={newCoGuestLast}
                    onChangeText={setNewCoGuestLast}
                  />
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Age"
                    keyboardType="numeric"
                    value={newCoGuestAge}
                    onChangeText={setNewCoGuestAge}
                  />
                  <TextInput
                    style={[styles.input, { flex: 2 }]}
                    placeholder="ID Proof #"
                    value={newCoGuestId}
                    onChangeText={setNewCoGuestId}
                  />
                </View>
                <TouchableOpacity style={styles.confirmCoGuestBtn} onPress={handleAddCoGuest}>
                  <Text style={styles.confirmCoGuestBtnText}>Add to Booking</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Section 3: Billing & Advance */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <IndianRupee size={18} color={COLORS.brand} style={{ marginRight: 6 }} />
            <Text style={styles.cardHeader}>3. Tariff & Advance Settlement</Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Rate / Night (₹)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={roomRate}
                onChangeText={setRoomRate}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Discount (₹)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={discountAmount}
                onChangeText={setDiscountAmount}
              />
            </View>
          </View>

          <Text style={styles.inputLabel}>Advance Deposit Amount (₹)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="e.g. 1500"
            value={advanceDeposit}
            onChangeText={setAdvanceDeposit}
          />

          <Text style={styles.inputLabel}>Payment Method</Text>
          <View style={styles.pillsWrap}>
            {PAYMENT_METHODS.map((pm) => (
              <TouchableOpacity
                key={pm.key}
                style={[styles.pill, paymentMethod === pm.key && styles.pillActive]}
                onPress={() => setPaymentMethod(pm.key)}
              >
                <Text style={[styles.pillText, paymentMethod === pm.key && styles.pillTextActive]}>
                  {pm.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.inputLabel}>Transaction / Reference # (UTR / Card Ref)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. UPI Ref / Cash Desk"
            value={transactionRef}
            onChangeText={setTransactionRef}
          />
        </View>

        {/* Submit Check-In Button */}
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleCheckInSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.submitBtnText}>Complete Check-In & Allocate Key</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 50,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 10,
  },
  cardHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
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
    gap: 8,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
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
  roomCardSelect: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 110,
  },
  roomCardSelected: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  roomCardNum: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  roomCardType: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  roomCardRate: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.clean,
    marginTop: 4,
  },
  noRoomsWarning: {
    fontSize: 13,
    color: COLORS.danger,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  coGuestsBox: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  coGuestsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  coGuestsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  addCoGuestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addCoGuestBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.brand,
  },
  coGuestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  coGuestName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  coGuestId: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  addCoGuestForm: {
    backgroundColor: COLORS.bg,
    padding: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  confirmCoGuestBtn: {
    backgroundColor: COLORS.brand,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  confirmCoGuestBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: COLORS.brand,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  submitBtnText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '800',
  },
});
