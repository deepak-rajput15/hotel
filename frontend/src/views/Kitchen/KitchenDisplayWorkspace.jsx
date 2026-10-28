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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
          {kots.map((kot) => {
            const isDelayed = kot.is_delayed;
            const isReady = kot.overall_status === 'READY';
            const isCooking = kot.overall_status === 'PREPARING';

            return (
              <div
                key={kot.group_key}
                className="card"
                style={{
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderTop: `4px solid ${
                    isDelayed ? '#ef4444' : isReady ? 'var(--success)' : isCooking ? 'var(--brand)' : '#f59e0b'
                  }`,
                  boxShadow: isDelayed ? '0 4px 14px rgba(239, 68, 68, 0.15)' : 'var(--shadow-xs)',
                }}
              >
                <div>
                  {/* Card Header: Channel & KOT Details */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="badge badge-brand" style={{ fontSize: '11px', fontWeight: '800' }}>
                        {kot.kot_number}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--t-900)' }}>
                        {kot.order_type === 'DINE_IN'
                          ? `🍽️ Table ${kot.table_no || '--'}`
                          : kot.order_type === 'ROOM_SERVICE'
                          ? `🛎️ Room ${kot.room_number || '--'}`
                          : '🛍️ Takeaway'}
                      </span>
                    </div>

                    {/* Timer Badge */}
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: isDelayed ? '#fee2e2' : 'var(--surface-sub)',
                        color: isDelayed ? '#b91c1c' : 'var(--t-700)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Clock size={12} />
                      {kot.elapsed_minutes}m ago
                    </span>
                  </div>

                  <div style={{ fontSize: '11.5px', color: 'var(--t-500)', marginBottom: '12px' }}>
                    Order: <strong>{kot.order_number}</strong> &bull; Covers: <strong>{kot.covers}</strong>
                    {kot.customer_name && ` &bull; Guest: ${kot.customer_name}`}
                  </div>

                  {/* Itemized Dishes List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                    {kot.items.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          background: 'var(--surface-sub)',
                          padding: '8px 10px',
                          borderRadius: 'var(--r-sm)',
                          border: '1px solid var(--border-sub)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--brand)', background: 'var(--brand-50)', padding: '1px 5px', borderRadius: '3px' }}>
                              {item.quantity}x
                            </span>
                            <span style={{ fontSize: '10px' }}>
                              {item.food_type === 'VEG' ? '🟢' : '🔴'}
                            </span>
                            <strong style={{ fontSize: '13px', color: 'var(--t-900)' }}>
                              {item.item_name}
                            </strong>
                          </div>

                          {/* Individual Item Status Button */}
                          {item.status === 'PENDING' ? (
                            <button
                              onClick={() => handleUpdateItemStatus(item.id, 'PREPARING')}
                              disabled={actionLoading}
                              className="btn btn-outline"
                              style={{ padding: '2px 6px', fontSize: '11px', color: 'var(--brand)' }}
                            >
                              Start
                            </button>
                          ) : item.status === 'PREPARING' ? (
                            <button
                              onClick={() => handleUpdateItemStatus(item.id, 'READY')}
                              disabled={actionLoading}
                              className="btn btn-primary"
                              style={{ padding: '2px 6px', fontSize: '11px', background: 'var(--success)', borderColor: 'var(--success)' }}
                            >
                              Mark Ready
                            </button>
                          ) : (
                            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                              <Check size={12} /> Ready
                            </span>
                          )}
                        </div>

                        {/* Special Cooking Instructions */}
                        {item.special_notes && (
                          <div
                            style={{
                              fontSize: '11px',
                              fontWeight: '600',
                              color: '#92400e',
                              background: '#fef3c7',
                              padding: '2px 6px',
                              borderRadius: '3px',
                              marginTop: '4px',
                              display: 'inline-block',
                            }}
                          >
                            ⚠️ Note: {item.special_notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Batch Actions for Entire KOT */}
                <div style={{ borderTop: '1px solid var(--border-sub)', paddingTop: '10px', display: 'flex', gap: '8px' }}>
                  {kot.overall_status === 'PENDING' && (
                    <button
                      onClick={() => handleBatchUpdateKot(kot.order_id, kot.kot_number, 'PREPARING')}
                      disabled={actionLoading}
                      className="btn btn-outline"
                      style={{ flex: 1, fontSize: '12px', padding: '6px' }}
                    >
                      Start Cooking All
                    </button>
                  )}

                  {kot.overall_status !== 'READY' && kot.overall_status !== 'SERVED' && (
                    <button
                      onClick={() => handleBatchUpdateKot(kot.order_id, kot.kot_number, 'READY')}
                      disabled={actionLoading}
                      className="btn btn-primary"
                      style={{ flex: 1, fontSize: '12px', padding: '6px', background: 'var(--success)', borderColor: 'var(--success)' }}
                    >
                      All Ready (KOT Done)
                    </button>
                  )}

                  {kot.overall_status === 'READY' && (
                    <button
                      onClick={() => handleBatchUpdateKot(kot.order_id, kot.kot_number, 'SERVED')}
                      disabled={actionLoading}
                      className="btn btn-outline"
                      style={{ flex: 1, fontSize: '12px', padding: '6px' }}
                    >
                      Dispatch / Picked Up
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

