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

// Mock notifications data
export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 1,
    userId: 1,
    eventId: 1,
    type: "BOOKING_CONFIRMED",
    priority: "HIGH",
    title: "New Booking Confirmed!",
    message: "Priya & Karthik Wedding has been confirmed for June 15, 2024",
    metadata: { bookingId: "BK001", amount: 150000, customerName: "Rajesh Kumar" },
    read: false,
    status: "SENT",
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
    updatedAt: new Date().toISOString()
  },
  {
    id: 2,
    userId: 1,
    eventId: 2,
    type: "PAYMENT_SUCCESS",
    priority: "HIGH",
    title: "Payment Received",
    message: "₹35,000 received for Wedding Photography Package",
    metadata: { paymentId: "PAY001", amount: 35000, serviceName: "Wedding Photography" },
    read: false,
    status: "SENT",
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
    updatedAt: new Date().toISOString()
  },
  {
    id: 3,
    userId: 1,
    eventId: 3,
    type: "VENDOR_APPROVED",
    priority: "NORMAL",
    title: "Vendor Application Approved",
    message: "Elegant Decor Studio has been approved and is now live on the platform",
    metadata: { vendorId: "V001", vendorName: "Elegant Decor Studio" },
    read: true,
    readAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    status: "SENT",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    updatedAt: new Date().toISOString()
  },
  {
    id: 4,
    userId: 1,
    eventId: 4,
    type: "EVENT_REMINDER",
    priority: "HIGH",
    title: "Event Reminder - Tomorrow",
    message: "Rahul & Sneha Pre-Wedding is scheduled for tomorrow at 6:00 AM",
    metadata: { eventId: "E001", eventDate: "2024-05-20", time: "06:00 AM" },
    read: false,
    status: "SENT",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago
    updatedAt: new Date().toISOString()
  },
  {
    id: 5,
    userId: 1,
    eventId: 5,
    type: "BOOKING_CANCELLED",
    priority: "CRITICAL",
    title: "Booking Cancelled",
    message: "Corporate Annual Meet has been cancelled. Refund will be processed within 5-7 business days.",
    metadata: { bookingId: "BK002", refundAmount: 50000, reason: "Client request" },
    read: true,
    readAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    status: "SENT",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
    updatedAt: new Date().toISOString()
  },
  {
    id: 6,
    userId: 1,
    eventId: 6,
    type: "VENUE_APPROVED",
    priority: "NORMAL",
    title: "Venue Listing Approved",
    message: "Royal Convention Center has been approved and is now visible to customers",
    metadata: { venueId: "VN001", venueName: "Royal Convention Center" },
    read: true,
    status: "SENT",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    updatedAt: new Date().toISOString()
  },
  {
    id: 7,
    userId: 1,
    eventId: 7,
    type: "PAYMENT_FAILED",
    priority: "CRITICAL",
    title: "Payment Failed",
    message: "Payment of ₹25,000 failed for Event Videography. Please contact the customer.",
    metadata: { paymentId: "PAY002", amount: 25000, reason: "Insufficient funds" },
    read: false,
    status: "SENT",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
    updatedAt: new Date().toISOString()
  },
  {
    id: 8,
    userId: 1,
    eventId: 8,
    type: "SYSTEM_ALERT",
    priority: "LOW",
    title: "Platform Maintenance Scheduled",
    message: "Scheduled maintenance on Feb 25, 2024 from 2:00 AM to 4:00 AM IST",
    metadata: { maintenanceDate: "2024-02-25", duration: "2 hours" },
    read: true,
    status: "SENT",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 days ago
    updatedAt: new Date().toISOString()
  }
];

// Mock notification preferences
export const MOCK_NOTIFICATION_PREFERENCES: NotificationPreference[] = [
  { id: 1, userId: 1, type: "BOOKING_CONFIRMED", channel: "IN_APP", enabled: true },
  { id: 2, userId: 1, type: "BOOKING_CONFIRMED", channel: "EMAIL", enabled: true },
  { id: 3, userId: 1, type: "BOOKING_CONFIRMED", channel: "SMS", enabled: false },
  { id: 4, userId: 1, type: "PAYMENT_SUCCESS", channel: "IN_APP", enabled: true },
  { id: 5, userId: 1, type: "PAYMENT_SUCCESS", channel: "EMAIL", enabled: true },
  { id: 6, userId: 1, type: "EVENT_REMINDER", channel: "IN_APP", enabled: true },
  { id: 7, userId: 1, type: "EVENT_REMINDER", channel: "SMS", enabled: true },
  { id: 8, userId: 1, type: "VENDOR_APPROVED", channel: "IN_APP", enabled: true },
  { id: 9, userId: 1, type: "VENDOR_APPROVED", channel: "EMAIL", enabled: true },
  { id: 10, userId: 1, type: "SYSTEM_ALERT", channel: "IN_APP", enabled: true },
];

// Get notifications for a user
export const getUserNotifications = async (userId: number): Promise<Notification[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  return MOCK_NOTIFICATIONS.filter(n => n.userId === userId);
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId: number): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  // In real app, this would update the backend
  console.log(`Marked notification ${notificationId} as read`);
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async (userId: number): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  console.log(`Marked all notifications as read for user ${userId}`);
};

// Get unread count
export const getUnreadCount = async (userId: number): Promise<number> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  return MOCK_NOTIFICATIONS.filter(n => n.userId === userId && !n.read).length;
};

// Get notification preferences
export const getNotificationPreferences = async (userId: number): Promise<NotificationPreference[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return MOCK_NOTIFICATION_PREFERENCES.filter(p => p.userId === userId);
};

// Update notification preference
export const updateNotificationPreference = async (
  userId: number,
  type: NotificationType,
  channel: NotificationChannel,
  enabled: boolean
): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  console.log(`Updated preference: ${type} - ${channel} - ${enabled}`);
};

// Get notification icon based on type (returns Lucide icon name)
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

// Get notification color based on priority
export const getNotificationColor = (priority: NotificationPriority): string => {
  switch (priority) {
    case "CRITICAL":
      return "bg-red-50 border-red-200";
    case "HIGH":
      return "bg-orange-50 border-orange-200";
    case "NORMAL":
      return "bg-blue-50 border-blue-200";
    case "LOW":
      return "bg-silver-50 border-silver-200";
    default:
      return "bg-silver-50 border-silver-200";
  }
};

// Format time ago
export const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
};
