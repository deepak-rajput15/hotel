import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { hotelApi } from '../../api';
import {
  Bed,
  ConciergeBell,
  Utensils,
  ChefHat,
  Boxes,
  ShoppingCart,
  CheckCircle2,
  Lock,
  AlertTriangle,
  Users,
  CalendarCheck,
  TrendingUp,
  Sparkles,
} from 'lucide-react';

export default function HotelOwnerDashboard({ activeTab = 'dashboard' }) {
  const { user, currentHotel, activeModules } = useAuth();
  const [moduleApiStatus, setModuleApiStatus] = useState(null);
  const [testingApi, setTestingApi] = useState(false);

  useEffect(() => {
    if (activeTab === 'front_office' || activeTab === 'restaurant') {
      testModuleBackendAccess(activeTab);
    } else {
      setModuleApiStatus(null);
    }
  }, [activeTab, currentHotel]);

  const testModuleBackendAccess = async (tab) => {
    try {
      setTestingApi(true);
      let res;
      if (tab === 'front_office') {
        res = await hotelApi.testFrontOffice();
      } else if (tab === 'restaurant') {
        res = await hotelApi.testRestaurant();
      }
      setModuleApiStatus({ success: true, data: res });
    } catch (err) {
      setModuleApiStatus({
        success: false,
        error: err.data?.message || err.message,
        errorCode: err.data?.error_code,
      });
    } finally {
      setTestingApi(false);
    }
  };

  const isModuleActive = (code) => activeModules.includes(code);

  return (
    <div className="page-body">
      {/* Hotel Identity Card */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(15, 23, 42, 0.95) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span className="badge badge-primary">{currentHotel?.hotel_code || 'HTL-1001'}</span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Organization: <strong style={{ color: 'white' }}>{user?.organization?.name || 'Apex Hospitality Group'}</strong>
            </span>
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'white' }}>
            {currentHotel?.name || 'Hotel Property'}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {currentHotel?.city || 'India'} &bull; Currency: <strong>INR</strong> &bull; Status: <strong style={{ color: 'var(--emerald)' }}>ACTIVE</strong>
          </p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '6px' }}>
            Subscribed Operational Modules
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'flex-end' }}>
            {activeModules.map((modCode) => (
              <span key={modCode} className="badge badge-active" style={{ fontSize: '11px', padding: '3px 8px' }}>
                <CheckCircle2 size={12} /> {modCode.replace('_', ' ').toUpperCase()}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* View: Property Overview */}
      {activeTab === 'dashboard' && (
        <div>
          {/* Operational Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            <MetricCard
              label="Active Subscriptions"
              value={`${activeModules.length} / 6`}
              subtext="Modules Enabled by SaaS Admin"
              icon={Sparkles}
              color="var(--primary)"
            />
            <MetricCard
              label="Room Rack Capacity"
              value="48 Rooms"
              subtext="82% Occupancy Rate Today"
              icon={Bed}
              color="var(--emerald)"
            />
            <MetricCard
              label="Expected Arrivals"
              value="14 Guests"
              subtext="Front Desk Check-in Queue"
              icon={CalendarCheck}
              color="var(--cyan)"
            />
            <MetricCard
              label="Today's Revenue"
              value="₹ 1,42,800"
              subtext="Rooms + F&B POS Invoices"
              icon={TrendingUp}
              color="#a855f7"
            />
          </div>

          {/* Module Entitlement Status Grid */}
          <div className="card">
            <h3 style={{ fontSize: '17px', fontWeight: '800', color: 'white', marginBottom: '8px' }}>
              Your Hotel's Module Entitlements
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Only modules enabled by the platform company for <strong>{currentHotel?.name}</strong> can be accessed. Access is strictly verified on every backend API request.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <ModuleStatusCard
                code="front_office"
                title="Front Office"
                icon={ConciergeBell}
                description="Guest reservations, room assignment, walk-ins, and guest ledger."
                active={isModuleActive('front_office')}
              />
              <ModuleStatusCard
                code="rooms"
                title="Rooms & Rack"
                icon={Bed}
                description="Visual room rack, housekeeping status, room tariffs, and floor maps."
                active={isModuleActive('rooms')}
              />
              <ModuleStatusCard
                code="restaurant"
                title="Restaurant & POS"
                icon={Utensils}
                description="Dine-in table orders, POS billing, food menu, and takeaway invoicing."
                active={isModuleActive('restaurant')}
              />
              <ModuleStatusCard
                code="kitchen"
                title="Kitchen (KOT)"
                icon={ChefHat}
                description="Realtime Kitchen Order Tickets display, chef queues, and food preparation."
                active={isModuleActive('kitchen')}
              />
              <ModuleStatusCard
                code="store"
                title="Store / Inventory"
                icon={Boxes}
                description="Stock tracking, item requisitions, low stock alerts, and physical audits."
                active={isModuleActive('store')}
              />
              <ModuleStatusCard
                code="purchase"
                title="Purchase & Orders"
                icon={ShoppingCart}
                description="Vendor management, Purchase Orders (PO), and Goods Receipt Notes (GRN)."
                active={isModuleActive('purchase')}
              />
            </div>
          </div>
        </div>
      )}

      {/* View: Operational Module Interactive Screens */}
      {activeTab !== 'dashboard' && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '19px', fontWeight: '800', color: 'white', textTransform: 'capitalize' }}>
                {activeTab.replace('_', ' ')} Operational Console
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Property Context: <strong>{currentHotel?.name} ({currentHotel?.hotel_code})</strong>
              </p>
            </div>

            <span className={`badge ${isModuleActive(activeTab) ? 'badge-active' : 'badge-inactive'}`}>
              {isModuleActive(activeTab) ? 'Active Subscription' : 'Not Subscribed'}
            </span>
          </div>

          {/* Backend Verification Status Banner */}
          {moduleApiStatus && (
            <div
              style={{
                padding: '16px 20px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '24px',
                background: moduleApiStatus.success ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.08)',
                border: `1px solid ${moduleApiStatus.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              {moduleApiStatus.success ? (
                <CheckCircle2 size={20} color="var(--emerald)" />
              ) : (
                <Lock size={20} color="var(--rose)" />
              )}
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: '700', color: moduleApiStatus.success ? 'var(--emerald)' : 'var(--rose)' }}>
                  {moduleApiStatus.success ? 'Backend Security Guard: Verified (200 OK)' : `Backend Security Guard: Blocked (${moduleApiStatus.errorCode || '403 Forbidden'})`}
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {moduleApiStatus.success ? moduleApiStatus.data?.message : moduleApiStatus.error}
                </div>
              </div>
            </div>
          )}

          {/* Module Content Based on Subscription */}
          {isModuleActive(activeTab) ? (
            <div>
              {/* Active Operational Mock Screen */}
              <div style={{ background: 'var(--bg-surface)', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'white', marginBottom: '14px' }}>
                  Live Operational Workspace
                </h4>

                {activeTab === 'front_office' && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
                      <MiniRack room="101" type="Deluxe Suite" status="OCCUPIED" guest="A. Roy" />
                      <MiniRack room="102" type="Deluxe Suite" status="CLEAN" guest="Available" />
                      <MiniRack room="103" type="Standard King" status="DIRTY" guest="Checking out" />
                      <MiniRack room="104" type="Executive Room" status="OCCUPIED" guest="P. Mehra" />
                    </div>
                    <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                      Front Office Desk is online. Connected to PostgreSQL tenant database scope.
                    </div>
                  </div>
                )}

                {activeTab === 'restaurant' && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
                      <MiniTable table="T-01" covers="4/4" bill="₹ 2,450" status="BUSY" />
                      <MiniTable table="T-02" covers="0/2" bill="--" status="VACANT" />
                      <MiniTable table="T-03" covers="2/4" bill="₹ 1,120" status="KOT SENT" />
                      <MiniTable table="T-04" covers="6/8" bill="₹ 5,890" status="BILL PRINTED" />
                    </div>
                    <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                      Restaurant POS terminal active. Real-time billing enabled for this property.
                    </div>
                  </div>
                )}

                {activeTab !== 'front_office' && activeTab !== 'restaurant' && (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <p style={{ fontSize: '14px', color: 'white', fontWeight: '600' }}>
                      {activeTab.replace('_', ' ').toUpperCase()} Console Ready
                    </p>
                    <p style={{ fontSize: '12.5px', marginTop: '4px' }}>
                      Subscribed under {currentHotel?.name}. Ready for Phase 3 operational logic integration.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ padding: '60px 20px', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--rose)' }}>
                <Lock size={26} />
              </div>
              <h4 style={{ fontSize: '18px', fontWeight: '800', color: 'white' }}>
                Module Not Subscribed
              </h4>
              <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', maxWidth: '460px', margin: '8px auto 20px' }}>
                This property (<strong>{currentHotel?.hotel_code}</strong>) does not have an active subscription for the <strong>{activeTab.replace('_', ' ')}</strong> module.
              </p>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Switch to the <strong>Super Admin</strong> account from the top bar to enable this module with one click!
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ModuleStatusCard({ title, icon: Icon, description, active }) {
  return (
    <div
      style={{
        background: active ? 'rgba(99, 102, 241, 0.04)' : 'var(--bg-surface)',
        border: '1px solid',
        borderColor: active ? 'rgba(99, 102, 241, 0.3)' : 'var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '18px',
        opacity: active ? 1 : 0.6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: active ? 'var(--primary)' : 'var(--text-muted)' }}>
            <Icon size={18} />
          </div>
          <span style={{ fontSize: '14.5px', fontWeight: '700', color: 'white' }}>{title}</span>
        </div>
        <span className={`badge ${active ? 'badge-active' : 'badge-inactive'}`}>
          {active ? 'Subscribed' : 'Locked'}
        </span>
      </div>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
        {description}
      </p>
    </div>
  );
}

function MetricCard({ label, value, subtext, icon: Icon, color }) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div
        style={{
          width: '46px',
          height: '46px',
          borderRadius: 'var(--radius-md)',
          background: `rgba(255, 255, 255, 0.04)`,
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: color,
        }}
      >
        <Icon size={22} />
      </div>
      <div>
        <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          {label}
        </div>
        <div style={{ fontSize: '22px', fontWeight: '800', color: 'white', marginTop: '2px' }}>
          {value}
        </div>
        <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          {subtext}
        </div>
      </div>
    </div>
  );
}

function MiniRack({ room, type, status, guest }) {
  const isOccupied = status === 'OCCUPIED';
  return (
    <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <strong style={{ fontSize: '14px', color: 'white' }}>Room {room}</strong>
        <span className={`badge ${isOccupied ? 'badge-primary' : 'badge-active'}`} style={{ fontSize: '9px', padding: '1px 6px' }}>
          {status}
        </span>
      </div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{type}</div>
      <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>{guest}</div>
    </div>
  );
}

function MiniTable({ table, covers, bill, status }) {
  return (
    <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <strong style={{ fontSize: '14px', color: 'white' }}>{table}</strong>
        <span className="badge badge-active" style={{ fontSize: '9px', padding: '1px 6px' }}>
          {status}
        </span>
      </div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Covers: {covers}</div>
      <div style={{ fontSize: '12px', fontWeight: '700', color: 'white', marginTop: '4px' }}>{bill}</div>
    </div>
  );
}
