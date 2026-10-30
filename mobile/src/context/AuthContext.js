import React, { createContext, useContext, useState, useEffect } from 'react';
import Storage from '../utils/storage';
import { api } from '../api/client';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [currentHotel, setCurrentHotel] = useState(null);
  const [activeModules, setActiveModules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredSession();
  }, []);

  const loadStoredSession = async () => {
    try {
      const storedToken = await Storage.getItem('@grandstay_token');
      const storedUser = await Storage.getItem('@grandstay_user');
      const storedHotel = await Storage.getItem('@grandstay_hotel');

      if (storedToken && storedUser) {
        setToken(storedToken);
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);

        if (storedHotel) {
          const parsedHotel = JSON.parse(storedHotel);
          setCurrentHotel(parsedHotel);
          computeActiveModules(parsedHotel);
        } else if (parsedUser.accessible_hotels?.length > 0) {
          const firstHotel = parsedUser.accessible_hotels.find(h => h.hotel_code === 'HTL-1002') || parsedUser.accessible_hotels[0];
          setCurrentHotel(firstHotel);
          await Storage.setItem('@grandstay_hotel', JSON.stringify(firstHotel));
          await Storage.setItem('@grandstay_hotel_id', firstHotel.id);
          computeActiveModules(firstHotel);
        }
      }
    } catch (e) {
      console.warn('Failed to load stored session', e);
    } finally {
      setIsLoading(false);
    }
  };

  const computeActiveModules = (hotel) => {
    if (!hotel || hotel.id === 'ALL') {
      setActiveModules(['front_office', 'rooms', 'restaurant', 'kitchen', 'store', 'purchase']);
      return;
    }
    const modules = hotel.subscriptions
      ?.filter((s) => s.is_active && (!s.expires_at || new Date(s.expires_at) > new Date()))
      ?.map((s) => s.module?.code || s.module_code)
      .filter(Boolean) || [];

    // Fallback if subscriptions array not directly present
    if (modules.length === 0 && hotel.active_modules) {
      setActiveModules(hotel.active_modules);
    } else {
      setActiveModules(modules);
    }
  };

  const login = async (email, password) => {
    const res = await api.login(email, password);
    const receivedToken = res.token || res.data?.token || res.access_token;
    const receivedUser = res.user || res.data?.user;

    setToken(receivedToken);
    setUser(receivedUser);

    await Storage.setItem('@grandstay_token', receivedToken);
    await Storage.setItem('@grandstay_user', JSON.stringify(receivedUser));

    // Choose default hotel (prefer HTL-1002 Apex Sea Breeze Resort if present for live operations)
    let defaultHotel = null;
    if (receivedUser.accessible_hotels && receivedUser.accessible_hotels.length > 0) {
      defaultHotel = receivedUser.accessible_hotels.find(h => h.hotel_code === 'HTL-1002') || receivedUser.accessible_hotels[0];
    } else if (receivedUser.hotel) {
      defaultHotel = receivedUser.hotel;
    }

    if (defaultHotel) {
      setCurrentHotel(defaultHotel);
      await Storage.setItem('@grandstay_hotel', JSON.stringify(defaultHotel));
      await Storage.setItem('@grandstay_hotel_id', defaultHotel.id);
      computeActiveModules(defaultHotel);
    }

    return res;
  };

  const selectHotel = async (hotel) => {
    setCurrentHotel(hotel);
    if (hotel === 'ALL' || hotel?.id === 'ALL') {
      await Storage.setItem('@grandstay_hotel_id', 'ALL');
      await Storage.setItem('@grandstay_hotel', JSON.stringify({ id: 'ALL', name: 'All Properties Portfolio' }));
    } else {
      await Storage.setItem('@grandstay_hotel_id', hotel.id);
      await Storage.setItem('@grandstay_hotel', JSON.stringify(hotel));
    }
    computeActiveModules(hotel);
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (e) {
      // ignore
    } finally {
      setUser(null);
      setToken(null);
      setCurrentHotel(null);
      setActiveModules([]);
      await Storage.removeItem('@grandstay_token');
      await Storage.removeItem('@grandstay_user');
      await Storage.removeItem('@grandstay_hotel');
      await Storage.removeItem('@grandstay_hotel_id');
    }
  };

  // Determine computed role
  const getRole = () => {
    if (!user) return 'guest';
    if (user.is_platform_admin) return 'super_admin';
    if (user.is_org_owner) return 'owner';
    const slug = user.assigned_role?.slug;
    if (slug === 'general-manager') return 'manager';
    if (slug === 'front-desk') return 'front_desk';
    if (slug === 'restaurant-cashier') return 'waiter';
    if (slug === 'head-chef') return 'chef';
    if (slug === 'storekeeper') return 'housekeeping'; // shares inventory / housekeeping
    return 'staff';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        currentHotel,
        activeModules,
        isLoading,
        role: getRole(),
        login,
        logout,
        selectHotel,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

