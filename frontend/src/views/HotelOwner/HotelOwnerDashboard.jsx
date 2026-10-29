import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { hotelApi } from '../../api';
import ConsolidatedPortfolioView from './ConsolidatedPortfolioView';
import StaffManagementTab from './StaffManagementTab';
import FrontOfficeWorkspace from '../FrontOffice/FrontOfficeWorkspace';
import StoreInventoryWorkspace from '../Store/StoreInventoryWorkspace';
import PurchaseOrdersWorkspace from '../Purchase/PurchaseOrdersWorkspace';
import ReportsWorkspace from '../Reports/ReportsWorkspace';
import RestaurantPosWorkspace from '../Restaurant/RestaurantPosWorkspace';
import KitchenDisplayWorkspace from '../Kitchen/KitchenDisplayWorkspace';
import OtaChannelManagerWorkspace from '../ChannelManager/OtaChannelManagerWorkspace';
import {
  Bed,
  ConciergeBell,
  Utensils,
  ChefHat,
  Boxes,
  ShoppingCart,
  CheckCircle2,
  Lock,
  CalendarCheck,
  TrendingUp,
  Sparkles,
  Megaphone,
  QrCode,
  Smartphone,
} from 'lucide-react';
import UpiSettingsModal from '../../components/Payments/UpiSettingsModal';

export default function HotelOwnerDashboard({ activeTab = 'dashboard' }) {
  const { user, currentHotel, activeModules, selectHotel } = useAuth();
  const { setIsBroadcastOpen } = useNotifications();
  const [moduleApiStatus, setModuleApiStatus] = useState(null);
  const [testingApi, setTestingApi] = useState(false);
  const [isUpiModalOpen, setIsUpiModalOpen] = useState(false);

  useEffect(() => {
    if (activeTab === 'restaurant') {
      testModuleBackendAccess(activeTab);
    } else {
      setModuleApiStatus(null);
    }
  }, [activeTab, currentHotel]);

  const testModuleBackendAccess = async (tab) => {
    try {
      setTestingApi(true);
      let res;
      if (tab === 'restaurant') {
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
  const isStaff = !!user?.assigned_role && !user?.is_org_owner;

  // If a role-restricted staff lands on the default tab, route them directly to their operational console
  if (isStaff && activeTab === 'dashboard') {
    if (user.assigned_role.slug === 'storekeeper') {
      return (
        <div className="page-body">
          <StoreInventoryWorkspace />
        </div>
      );
    }
    if (user.assigned_role.slug === 'restaurant-cashier') {
      return (
        <div className="page-body">
          <RestaurantPosWorkspace />
        </div>
      );
    }
    if (user.assigned_role.slug !== 'general-manager') {
      const roleAllowed = {
        'head-chef': 'kitchen',
        'front-desk': 'front_office',
        'restaurant-cashier': 'restaurant',
      };
      const defaultMod = roleAllowed[user.assigned_role.slug] || 'front_office';
      if (defaultMod === 'front_office') {
        return (
          <div className="page-body">
            <FrontOfficeWorkspace />
          </div>
        );
      }
      if (defaultMod === 'restaurant') {
        return (
          <div className="page-body">
            <RestaurantPosWorkspace />
          </div>
        );
      }
      if (defaultMod === 'kitchen') {
        return (
          <div className="page-body">
            <KitchenDisplayWorkspace />
          </div>
        );
      }
    }
  }

  // 1. Staff Management Route (Owner or Hotel Sub-Admin / General Manager for this property)
  if (activeTab === 'staff') {
    if (isStaff && user?.assigned_role?.slug !== 'general-manager') {
      return null;
    }
    return <StaffManagementTab activeHotelId={currentHotel?.id} />;
  }

  // 2. Multi-Hotel Consolidated Portfolio Route (Owner only)
  if (currentHotel?.id === 'ALL' || activeTab === 'portfolio_overview' || activeTab === 'properties') {
    if (isStaff) {
      return null;
    }
    return (
      <div className="page-body">
        <ConsolidatedPortfolioView
          organization={user?.organization}
          hotels={user?.accessible_hotels || []}
          onSelectSpecificHotel={(hotel) => selectHotel(hotel)}
        />
      </div>
    );
  }

  // 3. Operational Front Office Route & Rooms Rack
  if (activeTab === 'front_office' || activeTab === 'rooms') {
    if (!isModuleActive('front_office') && !isModuleActive('rooms')) {
      return (
        <div className="page-body">
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--error-bg)', color: 'var(--error)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Lock size={28} />
            </div>
            <h3 style={{ fontSize: '19px', fontWeight: '800', color: 'var(--t-900)' }}>
              Front Office / Rooms Module Locked
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--t-500)', maxWidth: '420px', margin: '6px auto 16px' }}>
              Property <strong>{currentHotel?.name} ({currentHotel?.hotel_code})</strong> does not have an active Front Office subscription. Subscription must be toggled by the Platform Super Admin.
            </p>
            <span className="badge badge-inactive">Status: Subscription Inactive</span>
          </div>
        </div>
      );
    }
    return (
      <div className="page-body">
        <FrontOfficeWorkspace />
      </div>
    );
  }

  // 4. Store & Inventory Management Route (Book1.xlsx Product & Stock Management)
  if (activeTab === 'store') {
    if (!isModuleActive('store')) {
      return (
        <div className="page-body">
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--error-bg)', color: 'var(--error)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Lock size={28} />
            </div>
            <h3 style={{ fontSize: '19px', fontWeight: '800', color: 'var(--t-900)' }}>
              Store & Inventory Module Locked
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--t-500)', maxWidth: '420px', margin: '6px auto 16px' }}>
              Property <strong>{currentHotel?.name} ({currentHotel?.hotel_code})</strong> does not have an active Store / Inventory subscription. Subscription must be toggled by the Platform Super Admin.
            </p>
            <span className="badge badge-inactive">Status: Subscription Inactive</span>
          </div>
        </div>
      );
    }
    return (
      <div className="page-body">
        <StoreInventoryWorkspace />
      </div>
    );
  }

  // 5. Purchase Orders & GRN Procurement Route
  if (activeTab === 'purchase') {
    if (!isModuleActive('purchase')) {
      return (
        <div className="page-body">
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--error-bg)', color: 'var(--error)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Lock size={28} />
            </div>
            <h3 style={{ fontSize: '19px', fontWeight: '800', color: 'var(--t-900)' }}>
              Purchase Orders & GRN Module Locked
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--t-500)', maxWidth: '420px', margin: '6px auto 16px' }}>
              Property <strong>{currentHotel?.name} ({currentHotel?.hotel_code})</strong> does not have an active Purchase Orders subscription. Subscription must be toggled by the Platform Super Admin.
            </p>
            <span className="badge badge-inactive">Status: Subscription Inactive</span>
          </div>
        </div>
      );
    }
    return (
      <div className="page-body">
        <PurchaseOrdersWorkspace />
      </div>
    );
  }

  // 5. Reports & Night Audit Route (Available to Owner & General Manager)
  if (activeTab === 'reports') {
    return (
      <div className="page-body">
        <ReportsWorkspace />
      </div>
    );
  }

  // 6. Restaurant & Dining POS Route
  if (activeTab === 'restaurant') {
    if (!isModuleActive('restaurant')) {
      return (
        <div className="page-body">
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--error-bg)', color: 'var(--error)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Lock size={28} />
            </div>
            <h3 style={{ fontSize: '19px', fontWeight: '800', color: 'var(--t-900)' }}>
              Restaurant & POS Module Locked
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--t-500)', maxWidth: '420px', margin: '6px auto 16px' }}>
              Property <strong>{currentHotel?.name} ({currentHotel?.hotel_code})</strong> does not have an active Restaurant subscription. Subscription must be toggled by the Platform Super Admin.
            </p>
            <span className="badge badge-inactive">Status: Subscription Inactive</span>
          </div>
        </div>
      );
    }
    return (
      <div className="page-body">
        <RestaurantPosWorkspace />
      </div>
    );
  }

  // 7. Kitchen Display System (KDS / KOT) Route
  if (activeTab === 'kitchen') {
    if (!isModuleActive('kitchen')) {
      return (
        <div className="page-body">
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--error-bg)', color: 'var(--error)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Lock size={28} />
            </div>
            <h3 style={{ fontSize: '19px', fontWeight: '800', color: 'var(--t-900)' }}>
              Kitchen (KOT) Module Locked
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--t-500)', maxWidth: '420px', margin: '6px auto 16px' }}>
              Property <strong>{currentHotel?.name} ({currentHotel?.hotel_code})</strong> does not have an active Kitchen subscription. Subscription must be toggled by the Platform Super Admin.
            </p>
            <span className="badge badge-inactive">Status: Subscription Inactive</span>
          </div>
        </div>
      );
    }
    return (
      <div className="page-body">
        <KitchenDisplayWorkspace />
      </div>
    );
  }

  // 8. OTA Channel Manager & 2-Way Sync Engine Route
  if (activeTab === 'channel_manager' || activeTab === 'ota') {
    return (
      <div className="page-body">
        <OtaChannelManagerWorkspace />
      </div>
    );
  }

  return (
    <div className="page-body">
      {/* Hotel Identity Card (Clean Hygaar-IQ style) */}
      <div
        className="card"
        style={{
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          borderLeft: '4px solid var(--brand)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-brand">{currentHotel?.hotel_code || 'HTL-1001'}</span>
            <span style={{ fontSize: '12.5px', color: 'var(--t-500)' }}>
              Organization: <strong style={{ color: 'var(--t-700)' }}>{user?.organization?.name || 'Apex Hospitality Group'}</strong>
            </span>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--t-900)' }}>
            {currentHotel?.name || 'Hotel Property'}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--t-600)', marginTop: '2px' }}>
            {currentHotel?.city || 'India'} &bull; Currency: <strong>INR</strong> &bull; Status: <strong style={{ color: 'var(--success)' }}>ACTIVE</strong>
          </p>
        </div>

        {/* Subscribed modules & Broadcast Action: Owner view only */}
        {!isStaff && (
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setIsUpiModalOpen(true)}
                className="btn btn-outline btn-sm"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: '700',
                  background: '#ffffff',
                  borderColor: '#cbd5e1',
                  color: 'var(--brand)',
                }}
                title="Configure Hotel UPI ID and Payment QR Code"
              >
                <QrCode size={13} />
                <span>UPI & QR Settings</span>
              </button>

              <button
                onClick={() => setIsBroadcastOpen(true)}
                className="btn btn-primary btn-sm"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: '700',
                }}
                title="Broadcast internal notification or reminder to staff"
              >
                <Megaphone size={13} />
                <span>Broadcast Staff Reminder</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'flex-end' }}>
              {activeModules.map((modCode) => (
                <span key={modCode} className="badge badge-success" style={{ fontSize: '11px', padding: '3px 8px' }}>
                  <CheckCircle2 size={12} /> {modCode.replace('_', ' ').toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* View: Property Overview */}
      {activeTab === 'dashboard' && (
        <div>
          {/* Operational Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
            {!isStaff && (
              <MetricCard
                label="Active Subscriptions"
                value={`${activeModules.length} / 6`}
                subtext="Modules Enabled by SaaS Admin"
                icon={Sparkles}
                color="var(--brand)"
              />
            )}
            <MetricCard
              label="Room Rack Capacity"
              value="48 Rooms"
              subtext="82% Occupancy Rate Today"
              icon={Bed}
              color="var(--success)"
            />
            <MetricCard
              label="Expected Arrivals"
              value="14 Guests"
              subtext="Front Desk Check-in Queue"
              icon={CalendarCheck}
              color="#0891b2"
            />
            <MetricCard
              label="Today's Revenue"
              value="₹ 1,42,800"
              subtext="Rooms + F&B POS Invoices"
              icon={TrendingUp}
              color="#9333ea"
            />
          </div>

          {/* Module Entitlement Status Grid (Hotel Owner Admin Only) */}
          {!isStaff && (
            <div className="card">
              <h3 style={{ fontSize: '16.5px', fontWeight: '700', color: 'var(--t-900)', marginBottom: '4px' }}>
                Your Hotel's Module Entitlements
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--t-600)', marginBottom: '18px' }}>
                Only modules enabled by the platform company for <strong>{currentHotel?.name}</strong> can be accessed. Access is strictly verified on every backend API request.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
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
          )}
        </div>
      )}

      {/* View: Operational Module Interactive Screens */}
      {activeTab !== 'dashboard' && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--t-900)', textTransform: 'capitalize' }}>
                {activeTab.replace('_', ' ')} Operational Console
              </h3>
              <p style={{ fontSize: '12.5px', color: 'var(--t-500)' }}>
                Property Context: <strong>{currentHotel?.name} ({currentHotel?.hotel_code})</strong>
              </p>
            </div>

            <span className={`badge ${isModuleActive(activeTab) ? 'badge-success' : 'badge-inactive'}`}>
              {isModuleActive(activeTab) ? 'Active Subscription' : 'Not Subscribed'}
            </span>
          </div>

          {/* Backend Verification Status Banner */}
          {moduleApiStatus && (
            <div
              style={{
                padding: '14px 18px',
                borderRadius: 'var(--r-card)',
                marginBottom: '20px',
                background: moduleApiStatus.success ? 'var(--success-bg)' : 'var(--error-bg)',
                border: `1px solid ${moduleApiStatus.success ? 'var(--success-border)' : 'var(--error-border)'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              {moduleApiStatus.success ? (
                <CheckCircle2 size={18} color="var(--success)" />
              ) : (
                <Lock size={18} color="var(--error)" />
              )}
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: moduleApiStatus.success ? 'var(--success)' : 'var(--error)' }}>
                  {moduleApiStatus.success ? 'Backend Security Guard: Verified (200 OK)' : `Backend Security Guard: Blocked (${moduleApiStatus.errorCode || '403 Forbidden'})`}
                </div>
                <div style={{ fontSize: '12px', color: moduleApiStatus.success ? '#065f46' : '#991b1b', marginTop: '1px' }}>
                  {moduleApiStatus.success ? moduleApiStatus.data?.message : moduleApiStatus.error}
                </div>
              </div>
            </div>
          )}

          {/* Module Content Based on Subscription */}
          {isModuleActive(activeTab) ? (
            <div>
              <div style={{ background: 'var(--surface-sub)', padding: '20px', borderRadius: 'var(--r-card)', border: '1px solid var(--border-sub)' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--t-900)', marginBottom: '14px' }}>
                  Live Operational Workspace
                </h4>

                {activeTab === 'front_office' && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '18px' }}>
                      <MiniRack room="101" type="Deluxe Suite" status="OCCUPIED" guest="A. Roy" />
                      <MiniRack room="102" type="Deluxe Suite" status="CLEAN" guest="Available" />
                      <MiniRack room="103" type="Standard King" status="DIRTY" guest="Checking out" />
                      <MiniRack room="104" type="Executive Room" status="OCCUPIED" guest="P. Mehra" />
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--t-500)' }}>
                      Front Office Desk is online. Connected to PostgreSQL tenant database scope.
                    </div>
                  </div>
                )}

                {activeTab === 'restaurant' && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '18px' }}>
                      <MiniTable table="T-01" covers="4/4" bill="₹ 2,450" status="BUSY" />
                      <MiniTable table="T-02" covers="0/2" bill="--" status="VACANT" />
                      <MiniTable table="T-03" covers="2/4" bill="₹ 1,120" status="KOT SENT" />
                      <MiniTable table="T-04" covers="6/8" bill="₹ 5,890" status="BILL PRINTED" />
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--t-500)' }}>
                      Restaurant POS terminal active. Real-time billing enabled for this property.
                    </div>
                  </div>
                )}

                {activeTab !== 'front_office' && activeTab !== 'restaurant' && (
                  <div style={{ padding: '36px', textAlign: 'center', color: 'var(--t-500)' }}>
                    <p style={{ fontSize: '14px', color: 'var(--t-900)', fontWeight: '600' }}>
                      {activeTab.replace('_', ' ').toUpperCase()} Console Ready
                    </p>
                    <p style={{ fontSize: '12px', marginTop: '4px' }}>
                      Subscribed under {currentHotel?.name}. Ready for Phase 3 operational logic integration.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ padding: '50px 20px', textAlign: 'center', background: 'var(--surface-sub)', borderRadius: 'var(--r-card)' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'var(--error-bg)', border: '1px solid var(--error-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', color: 'var(--error)' }}>
                <Lock size={22} />
              </div>
              <h4 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--t-900)' }}>
                Module Not Subscribed
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--t-600)', maxWidth: '460px', margin: '6px auto 18px' }}>
                This property (<strong>{currentHotel?.hotel_code}</strong>) does not have an active subscription for the <strong>{activeTab.replace('_', ' ')}</strong> module.
              </p>
              <div style={{ fontSize: '12px', color: 'var(--t-500)' }}>
                Switch to the <strong>Super Admin</strong> account from the top bar to enable this module with one click!
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hotel UPI & QR Settings Modal */}
      <UpiSettingsModal
        isOpen={isUpiModalOpen}
        onClose={() => setIsUpiModalOpen(false)}
        hotelId={currentHotel?.id}
        onSettingsUpdated={() => {
          setIsUpiModalOpen(false);
        }}
      />
    </div>
  );
}

function ModuleStatusCard({ title, icon: Icon, description, active }) {
  return (
    <div
      style={{
        background: active ? 'var(--white)' : 'var(--surface-sub)',
        border: '1px solid',
        borderColor: active ? 'var(--border)' : 'var(--border-sub)',
        borderRadius: 'var(--r-card)',
        padding: '16px',
        boxShadow: active ? 'var(--shadow-xs)' : 'none',
        opacity: active ? 1 : 0.65,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: 'var(--r-sm)', background: active ? 'var(--brand-50)' : 'var(--tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: active ? 'var(--brand)' : 'var(--t-500)' }}>
            <Icon size={16} />
          </div>
          <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--t-900)' }}>{title}</span>
        </div>
        <span className={`badge ${active ? 'badge-success' : 'badge-inactive'}`}>
          {active ? 'Subscribed' : 'Locked'}
        </span>
      </div>
      <p style={{ fontSize: '12px', color: 'var(--t-600)', lineHeight: 1.4 }}>
        {description}
      </p>
    </div>
  );
}

function MetricCard({ label, value, subtext, icon: Icon, color }) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '18px' }}>
      <div
        style={{
          width: '42px',
          height: '42px',
          borderRadius: 'var(--r-card)',
          background: 'var(--surface-sub)',
          border: '1px solid var(--border-sub)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: color,
        }}
      >
        <Icon size={20} />
      </div>
      <div>
        <div style={{ fontSize: '11.5px', fontWeight: '600', color: 'var(--t-500)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
          {label}
        </div>
        <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--t-900)', marginTop: '1px' }}>
          {value}
        </div>
        <div style={{ fontSize: '11.5px', color: 'var(--t-600)', marginTop: '1px' }}>
          {subtext}
        </div>
      </div>
    </div>
  );
}

function MiniRack({ room, type, status, guest }) {
  const isOccupied = status === 'OCCUPIED';
  return (
    <div style={{ background: 'var(--white)', padding: '12px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border-sub)', boxShadow: 'var(--shadow-xs)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <strong style={{ fontSize: '13.5px', color: 'var(--t-900)' }}>Room {room}</strong>
        <span className={`badge ${isOccupied ? 'badge-brand' : 'badge-success'}`} style={{ fontSize: '9.5px', padding: '1px 6px' }}>
          {status}
        </span>
      </div>
      <div style={{ fontSize: '11px', color: 'var(--t-500)' }}>{type}</div>
      <div style={{ fontSize: '11.5px', color: 'var(--t-700)', marginTop: '3px' }}>{guest}</div>
    </div>
  );
}

function MiniTable({ table, covers, bill, status }) {
  return (
    <div style={{ background: 'var(--white)', padding: '12px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border-sub)', boxShadow: 'var(--shadow-xs)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <strong style={{ fontSize: '13.5px', color: 'var(--t-900)' }}>{table}</strong>
        <span className="badge badge-success" style={{ fontSize: '9.5px', padding: '1px 6px' }}>
          {status}
        </span>
      </div>
      <div style={{ fontSize: '11px', color: 'var(--t-500)' }}>Covers: {covers}</div>
      <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--t-900)', marginTop: '3px' }}>{bill}</div>
    </div>
  );
}
