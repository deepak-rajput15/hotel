import React, { useState, useEffect } from 'react';
import { guestApi } from '../../api';
import {
  Utensils,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  ChevronRight,
  X,
  Plus,
  Minus,
  Sparkles,
  Hotel,
  Bed,
  Send,
  ArrowLeft,
  Flame,
  ChefHat,
  ConciergeBell,
} from 'lucide-react';

export default function RoomDiningGuestView({ hotelCode, roomNumber }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [dietFilter, setDietFilter] = useState('ALL'); // 'ALL', 'VEG', 'NON_VEG'

  const [cart, setCart] = useState({}); // { itemId: { item, qty, notes } }
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [settlementPref, setSettlementPref] = useState('ROOM_FOLIO');

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null); // Active placed order for live tracking
  const [trackingInterval, setTrackingInterval] = useState(null);

  useEffect(() => {
    loadMenu();
  }, [hotelCode, roomNumber]);

  const loadMenu = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await guestApi.getRoomMenu(hotelCode, roomNumber);
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load room dining menu:', err);
      setError(err.data?.message || err.message || 'Unable to load room dining menu.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (item) => {
    setCart((prev) => {
      const currentQty = prev[item.id]?.qty || 0;
      return {
        ...prev,
        [item.id]: {
          item,
          qty: currentQty + 1,
          notes: prev[item.id]?.notes || '',
        },
      };
    });
  };

  const handleUpdateQty = (itemId, delta) => {
    setCart((prev) => {
      const current = prev[itemId];
      if (!current) return prev;
      const newQty = current.qty + delta;
      if (newQty <= 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return {
        ...prev,
        [itemId]: { ...current, qty: newQty },
      };
    });
  };

  const cartItems = Object.values(cart);
  const totalCartCount = cartItems.reduce((acc, curr) => acc + curr.qty, 0);
  const cartSubtotal = cartItems.reduce((acc, curr) => acc + Number(curr.item.price) * curr.qty, 0);
  const cartTax = Math.round(cartSubtotal * 0.05 * 100) / 100;
  const cartGrandTotal = Math.round((cartSubtotal + cartTax) * 100) / 100;

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) return;
    try {
      setSubmittingOrder(true);
      const payload = {
        items: cartItems.map((c) => ({
          menu_item_id: c.item.id,
          quantity: c.qty,
          special_notes: c.notes || null,
        })),
        special_instructions: specialInstructions.trim() || null,
        settlement_preference: settlementPref,
      };

      const res = await guestApi.placeRoomOrder(hotelCode, roomNumber, payload);
      if (res.success) {
        setCart({});
        setIsCartOpen(false);
        setActiveOrder(res.data);
        startLiveTracking(res.data.order_number);
      }
    } catch (err) {
      alert(err.data?.message || err.message || 'Failed to place order.');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const startLiveTracking = (orderNumber) => {
    const poll = async () => {
      try {
        const res = await guestApi.trackOrderStatus(orderNumber);
        if (res.success) {
          setActiveOrder(res.data);
        }
      } catch (e) {
        console.error('Tracking poll error:', e);
      }
    };
    poll();
    const timer = setInterval(poll, 10000);
    setTrackingInterval(timer);
  };

  useEffect(() => {
    return () => {
      if (trackingInterval) clearInterval(trackingInterval);
    };
  }, [trackingInterval]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#fff', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.2)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Loading In-Room Dining Menu...</h3>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>Connecting to Hotel Kitchen</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#fff', padding: '20px', fontFamily: 'sans-serif' }}>
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '32px 24px', maxWidth: '420px', textAlign: 'center' }}>
          <AlertCircle size={44} color="#f87171" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: '800' }}>Unable to Access Room Service</h3>
          <p style={{ fontSize: '13.5px', color: '#94a3b8', marginTop: '8px', lineHeight: 1.5 }}>
            {error || 'Room service is currently not available.'}
          </p>
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #334155', fontSize: '12px', color: '#64748b' }}>
            Please dial <strong>Front Desk (Ext. 9)</strong> from your room phone.
          </div>
        </div>
      </div>
    );
  }

  const { hotel, room, guest, can_order, status_message, categories, menu_items } = data;

  const filteredItems = menu_items.filter((item) => {
    const matchesCategory = selectedCategory === 'ALL' || item.category_name === selectedCategory;
    const matchesDiet =
      dietFilter === 'ALL' ||
      (dietFilter === 'VEG' && item.food_type === 'VEG') ||
      (dietFilter === 'NON_VEG' && item.food_type === 'NON_VEG');
    return matchesCategory && matchesDiet;
  });

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', fontFamily: "'Inter', sans-serif", paddingBottom: totalCartCount > 0 ? '90px' : '30px' }}>
      {/* Top Mobile App Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
          color: '#ffffff',
          padding: '20px 18px 24px',
          borderBottomLeftRadius: '24px',
          borderBottomRightRadius: '24px',
          boxShadow: '0 10px 25px -5px rgba(30, 27, 75, 0.4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Hotel size={18} />
            </div>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.8, fontWeight: '700' }}>
                In-Room Dining & Bar
              </div>
              <strong style={{ fontSize: '16px', fontWeight: '800' }}>{hotel.name}</strong>
            </div>
          </div>

          {/* Room Pill */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(4px)',
              padding: '6px 12px',
              borderRadius: '9999px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12.5px',
              fontWeight: '700',
            }}
          >
            <Bed size={14} />
            <span>Room {room.room_number}</span>
          </div>
        </div>

        {/* Guest Greeting Card */}
        {can_order && guest ? (
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '14px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '12px', opacity: 0.85 }}>Welcome,</div>
              <div style={{ fontSize: '15px', fontWeight: '800' }}>{guest.display_name}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '10.5px', background: '#10b981', color: '#fff', padding: '2px 8px', borderRadius: '9999px', fontWeight: '700' }}>
                Active Guest Stay
              </span>
              <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>
                Charges post to Folio
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '12px',
              padding: '10px 14px',
              fontSize: '12.5px',
              lineHeight: 1.4,
            }}
          >
            ⚠️ {status_message}
          </div>
        )}
      </div>

      {/* Live Order Tracker Banner (if order was placed) */}
      {activeOrder && (
        <div style={{ padding: '16px 16px 0' }}>
          <div
            style={{
              background: '#ffffff',
              border: '2px solid #6366f1',
              borderRadius: '16px',
              padding: '16px',
              boxShadow: '0 4px 15px rgba(99, 102, 241, 0.15)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1', animation: 'ping 1.5s infinite' }} />
                <strong style={{ fontSize: '13px', color: '#1e1b4b' }}>Live Order Tracking</strong>
              </div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>#{activeOrder.order_number}</span>
            </div>

            {/* Stepper Progress Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', margin: '14px 0 10px' }}>
              {[1, 2, 3, 4].map((step) => {
                const isPassed = (activeOrder.step_index || 1) >= step;
                return (
                  <div
                    key={step}
                    style={{
                      flex: 1,
                      height: '6px',
                      borderRadius: '3px',
                      background: isPassed ? '#6366f1' : '#e2e8f0',
                      transition: 'background 0.3s ease',
                    }}
                  />
                );
              })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ fontWeight: '700', color: '#4338ca' }}>
                {activeOrder.status_label || 'Order in Kitchen Queue'}
              </span>
              <span style={{ color: '#64748b' }}>~20-25 mins</span>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Category & Diet Filters */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          background: 'rgba(248, 250, 252, 0.95)',
          backdropFilter: 'blur(8px)',
          padding: '12px 16px',
          zIndex: 100,
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        {/* Diet Toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          {[
            { id: 'ALL', label: 'All Items' },
            { id: 'VEG', label: '🟢 Veg Only' },
            { id: 'NON_VEG', label: '🔴 Non-Veg' },
          ].map((d) => (
            <button
              key={d.id}
              onClick={() => setDietFilter(d.id)}
              style={{
                background: dietFilter === d.id ? '#1e293b' : '#ffffff',
                color: dietFilter === d.id ? '#ffffff' : '#475569',
                border: '1px solid',
                borderColor: dietFilter === d.id ? '#1e293b' : '#cbd5e1',
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '11.5px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Category Horizontal Scroll */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '4px',
            scrollbarWidth: 'none',
          }}
        >
          <button
            onClick={() => setSelectedCategory('ALL')}
            style={{
              background: selectedCategory === 'ALL' ? '#6366f1' : '#ffffff',
              color: selectedCategory === 'ALL' ? '#ffffff' : '#334155',
              border: '1px solid',
              borderColor: selectedCategory === 'ALL' ? '#6366f1' : '#e2e8f0',
              padding: '6px 14px',
              borderRadius: '10px',
              fontSize: '12.5px',
              fontWeight: '700',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              boxShadow: selectedCategory === 'ALL' ? '0 2px 6px rgba(99, 102, 241, 0.25)' : 'none',
            }}
          >
            All Menu
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.name)}
              style={{
                background: selectedCategory === cat.name ? '#6366f1' : '#ffffff',
                color: selectedCategory === cat.name ? '#ffffff' : '#334155',
                border: '1px solid',
                borderColor: selectedCategory === cat.name ? '#6366f1' : '#e2e8f0',
                padding: '6px 14px',
                borderRadius: '10px',
                fontSize: '12.5px',
                fontWeight: '700',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                boxShadow: selectedCategory === cat.name ? '0 2px 6px rgba(99, 102, 241, 0.25)' : 'none',
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items List */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: '#64748b' }}>
            <Utensils size={36} style={{ opacity: 0.3, margin: '0 auto 10px' }} />
            <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>No dishes found</h4>
            <p style={{ fontSize: '12.5px', marginTop: '4px' }}>Try selecting another category or diet filter.</p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const inCartQty = cart[item.id]?.qty || 0;
            const isVeg = item.food_type === 'VEG';

            return (
              <div
                key={item.id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '14px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                {/* Left Dish Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    {/* Food Type Indicator */}
                    <span
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '3px',
                        border: `1.5px solid ${isVeg ? '#16a34a' : '#dc2626'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: isVeg ? '#16a34a' : '#dc2626',
                        }}
                      />
                    </span>

                    <strong style={{ fontSize: '14.5px', fontWeight: '800', color: '#0f172a' }}>
                      {item.name}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '15px', fontWeight: '800', color: '#1e1b4b' }}>
                      ₹{Number(item.price).toLocaleString('en-IN')}
                    </span>
                    <span style={{ fontSize: '10.5px', color: '#64748b' }}>+ 5% GST</span>
                  </div>

                  {item.description && (
                    <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4, margin: '2px 0 6px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {item.description}
                    </p>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px', color: '#94a3b8' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Clock size={11} /> {item.preparation_time_minutes || 15} mins
                    </span>
                  </div>
                </div>

                {/* Right: Add / Stepper Button */}
                <div style={{ flexShrink: 0 }}>
                  {!can_order ? (
                    <button
                      disabled
                      style={{
                        background: '#f1f5f9',
                        color: '#94a3b8',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '6px 14px',
                        fontSize: '12px',
                        fontWeight: '700',
                      }}
                    >
                      Locked
                    </button>
                  ) : inCartQty === 0 ? (
                    <button
                      onClick={() => handleAddToCart(item)}
                      style={{
                        background: '#eff6ff',
                        color: '#2563eb',
                        border: '1.5px solid #bfdbfe',
                        borderRadius: '10px',
                        padding: '8px 18px',
                        fontSize: '13px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 1px 2px rgba(37,99,235,0.06)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Plus size={14} />
                      <span>ADD</span>
                    </button>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: '#2563eb',
                        color: '#ffffff',
                        borderRadius: '10px',
                        padding: '4px',
                        gap: '8px',
                      }}
                    >
                      <button
                        onClick={() => handleUpdateQty(item.id, -1)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#fff',
                          cursor: 'pointer',
                          display: 'flex',
                          padding: '3px',
                        }}
                      >
                        <Minus size={13} />
                      </button>
                      <span style={{ fontSize: '13px', fontWeight: '800', minWidth: '16px', textAlign: 'center' }}>
                        {inCartQty}
                      </span>
                      <button
                        onClick={() => handleUpdateQty(item.id, 1)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#fff',
                          cursor: 'pointer',
                          display: 'flex',
                          padding: '3px',
                        }}
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Bottom Cart Bar */}
      {totalCartCount > 0 && !isCartOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '16px',
            left: '16px',
            right: '16px',
            maxWidth: '540px',
            margin: '0 auto',
            zIndex: 1000,
          }}
        >
          <div
            onClick={() => setIsCartOpen(true)}
            style={{
              background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
              color: '#ffffff',
              borderRadius: '16px',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              boxShadow: '0 12px 30px -5px rgba(30, 27, 75, 0.5)',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', opacity: 0.8, textTransform: 'uppercase', fontWeight: '700' }}>
                {totalCartCount} {totalCartCount === 1 ? 'Dish' : 'Dishes'} Selected
              </div>
              <strong style={{ fontSize: '17px', fontWeight: '800' }}>
                ₹{cartGrandTotal.toLocaleString('en-IN')}
              </strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', fontWeight: '800' }}>
              <span>View Order</span>
              <ChevronRight size={18} />
            </div>
          </div>
        </div>
      )}

      {/* Slide-Up Cart & Checkout Drawer */}
      {isCartOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              width: '100%',
              maxWidth: '540px',
              maxHeight: '85vh',
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.3)',
              overflow: 'hidden',
            }}
          >
            {/* Drawer Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <strong style={{ fontSize: '16px', color: '#0f172a' }}>Your In-Room Order</strong>
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Room {room.room_number}</p>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', padding: '6px', cursor: 'pointer' }}
              >
                <X size={18} color="#475569" />
              </button>
            </div>

            {/* Cart Items List */}
            <div style={{ overflowY: 'auto', padding: '16px 20px', flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {cartItems.map((c) => (
                  <div key={c.item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: '13.5px', color: '#1e293b' }}>{c.item.name}</strong>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        ₹{Number(c.item.price).toLocaleString('en-IN')} &times; {c.qty}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: '8px', padding: '3px 6px', gap: '8px' }}>
                      <button onClick={() => handleUpdateQty(c.item.id, -1)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <Minus size={12} />
                      </button>
                      <span style={{ fontSize: '12.5px', fontWeight: '800' }}>{c.qty}</span>
                      <button onClick={() => handleUpdateQty(c.item.id, 1)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <Plus size={12} />
                      </button>
                    </div>

                    <strong style={{ fontSize: '13.5px', color: '#0f172a', minWidth: '60px', textAlign: 'right' }}>
                      ₹{(Number(c.item.price) * c.qty).toLocaleString('en-IN')}
                    </strong>
                  </div>
                ))}
              </div>

              {/* Special Instructions Input */}
              <div style={{ marginTop: '18px', paddingTop: '16px', borderTop: '1px dashed #e2e8f0' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                  Chef & Delivery Notes (Optional):
                </label>
                <textarea
                  rows={2}
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="e.g. Please send extra spoons, make it less spicy, do not ring bell..."
                  style={{ width: '100%', padding: '10px', fontSize: '12.5px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>

              {/* Payment Mode Selection */}
              <div style={{ marginTop: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>
                  Settlement Option:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <label
                    onClick={() => setSettlementPref('ROOM_FOLIO')}
                    style={{
                      border: '2px solid',
                      borderColor: settlementPref === 'ROOM_FOLIO' ? '#6366f1' : '#e2e8f0',
                      background: settlementPref === 'ROOM_FOLIO' ? '#e0e7ff' : '#f8fafc',
                      padding: '10px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '700',
                      color: settlementPref === 'ROOM_FOLIO' ? '#4338ca' : '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <input type="radio" checked={settlementPref === 'ROOM_FOLIO'} onChange={() => {}} />
                    <span>Charge to Room Folio</span>
                  </label>

                  <label
                    onClick={() => setSettlementPref('PAY_ON_DELIVERY')}
                    style={{
                      border: '2px solid',
                      borderColor: settlementPref === 'PAY_ON_DELIVERY' ? '#6366f1' : '#e2e8f0',
                      background: settlementPref === 'PAY_ON_DELIVERY' ? '#e0e7ff' : '#f8fafc',
                      padding: '10px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '700',
                      color: settlementPref === 'PAY_ON_DELIVERY' ? '#4338ca' : '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <input type="radio" checked={settlementPref === 'PAY_ON_DELIVERY'} onChange={() => {}} />
                    <span>Pay on Delivery (UPI/Cash)</span>
                  </label>
                </div>
              </div>

              {/* Bill Breakdown */}
              <div style={{ marginTop: '18px', background: '#f8fafc', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                  <span>Subtotal</span>
                  <span>₹{cartSubtotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>
                  <span>Restaurant GST (5%)</span>
                  <span>₹{cartTax.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: '800', color: '#0f172a', paddingTop: '6px', borderTop: '1px dashed #cbd5e1' }}>
                  <span>Grand Total</span>
                  <span>₹{cartGrandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Place Order CTA Button */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid #e2e8f0', background: '#ffffff' }}>
              <button
                onClick={handlePlaceOrder}
                disabled={submittingOrder}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '14px',
                  fontSize: '15px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
                }}
              >
                <Send size={16} />
                <span>{submittingOrder ? 'Sending to Kitchen...' : `Confirm & Place Order (₹${cartGrandTotal.toFixed(2)})`}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

