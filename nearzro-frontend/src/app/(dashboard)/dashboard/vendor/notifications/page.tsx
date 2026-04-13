"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, CheckCheck, Trash2, Eye, RefreshCw, Loader2, Calendar, DollarSign, Store, Building2, Clock, AlertTriangle, MessageSquare, Star } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// ==================== Types ====================
interface Notification {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  priority: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
  createdAt: string;
  metadata?: any;
}

// ==================== Helpers ====================
const getNotificationIcon = (type: string) => {
  const iconMap: Record<string, any> = {
    BOOKING_CONFIRMED: Calendar,
    BOOKING_CANCELLED: Calendar,
    PAYMENT_SUCCESS: DollarSign,
    PAYMENT_FAILED: DollarSign,
    VENDOR_APPROVED: Store,
    VENDOR_REJECTED: Store,
    VENUE_APPROVED: Building2,
    VENUE_REJECTED: Building2,
    SERVICE_APPROVED: Star,
    SERVICE_REJECTED: Star,
    EVENT_REMINDER: Clock,
    EVENT_CANCELLED: Calendar,
    SYSTEM_ALERT: AlertTriangle,
    REVIEW_RECEIVED: MessageSquare,
  };
  return iconMap[type] || Bell;
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "CRITICAL": return "bg-red-100 text-red-700 border-red-300";
    case "HIGH": return "bg-orange-100 text-orange-700 border-orange-300";
    case "NORMAL": return "bg-blue-100 text-blue-700 border-blue-300";
    default: return "bg-neutral-100 text-neutral-700 border-neutral-300";
  }
};

const formatTimeAgo = (dateString: string) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

// ==================== Main Component ====================
export default function VendorNotificationsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [markingAllRead, setMarkingAllRead] = useState(false);

  // ==================== Load Notifications ====================
  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/notifications");
      const data = response.data?.notifications || response.data || [];
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error("Failed to load notifications:", error);
      toast.error("Failed to load notifications");
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "VENDOR") {
      router.push("/login");
      return;
    }
    loadNotifications();
  }, [isAuthenticated, user, router, loadNotifications]);

  // ==================== Actions ====================
  const markAsRead = async (id: number) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      setMarkingAllRead(true);
      await api.post("/notifications/read-all");
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast.success("All notifications marked as read");
    } catch (error: any) {
      console.error("Failed to mark all as read:", error);
      toast.error("Failed to mark all as read");
    } finally {
      setMarkingAllRead(false);
    }
  };

  const deleteNotification = async (id: number) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success("Notification deleted");
    } catch (error: any) {
      console.error("Failed to delete notification:", error);
      toast.error("Failed to delete notification");
    }
  };

  // ==================== Filter ====================
  const filteredNotifications = notifications.filter(n => {
    if (filter === "unread" && n.read) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query) ||
        n.type.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  // ==================== Loading State ====================
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-neutral-400" />
          <p className="text-neutral-600">Loading notifications...</p>
        </div>
      </div>
    );
  }

  // ==================== Main Render ====================
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-black">Notifications</h1>
          <p className="text-neutral-600">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}` : "All caught up!"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadNotifications}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead} disabled={markingAllRead}>
              {markingAllRead ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4 mr-2" />
              )}
              Mark All Read
            </Button>
          )}
        </div>
      </motion.div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
              <TabsList>
                <TabsTrigger value="all">All ({notifications.length})</TabsTrigger>
                <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative ml-auto">
              <Input
                placeholder="Search notifications..."
                className="w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-black">Your Notifications</CardTitle>
          <CardDescription>
            {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-black mb-2">
                {filter === "unread" ? "No unread notifications" : "No notifications yet"}
              </h3>
              <p className="text-neutral-600">
                {filter === "unread"
                  ? "You're all caught up!"
                  : "Notifications about your services, bookings, and payments will appear here"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {filteredNotifications.map((notification) => {
                  const Icon = getNotificationIcon(notification.type);
                  return (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className={cn(
                        "p-4 rounded-xl border transition-all",
                        notification.read
                          ? "bg-white border-neutral-200"
                          : "bg-blue-50 border-blue-200"
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0",
                          notification.read ? "bg-neutral-100 text-neutral-600" : "bg-blue-100 text-blue-600"
                        )}>
                          <Icon className="h-5 w-5" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className={cn(
                              "font-medium",
                              notification.read ? "text-neutral-700" : "text-black"
                            )}>
                              {notification.title}
                            </h4>
                            <Badge className={cn("text-xs", getPriorityColor(notification.priority))}>
                              {notification.priority}
                            </Badge>
                            {!notification.read && (
                              <div className="h-2 w-2 rounded-full bg-blue-500" />
                            )}
                          </div>
                          <p className="text-sm text-neutral-600 mb-2">{notification.message}</p>
                          <div className="flex items-center gap-4 text-xs text-neutral-500">
                            <span>{formatTimeAgo(notification.createdAt)}</span>
                            <span className="uppercase">{notification.type.replace(/_/g, " ")}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(notification.id)}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteNotification(notification.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
