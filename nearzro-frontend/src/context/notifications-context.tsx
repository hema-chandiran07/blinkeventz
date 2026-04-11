"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  Notification,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadCount,
  getNotificationPreferences,
  updateNotificationPreference,
  NotificationPreference,
  NotificationType,
  NotificationChannel
} from "@/services/notifications";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  preferences: NotificationPreference[];
  refreshNotifications: () => Promise<void>;
  markAsRead: (notificationId: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  updatePreference: (
    type: NotificationType,
    channel: NotificationChannel,
    enabled: boolean
  ) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const { isAuthenticated } = useAuth();

  const loadNotifications = useCallback(async () => {
    // Skip if not authenticated
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [notifsData, count, prefs] = await Promise.all([
        getUserNotifications(),
        getUnreadCount(),
        getNotificationPreferences()
      ]);
      setNotifications(notifsData.notifications || []);
      setUnreadCount(notifsData.unreadCount || count);
      setPreferences(prefs);
    } catch (error: any) {
      // Silently handle 401 errors (expected during auth transitions)
      if (error?.response?.status !== 401) {
        console.error("Failed to load notifications:", error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // Only load notifications if authenticated
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      setPreferences([]);
      setIsLoading(false);
      return;
    }

    loadNotifications();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications, isAuthenticated]);

  const refreshNotifications = async () => {
    await loadNotifications();
    toast.success("Notifications refreshed");
  };

  const markAsRead = async (notificationId: number) => {
    await markNotificationAsRead(notificationId);
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, read: true, readAt: new Date().toISOString() } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    await markAllNotificationsAsRead();
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true, readAt: new Date().toISOString() }))
    );
    setUnreadCount(0);
    toast.success("All notifications marked as read");
  };

  const updatePreference = async (
    type: NotificationType,
    channel: NotificationChannel,
    enabled: boolean
  ) => {
    await updateNotificationPreference(type, channel, enabled);
    setPreferences(prev =>
      prev.map(p =>
        p.type === type && p.channel === channel ? { ...p, enabled } : p
      )
    );
    toast.success("Notification preference updated");
  };

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        preferences,
        refreshNotifications,
        markAsRead,
        markAllAsRead,
        updatePreference
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationsProvider");
  }
  return context;
}
