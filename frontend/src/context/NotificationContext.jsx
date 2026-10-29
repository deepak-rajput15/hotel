import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { notificationsApi } from '../api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [banners, setBanners] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await notificationsApi.getNotifications();
      if (res.success) {
        setNotifications(res.data || []);
        setUnreadCount(res.meta?.unread_count || 0);
        setBanners(res.meta?.banners || []);
      }
    } catch (err) {
      console.error('Failed to load internal notifications:', err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Auto-refresh notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
      setBanners([]);
      setUnreadCount(0);
    }
  }, [user, fetchNotifications]);

  const markAsRead = async (id) => {
    try {
      await notificationsApi.markAsRead(id, false);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const dismissBanner = async (id) => {
    try {
      await notificationsApi.markAsRead(id, true);
      setBanners((prev) => prev.filter((b) => b.id !== id));
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_dismissed: true, is_read: true } : n))
      );
    } catch (err) {
      console.error('Failed to dismiss banner:', err);
    }
  };

  const toggleBanner = async (id) => {
    try {
      const res = await notificationsApi.toggleBanner(id);
      if (res.success) {
        fetchNotifications();
      }
    } catch (err) {
      console.error('Failed to toggle banner:', err);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await notificationsApi.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setBanners((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const createBroadcast = async (data) => {
    const res = await notificationsApi.createNotification(data);
    if (res.success) {
      await fetchNotifications();
    }
    return res;
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        banners,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        dismissBanner,
        toggleBanner,
        deleteNotification,
        createBroadcast,
        isBroadcastOpen,
        setIsBroadcastOpen,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

