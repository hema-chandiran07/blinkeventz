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

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const [notifs, count, prefs] = await Promise.all([
        getUserNotifications(1),
        getUnreadCount(1),
        getNotificationPreferences(1)
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
      setPreferences(prefs);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

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
    await markAllNotificationsAsRead(1);
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
    await updateNotificationPreference(1, type, channel, enabled);
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
