import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import SuperAdminDashboard from './views/SuperAdmin/SuperAdminDashboard';
import HotelOwnerDashboard from './views/HotelOwner/HotelOwnerDashboard';
import Login from './views/Login';

function AppContent() {
  const { user, loading, currentHotel } = useAuth();
  const [currentTab, setCurrentTab] = useState('overview');

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-app)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: '500' }}>Initializing GrandStay SaaS Platform...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const isSuperAdmin = user.is_platform_admin;

  const getPageTitle = () => {
    if (isSuperAdmin) {
      switch (currentTab) {
        case 'overview': return 'Platform Command Center';
        case 'organizations': return 'Hotel Owners & Organizations';
        case 'hotels': return 'Hotel Properties Directory';
        case 'subscriptions': return 'Module Subscriptions & Entitlement Control';
        default: return 'Platform Administration';
      }
    } else {
      switch (currentTab) {
        case 'dashboard': return `${currentHotel?.name || 'Hotel'} Dashboard`;
        case 'front_office': return 'Front Office Operations';
        case 'rooms': return 'Rooms Management & Rack Grid';
        case 'restaurant': return 'Restaurant & Dining POS';
        case 'kitchen': return 'Kitchen Display System (KOT)';
        case 'store': return 'Store & Inventory Management';
        case 'purchase': return 'Purchase Orders & Vendors';
        default: return 'Hotel Operations';
      }
    }
  };

  const getPageSubtitle = () => {
    if (isSuperAdmin) {
      return 'Manage hotel owner accounts, provision properties, and toggle modular subscription access.';
    } else {
      return `Operational tenant console for property code: ${currentHotel?.hotel_code || 'HTL-1001'}`;
    }
  };

  return (
    <div className="app-container">
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      <div className="main-content">
        <Navbar title={getPageTitle()} subtitle={getPageSubtitle()} />

        {isSuperAdmin ? (
          <SuperAdminDashboard activeTab={currentTab} />
        ) : (
          <HotelOwnerDashboard activeTab={currentTab} />
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
