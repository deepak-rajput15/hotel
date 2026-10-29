import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { kitchenApi } from '../../api';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Flame,
  BellRing,
  Utensils,
  Bed,
  ShoppingBag,
  Check,
  ChevronRight,
  Filter,
} from 'lucide-react';

const formatKotElapsed = (printedAt, fallbackMins) => {
  if (printedAt) {
    const diffMs = Date.now() - new Date(printedAt).getTime();
    if (!isNaN(diffMs)) {
      const mins = Math.max(0, Math.floor(diffMs / 60000));
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      return remMins > 0 ? `${hrs}h ${remMins}m ago` : `${hrs}h ago`;
    }
  }
  const cleanMins = Math.max(0, Math.round(Math.abs(parseFloat(fallbackMins) || 0)));
  return cleanMins === 0 ? 'Just now' : `${cleanMins}m ago`;
};

const VegNonVegBadge = ({ type }) => {
  const isVeg = type === 'VEG';
  return (
    <span
      title={isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '15px',
        height: '15px',
        border: `1.5px solid ${isVeg ? '#16a34a' : '#dc2626'}`,
        borderRadius: '3px',
        padding: '1px',
        flexShrink: 0,
        backgroundColor: '#ffffff',
      }}
    >
      <span
        style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          backgroundColor: isVeg ? '#16a34a' : '#dc2626',
          display: 'inline-block',
        }}
      />
    </span>
  );
};

export default function KitchenDisplayWorkspace() {
  const { currentHotel, user } = useAuth();

  const [filter, setFilter] = useState('ACTIVE'); // 'ACTIVE', 'READY', 'ALL'
  const [kots, setKots] = useState([]);
  const [metrics, setMetrics] = useState({
    pending_items: 0,
    preparing_items: 0,
    ready_items: 0,
    delayed_kots: 0,
    total_in_kitchen: 0,
  });
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchKdsData = async () => {
    try {
      setLoading(true);
      const [kotsRes, summaryRes] = await Promise.all([
        kitchenApi.getLiveKots({ status: filter }),
        kitchenApi.getSummary(),
      ]);
      setKots(kotsRes.kots || []);
      setMetrics(summaryRes.metrics || {});
    } catch (err) {
      console.error('Failed to fetch KDS data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKdsData();
  }, [currentHotel?.id, filter]);

  // Auto-refresh every 12 seconds for real-time kitchen display
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchKdsData();
    }, 12000);
    return () => clearInterval(interval);
  }, [autoRefresh, filter, currentHotel?.id]);

  // Update Single Item Status
  const handleUpdateItemStatus = async (itemId, newStatus) => {
    try {
      setActionLoading(true);
      await kitchenApi.updateItemStatus(itemId, newStatus);
      fetchKdsData();
    } catch (err) {
      alert('Failed to update item: ' + (err.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  // Batch Update Entire KOT
  const handleBatchUpdateKot = async (orderId, kotNumber, newStatus) => {
    try {
      setActionLoading(true);
      await kitchenApi.updateKotStatus(orderId, kotNumber, newStatus);
      fetchKdsData();
    } catch (err) {
      alert('Failed to update KOT: ' + (err.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="kitchen-display-workspace" style={{ paddingBottom: '50px' }}>
      {/* 1. KDS Command Header */}
      <div
        className="card"
        style={{
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          borderLeft: '4px solid #ef4444',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-brand">{currentHotel?.hotel_code || 'HTL-1002'}</span>
            <span style={{ fontSize: '12px', color: 'var(--t-500)' }}>
              Head Chef &bull; <strong>{currentHotel?.name}</strong> Kitchen
            </span>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--t-900)' }}>
            Kitchen Display System (Live KOT Board)
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--t-600)', marginTop: '2px' }}>
            Live preparation queue, cooking station timer alerts, and runner pickup dispatch.
          </p>
        </div>

        {/* Filter Pills & Live Auto-Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', background: 'var(--surface-sub)', padding: '3px', borderRadius: 'var(--r-sm)' }}>
            {[
              { id: 'ACTIVE', label: `Cooking Queue (${metrics.total_in_kitchen || 0})` },
              { id: 'READY', label: `Ready for Pickup (${metrics.ready_items || 0})` },
              { id: 'ALL', label: 'All KOTs' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--r-sm)',
                  fontSize: '12.5px',
                  fontWeight: filter === tab.id ? '700' : '500',
                  background: filter === tab.id ? 'var(--white)' : 'transparent',
                  color: filter === tab.id ? 'var(--brand)' : 'var(--t-700)',
                  border: filter === tab.id ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchKdsData()}
            disabled={loading}
            className="btn btn-outline"
            style={{ fontSize: '12.5px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* 2. Kitchen Station KPI Metrics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        <KdsMetricCard
          label="Total Dishes in Queue"
          value={metrics.total_in_kitchen || 0}
          subtext="Pending + On Stove"
          icon={Flame}
          color="#ef4444"
          highlight
        />

        <KdsMetricCard
          label="Pending Preparation"
          value={metrics.pending_items || 0}
          subtext="Dishes waiting to start"
          icon={Clock}
          color="#f59e0b"
        />

        <KdsMetricCard
          label="Cooking on Stove"
          value={metrics.preparing_items || 0}
          subtext="Dishes being prepared"
          icon={ChefHat}
          color="var(--brand)"
        />

        <KdsMetricCard
          label="Ready for Pickup"
          value={metrics.ready_items || 0}
          subtext="Waiting for waiter dispatch"
          icon={CheckCircle2}
          color="var(--success)"
        />

        <KdsMetricCard
          label="Delayed KOTs (>15m)"
          value={metrics.delayed_kots || 0}
          subtext="Orders needing urgency"
          icon={AlertTriangle}
          color={metrics.delayed_kots > 0 ? '#b91c1c' : 'var(--t-500)'}
        />
      </div>

      {/* 3. Live KOT Cards Grid */}
      {kots.length === 0 ? (
        <div className="card" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--t-500)' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: 'var(--success-bg)',
              color: 'var(--success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
            }}
          >
            <CheckCircle2 size={28} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--t-900)' }}>
            All Caught Up! Kitchen Queue Clear
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--t-500)', maxWidth: '420px', margin: '6px auto 0' }}>
            There are currently no active tickets in the kitchen. New orders punched from the Restaurant POS or Room Service desk will appear here automatically.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 350px), 420px))',
            gap: '20px',
            alignItems: 'start',
          }}
        >
          {kots.map((kot) => {
            const isDelayed = kot.is_delayed || (kot.elapsed_minutes >= 15);
            const isReady = kot.overall_status === 'READY';
            const isCooking = kot.overall_status === 'PREPARING';

            const statusTheme = isDelayed
              ? { border: '#ef4444', bannerBg: '#fef2f2', badgeBg: '#fee2e2', text: '#b91c1c', label: 'DELAYED (>15M)' }
              : isReady
              ? { border: 'var(--success)', bannerBg: '#f0fdf4', badgeBg: '#dcfce7', text: 'var(--success)', label: 'READY FOR DISPATCH' }
              : isCooking
              ? { border: 'var(--brand)', bannerBg: '#eff6ff', badgeBg: '#dbeafe', text: 'var(--brand)', label: 'COOKING ON STOVE' }
              : { border: '#f59e0b', bannerBg: '#fffbeb', badgeBg: '#fef3c7', text: '#b45309', label: 'ORDER QUEUED' };

            const elapsedText = formatKotElapsed(kot.kot_printed_at, kot.elapsed_minutes);

            return (
              <div
                key={kot.group_key}
                className="card"
                style={{
                  padding: '0',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  borderTop: `5px solid ${statusTheme.border}`,
                  boxShadow: isDelayed ? '0 6px 20px rgba(239, 68, 68, 0.16)' : '0 2px 8px rgba(0, 0, 0, 0.04)',
                  background: 'var(--white)',
                }}
              >
                <div>
                  {/* Card Header Bar: Ticket Number, Table/Room, Live Timer */}
                  <div
                    style={{
                      background: statusTheme.bannerBg,
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border-sub)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          background: '#0f172a',
                          color: '#ffffff',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '800',
                          letterSpacing: '0.5px',
                        }}
                      >
                        {kot.kot_number}
                      </span>

                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: '800',
                          padding: '3px 9px',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          background: kot.order_type === 'DINE_IN' ? '#ecfdf5' : kot.order_type === 'ROOM_SERVICE' ? '#eff6ff' : '#fffbeb',
                          color: kot.order_type === 'DINE_IN' ? '#065f46' : kot.order_type === 'ROOM_SERVICE' ? '#1e40af' : '#92400e',
                          border: `1px solid ${kot.order_type === 'DINE_IN' ? '#a7f3d0' : kot.order_type === 'ROOM_SERVICE' ? '#bfdbfe' : '#fde68a'}`,
                        }}
                      >
                        {kot.order_type === 'DINE_IN' ? (
                          <>
                            <Utensils size={13} />
                            Table {kot.table_no || '--'}
                          </>
                        ) : kot.order_type === 'ROOM_SERVICE' ? (
                          <>
                            <Bed size={13} />
                            Room {kot.room_number || '--'}
                          </>
                        ) : (
                          <>
                            <ShoppingBag size={13} />
                            Takeaway
                          </>
                        )}
                      </span>
                    </div>

                    {/* Timer Badge with non-wrapping pill formatting */}
                    <div
                      style={{
                        whiteSpace: 'nowrap',
                        fontSize: '11.5px',
                        fontWeight: '800',
                        padding: '4px 9px',
                        borderRadius: '6px',
                        background: statusTheme.badgeBg,
                        color: statusTheme.text,
                        border: `1px solid ${statusTheme.border}40`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        flexShrink: 0,
                      }}
                    >
                      {isDelayed ? <AlertTriangle size={13} /> : <Clock size={13} />}
                      <span>{elapsedText}</span>
                    </div>
                  </div>

                  {/* Sub-header Bar: Order Ref, Covers, Guest & Status */}
                  <div
                    style={{
                      padding: '9px 16px',
                      background: 'var(--surface-sub)',
                      borderBottom: '1px solid var(--border-sub)',
                      fontSize: '11.5px',
                      color: 'var(--t-600)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '6px',
                    }}
                  >
                    <div>
                      Order: <strong>{kot.order_number}</strong> &bull; Covers: <strong>{kot.covers || 1}</strong>
                      {kot.customer_name && (
                        <span> &bull; Guest: <strong>{kot.customer_name}</strong></span>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: '800',
                        color: statusTheme.text,
                        textTransform: 'uppercase',
                        letterSpacing: '0.4px',
                      }}
                    >
                      {statusTheme.label}
                    </span>
                  </div>

                  {/* Itemized Dishes List */}
                  <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {kot.items.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          background: item.status === 'READY' ? '#f0fdf4' : 'var(--white)',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: `1px solid ${item.status === 'READY' ? '#bbf7d0' : 'var(--border-sub)'}`,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                            {/* Quantity Badge */}
                            <span
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '6px',
                                background: item.status === 'READY' ? '#15803d' : 'var(--brand)',
                                color: '#ffffff',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                fontWeight: '800',
                                flexShrink: 0,
                              }}
                            >
                              {item.quantity}x
                            </span>

                            {/* Veg / Non-Veg Indicator */}
                            <VegNonVegBadge type={item.food_type} />

                            <strong
                              style={{
                                fontSize: '13.5px',
                                color: 'var(--t-900)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={item.item_name}
                            >
                              {item.item_name}
                            </strong>
                          </div>

                          {/* Individual Item Status Actions */}
                          <div style={{ flexShrink: 0 }}>
                            {item.status === 'PENDING' ? (
                              <button
                                onClick={() => handleUpdateItemStatus(item.id, 'PREPARING')}
                                disabled={actionLoading}
                                className="btn btn-outline"
                                style={{
                                  padding: '4px 10px',
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  color: 'var(--brand)',
                                  borderColor: 'var(--brand)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <Flame size={12} />
                                Start
                              </button>
                            ) : item.status === 'PREPARING' ? (
                              <button
                                onClick={() => handleUpdateItemStatus(item.id, 'READY')}
                                disabled={actionLoading}
                                className="btn btn-primary"
                                style={{
                                  padding: '4px 10px',
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  background: 'var(--success)',
                                  borderColor: 'var(--success)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <Check size={12} />
                                Mark Ready
                              </button>
                            ) : (
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  color: '#15803d',
                                  background: '#dcfce7',
                                  border: '1px solid #bbf7d0',
                                  padding: '3px 8px',
                                  borderRadius: '5px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                              >
                                <CheckCircle2 size={12} />
                                Ready
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Special Cooking Instructions Callout */}
                        {item.special_notes && (
                          <div
                            style={{
                              fontSize: '11.5px',
                              fontWeight: '600',
                              color: '#92400e',
                              background: '#fffbeb',
                              border: '1px dashed #fde68a',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              marginTop: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                            }}
                          >
                            <ChefHat size={13} style={{ flexShrink: 0 }} />
                            <span><strong>Chef Note:</strong> {item.special_notes}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* KOT Global Order Notes */}
                  {kot.notes && (
                    <div
                      style={{
                        margin: '0 16px 12px',
                        fontSize: '11.5px',
                        fontWeight: '600',
                        color: '#1e40af',
                        background: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        padding: '6px 10px',
                        borderRadius: '6px',
                      }}
                    >
                      <strong>Table Instruction:</strong> {kot.notes}
                    </div>
                  )}
                </div>

                {/* Batch Actions for Entire KOT (Tear-off Footer) */}
                <div
                  style={{
                    padding: '12px 16px',
                    background: 'var(--surface-sub)',
                    borderTop: '2px dashed var(--border)',
                    display: 'flex',
                    gap: '8px',
                  }}
                >
                  {kot.overall_status === 'PENDING' && (
                    <button
                      onClick={() => handleBatchUpdateKot(kot.order_id, kot.kot_number, 'PREPARING')}
                      disabled={actionLoading}
                      className="btn btn-outline"
                      style={{
                        flex: 1,
                        fontSize: '12px',
                        fontWeight: '700',
                        padding: '8px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        borderColor: 'var(--brand)',
                        color: 'var(--brand)',
                        background: 'var(--white)',
                      }}
                    >
                      <Flame size={14} />
                      Start Cooking All
                    </button>
                  )}

                  {kot.overall_status !== 'READY' && kot.overall_status !== 'SERVED' && (
                    <button
                      onClick={() => handleBatchUpdateKot(kot.order_id, kot.kot_number, 'READY')}
                      disabled={actionLoading}
                      className="btn btn-primary"
                      style={{
                        flex: 1,
                        fontSize: '12px',
                        fontWeight: '700',
                        padding: '8px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        background: 'var(--success)',
                        borderColor: 'var(--success)',
                        boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)',
                      }}
                    >
                      <CheckCircle2 size={14} />
                      All Ready (KOT Done)
                    </button>
                  )}

                  {kot.overall_status === 'READY' && (
                    <button
                      onClick={() => handleBatchUpdateKot(kot.order_id, kot.kot_number, 'SERVED')}
                      disabled={actionLoading}
                      className="btn btn-outline"
                      style={{
                        flex: 1,
                        fontSize: '12px',
                        fontWeight: '700',
                        padding: '8px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        background: 'var(--white)',
                        color: 'var(--t-900)',
                      }}
                    >
                      <ShoppingBag size={14} />
                      Dispatch / Runner Picked Up
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function KdsMetricCard({ label, value, subtext, icon: Icon, color, highlight }) {
  return (
    <div
      className="card"
      style={{
        padding: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        borderLeft: highlight ? `4px solid ${color}` : undefined,
      }}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: 'var(--r-sm)',
          background: 'var(--surface-sub)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: color,
        }}
      >
        <Icon size={18} />
      </div>
      <div>
        <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--t-500)', textTransform: 'uppercase' }}>
          {label}
        </div>
        <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--t-900)', marginTop: '1px' }}>
          {value}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--t-500)', marginTop: '1px' }}>
          {subtext}
        </div>
      </div>
    </div>
  );
}

