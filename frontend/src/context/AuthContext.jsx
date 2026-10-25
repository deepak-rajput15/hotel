import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi, hotelApi } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('hotel_saas_token'));
  const [loading, setLoading] = useState(true);
  const [currentHotel, setCurrentHotel] = useState(null);
  const [activeModules, setActiveModules] = useState([]);

  useEffect(() => {
    if (token) {
      loadProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await authApi.getMe();
      if (res.success) {
        setUser(res.user);
        
        // Resolve initial hotel
        const storedHotelId = localStorage.getItem('hotel_saas_current_hotel_id');
        const accessible = res.user.accessible_hotels || [];

        if (storedHotelId === 'ALL' || (!storedHotelId && res.user.is_org_owner && accessible.length > 1)) {
          selectHotel('ALL');
        } else {
          let selected = accessible.find(h => h.id === storedHotelId || h.hotel_code === storedHotelId);
          if (!selected && accessible.length > 0) {
            selected = accessible[0];
          }
          if (selected) {
            selectHotel(selected);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const PORTFOLIO_HOTEL = {
    id: 'ALL',
    hotel_code: 'PORTFOLIO',
    name: 'All Properties (Consolidated Overview)',
    city: 'Multi-Location',
    isPortfolio: true,
  };

  const selectHotel = async (hotel) => {
    if (hotel === 'ALL' || hotel?.id === 'ALL') {
      setCurrentHotel(PORTFOLIO_HOTEL);
      localStorage.setItem('hotel_saas_current_hotel_id', 'ALL');
      setActiveModules([]);
      return;
    }

    setCurrentHotel(hotel);
    localStorage.setItem('hotel_saas_current_hotel_id', hotel.id);

    try {
      const res = await hotelApi.getActiveModules(hotel.id);
      if (res.success) {
        setActiveModules(res.active_modules || []);
      }
    } catch (err) {
      console.warn('Could not fetch active modules for hotel:', err);
    }
  };

  const login = async (email, password) => {
    const res = await authApi.login(email, password);
    if (res.success && res.token) {
      localStorage.setItem('hotel_saas_token', res.token);
      setToken(res.token);
      setUser(res.user);

      const accessible = res.user.accessible_hotels || [];
      if (res.user.is_org_owner && accessible.length > 1) {
        await selectHotel('ALL');
      } else if (accessible.length > 0) {
        await selectHotel(accessible[0]);
      }
      return res;
    }
    throw new Error(res.message || 'Login failed');
  };

  const logout = () => {
    localStorage.removeItem('hotel_saas_token');
    localStorage.removeItem('hotel_saas_current_hotel_id');
    setToken(null);
    setUser(null);
    setCurrentHotel(null);
    setActiveModules([]);
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        currentHotel,
        activeModules,
        login,
        logout,
        selectHotel,
        refreshProfile: loadProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
