/**
 * Notification Service - Real Backend Integration
 * NO MOCK DATA - All calls go to actual backend API
 */

import api from '@/lib/api';

// Notification types matching the backend schema
export type NotificationType =
  | "BOOKING_CONFIRMED"
  | "BOOKING_CANCELLED"
  | "PAYMENT_SUCCESS"
  | "PAYMENT_FAILED"
  | "VENDOR_APPROVED"
  | "VENDOR_REJECTED"
  | "VENUE_APPROVED"
  | "VENUE_REJECTED"
  | "SERVICE_APPROVED"
  | "SERVICE_REJECTED"
  | "EVENT_REMINDER"
  | "EVENT_CANCELLED"
  | "SYSTEM_ALERT"
  | "OTHER";

export type NotificationPriority = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";

export type NotificationStatus = "PENDING" | "PROCESSING" | "SENT" | "PARTIAL" | "FAILED";

export type NotificationChannel = "IN_APP" | "EMAIL" | "SMS" | "WHATSAPP" | "PUSH";

export interface Notification {
  id: number;
  userId: number;
  eventId?: number;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  read: boolean;
  readAt?: string;
  status: NotificationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreference {
  id: number;
  userId: number;
  type: NotificationType;
  channel: NotificationChannel;
  enabled: boolean;
}

/**
 * Get all notifications for current user from backend
 */
export const getUserNotifications = async (
  page: number = 1,
  limit: number = 20
): Promise<{ notifications: Notification[]; pagination: any; unreadCount: number }> => {
  try {
    const response = await api.get('/notifications', {
      params: { page, limit }
    });
    return response.data;
  } catch (error) {
    // Don't log errors for 401 or timeout - they're expected during auth transitions
    const status = (error as any)?.response?.status;
    const code = (error as any)?.code;
    if (status !== 401 && code !== 'ECONNABORTED') {
      console.error('Failed to fetch notifications:', error);
    }
    return { notifications: [], pagination: { total: 0 }, unreadCount: 0 };
  }
};

/**
 * Mark notification as read (POST method - backend expects POST)
 */
export const markNotificationAsRead = async (notificationId: number): Promise<void> => {
  try {
    await api.post(`/notifications/${notificationId}/read`);
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    throw error;
  }
};

/**
 * Mark all notifications as read (POST method - backend expects POST)
 */
export const markAllNotificationsAsRead = async (): Promise<void> => {
  try {
    await api.post('/notifications/read-all');
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error);
    throw error;
  }
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async (): Promise<number> => {
  try {
    const response = await api.get('/notifications/unread-count');
    return response.data;
  } catch (error) {
    console.error('Failed to get unread count:', error);
    return 0;
  }
};

/**
 * Delete a notification
 */
export const deleteNotification = async (notificationId: number): Promise<void> => {
  try {
    await api.delete(`/notifications/${notificationId}`);
  } catch (error) {
    console.error('Failed to delete notification:', error);
    throw error;
  }
};

/**
 * Delete all notifications (clear all)
 */
export const deleteAllNotifications = async (): Promise<number> => {
  try {
    const response = await api.delete('/notifications');
    return response.data.deleted;
  } catch (error) {
    console.error('Failed to delete all notifications:', error);
    throw error;
  }
};

/**
 * Get notification preferences
 */
export const getNotificationPreferences = async (): Promise<NotificationPreference[]> => {
  try {
    const response = await api.get('/notifications/preferences');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch notification preferences:', error);
    return [];
  }
};

/**
 * Update notification preference
 */
export const updateNotificationPreference = async (
  type: NotificationType,
  channel: NotificationChannel,
  enabled: boolean
): Promise<NotificationPreference> => {
  try {
    const response = await api.patch('/notifications/preferences', { type, channel, enabled });
    return response.data;
  } catch (error) {
    console.error('Failed to update notification preference:', error);
    throw error;
  }
};

/**
 * Get notification icon based on type (returns Lucide icon name)
 */
export const getNotificationIconName = (type: NotificationType): string => {
  switch (type) {
    case "BOOKING_CONFIRMED":
    case "BOOKING_CANCELLED":
      return "Calendar";
    case "PAYMENT_SUCCESS":
    case "PAYMENT_FAILED":
      return "CreditCard";
    case "VENDOR_APPROVED":
    case "VENDOR_REJECTED":
      return "Store";
    case "VENUE_APPROVED":
    case "VENUE_REJECTED":
      return "Building2";
    case "SERVICE_APPROVED":
    case "SERVICE_REJECTED":
      return "CheckCircle";
    case "EVENT_REMINDER":
      return "Clock";
    case "EVENT_CANCELLED":
      return "XCircle";
    case "SYSTEM_ALERT":
      return "AlertTriangle";
    default:
      return "Bell";
  }
};

/**
 * Get notification color based on priority
 */
export const getNotificationColor = (priority: NotificationPriority): string => {
  switch (priority) {
    case "CRITICAL":
      return "text-error bg-error-bg/10";
    case "HIGH":
      return "text-warning bg-warning-bg/10";
    case "NORMAL":
      return "text-info bg-info-bg/10";
    case "LOW":
      return "text-silver-400 bg-silver-900/10";
    default:
      return "text-silver-400 bg-silver-900/10";
  }
};

/**
 * Format time ago
 */
export const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: 'numeric' });
};
