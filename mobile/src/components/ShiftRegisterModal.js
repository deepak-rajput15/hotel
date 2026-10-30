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
import { api } from '../api/client';
import { COLORS } from '../theme/colors';
import {
  X,
  Clock,
  IndianRupee,
  Lock,
  Unlock,
  ArrowUpRight,
  ArrowDownLeft,
  AlertCircle,
  CheckCircle2,
  FileText,
  User,
} from 'lucide-react-native';

export default function ShiftRegisterModal({
  visible,
  onClose,
  defaultDepartment = 'FRONT_DESK',
  onShiftUpdated,
}) {
  const [department, setDepartment] = useState(defaultDepartment);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [shiftData, setShiftData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Sub-views
  const [viewMode, setViewMode] = useState('MAIN'); // 'MAIN' | 'OPEN_FORM' | 'TRANSACTION_FORM' | 'CLOSE_FORM'

  // Open Shift Form State
  const [shiftType, setShiftType] = useState('MORNING');
  const [openingFloat, setOpeningFloat] = useState('2000');
  const [openingNotes, setOpeningNotes] = useState('');

  // Cash In/Out Form State
  const [txType, setTxType] = useState('PAYOUT'); // 'PAYOUT' | 'PAYIN'
  const [txAmount, setTxAmount] = useState('');
  const [txReason, setTxReason] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [receiptVoucherNo, setReceiptVoucherNo] = useState('');

  // Close Shift Form State
  const [actualCashCounted, setActualCashCounted] = useState('');
  const [handoverNotes, setHandoverNotes] = useState('');

  useEffect(() => {
    if (visible) {
      loadCurrentShift();
      setViewMode('MAIN');
      setErrorMessage('');
      setSuccessMessage('');
    }
  }, [visible, department]);

  const loadCurrentShift = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await api.getCurrentShift(department);
      if (res && res.success !== false) {
        setShiftData(res);
      } else {
        setShiftData(null);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Unable to sync shift status.');
      setShiftData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenShiftSubmit = async () => {
    setActionLoading(true);
    setErrorMessage('');
    try {
      const res = await api.openShift({
        department,
        shift_type: shiftType,
        opening_float: parseFloat(openingFloat) || 0,
        opening_notes: openingNotes,
      });
      setSuccessMessage(res.message || 'Shift opened successfully!');
      setViewMode('MAIN');
      await loadCurrentShift();
      if (onShiftUpdated) onShiftUpdated();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to open shift.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddTransactionSubmit = async () => {
    if (!shiftData?.shift?.id) return;
    if (!txAmount || parseFloat(txAmount) <= 0) {
      Alert.alert('Required', 'Please enter a valid amount.');
      return;
    }
    if (!txReason.trim()) {
      Alert.alert('Required', 'Please enter a reason for cash transaction.');
      return;
    }

    setActionLoading(true);
    setErrorMessage('');
    try {
      const res = await api.recordCashTransaction(shiftData.shift.id, {
        transaction_type: txType,
        amount: parseFloat(txAmount),
        reason: txReason.trim(),
        recipient_name: recipientName.trim(),
        receipt_voucher_no: receiptVoucherNo.trim(),
      });
      setSuccessMessage(res.message || 'Cash transaction recorded.');
      setTxAmount('');
      setTxReason('');
      setRecipientName('');
      setReceiptVoucherNo('');
      setViewMode('MAIN');
      await loadCurrentShift();
      if (onShiftUpdated) onShiftUpdated();
    } catch (err) {
      setErrorMessage(err.message || 'Transaction failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseShiftSubmit = async () => {
    if (!shiftData?.shift?.id) return;
    if (actualCashCounted === '' || isNaN(actualCashCounted)) {
      Alert.alert('Required', 'Please enter physical cash counted.');
      return;
    }

    setActionLoading(true);
    setErrorMessage('');
    try {
      const res = await api.closeShift(shiftData.shift.id, {
        actual_cash_counted: parseFloat(actualCashCounted) || 0,
        handover_notes: handoverNotes.trim(),
      });
      setSuccessMessage(res.message || 'Shift closed and drawer reconciled.');
      setActualCashCounted('');
      setHandoverNotes('');
      setViewMode('MAIN');
      await loadCurrentShift();
      if (onShiftUpdated) onShiftUpdated();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to close shift.');
    } finally {
      setActionLoading(false);
    }
  };

  const activeShift = shiftData?.shift;
  const hasActiveShift = !!activeShift;
  const expectedCash = activeShift?.expected_cash ?? activeShift?.closing_cash_computed ?? 0;
  const countedNum = parseFloat(actualCashCounted) || 0;
  const cashDiscrepancy = countedNum - expectedCash;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Clock size={20} color={COLORS.brand} style={{ marginRight: 8 }} />
              <View>
                <Text style={styles.title}>Cash Drawer & Shift Register</Text>
                <Text style={styles.subtitle}>
                  {department === 'FRONT_DESK' ? 'Front Desk Terminal' : 'Restaurant & POS'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Department Switcher */}
          <View style={styles.deptRow}>
            <TouchableOpacity
              style={[styles.deptPill, department === 'FRONT_DESK' && styles.deptPillActive]}
              onPress={() => setDepartment('FRONT_DESK')}
            >
              <Text
                style={[styles.deptPillText, department === 'FRONT_DESK' && styles.deptPillTextActive]}
              >
                Front Desk
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.deptPill, department === 'RESTAURANT' && styles.deptPillActive]}
              onPress={() => setDepartment('RESTAURANT')}
            >
              <Text
                style={[styles.deptPillText, department === 'RESTAURANT' && styles.deptPillTextActive]}
              >
                Restaurant POS
              </Text>
            </TouchableOpacity>
          </View>

          {/* Alerts */}
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
              <Text style={styles.loadingText}>Loading shift register...</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.scrollContent}>
              {/* VIEW: MAIN DASHBOARD */}
              {viewMode === 'MAIN' && (
                <>
                  {hasActiveShift ? (
                    <>
                      {/* Active Shift Card */}
                      <View style={styles.activeCard}>
                        <View style={styles.activeTopRow}>
                          <View style={styles.statusBadgeGreen}>
                            <View style={styles.greenPulse} />
                            <Text style={styles.statusBadgeGreenText}>
                              {activeShift.shift_type || 'ACTIVE'} SHIFT OPEN
                            </Text>
                          </View>
                          <Text style={styles.openedAtText}>
                            Since {new Date(activeShift.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>

                        <Text style={styles.cashierName}>
                          Cashier: {activeShift.user?.name || 'Staff In-Charge'}
                        </Text>

                        {/* Drawer Balance Box */}
                        <View style={styles.drawerCashBox}>
                          <Text style={styles.drawerCashLabel}>Expected Physical Cash</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                            <Text style={styles.rupeeSymbol}>₹</Text>
                            <Text style={styles.drawerCashAmount}>
                              {Number(expectedCash).toLocaleString('en-IN')}
                            </Text>
                          </View>
                          <Text style={styles.drawerCashSub}>
                            Float ₹{Number(activeShift.opening_float || 0).toLocaleString('en-IN')} + Collections
                          </Text>
                        </View>

                        {/* Breakdown Metrics */}
                        <View style={styles.breakdownGrid}>
                          <View style={styles.breakdownCol}>
                            <Text style={styles.breakdownLabel}>Opening Float</Text>
                            <Text style={styles.breakdownVal}>₹{activeShift.opening_float || 0}</Text>
                          </View>
                          <View style={styles.breakdownDivider} />
                          <View style={styles.breakdownCol}>
                            <Text style={styles.breakdownLabel}>Payments In</Text>
                            <Text style={[styles.breakdownVal, { color: COLORS.clean }]}>
                              +₹{activeShift.cash_collected || 0}
                            </Text>
                          </View>
                          <View style={styles.breakdownDivider} />
                          <View style={styles.breakdownCol}>
                            <Text style={styles.breakdownLabel}>Payouts Out</Text>
                            <Text style={[styles.breakdownVal, { color: COLORS.danger }]}>
                              -₹{activeShift.cash_paid_out || 0}
                            </Text>
                          </View>
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.activeActionRow}>
                          <TouchableOpacity
                            style={styles.recordMovementBtn}
                            onPress={() => setViewMode('TRANSACTION_FORM')}
                          >
                            <ArrowUpRight size={15} color={COLORS.brand} style={{ marginRight: 4 }} />
                            <Text style={styles.recordMovementText}>Cash In / Out</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.closeShiftBtn}
                            onPress={() => setViewMode('CLOSE_FORM')}
                          >
                            <Lock size={15} color="white" style={{ marginRight: 4 }} />
                            <Text style={styles.closeShiftText}>Close Shift</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Cash Transactions List */}
                      <Text style={styles.sectionHeader}>Mid-Shift Cash Movements</Text>
                      {activeShift.cash_transactions?.length > 0 ? (
                        activeShift.cash_transactions.map((tx, idx) => (
                          <View key={tx.id || idx} style={styles.txRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <View
                                style={[
                                  styles.txIconBox,
                                  tx.transaction_type === 'PAYIN'
                                    ? { backgroundColor: COLORS.successBg }
                                    : { backgroundColor: COLORS.dangerBg },
                                ]}
                              >
                                {tx.transaction_type === 'PAYIN' ? (
                                  <ArrowDownLeft size={14} color={COLORS.clean} />
                                ) : (
                                  <ArrowUpRight size={14} color={COLORS.danger} />
                                )}
                              </View>
                              <View>
                                <Text style={styles.txReason}>{tx.reason || 'Cash movement'}</Text>
                                <Text style={styles.txMeta}>
                                  {tx.recipient_name ? `To: ${tx.recipient_name} • ` : ''}
                                  {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                              </View>
                            </View>
                            <Text
                              style={[
                                styles.txAmount,
                                tx.transaction_type === 'PAYIN'
                                  ? { color: COLORS.clean }
                                  : { color: COLORS.danger },
                              ]}
                            >
                              {tx.transaction_type === 'PAYIN' ? '+' : '-'}₹{Number(tx.amount).toLocaleString('en-IN')}
                            </Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.emptyNotice}>No cash transactions recorded during this shift yet.</Text>
                      )}
                    </>
                  ) : (
                    /* Closed / Inactive State */
                    <View style={styles.noShiftCard}>
                      <View style={styles.noShiftIcon}>
                        <Lock size={32} color={COLORS.textMuted} />
                      </View>
                      <Text style={styles.noShiftTitle}>Cash Drawer is Closed</Text>
                      <Text style={styles.noShiftDesc}>
                        No cashier currently has an open shift for the {department === 'FRONT_DESK' ? 'Front Desk' : 'Restaurant'}. Open a new shift to record walk-in cash and manage collections.
                      </Text>

                      <TouchableOpacity
                        style={styles.openPrimaryBtn}
                        onPress={() => setViewMode('OPEN_FORM')}
                      >
                        <Unlock size={16} color="white" style={{ marginRight: 6 }} />
                        <Text style={styles.openPrimaryBtnText}>Open New Shift Register</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}

              {/* VIEW: OPEN SHIFT FORM */}
              {viewMode === 'OPEN_FORM' && (
                <View style={styles.formContainer}>
                  <Text style={styles.formTitle}>Open New Cash Register Shift</Text>

                  <Text style={styles.inputLabel}>Shift Type</Text>
                  <View style={styles.shiftTypeRow}>
                    {['MORNING', 'EVENING', 'NIGHT'].map((st) => (
                      <TouchableOpacity
                        key={st}
                        style={[styles.shiftTypePill, shiftType === st && styles.shiftTypePillActive]}
                        onPress={() => setShiftType(st)}
                      >
                        <Text
                          style={[
                            styles.shiftTypePillText,
                            shiftType === st && styles.shiftTypePillTextActive,
                          ]}
                        >
                          {st}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.inputLabel}>Opening Float Balance (₹ Cash in Drawer) *</Text>
                  <View style={styles.inputWrap}>
                    <IndianRupee size={16} color={COLORS.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={openingFloat}
                      onChangeText={setOpeningFloat}
                      placeholder="e.g. 2000"
                    />
                  </View>

                  <Text style={styles.inputLabel}>Opening Notes / Handover Observations</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    multiline
                    numberOfLines={3}
                    value={openingNotes}
                    onChangeText={setOpeningNotes}
                    placeholder="e.g. Verified 2,000 cash notes in register"
                  />

                  <View style={styles.formActionRow}>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => setViewMode('MAIN')}
                      disabled={actionLoading}
                    >
                      <Text style={styles.cancelBtnText}>Back</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.submitBtn}
                      onPress={handleOpenShiftSubmit}
                      disabled={actionLoading}
                    >
                      {actionLoading ? (
                        <ActivityIndicator color="white" size="small" />
                      ) : (
                        <Text style={styles.submitBtnText}>Start Shift</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* VIEW: CASH TRANSACTION FORM */}
              {viewMode === 'TRANSACTION_FORM' && (
                <View style={styles.formContainer}>
                  <Text style={styles.formTitle}>Record Cash Movement</Text>

                  <View style={styles.txTypeRow}>
                    <TouchableOpacity
                      style={[styles.txTypeBtn, txType === 'PAYOUT' && styles.txTypeBtnPayout]}
                      onPress={() => setTxType('PAYOUT')}
                    >
                      <ArrowUpRight size={16} color={txType === 'PAYOUT' ? COLORS.danger : COLORS.textMuted} />
                      <Text
                        style={[
                          styles.txTypeBtnText,
                          txType === 'PAYOUT' && { color: COLORS.danger, fontWeight: '700' },
                        ]}
                      >
                        Cash Out (Payout / Expense)
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.txTypeBtn, txType === 'PAYIN' && styles.txTypeBtnPayin]}
                      onPress={() => setTxType('PAYIN')}
                    >
                      <ArrowDownLeft size={16} color={txType === 'PAYIN' ? COLORS.clean : COLORS.textMuted} />
                      <Text
                        style={[
                          styles.txTypeBtnText,
                          txType === 'PAYIN' && { color: COLORS.clean, fontWeight: '700' },
                        ]}
                      >
                        Cash In (Top-Up / Deposit)
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.inputLabel}>Amount (₹) *</Text>
                  <View style={styles.inputWrap}>
                    <IndianRupee size={16} color={COLORS.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={txAmount}
                      onChangeText={setTxAmount}
                      placeholder="e.g. 500"
                    />
                  </View>

                  <Text style={styles.inputLabel}>Reason / Expense Description *</Text>
                  <TextInput
                    style={styles.input}
                    value={txReason}
                    onChangeText={setTxReason}
                    placeholder="e.g. Purchased guest laundry detergent / milk"
                  />

                  <Text style={styles.inputLabel}>Paid To / Received From (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={recipientName}
                    onChangeText={setRecipientName}
                    placeholder="e.g. Local Grocery Store"
                  />

                  <Text style={styles.inputLabel}>Voucher / Receipt Reference # (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={receiptVoucherNo}
                    onChangeText={setReceiptVoucherNo}
                    placeholder="e.g. VCH-0042"
                  />

                  <View style={styles.formActionRow}>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => setViewMode('MAIN')}
                      disabled={actionLoading}
                    >
                      <Text style={styles.cancelBtnText}>Back</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.submitBtn}
                      onPress={handleAddTransactionSubmit}
                      disabled={actionLoading}
                    >
                      {actionLoading ? (
                        <ActivityIndicator color="white" size="small" />
                      ) : (
                        <Text style={styles.submitBtnText}>Post Transaction</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* VIEW: CLOSE SHIFT FORM */}
              {viewMode === 'CLOSE_FORM' && (
                <View style={styles.formContainer}>
                  <Text style={styles.formTitle}>Reconcile & Close Cash Drawer</Text>

                  <View style={styles.reconcileBox}>
                    <Text style={styles.reconcileLabel}>System Expected Cash:</Text>
                    <Text style={styles.reconcileVal}>
                      ₹{Number(expectedCash).toLocaleString('en-IN')}
                    </Text>
                  </View>

                  <Text style={styles.inputLabel}>Physical Cash Counted in Drawer (₹) *</Text>
                  <View style={styles.inputWrap}>
                    <IndianRupee size={16} color={COLORS.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={actualCashCounted}
                      onChangeText={setActualCashCounted}
                      placeholder="Enter physical cash counted"
                    />
                  </View>

                  {actualCashCounted !== '' && (
                    <View
                      style={[
                        styles.discrepancyBox,
                        cashDiscrepancy === 0
                          ? { backgroundColor: COLORS.successBg, borderColor: COLORS.successBorder }
                          : { backgroundColor: COLORS.dangerBg, borderColor: COLORS.dangerBorder },
                      ]}
                    >
                      <Text
                        style={[
                          styles.discrepancyText,
                          cashDiscrepancy === 0 ? { color: COLORS.clean } : { color: COLORS.danger },
                        ]}
                      >
                        {cashDiscrepancy === 0
                          ? '✓ Exact Balance Match! No Variance.'
                          : cashDiscrepancy > 0
                          ? `▲ Cash Surplus: +₹${cashDiscrepancy.toLocaleString('en-IN')}`
                          : `▼ Cash Shortage: -₹${Math.abs(cashDiscrepancy).toLocaleString('en-IN')}`}
                      </Text>
                    </View>
                  )}

                  <Text style={styles.inputLabel}>Handover Notes & Observations</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    multiline
                    numberOfLines={3}
                    value={handoverNotes}
                    onChangeText={setHandoverNotes}
                    placeholder="Enter any variance explanation or notes for the next cashier..."
                  />

                  <View style={styles.formActionRow}>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => setViewMode('MAIN')}
                      disabled={actionLoading}
                    >
                      <Text style={styles.cancelBtnText}>Back</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.submitBtn, { backgroundColor: COLORS.danger }]}
                      onPress={handleCloseShiftSubmit}
                      disabled={actionLoading}
                    >
                      {actionLoading ? (
                        <ActivityIndicator color="white" size="small" />
                      ) : (
                        <Text style={styles.submitBtnText}>Confirm & Close Shift</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
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
  deptRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  deptPill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  deptPillActive: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  deptPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  deptPillTextActive: {
    color: 'white',
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

  // Active Card
  activeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  activeTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadgeGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.successBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  greenPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.clean,
    marginRight: 6,
  },
  statusBadgeGreenText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.clean,
  },
  openedAtText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  cashierName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  drawerCashBox: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  drawerCashLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  rupeeSymbol: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.brand,
    marginRight: 4,
  },
  drawerCashAmount: {
    fontSize: 30,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  drawerCashSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  breakdownGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginBottom: 14,
  },
  breakdownCol: {
    flex: 1,
    alignItems: 'center',
  },
  breakdownDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.border,
  },
  breakdownLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  breakdownVal: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  activeActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  recordMovementBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.brand,
    paddingVertical: 10,
    borderRadius: 10,
  },
  recordMovementText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.brand,
  },
  closeShiftBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.danger,
    paddingVertical: 10,
    borderRadius: 10,
  },
  closeShiftText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'white',
  },

  // No Shift Card
  noShiftCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  noShiftIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  noShiftTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  noShiftDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  openPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.brand,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  openPrimaryBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },

  // Sections
  sectionHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  txIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  txReason: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  txMeta: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  emptyNotice: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    paddingVertical: 6,
  },

  // Forms
  formContainer: {
    paddingVertical: 6,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginTop: 10,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
  },
  inputIcon: {
    marginRight: 6,
  },
  input: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  textArea: {
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
    height: 70,
    textAlignVertical: 'top',
  },
  shiftTypeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  shiftTypePill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  shiftTypePillActive: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  shiftTypePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  shiftTypePillTextActive: {
    color: 'white',
  },
  txTypeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  txTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  txTypeBtnPayout: {
    borderColor: COLORS.danger,
    backgroundColor: COLORS.dangerBg,
  },
  txTypeBtnPayin: {
    borderColor: COLORS.clean,
    backgroundColor: COLORS.successBg,
  },
  txTypeBtnText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  reconcileBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bg,
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  reconcileLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  reconcileVal: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  discrepancyBox: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  discrepancyText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  formActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    borderRadius: 10,
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
    backgroundColor: COLORS.brand,
    borderRadius: 10,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
});

