import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { otaApi } from '../../api';

export default function OtaChannelManagerWorkspace() {
  const { currentHotel } = useAuth();
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('channels'); // 'channels' | 'simulator' | 'logs'
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [simulating, setSimulating] = useState(false);
  const [pushingAri, setPushingAri] = useState(false);

  // Edit channel modal
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [editForm, setEditForm] = useState({
    commission_rate_percent: '',
    hotel_channel_id: '',
    is_connected: true,
  });

  useEffect(() => {
    loadOtaData();
  }, [currentHotel]);

  const loadOtaData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await otaApi.getChannels(currentHotel?.id);
      if (res.success) {
        setChannels(res.channels || []);
        setMetrics(res.metrics || {});
      }
      const logsRes = await otaApi.getLogs({}, currentHotel?.id);
      if (logsRes.success) {
        setLogs(logsRes.logs?.data || []);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load OTA Channel Manager');
    } finally {
      setLoading(false);
    }
  };

  const handlePushAri = async (channelCode = null) => {
    setPushingAri(true);
    setStatusMsg('');
    setErrorMsg('');
    try {
      const res = await otaApi.pushAri(channelCode, currentHotel?.id);
      if (res.success) {
        setStatusMsg(`✓ ${res.message}`);
        await loadOtaData();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to push ARI inventory');
    } finally {
      setPushingAri(false);
    }
  };

  const handleSimulate = async (channelCode, preset = {}) => {
    setSimulating(true);
    setStatusMsg('');
    setErrorMsg('');
    try {
      const res = await otaApi.simulateBooking({
        channel_code: channelCode,
        ...preset,
      }, currentHotel?.id);

      if (res.success) {
        setStatusMsg(`🎉 ${res.message} (Gross: ₹${res.financials?.gross_amount} • Commission: -₹${res.financials?.commission_amount} • Net Hotel Payout: ₹${res.financials?.net_payable})`);
        await loadOtaData();
      } else {
        setErrorMsg(res.message);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Simulation failed');
    } finally {
      setSimulating(false);
    }
  };

  const handleUpdateChannel = async (e) => {
    e.preventDefault();
    if (!selectedChannel) return;
    try {
      const res = await otaApi.updateChannel(selectedChannel.channel_code, {
        commission_rate_percent: parseFloat(editForm.commission_rate_percent),
        hotel_channel_id: editForm.hotel_channel_id,
        is_connected: editForm.is_connected,
      }, currentHotel?.id);

      if (res.success) {
        setSelectedChannel(null);
        setStatusMsg(res.message);
        await loadOtaData();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Update failed');
    }
  };

  const getChannelLogo = (code) => {
    switch (code) {
      case 'MAKEMYTRIP': return '🔴 MMT';
      case 'BOOKING_COM': return '🔵 Booking';
      case 'AGODA': return '🟠 Agoda';
      case 'EXPEDIA': return '🟡 Expedia';
      case 'AIRBNB': return '🌸 Airbnb';
      default: return '🌐 OTA';
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>🌐</span>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>
              OTA Channel Manager & 2-Way Sync Engine
            </h2>
            <span style={{
              background: '#ecfdf5',
              color: '#065f46',
              border: '1px solid #a7f3d0',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: '700',
            }}>
              ● 2-WAY LIVE ARI
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
            Bi-directional inventory sync with MakeMyTrip, Booking.com, Agoda. Automated rate push & instant reservation import.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            disabled={pushingAri}
            onClick={() => handlePushAri()}
            style={{
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)',
            }}
          >
            <span>🔄</span>
            <span>{pushingAri ? 'Pushing Rates & Inventory...' : 'Push Live ARI to All OTAs'}</span>
          </button>
        </div>
      </div>

      {/* Status Banners */}
      {statusMsg && (
        <div style={{
          background: '#f0fdf4',
          color: '#166534',
          border: '1px solid #bbf7d0',
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '13px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>{statusMsg}</span>
          <button onClick={() => setStatusMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#166534' }}>✕</button>
        </div>
      )}

      {errorMsg && (
        <div style={{
          background: '#fef2f2',
          color: '#991b1b',
          border: '1px solid #fecaca',
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '13px',
          marginBottom: '16px',
        }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* 4 Financial KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
            Connected Channels
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
            {metrics.connected_channels_count || 3} <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '500' }}>/ 5 Platforms</span>
          </div>
          <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '2px' }}>● 100% Health Status</div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
            Total OTA Bookings
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
            {metrics.total_ota_bookings || 0}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Imported to Front Desk PMS</div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
            Gross OTA Revenue
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
            ₹{metrics.gross_ota_revenue?.toLocaleString('en-IN') || '0'}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            Commission: -₹{metrics.total_commission_paid?.toLocaleString('en-IN') || '0'}
          </div>
        </div>

        <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '12px', border: '1px solid #bbf7d0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#166534', textTransform: 'uppercase' }}>
            Net Hotel Payout
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#15803d', marginTop: '4px' }}>
            ₹{metrics.net_ota_payout?.toLocaleString('en-IN') || '0'}
          </div>
          <div style={{ fontSize: '11px', color: '#166534', marginTop: '2px' }}>Direct Bank Settlement</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('channels')}
          style={{
            padding: '10px 18px',
            borderRadius: '6px 6px 0 0',
            border: 'none',
            fontSize: '13px',
            fontWeight: activeTab === 'channels' ? '700' : '500',
            background: activeTab === 'channels' ? '#ffffff' : 'transparent',
            color: activeTab === 'channels' ? '#0f172a' : '#64748b',
            borderBottom: activeTab === 'channels' ? '2px solid #2563eb' : '2px solid transparent',
            cursor: 'pointer',
          }}
        >
          🏨 Connected Channels ({channels.length})
        </button>

        <button
          onClick={() => setActiveTab('simulator')}
          style={{
            padding: '10px 18px',
            borderRadius: '6px 6px 0 0',
            border: 'none',
            fontSize: '13px',
            fontWeight: activeTab === 'simulator' ? '700' : '500',
            background: activeTab === 'simulator' ? '#ffffff' : 'transparent',
            color: activeTab === 'simulator' ? '#0f172a' : '#64748b',
            borderBottom: activeTab === 'simulator' ? '2px solid #2563eb' : '2px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>⚡ Live 2-Way Simulator</span>
          <span style={{ background: '#fef08a', color: '#854d0e', padding: '1px 6px', borderRadius: '10px', fontSize: '10px', fontWeight: '800' }}>
            TEST LAB
          </span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          style={{
            padding: '10px 18px',
            borderRadius: '6px 6px 0 0',
            border: 'none',
            fontSize: '13px',
            fontWeight: activeTab === 'logs' ? '700' : '500',
            background: activeTab === 'logs' ? '#ffffff' : 'transparent',
            color: activeTab === 'logs' ? '#0f172a' : '#64748b',
            borderBottom: activeTab === 'logs' ? '2px solid #2563eb' : '2px solid transparent',
            cursor: 'pointer',
          }}
        >
          📜 Sync & Webhook Audit Log ({logs.length})
        </button>
      </div>

      {/* ================= TAB 1: CHANNELS GRID ================= */}
      {activeTab === 'channels' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
          {channels.map((ch) => (
            <div
              key={ch.id}
              style={{
                background: '#ffffff',
                border: ch.is_connected ? '1px solid #cbd5e1' : '1px dashed #cbd5e1',
                borderRadius: '12px',
                padding: '18px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px', fontWeight: '800' }}>{getChannelLogo(ch.channel_code)}</span>
                    <strong style={{ fontSize: '15px', color: '#0f172a' }}>{ch.channel_name}</strong>
                  </div>

                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '700',
                    background: ch.is_connected ? '#dcfce7' : '#f1f5f9',
                    color: ch.is_connected ? '#15803d' : '#64748b',
                  }}>
                    {ch.is_connected ? '● CONNECTED' : '○ DISCONNECTED'}
                  </span>
                </div>

                <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.8' }}>
                  <div><strong>Channel Property ID:</strong> <code style={{ background: '#f1f5f9', padding: '1px 4px', borderRadius: '4px' }}>{ch.hotel_channel_id}</code></div>
                  <div><strong>Commission Rate:</strong> <span style={{ color: '#dc2626', fontWeight: '700' }}>{ch.commission_rate_percent}%</span></div>
                  <div><strong>2-Way Sync:</strong> {ch.two_way_sync_enabled ? '✅ Enabled (ARI + Bookings)' : '❌ Disabled'}</div>
                  <div><strong>Last Synced:</strong> {ch.last_sync_at ? new Date(ch.last_sync_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedChannel(ch);
                    setEditForm({
                      commission_rate_percent: ch.commission_rate_percent,
                      hotel_channel_id: ch.hotel_channel_id,
                      is_connected: ch.is_connected,
                    });
                  }}
                  style={{
                    flex: 1,
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#334155',
                    cursor: 'pointer',
                  }}
                >
                  ⚙️ Configure
                </button>

                <button
                  type="button"
                  onClick={() => handlePushAri(ch.channel_code)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #bfdbfe',
                    background: '#eff6ff',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#1d4ed8',
                    cursor: 'pointer',
                  }}
                >
                  🔄 Sync Now
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================= TAB 2: LIVE 2-WAY SIMULATOR LAB ================= */}
      {activeTab === 'simulator' && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '24px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        }}>
          <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
              ⚡ Interactive OTA Inbound Booking Simulator
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              Test real-world OTA connectivity in 1-click! When you trigger a booking, it instantly:
              <strong> 1) Allocates a room in PMS</strong>, <strong>2) Deducts OTA commission</strong>, <strong>3) Sends a WhatsApp confirmation</strong>, and <strong>4) Decrements availability on all other OTAs (ARI Push)</strong>.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
            {/* MakeMyTrip Card */}
            <div style={{
              border: '2px solid #fecaca',
              background: '#fff5f5',
              borderRadius: '12px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '20px' }}>🔴</span>
                  <strong style={{ fontSize: '15px', color: '#991b1b' }}>MakeMyTrip Inbound</strong>
                </div>
                <div style={{ fontSize: '12px', color: '#7f1d1d', lineHeight: '1.6' }}>
                  <div><strong>Guest:</strong> Aditi Singhania (Mumbai)</div>
                  <div><strong>Room Type:</strong> Deluxe Double Bed</div>
                  <div><strong>Gross Rate:</strong> ₹3,000 / Night (2 Nights)</div>
                  <div><strong>Commission:</strong> 18% (-₹1,080)</div>
                  <div><strong>Net Hotel Payout:</strong> ₹4,920</div>
                </div>
              </div>

              <button
                type="button"
                disabled={simulating}
                onClick={() => handleSimulate('MAKEMYTRIP', {
                  guest_name: 'Aditi Singhania',
                  guest_phone: '+919876001122',
                  guest_email: 'aditi.singhania@example.com',
                  room_type: 'DELUXE',
                  rate_per_night: 3000,
                })}
                style={{
                  marginTop: '16px',
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#ffffff',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(220, 38, 38, 0.3)',
                }}
              >
                {simulating ? 'Simulating Inbound Booking...' : '⚡ Simulate MakeMyTrip Booking'}
              </button>
            </div>

            {/* Booking.com Card */}
            <div style={{
              border: '2px solid #bfdbfe',
              background: '#eff6ff',
              borderRadius: '12px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '20px' }}>🔵</span>
                  <strong style={{ fontSize: '15px', color: '#1e40af' }}>Booking.com Global</strong>
                </div>
                <div style={{ fontSize: '12px', color: '#1e3a8a', lineHeight: '1.6' }}>
                  <div><strong>Guest:</strong> Jonathan Vance (London, UK)</div>
                  <div><strong>Room Type:</strong> Executive Suite</div>
                  <div><strong>Gross Rate:</strong> ₹4,500 / Night (2 Nights)</div>
                  <div><strong>Commission:</strong> 15% (-₹1,350)</div>
                  <div><strong>Net Hotel Payout:</strong> ₹7,650</div>
                </div>
              </div>

              <button
                type="button"
                disabled={simulating}
                onClick={() => handleSimulate('BOOKING_COM', {
                  guest_name: 'Jonathan Vance',
                  guest_phone: '+447911000999',
                  guest_email: 'jonathan.vance@example.co.uk',
                  room_type: 'DELUXE',
                  rate_per_night: 4500,
                })}
                style={{
                  marginTop: '16px',
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#2563eb',
                  color: '#ffffff',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(37, 99, 235, 0.3)',
                }}
              >
                {simulating ? 'Simulating Inbound Booking...' : '⚡ Simulate Booking.com Booking'}
              </button>
            </div>

            {/* Agoda Card */}
            <div style={{
              border: '2px solid #fed7aa',
              background: '#fffaf0',
              borderRadius: '12px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '20px' }}>🟠</span>
                  <strong style={{ fontSize: '15px', color: '#9a3412' }}>Agoda Asia-Pacific</strong>
                </div>
                <div style={{ fontSize: '12px', color: '#7c2d12', lineHeight: '1.6' }}>
                  <div><strong>Guest:</strong> Kenji Sato (Tokyo, Japan)</div>
                  <div><strong>Room Type:</strong> Deluxe Room</div>
                  <div><strong>Gross Rate:</strong> ₹3,200 / Night (2 Nights)</div>
                  <div><strong>Commission:</strong> 14% (-₹896)</div>
                  <div><strong>Net Hotel Payout:</strong> ₹5,504</div>
                </div>
              </div>

              <button
                type="button"
                disabled={simulating}
                onClick={() => handleSimulate('AGODA', {
                  guest_name: 'Kenji Sato',
                  guest_phone: '+819012345678',
                  guest_email: 'kenji.sato@example.jp',
                  room_type: 'DELUXE',
                  rate_per_night: 3200,
                })}
                style={{
                  marginTop: '16px',
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#ea580c',
                  color: '#ffffff',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(234, 88, 12, 0.3)',
                }}
              >
                {simulating ? 'Simulating Inbound Booking...' : '⚡ Simulate Agoda Booking'}
              </button>
            </div>
          </div>

          {/* Webhook Developer Guide */}
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
            <h5 style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
              📡 Live Production Webhook URL for OTAs (MakeMyTrip / Booking.com):
            </h5>
            <code style={{ background: '#0f172a', color: '#38bdf8', padding: '8px 12px', borderRadius: '6px', display: 'block', wordBreak: 'break-all' }}>
              POST https://sasapi.u2tech.in/api/v1/public/ota/webhook/{"{CHANNEL_CODE}"}
            </code>
            <p style={{ margin: '8px 0 0 0', color: '#64748b' }}>
              Headers required: <code>X-Hotel-Channel-Id: MMT-1001-999</code>. OTAs push raw JSON/XML reservation data which is automatically transformed and settled into the guest ledger.
            </p>
          </div>
        </div>
      )}

      {/* ================= TAB 3: AUDIT & SYNC LOGS ================= */}
      {activeTab === 'logs' && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          {!logs.length ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              No sync events logged yet. Try simulating an incoming booking!
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                  <th style={{ padding: '10px 14px' }}>Time</th>
                  <th style={{ padding: '10px 14px' }}>Channel</th>
                  <th style={{ padding: '10px 14px' }}>Direction</th>
                  <th style={{ padding: '10px 14px' }}>Event</th>
                  <th style={{ padding: '10px 14px' }}>Guest / Ref</th>
                  <th style={{ padding: '10px 14px' }}>Gross</th>
                  <th style={{ padding: '10px 14px' }}>Commission</th>
                  <th style={{ padding: '10px 14px' }}>Net Payout</th>
                  <th style={{ padding: '10px 14px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px', color: '#64748b' }}>
                      {new Date(l.processed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: '700', color: '#0f172a' }}>
                      {l.channel_code}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: '700',
                        background: l.direction === 'INBOUND' ? '#dbeafe' : '#fef3c7',
                        color: l.direction === 'INBOUND' ? '#1d4ed8' : '#b45309',
                      }}>
                        {l.direction === 'INBOUND' ? '📥 INBOUND' : '📤 OUTBOUND'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#334155' }}>
                      {l.event_type}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#0f172a' }}>
                      <strong>{l.guest_name || '—'}</strong>
                      {l.ota_reservation_id && <div style={{ fontSize: '10.5px', color: '#64748b' }}>#{l.ota_reservation_id}</div>}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: '700' }}>
                      {parseFloat(l.gross_amount) > 0 ? `₹${parseFloat(l.gross_amount).toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#dc2626', fontWeight: '600' }}>
                      {parseFloat(l.commission_amount) > 0 ? `-₹${parseFloat(l.commission_amount).toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#16a34a', fontWeight: '800' }}>
                      {parseFloat(l.net_payable_to_hotel) > 0 ? `₹${parseFloat(l.net_payable_to_hotel).toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: '800',
                        background: l.status === 'SUCCESS' ? '#dcfce7' : '#fee2e2',
                        color: l.status === 'SUCCESS' ? '#15803d' : '#b91c1c',
                      }}>
                        {l.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ================= MODAL: CONFIGURE OTA CHANNEL ================= */}
      {selectedChannel && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '24px',
            width: '100%',
            maxWidth: '480px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
          }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
              Configure {selectedChannel.channel_name}
            </h4>

            <form onSubmit={handleUpdateChannel}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                  Connection Status
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, is_connected: true })}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '6px',
                      border: editForm.is_connected ? '2px solid #10b981' : '1px solid #cbd5e1',
                      background: editForm.is_connected ? '#ecfdf5' : '#ffffff',
                      color: editForm.is_connected ? '#065f46' : '#64748b',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    ● Connected & Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, is_connected: false })}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '6px',
                      border: !editForm.is_connected ? '2px solid #ef4444' : '1px solid #cbd5e1',
                      background: !editForm.is_connected ? '#fef2f2' : '#ffffff',
                      color: !editForm.is_connected ? '#991b1b' : '#64748b',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    ○ Disconnected / Pause
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                  OTA Commission Rate (%) *
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="50"
                  required
                  value={editForm.commission_rate_percent}
                  onChange={(e) => setEditForm({ ...editForm, commission_rate_percent: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                  Hotel Property Channel ID *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.hotel_channel_id}
                  onChange={(e) => setEditForm({ ...editForm, hotel_channel_id: e.target.value })}
                  placeholder="e.g. MMT-10023-DEL"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedChannel(null)}
                  style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#2563eb', color: '#ffffff', fontWeight: '700', cursor: 'pointer' }}
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
