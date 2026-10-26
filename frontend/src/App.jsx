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

  React.useEffect(() => {
    if (user && !user.is_platform_admin) {
      if (user.assigned_role) {
        if (user.assigned_role.slug === 'front-desk') {
          setCurrentTab('front_office');
        } else if (user.assigned_role.slug === 'head-chef') {
          setCurrentTab('kitchen');
        } else if (user.assigned_role.slug === 'restaurant-cashier') {
          setCurrentTab('restaurant');
        } else if (user.assigned_role.slug === 'storekeeper') {
          setCurrentTab('store');
        }
      } else if (currentHotel?.id === 'ALL') {
        setCurrentTab('portfolio_overview');
      } else {
        setCurrentTab('dashboard');
      }
    } else if (user?.is_platform_admin) {
      setCurrentTab('overview');
    }
  }, [user?.id, currentHotel?.id]);

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

  const isSuperAdmin = user?.is_platform_admin;
  const isStaff = !!user?.assigned_role && !user?.is_org_owner;

  // Route protection: Staff should never access owner tabs
  React.useEffect(() => {
    if (isStaff && ['dashboard', 'portfolio_overview', 'staff', 'overview'].includes(currentTab)) {
      const roleAllowed = {
        'head-chef': 'kitchen',
        'front-desk': 'front_office',
        'restaurant-cashier': 'restaurant',
        'storekeeper': 'store',
      };
      setCurrentTab(roleAllowed[user.assigned_role.slug] || 'front_office');
    }
  }, [isStaff, currentTab, user?.assigned_role]);

  const getPageTitle = () => {
    if (isSuperAdmin) {
      switch (currentTab) {
        case 'overview': return 'Platform Command Center';
        case 'organizations': return 'Hotel Owners & Organizations';
        case 'hotels': return 'Hotel Properties Directory';
        case 'subscriptions': return 'Module Subscriptions & Entitlement Control';
        default: return 'Platform Administration';
      }
    } else if (isStaff) {
      switch (currentTab) {
        case 'front_office': return 'Front Office Operations Desk';
        case 'rooms': return 'Rooms Management & Rack Grid';
        case 'restaurant': return 'Restaurant & Dining POS';
        case 'kitchen': return 'Kitchen Display System (KOT)';
        case 'store': return 'Store & Inventory Management';
        case 'purchase': return 'Purchase Orders & Vendors';
        default: return user.assigned_role.name;
      }
    } else {
      if (currentHotel?.id === 'ALL') {
        switch (currentTab) {
          case 'staff': return 'Staff & Access Credentials';
          case 'properties': return 'Group Properties Performance';
          default: return `${user?.organization?.name || 'Group'} • Consolidated Portfolio`;
        }
      }
      switch (currentTab) {
        case 'dashboard': return `${currentHotel?.name || 'Hotel'} Executive Dashboard`;
        case 'staff': return `${currentHotel?.name || 'Hotel'} • Staff Management`;
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
    } else if (isStaff) {
      return `Operational Desk • Property: ${currentHotel?.name || 'Hotel'} (${currentHotel?.hotel_code || 'HTL-1001'})`;
    } else {
      if (currentHotel?.id === 'ALL') {
        return `Consolidated enterprise view aggregated across all ${user?.accessible_hotels?.length || 0} properties`;
      }
      return `Property Console • ${currentHotel?.name || 'Hotel'} (${currentHotel?.hotel_code || 'HTL-1001'})`;
    }
  };

  return (
    <div className="app-container">
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      <div className="main-content">
        <Navbar title={getPageTitle()} subtitle={getPageSubtitle()} />

        {isSuperAdmin ? (
          <SuperAdminDashboard activeTab={currentTab} onNavigateTab={setCurrentTab} />
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
