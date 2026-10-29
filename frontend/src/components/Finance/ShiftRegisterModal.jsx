import React, { useState, useEffect } from 'react';
import { shiftsApi } from '../../api';

export default function ShiftRegisterModal({ isOpen, onClose, defaultDepartment = 'FRONT_DESK', hotelId = null }) {
  const [department, setDepartment] = useState(defaultDepartment);
  const [activeTab, setActiveTab] = useState('register'); // 'register' | 'history'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Shift state
  const [shiftData, setShiftData] = useState(null);
  const [staffOptions, setStaffOptions] = useState([]);
  const [historyShifts, setHistoryShifts] = useState([]);

  // Open Shift Form
  const [openForm, setOpenForm] = useState({
    shift_type: 'MORNING',
    opening_float: '2000',
    opening_notes: '',
  });

  // Cash Payout Form
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutForm, setPayoutForm] = useState({
    transaction_type: 'PAYOUT',
    amount: '',
    reason: '',
    recipient_name: '',
    receipt_voucher_no: '',
  });

  // Close Shift Form
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeForm, setCloseForm] = useState({
    actual_cash_counted: '',
    handover_to_user_id: '',
    handover_notes: '',
    denominations: {
      '500': '',
      '200': '',
      '100': '',
      '50': '',
      '20': '',
      '10': '',
    },
  });

  // Printable slip state
  const [slipData, setSlipData] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadCurrentShift();
      if (activeTab === 'history') {
        loadHistory();
      }
    }
  }, [isOpen, department, activeTab]);

  const loadCurrentShift = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await shiftsApi.getCurrent(department, hotelId);
      if (res.success) {
        setShiftData(res);
        setStaffOptions(res.staff_options || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch shift status');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await shiftsApi.list({ department }, hotelId);
      if (res.success) {
        setHistoryShifts(res.shifts?.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenShift = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await shiftsApi.open({
        department,
        shift_type: openForm.shift_type,
        opening_float: parseFloat(openForm.opening_float) || 0,
        opening_notes: openForm.opening_notes,
      }, hotelId);

      if (res.success) {
        setSuccessMsg(res.message);
        await loadCurrentShift();
      }
    } catch (err) {
      setError(err.message || 'Could not open shift');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!shiftData?.shift?.id) return;
    setLoading(true);
    setError('');
    try {
      const res = await shiftsApi.addCashTransaction(shiftData.shift.id, {
        transaction_type: payoutForm.transaction_type,
        amount: parseFloat(payoutForm.amount),
        reason: payoutForm.reason,
        recipient_name: payoutForm.recipient_name,
        receipt_voucher_no: payoutForm.receipt_voucher_no,
      }, hotelId);

      if (res.success) {
        setShowPayoutModal(false);
        setPayoutForm({ transaction_type: 'PAYOUT', amount: '', reason: '', recipient_name: '', receipt_voucher_no: '' });
        setSuccessMsg(res.message);
        await loadCurrentShift();
      }
    } catch (err) {
      setError(err.message || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  // Denominations auto-calculate
  const handleDenominationChange = (denom, val) => {
    const updatedDenoms = { ...closeForm.denominations, [denom]: val };
    let total = 0;
    Object.keys(updatedDenoms).forEach((key) => {
      const count = parseInt(updatedDenoms[key], 10) || 0;
      total += count * parseInt(key, 10);
    });

    setCloseForm({
      ...closeForm,
      denominations: updatedDenoms,
      actual_cash_counted: total.toString(),
    });
  };

  const handleCloseShift = async (e) => {
    e.preventDefault();
    if (!shiftData?.shift?.id) return;
    setLoading(true);
    setError('');
    try {
      const res = await shiftsApi.close(shiftData.shift.id, {
        actual_cash_counted: parseFloat(closeForm.actual_cash_counted) || 0,
        denominations: closeForm.denominations,
        handover_to_user_id: closeForm.handover_to_user_id || null,
        handover_notes: closeForm.handover_notes,
      }, hotelId);

      if (res.success) {
        setShowCloseModal(false);
        setSuccessMsg(res.message);
        // Load slip for immediate review and print
        handleViewSlip(shiftData.shift.id);
        await loadCurrentShift();
      }
    } catch (err) {
      setError(err.message || 'Shift closing failed');
    } finally {
      setLoading(false);
    }
  };

  const handleViewSlip = async (shiftId) => {
    try {
      const res = await shiftsApi.getSlip(shiftId, hotelId);
      if (res.success) {
        setSlipData(res.slip);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  const currentShift = shiftData?.shift;
  const financials = currentShift?.live_financials;
  const expectedCash = financials?.expected_cash ?? 0;
  const countedCash = parseFloat(closeForm.actual_cash_counted) || 0;
  const liveVariance = countedCash - expectedCash;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px',
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '850px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
      }}>
        {/* Top Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(to right, #f8fafc, #ffffff)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '20px',
              boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)',
            }}>
              💼
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
                Shift Handover & Cash Drawer Register
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                Front desk float, live system collections, petty cash, physical count & handover
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Department selector */}
            <div style={{
              display: 'flex',
              background: '#f1f5f9',
              padding: '3px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
            }}>
              <button
                type="button"
                onClick={() => setDepartment('FRONT_DESK')}
                style={{
                  border: 'none',
                  background: department === 'FRONT_DESK' ? '#ffffff' : 'transparent',
                  color: department === 'FRONT_DESK' ? '#0f172a' : '#64748b',
                  fontWeight: department === 'FRONT_DESK' ? '600' : '500',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  boxShadow: department === 'FRONT_DESK' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                🛎️ Front Desk
              </button>
              <button
                type="button"
                onClick={() => setDepartment('RESTAURANT_POS')}
                style={{
                  border: 'none',
                  background: department === 'RESTAURANT_POS' ? '#ffffff' : 'transparent',
                  color: department === 'RESTAURANT_POS' ? '#0f172a' : '#64748b',
                  fontWeight: department === 'RESTAURANT_POS' ? '600' : '500',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  boxShadow: department === 'RESTAURANT_POS' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                🍽️ Restaurant POS
              </button>
            </div>

            <button
              onClick={onClose}
              style={{
                border: 'none',
                background: '#f1f5f9',
                color: '#64748b',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '8px 24px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
        }}>
          <button
            onClick={() => setActiveTab('register')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              background: activeTab === 'register' ? '#ffffff' : 'transparent',
              color: activeTab === 'register' ? '#0f172a' : '#64748b',
              boxShadow: activeTab === 'register' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            📊 Active Register
          </button>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              background: activeTab === 'history' ? '#ffffff' : 'transparent',
              color: activeTab === 'history' ? '#0f172a' : '#64748b',
              boxShadow: activeTab === 'history' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            📜 Shift History & Slips
          </button>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {error && (
            <div style={{
              background: '#fef2f2',
              color: '#991b1b',
              border: '1px solid #fecaca',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span>⚠️ {error}</span>
              <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b' }}>✕</button>
            </div>
          )}

          {successMsg && (
            <div style={{
              background: '#f0fdf4',
              color: '#166534',
              border: '1px solid #bbf7d0',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              marginBottom: '16px',
            }}>
              ✅ {successMsg}
            </div>
          )}

          {activeTab === 'register' && (
            <>
              {loading && !shiftData ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  ⏳ Checking shift status...
                </div>
              ) : !shiftData?.has_active_shift ? (
                /* ================= STATE 1: NO ACTIVE SHIFT (OPEN FORM) ================= */
                <div style={{
                  background: '#f8fafc',
                  border: '2px dashed #cbd5e1',
                  borderRadius: '14px',
                  padding: '32px 24px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔒</div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
                    No Active {department === 'FRONT_DESK' ? 'Front Desk' : 'Restaurant POS'} Shift
                  </h4>
                  <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: '#64748b', maxWidth: '480px', marginInline: 'auto' }}>
                    Start your shift by recording the opening physical cash float in drawer. All walk-ins, dining bills, and receipts will be automatically tracked against this register.
                  </p>

                  <form onSubmit={handleOpenShift} style={{ maxWidth: '440px', margin: '0 auto', textAlign: 'left' }}>
                    {/* Shift Type Pills */}
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                        Shift Schedule / Slot *
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                        {[
                          { id: 'MORNING', label: '🌅 Morning', sub: '7 AM - 3 PM' },
                          { id: 'EVENING', label: '🌇 Evening', sub: '3 PM - 11 PM' },
                          { id: 'NIGHT', label: '🌙 Night', sub: '11 PM - 7 AM' },
                        ].map((s) => (
                          <div
                            key={s.id}
                            onClick={() => setOpenForm({ ...openForm, shift_type: s.id })}
                            style={{
                              border: openForm.shift_type === s.id ? '2px solid #10b981' : '1px solid #cbd5e1',
                              background: openForm.shift_type === s.id ? '#ecfdf5' : '#ffffff',
                              padding: '10px 8px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              textAlign: 'center',
                            }}
                          >
                            <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>{s.label}</div>
                            <div style={{ fontSize: '10px', color: '#64748b' }}>{s.sub}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Opening Float Input */}
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                        Opening Cash Float in Drawer (₹) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        required
                        value={openForm.opening_float}
                        onChange={(e) => setOpenForm({ ...openForm, opening_float: e.target.value })}
                        placeholder="e.g. 2000"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '15px',
                          fontWeight: '600',
                          boxSizing: 'border-box',
                        }}
                      />
                      {/* Presets */}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                        {['1000', '2000', '5000', '10000'].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setOpenForm({ ...openForm, opening_float: amt })}
                            style={{
                              border: '1px solid #e2e8f0',
                              background: '#ffffff',
                              borderRadius: '4px',
                              fontSize: '11px',
                              padding: '2px 8px',
                              color: '#475569',
                              cursor: 'pointer',
                            }}
                          >
                            ₹{amt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Opening Notes */}
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                        Shift Notes / Safe Handover Source (Optional)
                      </label>
                      <input
                        type="text"
                        value={openForm.opening_notes}
                        onChange={(e) => setOpenForm({ ...openForm, opening_notes: e.target.value })}
                        placeholder="e.g. Received float from night shift lockbox"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '13px',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)',
                      }}
                    >
                      🚀 Open Shift & Start Register
                    </button>
                  </form>
                </div>
              ) : (
                /* ================= STATE 2: ACTIVE SHIFT LIVE DASHBOARD ================= */
                <div>
                  {/* Shift Banner */}
                  <div style={{
                    background: 'linear-gradient(to right, #ecfdf5, #f0fdf4)',
                    border: '1px solid #a7f3d0',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '20px',
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          background: '#10b981',
                          color: '#ffffff',
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          letterSpacing: '0.5px',
                        }}>
                          ● ACTIVE SHIFT
                        </span>
                        <strong style={{ fontSize: '15px', color: '#0f172a' }}>
                          {currentShift.shift_code}
                        </strong>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                          ({currentShift.shift_type})
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>
                        Cashier: <strong>{currentShift.user?.name}</strong> • Started at {new Date(currentShift.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setShowPayoutModal(true)}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          padding: '8px 14px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#334155',
                          cursor: 'pointer',
                        }}
                      >
                        💸 Add Petty Cash / Payout
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowCloseModal(true);
                          setCloseForm({
                            ...closeForm,
                            actual_cash_counted: (financials?.expected_cash || 0).toString(),
                          });
                        }}
                        style={{
                          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: '700',
                          color: '#ffffff',
                          cursor: 'pointer',
                          boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)',
                        }}
                      >
                        🔒 End Shift & Handover
                      </button>
                    </div>
                  </div>

                  {/* 4 Core Financial KPI Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>
                        1. Opening Float
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
                        ₹{financials?.opening_float?.toLocaleString('en-IN') || '0'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Starting drawer cash</div>
                    </div>

                    <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#166534', textTransform: 'uppercase' }}>
                        2. Cash Collected (+)
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: '800', color: '#15803d', marginTop: '4px' }}>
                        ₹{financials?.total_cash_sales?.toLocaleString('en-IN') || '0'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#166534', marginTop: '2px' }}>
                        FD: ₹{financials?.front_office_cash} • POS: ₹{financials?.pos_cash}
                      </div>
                    </div>

                    <div style={{ background: '#fef2f2', padding: '16px', borderRadius: '12px', border: '1px solid #fecaca' }}>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#991b1b', textTransform: 'uppercase' }}>
                        3. Petty Cash Payouts (-)
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: '800', color: '#dc2626', marginTop: '4px' }}>
                        ₹{financials?.cash_payouts?.toLocaleString('en-IN') || '0'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#991b1b', marginTop: '2px' }}>Mid-shift cash drops</div>
                    </div>

                    <div style={{ background: '#eff6ff', padding: '16px', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#1e40af', textTransform: 'uppercase' }}>
                        4. Expected Cash Now
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: '800', color: '#1d4ed8', marginTop: '4px' }}>
                        ₹{financials?.expected_cash?.toLocaleString('en-IN') || '0'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#1e40af', marginTop: '2px' }}>Must be in drawer</div>
                    </div>
                  </div>

                  {/* Non-Cash Digital Collections Summary */}
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '24px',
                  }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>
                      💳 Digital Collections During This Shift:
                    </div>
                    <div style={{ display: 'flex', gap: '24px' }}>
                      <div>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>UPI / QR: </span>
                        <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                          ₹{financials?.total_upi_sales?.toLocaleString('en-IN') || '0'}
                        </strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>Card: </span>
                        <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                          ₹{financials?.total_card_sales?.toLocaleString('en-IN') || '0'}
                        </strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>Folio Transfer: </span>
                        <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                          ₹{financials?.pos_room_folio_transfers?.toLocaleString('en-IN') || '0'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Mid Shift Cash Transactions List */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <h5 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
                        Cash Drawer Petty Cash & Drop Log ({currentShift.cash_transactions?.length || 0})
                      </h5>
                    </div>

                    {!currentShift.cash_transactions?.length ? (
                      <div style={{
                        padding: '16px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#94a3b8',
                        textAlign: 'center',
                      }}>
                        No petty cash payouts or drops logged during this shift yet.
                      </div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                            <th style={{ padding: '8px 12px' }}>Time</th>
                            <th style={{ padding: '8px 12px' }}>Type</th>
                            <th style={{ padding: '8px 12px' }}>Amount</th>
                            <th style={{ padding: '8px 12px' }}>Reason</th>
                            <th style={{ padding: '8px 12px' }}>Recipient / Voucher</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentShift.cash_transactions.map((t) => (
                            <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '8px 12px', color: '#64748b' }}>
                                {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td style={{ padding: '8px 12px' }}>
                                <span style={{
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontSize: '10px',
                                  fontWeight: '700',
                                  background: t.transaction_type === 'PAYOUT' ? '#fee2e2' : '#dcfce7',
                                  color: t.transaction_type === 'PAYOUT' ? '#b91c1c' : '#15803d',
                                }}>
                                  {t.transaction_type}
                                </span>
                              </td>
                              <td style={{ padding: '8px 12px', fontWeight: '700', color: '#0f172a' }}>
                                ₹{parseFloat(t.amount).toLocaleString('en-IN')}
                              </td>
                              <td style={{ padding: '8px 12px', color: '#334155' }}>{t.reason}</td>
                              <td style={{ padding: '8px 12px', color: '#64748b' }}>
                                {t.recipient_name || '—'} {t.receipt_voucher_no ? `(${t.receipt_voucher_no})` : ''}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ================= STATE 3: SHIFT HISTORY & SLIPS ================= */}
          {activeTab === 'history' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
                  Past Shifts Audit Trail
                </h4>
                <button
                  type="button"
                  onClick={loadHistory}
                  style={{
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  🔄 Refresh
                </button>
              </div>

              {!historyShifts.length ? (
                <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                  No historical shifts found for {department}.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {historyShifts.map((s) => {
                    const varianceVal = parseFloat(s.variance) || 0;
                    return (
                      <div
                        key={s.id}
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: '10px',
                          padding: '14px 18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: '#ffffff',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ fontSize: '14px', color: '#0f172a' }}>{s.shift_code}</strong>
                            <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: '#f1f5f9', color: '#475569' }}>
                              {s.shift_type}
                            </span>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: '700',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: s.status === 'OPEN' ? '#dcfce7' : '#f1f5f9',
                              color: s.status === 'OPEN' ? '#15803d' : '#475569',
                            }}>
                              {s.status}
                            </span>
                          </div>

                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                            Cashier: <strong>{s.user?.name}</strong>
                            {s.handover_to_user && (
                              <span> ➔ Handed over to: <strong>{s.handover_to_user?.name}</strong></span>
                            )}
                            {' • '}
                            {new Date(s.opened_at).toLocaleDateString()}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>Actual Cash Counted</div>
                            <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
                              ₹{parseFloat(s.actual_cash_counted).toLocaleString('en-IN')}
                            </div>
                            {/* Variance badge */}
                            <div style={{
                              fontSize: '10px',
                              fontWeight: '700',
                              color: varianceVal === 0 ? '#15803d' : (varianceVal > 0 ? '#b45309' : '#dc2626'),
                            }}>
                              {varianceVal === 0
                                ? '✓ BALANCED'
                                : (varianceVal > 0 ? `+₹${varianceVal} OVERAGE` : `-₹${Math.abs(varianceVal)} SHORTAGE`)}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleViewSlip(s.id)}
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #cbd5e1',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                              color: '#334155',
                              cursor: 'pointer',
                            }}
                          >
                            🧾 View Slip
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ================= MODAL: ADD PETTY CASH / PAYOUT ================= */}
        {showPayoutModal && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '12px',
              padding: '24px',
              width: '100%',
              maxWidth: '460px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
                Record Cash Drawer Payout / Petty Cash
              </h4>

              <form onSubmit={handleAddTransaction}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                    Type *
                  </label>
                  <select
                    value={payoutForm.transaction_type}
                    onChange={(e) => setPayoutForm({ ...payoutForm, transaction_type: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="PAYOUT">📤 Cash Payout (Petty Expense / Vendor Advance)</option>
                    <option value="CASH_DROP">🏦 Mid-Shift Cash Drop (Deposit to Safe)</option>
                    <option value="FLOAT_ADDITION">📥 Float Top-Up (Added Change to Drawer)</option>
                  </select>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={payoutForm.amount}
                    onChange={(e) => setPayoutForm({ ...payoutForm, amount: e.target.value })}
                    placeholder="e.g. 500"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                    Reason / Purpose *
                  </label>
                  <input
                    type="text"
                    required
                    value={payoutForm.reason}
                    onChange={(e) => setPayoutForm({ ...payoutForm, reason: e.target.value })}
                    placeholder="e.g. Dairy vendor milk advance / Generator diesel"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                      Recipient Name
                    </label>
                    <input
                      type="text"
                      value={payoutForm.recipient_name}
                      onChange={(e) => setPayoutForm({ ...payoutForm, recipient_name: e.target.value })}
                      placeholder="e.g. Ramesh Dairy"
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                      Voucher No.
                    </label>
                    <input
                      type="text"
                      value={payoutForm.receipt_voucher_no}
                      onChange={(e) => setPayoutForm({ ...payoutForm, receipt_voucher_no: e.target.value })}
                      placeholder="e.g. VCH-004"
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowPayoutModal(false)}
                    style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#10b981', color: '#ffffff', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Record Payout
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================= MODAL: END SHIFT & HANDOVER ================= */}
        {showCloseModal && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '16px',
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              width: '100%',
              maxWidth: '650px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h4 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#0f172a' }}>
                  🔒 Close Shift & Handover Cash
                </h4>
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  style={{ border: 'none', background: '#f1f5f9', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              {/* Expected vs Counted Summary Box */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '10px',
                padding: '14px',
                background: '#f8fafc',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                marginBottom: '20px',
                textAlign: 'center',
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>System Expected Cash</div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                    ₹{expectedCash.toLocaleString('en-IN')}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Actual Counted Cash</div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                    ₹{countedCash.toLocaleString('en-IN')}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Variance Status</div>
                  <div style={{
                    fontSize: '15px',
                    fontWeight: '800',
                    color: liveVariance === 0 ? '#15803d' : (liveVariance > 0 ? '#b45309' : '#dc2626'),
                  }}>
                    {liveVariance === 0
                      ? '✓ MATCH (₹0)'
                      : (liveVariance > 0 ? `+₹${liveVariance} (OVER)` : `-₹${Math.abs(liveVariance)} (SHORT)`)}
                  </div>
                </div>
              </div>

              <form onSubmit={handleCloseShift}>
                {/* Denominations Counter */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
                    🧮 Physical Note Count (Denominations):
                  </label>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '10px',
                    background: '#f8fafc',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                  }}>
                    {['500', '200', '100', '50', '20', '10'].map((denom) => (
                      <div key={denom} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '600', width: '42px', color: '#475569' }}>
                          ₹{denom} ×
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={closeForm.denominations[denom]}
                          onChange={(e) => handleDenominationChange(denom, e.target.value)}
                          placeholder="0"
                          style={{
                            width: '60px',
                            padding: '4px 6px',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            fontSize: '13px',
                            textAlign: 'center',
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Direct Actual Cash override */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                    Total Actual Cash Counted (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={closeForm.actual_cash_counted}
                    onChange={(e) => setCloseForm({ ...closeForm, actual_cash_counted: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '16px',
                      fontWeight: '800',
                      color: '#0f172a',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Handover Recipient */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                    Handover Cash & Keys To (Staff Member) *
                  </label>
                  <select
                    value={closeForm.handover_to_user_id}
                    onChange={(e) => setCloseForm({ ...closeForm, handover_to_user_id: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="">Select incoming staff member...</option>
                    {staffOptions.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.role})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Handover Notes */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                    Handover Notes / Pending Issues (Room Balances, Keys, VIP Arrival)
                  </label>
                  <textarea
                    rows="3"
                    value={closeForm.handover_notes}
                    onChange={(e) => setCloseForm({ ...closeForm, handover_notes: e.target.value })}
                    placeholder="e.g. Room 204 owes ₹1,200 pending checkout tomorrow. Master key #2 returned to desk safe."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowCloseModal(false)}
                    style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      color: '#ffffff',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    🔒 Finalize Shift Handover
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================= MODAL: PRINTABLE SHIFT SLIP ================= */}
        {slipData && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10001,
            padding: '16px',
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '14px',
              padding: '24px',
              width: '100%',
              maxWidth: '440px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}>
              {/* Thermal Print Slip Header */}
              <div style={{ textAlign: 'center', borderBottom: '2px dashed #cbd5e1', paddingBottom: '12px', marginBottom: '14px' }}>
                <h3 style={{ margin: '0 0 2px 0', fontSize: '18px', fontWeight: '800' }}>{slipData.hotel_name}</h3>
                <div style={{ fontSize: '11px', color: '#64748b' }}>{slipData.hotel_address} • {slipData.hotel_phone}</div>
                <div style={{
                  display: 'inline-block',
                  background: '#0f172a',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  marginTop: '8px',
                }}>
                  SHIFT HANDOVER RECEIPT SLIP
                </div>
              </div>

              {/* Shift Metadata */}
              <div style={{ fontSize: '12px', lineHeight: '1.6', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                <div><strong>Shift Code:</strong> {slipData.shift_code}</div>
                <div><strong>Department:</strong> {slipData.department} ({slipData.shift_type})</div>
                <div><strong>Opened By:</strong> {slipData.opened_by}</div>
                <div><strong>Handed Over To:</strong> {slipData.handed_over_to}</div>
                <div><strong>Timings:</strong> {new Date(slipData.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {slipData.closed_at ? new Date(slipData.closed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'}</div>
              </div>

              {/* Financial Breakdown */}
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', marginBottom: '14px' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '4px 0', color: '#64748b' }}>Opening Float:</td>
                    <td style={{ textAlign: 'right', fontWeight: '600' }}>₹{slipData.financials?.opening_float?.toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 0', color: '#64748b' }}>System Cash Sales:</td>
                    <td style={{ textAlign: 'right', fontWeight: '600', color: '#16a34a' }}>+₹{slipData.financials?.system_cash_sales?.toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 0', color: '#64748b' }}>Cash Paid Out:</td>
                    <td style={{ textAlign: 'right', fontWeight: '600', color: '#dc2626' }}>-₹{slipData.financials?.cash_paid_out?.toLocaleString('en-IN')}</td>
                  </tr>
                  <tr style={{ borderTop: '1px solid #e2e8f0', fontWeight: '700' }}>
                    <td style={{ padding: '6px 0' }}>Expected Cash:</td>
                    <td style={{ textAlign: 'right' }}>₹{slipData.financials?.expected_cash?.toLocaleString('en-IN')}</td>
                  </tr>
                  <tr style={{ fontWeight: '800', fontSize: '13px' }}>
                    <td style={{ padding: '4px 0' }}>Actual Counted:</td>
                    <td style={{ textAlign: 'right' }}>₹{slipData.financials?.actual_cash_counted?.toLocaleString('en-IN')}</td>
                  </tr>
                  <tr style={{
                    borderTop: '1px dashed #cbd5e1',
                    fontWeight: '800',
                    color: slipData.financials?.variance === 0 ? '#16a34a' : (slipData.financials?.variance > 0 ? '#b45309' : '#dc2626'),
                  }}>
                    <td style={{ padding: '6px 0' }}>Variance:</td>
                    <td style={{ textAlign: 'right' }}>
                      {slipData.financials?.variance === 0 ? '✓ ₹0 (BALANCED)' : `₹${slipData.financials?.variance}`}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Signatures placeholder */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '24px', paddingTop: '16px', borderTop: '1px dashed #cbd5e1', textAlign: 'center', fontSize: '11px', color: '#64748b' }}>
                <div>
                  <div style={{ height: '32px' }}></div>
                  <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '4px' }}>Outgoing Cashier</div>
                </div>
                <div>
                  <div style={{ height: '32px' }}></div>
                  <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '4px' }}>Incoming Cashier</div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#0f172a',
                    color: '#ffffff',
                    fontWeight: '700',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  🖨️ Print Slip
                </button>
                <button
                  type="button"
                  onClick={() => setSlipData(null)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#334155',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
