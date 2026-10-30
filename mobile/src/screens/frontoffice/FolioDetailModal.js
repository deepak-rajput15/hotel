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
import {
  X,
  User,
  Phone,
  Bed,
  Calendar,
  IndianRupee,
  PlusCircle,
  CreditCard,
  LogOut,
  Send,
  CheckCircle2,
  AlertCircle,
  Users,
  Receipt,
} from 'lucide-react-native';

export default function FolioDetailModal({
  visible,
  bookingId,
  onClose,
  onBookingUpdated,
}) {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [booking, setBooking] = useState(null);
  const [activeTab, setActiveTab] = useState('charges'); // 'charges' | 'payments' | 'checkout'
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Add Charge Sub-Modal
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [itemType, setItemType] = useState('FOOD_BEVERAGE');
  const [chargeDesc, setChargeDesc] = useState('');
  const [chargeQty, setChargeQty] = useState('1');
  const [chargePrice, setChargePrice] = useState('');

  // Record Payment Sub-Modal
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI_QR');
  const [txRef, setTxRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Checkout Sub-Modal / Form
  const [settlementAmount, setSettlementAmount] = useState('');
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState('UPI_QR');
  const [checkoutTxRef, setCheckoutTxRef] = useState('');
  const [checkoutNotes, setCheckoutNotes] = useState('');

  useEffect(() => {
    if (visible && bookingId) {
      loadBookingDetails();
      setErrorMessage('');
      setSuccessMessage('');
      setActiveTab('charges');
    }
  }, [visible, bookingId]);

  const loadBookingDetails = async () => {
    setLoading(true);
    try {
      const res = await api.getBookingDetail(bookingId);
      const bData = res.booking || res.data?.booking || res;
      setBooking(bData);
      if (bData?.balance_amount) {
        setPaymentAmount(bData.balance_amount.toString());
        setSettlementAmount(bData.balance_amount.toString());
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load guest folio details.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddChargeSubmit = async () => {
    if (!chargeDesc.trim()) {
      Alert.alert('Required', 'Please enter charge description.');
      return;
    }
    if (!chargePrice || parseFloat(chargePrice) <= 0) {
      Alert.alert('Required', 'Please enter a valid unit price.');
      return;
    }

    setActionLoading(true);
    setErrorMessage('');
    try {
      const res = await api.addFolioCharge(booking.id, {
        item_type: itemType,
        description: chargeDesc.trim(),
        quantity: parseInt(chargeQty, 10) || 1,
        unit_price: parseFloat(chargePrice),
      });

      setSuccessMessage(res.message || 'Charge added to guest folio.');
      setShowAddCharge(false);
      setChargeDesc('');
      setChargeQty('1');
      setChargePrice('');
      if (res.updated_booking) setBooking(res.updated_booking);
      else await loadBookingDetails();
      if (onBookingUpdated) onBookingUpdated();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to post folio charge.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordPaymentSubmit = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      Alert.alert('Required', 'Please enter payment amount.');
      return;
    }

    setActionLoading(true);
    setErrorMessage('');
    try {
      const res = await api.recordFolioPayment(booking.id, {
        amount: parseFloat(paymentAmount),
        payment_method: paymentMethod,
        transaction_reference: txRef.trim(),
        notes: paymentNotes.trim(),
      });

      setSuccessMessage(res.message || 'Payment recorded.');
      setShowRecordPayment(false);
      setPaymentAmount('');
      setTxRef('');
      setPaymentNotes('');
      if (res.updated_booking) setBooking(res.updated_booking);
      else await loadBookingDetails();
      if (onBookingUpdated) onBookingUpdated();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to record payment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOutSubmit = async () => {
    const balance = Number(booking.balance_amount || 0);
    if (balance > 0 && (!settlementAmount || parseFloat(settlementAmount) < balance)) {
      Alert.alert(
        'Outstanding Balance',
        `Guest has an unpaid balance of ₹${balance.toLocaleString('en-IN')}. Please collect or adjust full settlement before checkout.`
      );
      return;
    }

    setActionLoading(true);
    setErrorMessage('');
    try {
      const res = await api.checkOutGuest(booking.id, {
        settlement_amount: parseFloat(settlementAmount) || balance,
        payment_method: checkoutPaymentMethod,
        transaction_reference: checkoutTxRef.trim(),
        notes: checkoutNotes.trim(),
      });

      Alert.alert(
        'Guest Checked Out 🎉',
        `Room ${booking.room?.room_number} is now marked DIRTY for housekeeping inspection. Tax Invoice generated.`
      );
      if (onBookingUpdated) onBookingUpdated();
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to complete checkout.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendWhatsAppInvoice = async () => {
    setActionLoading(true);
    try {
      await api.sendWhatsAppInvoice({
        booking_id: booking.id,
        phone: booking.guest?.phone,
      });
      setSuccessMessage(`WhatsApp Tax Invoice dispatched to ${booking.guest?.phone}`);
    } catch (err) {
      setErrorMessage(err.message || 'Could not send WhatsApp invoice.');
    } finally {
      setActionLoading(false);
    }
  };

  if (!visible) return null;

  const charges = booking?.folio_items || [];
  const payments = booking?.payments || [];
  const occupants = booking?.booking_guests || booking?.co_guests || [];
  const balanceDue = Number(booking?.balance_amount || 0);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Top Header */}
          <View style={styles.header}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.folioBadge}>Folio #{booking?.booking_number || 'BKG'}</Text>
                <View style={styles.roomPill}>
                  <Text style={styles.roomPillText}>Room {booking?.room?.room_number || '---'}</Text>
                </View>
              </View>
              <Text style={styles.headerGuestName}>
                {booking?.guest?.first_name} {booking?.guest?.last_name || ''}
              </Text>
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

          {successMessage ? (
            <View style={styles.successBanner}>
              <CheckCircle2 size={15} color={COLORS.clean} style={{ marginRight: 6 }} />
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          ) : null}

          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={COLORS.brand} />
              <Text style={styles.loadingText}>Fetching guest ledger & charges...</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.scrollContent}>
              {/* Guest & Stay Info Card */}
              <View style={styles.guestInfoCard}>
                <View style={styles.infoRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Phone size={13} color={COLORS.textMuted} style={{ marginRight: 4 }} />
                    <Text style={styles.infoText}>{booking?.guest?.phone || 'No phone'}</Text>
                  </View>
                  <Text style={styles.infoText}>
                    {booking?.guest?.city ? `${booking?.guest?.city}, ` : ''}{booking?.guest?.country || 'India'}
                  </Text>
                </View>

                <View style={styles.stayDatesRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Calendar size={13} color={COLORS.brand} style={{ marginRight: 4 }} />
                    <Text style={styles.stayDatesText}>
                      In: {new Date(booking?.check_in_at).toLocaleDateString([], { month: 'short', day: 'numeric' })} →
                      Out: {new Date(booking?.expected_check_out_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                  <Text style={styles.nightsText}>{booking?.total_nights || 1} Night(s)</Text>
                </View>

                {occupants.length > 0 && (
                  <View style={styles.occupantsBox}>
                    <Text style={styles.occupantsTitle}>
                      👥 Additional Occupants ({occupants.length}):
                    </Text>
                    {occupants.map((occ, idx) => (
                      <Text key={idx} style={styles.occupantItem}>
                        • {occ.first_name} {occ.last_name} ({occ.gender}, {occ.age} yrs) - {occ.id_type}: {occ.id_number}
                      </Text>
                    ))}
                  </View>
                )}
              </View>

              {/* Financial Balance Overview Grid */}
              <View style={styles.financeGrid}>
                <View style={styles.financeCol}>
                  <Text style={styles.financeLabel}>Room Charges</Text>
                  <Text style={styles.financeVal}>₹{Number(booking?.total_room_charges || 0).toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.financeCol}>
                  <Text style={styles.financeLabel}>Extra Charges</Text>
                  <Text style={styles.financeVal}>₹{Number(booking?.total_extra_charges || 0).toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.financeCol}>
                  <Text style={styles.financeLabel}>GST Tax</Text>
                  <Text style={styles.financeVal}>₹{Number(booking?.tax_amount || 0).toLocaleString('en-IN')}</Text>
                </View>
              </View>

              {/* Grand Total & Balance Due Banner */}
              <View style={styles.balanceBanner}>
                <View>
                  <Text style={styles.bannerLabel}>Grand Bill Total</Text>
                  <Text style={styles.bannerTotal}>₹{Number(booking?.grand_total || 0).toLocaleString('en-IN')}</Text>
                  <Text style={styles.bannerPaid}>Paid: ₹{Number(booking?.paid_amount || 0).toLocaleString('en-IN')}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.bannerLabel}>Outstanding Balance</Text>
                  <Text
                    style={[
                      styles.bannerBalance,
                      balanceDue > 0 ? { color: COLORS.danger } : { color: COLORS.clean },
                    ]}
                  >
                    ₹{Number(balanceDue).toLocaleString('en-IN')}
                  </Text>
                  <Text style={styles.bannerStatus}>
                    {balanceDue <= 0 ? '✓ Fully Cleared' : 'Payment Due'}
                  </Text>
                </View>
              </View>

              {/* Tabs: Charges vs Payments vs Checkout */}
              <View style={styles.tabRow}>
                <TouchableOpacity
                  style={[styles.tabBtn, activeTab === 'charges' && styles.tabBtnActive]}
                  onPress={() => setActiveTab('charges')}
                >
                  <Text style={[styles.tabBtnText, activeTab === 'charges' && styles.tabBtnTextActive]}>
                    Charges ({charges.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tabBtn, activeTab === 'payments' && styles.tabBtnActive]}
                  onPress={() => setActiveTab('payments')}
                >
                  <Text style={[styles.tabBtnText, activeTab === 'payments' && styles.tabBtnTextActive]}>
                    Payments ({payments.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tabBtn, activeTab === 'checkout' && styles.tabBtnActive]}
                  onPress={() => setActiveTab('checkout')}
                >
                  <Text style={[styles.tabBtnText, activeTab === 'checkout' && styles.tabBtnTextActive]}>
                    Check-Out
                  </Text>
                </TouchableOpacity>
              </View>

              {/* TAB 1: CHARGES */}
              {activeTab === 'charges' && (
                <View style={styles.tabContent}>
                  <View style={styles.sectionTitleRow}>
                    <Text style={styles.sectionTitle}>Itemized Billing Ledger</Text>
                    <TouchableOpacity
                      style={styles.addSmallBtn}
                      onPress={() => setShowAddCharge(true)}
                    >
                      <PlusCircle size={14} color="white" style={{ marginRight: 4 }} />
                      <Text style={styles.addSmallBtnText}>+ Add Charge</Text>
                    </TouchableOpacity>
                  </View>

                  {charges.length === 0 ? (
                    <Text style={styles.emptyNote}>No extra charges added yet.</Text>
                  ) : (
                    charges.map((item, idx) => (
                      <View key={item.id || idx} style={styles.ledgerRow}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <View style={styles.chargeTypePill}>
                              <Text style={styles.chargeTypePillText}>{item.item_type || 'CHARGE'}</Text>
                            </View>
                            <Text style={styles.chargeName}>{item.description}</Text>
                          </View>
                          <Text style={styles.chargeMeta}>
                            Qty: {item.quantity} × ₹{Number(item.unit_price).toLocaleString('en-IN')}
                          </Text>
                        </View>
                        <Text style={styles.chargeTotal}>₹{Number(item.total_price).toLocaleString('en-IN')}</Text>
                      </View>
                    ))
                  )}
                </View>
              )}

              {/* TAB 2: PAYMENTS */}
              {activeTab === 'payments' && (
                <View style={styles.tabContent}>
                  <View style={styles.sectionTitleRow}>
                    <Text style={styles.sectionTitle}>Recorded Payments</Text>
                    <TouchableOpacity
                      style={[styles.addSmallBtn, { backgroundColor: COLORS.clean }]}
                      onPress={() => setShowRecordPayment(true)}
                    >
                      <CreditCard size={14} color="white" style={{ marginRight: 4 }} />
                      <Text style={styles.addSmallBtnText}>+ Record Payment</Text>
                    </TouchableOpacity>
                  </View>

                  {payments.length === 0 ? (
                    <Text style={styles.emptyNote}>No payments recorded yet.</Text>
                  ) : (
                    payments.map((p, idx) => (
                      <View key={p.id || idx} style={styles.ledgerRow}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <View style={[styles.chargeTypePill, { backgroundColor: COLORS.successBg }]}>
                              <Text style={[styles.chargeTypePillText, { color: COLORS.clean }]}>
                                {p.payment_method || 'PAYMENT'}
                              </Text>
                            </View>
                            <Text style={styles.chargeName}>₹{Number(p.amount).toLocaleString('en-IN')}</Text>
                          </View>
                          <Text style={styles.chargeMeta}>
                            {p.transaction_reference ? `Ref: ${p.transaction_reference} • ` : ''}
                            {new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                        <Text style={[styles.chargeTotal, { color: COLORS.clean }]}>
                          Paid ₹{Number(p.amount).toLocaleString('en-IN')}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              )}

              {/* TAB 3: CHECKOUT */}
              {activeTab === 'checkout' && (
                <View style={styles.tabContent}>
                  <Text style={styles.sectionTitle}>Guest Settlement & Checkout</Text>

                  <View style={styles.checkoutSummaryCard}>
                    <Text style={styles.checkoutSummaryTitle}>Settlement Balance:</Text>
                    <Text
                      style={[
                        styles.checkoutSummaryAmount,
                        balanceDue > 0 ? { color: COLORS.danger } : { color: COLORS.clean },
                      ]}
                    >
                      ₹{Number(balanceDue).toLocaleString('en-IN')}
                    </Text>
                  </View>

                  {balanceDue > 0 && (
                    <>
                      <Text style={styles.inputLabel}>Settlement Payment Method</Text>
                      <View style={styles.methodRow}>
                        {['UPI_QR', 'CASH', 'CARD'].map((m) => (
                          <TouchableOpacity
                            key={m}
                            style={[
                              styles.methodBtn,
                              checkoutPaymentMethod === m && styles.methodBtnActive,
                            ]}
                            onPress={() => setCheckoutPaymentMethod(m)}
                          >
                            <Text
                              style={[
                                styles.methodBtnText,
                                checkoutPaymentMethod === m && styles.methodBtnTextActive,
                              ]}
                            >
                              {m}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <Text style={styles.inputLabel}>Settlement Amount (₹) *</Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={settlementAmount}
                        onChangeText={setSettlementAmount}
                        placeholder={`e.g. ${balanceDue}`}
                      />

                      <Text style={styles.inputLabel}>Transaction / UTR Reference #</Text>
                      <TextInput
                        style={styles.input}
                        value={checkoutTxRef}
                        onChangeText={setCheckoutTxRef}
                        placeholder="e.g. UPI UTR 42891901"
                      />
                    </>
                  )}

                  <Text style={styles.inputLabel}>Checkout Notes & Inspection</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    multiline
                    value={checkoutNotes}
                    onChangeText={setCheckoutNotes}
                    placeholder="e.g. Room key returned, minibar verified"
                  />

                  <TouchableOpacity
                    style={styles.checkoutConfirmBtn}
                    onPress={handleCheckOutSubmit}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <LogOut size={16} color="white" style={{ marginRight: 6 }} />
                        <Text style={styles.checkoutConfirmText}>
                          Complete Check-Out & Mark Room DIRTY
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* WhatsApp Invoice Trigger */}
                  <TouchableOpacity
                    style={styles.whatsappBtn}
                    onPress={handleSendWhatsAppInvoice}
                    disabled={actionLoading}
                  >
                    <Send size={15} color={COLORS.clean} style={{ marginRight: 6 }} />
                    <Text style={styles.whatsappBtnText}>Send WhatsApp Tax Invoice</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          )}

          {/* SUB-MODAL: ADD CHARGE */}
          <Modal visible={showAddCharge} transparent animationType="fade">
            <View style={styles.subModalOverlay}>
              <View style={styles.subModalCard}>
                <View style={styles.subModalHeader}>
                  <Text style={styles.subModalTitle}>Post Folio Extra Charge</Text>
                  <TouchableOpacity onPress={() => setShowAddCharge(false)}>
                    <X size={18} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputLabel}>Charge Item Type</Text>
                <View style={styles.itemTypeRow}>
                  {['FOOD_BEVERAGE', 'ROOM_SERVICE', 'LAUNDRY', 'SPA', 'MISCELLANEOUS'].map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.typePill, itemType === t && styles.typePillActive]}
                      onPress={() => setItemType(t)}
                    >
                      <Text style={[styles.typePillText, itemType === t && styles.typePillTextActive]}>
                        {t}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Description *</Text>
                <TextInput
                  style={styles.input}
                  value={chargeDesc}
                  onChangeText={setChargeDesc}
                  placeholder="e.g. Laundry 2 Shirts Ironing"
                />

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Quantity</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={chargeQty}
                      onChangeText={setChargeQty}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Unit Price (₹) *</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={chargePrice}
                      onChangeText={setChargePrice}
                      placeholder="e.g. 250"
                    />
                  </View>
                </View>

                <View style={styles.subModalActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setShowAddCharge(false)}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={handleAddChargeSubmit}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <Text style={styles.submitBtnText}>Post Charge</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* SUB-MODAL: RECORD PAYMENT */}
          <Modal visible={showRecordPayment} transparent animationType="fade">
            <View style={styles.subModalOverlay}>
              <View style={styles.subModalCard}>
                <View style={styles.subModalHeader}>
                  <Text style={styles.subModalTitle}>Record Payment on Folio</Text>
                  <TouchableOpacity onPress={() => setShowRecordPayment(false)}>
                    <X size={18} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputLabel}>Payment Method</Text>
                <View style={styles.methodRow}>
                  {['UPI_QR', 'CASH', 'CARD'].map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.methodBtn, paymentMethod === m && styles.methodBtnActive]}
                      onPress={() => setPaymentMethod(m)}
                    >
                      <Text
                        style={[
                          styles.methodBtnText,
                          paymentMethod === m && styles.methodBtnTextActive,
                        ]}
                      >
                        {m}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Amount (₹) *</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                  placeholder="e.g. 2500"
                />

                <Text style={styles.inputLabel}>Transaction / UTR Reference # (Optional)</Text>
                <TextInput
                  style={styles.input}
                  value={txRef}
                  onChangeText={setTxRef}
                  placeholder="e.g. UPI Ref / Bank Ref"
                />

                <Text style={styles.inputLabel}>Notes</Text>
                <TextInput
                  style={styles.input}
                  value={paymentNotes}
                  onChangeText={setPaymentNotes}
                  placeholder="e.g. Advance paid at check-in desk"
                />

                <View style={styles.subModalActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setShowRecordPayment(false)}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.submitBtn, { backgroundColor: COLORS.clean }]}
                    onPress={handleRecordPaymentSubmit}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <Text style={styles.submitBtnText}>Confirm Payment</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
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
  folioBadge: {
    fontSize: 11,
    fontWeight: '800',
    backgroundColor: COLORS.infoBg,
    color: COLORS.brand,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roomPill: {
    backgroundColor: COLORS.bg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roomPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  headerGuestName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 4,
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
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.successBg,
    padding: 10,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 8,
  },
  successText: {
    color: COLORS.clean,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
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
  scrollContent: {
    padding: 20,
  },

  guestInfoCard: {
    backgroundColor: COLORS.bg,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  stayDatesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  stayDatesText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  nightsText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.brand,
  },
  occupantsBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  occupantsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  occupantItem: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },

  financeGrid: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  financeCol: {
    flex: 1,
    alignItems: 'center',
  },
  financeLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  financeVal: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 2,
  },

  balanceBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  bannerLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  bannerTotal: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  bannerPaid: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.clean,
    marginTop: 2,
  },
  bannerBalance: {
    fontSize: 22,
    fontWeight: '900',
  },
  bannerStatus: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginTop: 2,
  },

  tabRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  tabBtnTextActive: {
    color: COLORS.brand,
  },

  tabContent: {
    paddingBottom: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
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
  ledgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  chargeTypePill: {
    backgroundColor: COLORS.bg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  chargeTypePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  chargeName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  chargeMeta: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  chargeTotal: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  emptyNote: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    paddingVertical: 10,
    textAlign: 'center',
  },

  // Checkout View
  checkoutSummaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    padding: 14,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  checkoutSummaryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  checkoutSummaryAmount: {
    fontSize: 20,
    fontWeight: '900',
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
  textArea: {
    height: 60,
    textAlignVertical: 'top',
    paddingTop: 8,
  },
  methodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  methodBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
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
  checkoutConfirmBtn: {
    backgroundColor: COLORS.danger,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  checkoutConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.successBg,
    borderWidth: 1,
    borderColor: COLORS.successBorder,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 10,
  },
  whatsappBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.clean,
  },

  // Sub Modals
  subModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  subModalCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
  },
  subModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  subModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  itemTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typePillActive: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  typePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  typePillTextActive: {
    color: 'white',
  },
  subModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
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

