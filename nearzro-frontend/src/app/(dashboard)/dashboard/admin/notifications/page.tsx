"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell, AlertTriangle, CheckCircle2, X, Trash2,
  Settings, CheckCheck, Clock, AlertCircle
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import api from "@/lib/api";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  priority: string;
  createdAt: string;
  eventId?: number;
}

const TYPE_ICONS: Record<string, any> = {
  BOOKING_CONFIRMED: CheckCircle2,
  PAYMENT_SUCCESS: CheckCircle2,
  VENDOR_APPROVED: CheckCircle2,
  VENUE_APPROVED: CheckCircle2,
  PAYMENT_FAILED: AlertTriangle,
  BOOKING_CANCELLED: X,
  EVENT_REMINDER: Bell,
  SYSTEM_ALERT: AlertCircle,
};

const TYPE_COLORS: Record<string, string> = {
  BOOKING_CONFIRMED: "bg-emerald-950/20 border-emerald-800",
  PAYMENT_SUCCESS: "bg-emerald-950/20 border-emerald-800",
  VENDOR_APPROVED: "bg-emerald-950/20 border-emerald-800",
  VENUE_APPROVED: "bg-emerald-950/20 border-emerald-800",
  PAYMENT_FAILED: "bg-red-950/20 border-red-800",
  BOOKING_CANCELLED: "bg-red-950/20 border-red-800",
  EVENT_REMINDER: "bg-amber-950/20 border-amber-800",
  SYSTEM_ALERT: "bg-blue-950/20 border-blue-800",
};

export default function NotificationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const controller = new AbortController();
    loadNotifications(controller.signal);
    return () => controller.abort();
  }, []);

  const loadNotifications = async (signal?: AbortSignal) => {
    try {
      const response = await api.get("/notifications?admin=true", { signal });
      const data = response.data;
      // Backend may return { data: [...], pagination: {...} } or just [...]
      const notifications = Array.isArray(data) ? data : (data?.data || data?.notifications || []);
      setNotifications(notifications);
    } catch (error: any) {
      console.error("Failed to load notifications:", error);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = async (id: number) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      toast.success("Notification marked as read");
    } catch (error: any) {
      console.error("Mark as read error:", error);
      toast.error("Failed to mark as read");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.post("/notifications/read-all");
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast.success("All notifications marked as read");
    } catch (error: any) {
      console.error("Mark all as read error:", error);
      toast.error("Failed to mark all as read");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      // Assuming there's a delete endpoint, if not this will fail gracefully
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success("Notification deleted");
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error("Failed to delete notification");
    }
  };

  const handleClearAll = async () => {
    if (!confirm("Are you sure you want to clear all notifications?")) return;
    try {
      await api.delete("/notifications");
      setNotifications([]);
      toast.success("All notifications cleared");
    } catch (error: any) {
      console.error("Clear all error:", error);
      toast.error("Failed to clear notifications");
    }
  };

  const filteredNotifications = filter === "all" 
    ? notifications 
    : filter === "unread" 
    ? notifications.filter(n => !n.read)
    : notifications.filter(n => n.type.includes(filter.toUpperCase()));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-zinc-950">
        <p className="text-zinc-400">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-zinc-950 min-h-screen px-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100">Notifications</h1>
          <p className="text-zinc-400">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : "All caught up!"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800" onClick={handleMarkAllAsRead}>
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark All Read
          </Button>
          <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800" onClick={handleClearAll}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
          <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardContent className="p-4">
          <div className="flex gap-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
              className={filter === "all" ? "bg-zinc-100 text-zinc-900" : "border-zinc-700 text-zinc-300"}
            >
              All ({notifications.length})
            </Button>
            <Button
              variant={filter === "unread" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("unread")}
              className={filter === "unread" ? "bg-zinc-100 text-zinc-900" : "border-zinc-700 text-zinc-300"}
            >
              Unread ({unreadCount})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardContent className="p-12 text-center">
              <Bell className="h-16 w-16 mx-auto mb-4 text-zinc-500" />
              <h3 className="text-lg font-bold text-zinc-100 mb-2">No Notifications</h3>
              <p className="text-zinc-400">
                {filter === "unread" ? "No unread notifications" : "You're all caught up!"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredNotifications.map((notification) => {
            const Icon = TYPE_ICONS[notification.type] || Bell;
            const colorClass = TYPE_COLORS[notification.type] || "bg-zinc-800/50 border-zinc-700";

            return (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className={`border ${colorClass} ${!notification.read ? 'ring-2 ring-zinc-600' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-full ${
                        notification.type.includes('SUCCESS') || notification.type.includes('APPROVED')
                          ? 'bg-emerald-950/30'
                          : notification.type.includes('FAILED') || notification.type.includes('CANCELLED')
                          ? 'bg-red-950/30'
                          : 'bg-zinc-800'
                      }`}>
                        <Icon className={`h-5 w-5 ${
                          notification.type.includes('SUCCESS') || notification.type.includes('APPROVED')
                            ? 'text-emerald-400'
                            : notification.type.includes('FAILED') || notification.type.includes('CANCELLED')
                            ? 'text-red-400'
                            : 'text-zinc-400'
                        }`} />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                             <h3 className="font-bold text-zinc-100 mb-1">{notification.title || "No title"}</h3>
                             <p className="text-zinc-300 text-sm mb-2">{notification.message || "No message"}</p>
                             <div className="flex items-center gap-3 text-xs text-zinc-500">
                               <span className="flex items-center gap-1">
                                 <Clock className="h-3 w-3" />
                                 {notification.createdAt ? new Date(notification.createdAt).toLocaleString() : "N/A"}
                              </span>
                              {notification.priority === 'HIGH' && (
                                <Badge className="bg-red-950/30 text-red-400 border-red-700">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  High Priority
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMarkAsRead(notification.id)}
                                className="text-zinc-400 hover:text-zinc-100"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(notification.id)}
                              className="text-zinc-400 hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
