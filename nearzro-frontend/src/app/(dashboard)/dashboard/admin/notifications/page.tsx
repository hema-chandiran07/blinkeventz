"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell, AlertTriangle, CheckCircle2, Info, X, Trash2,
  Settings, Filter, CheckCheck, Clock, AlertCircle
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { notificationsApi } from "@/lib/api-endpoints";

const NOTIFICATIONS = [
  { id: 1, type: "success", title: "Payment Received", message: "₹1,50,000 received from Rajesh Kumar for Wedding Event", time: "5 minutes ago", read: false },
  { id: 2, type: "warning", title: "Pending Approvals", message: "3 venues and 2 vendors awaiting approval", time: "1 hour ago", read: false },
  { id: 3, type: "error", title: "Payment Failed", message: "Payment failed for Arjun's Birthday - insufficient funds", time: "2 hours ago", read: false },
  { id: 4, type: "info", title: "New User Registered", message: "John David registered as Event Manager", time: "3 hours ago", read: true },
  { id: 5, type: "success", title: "Event Completed", message: "TechCorp Annual Meet marked as completed", time: "5 hours ago", read: true },
  { id: 6, type: "warning", title: "Low Stock Alert", message: "Venue capacity reaching limit for weekend dates", time: "1 day ago", read: true },
];

const TYPE_ICONS: Record<string, any> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
  info: Info,
};

const TYPE_COLORS: Record<string, string> = {
  success: "bg-emerald-50 border-emerald-200",
  warning: "bg-amber-50 border-amber-200",
  error: "bg-red-50 border-red-200",
  info: "bg-blue-50 border-blue-200",
};

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const [filter, setFilter] = useState("all");

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = async (id: number) => {
    try {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      console.log(`Marking notification ${id} as read`);
      toast.success("Notification marked as read");
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error: any) {
      console.error("Mark as read error:", error);
      toast.error("Failed to mark as read");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      console.log("Marking all notifications as read");
      toast.success("All notifications marked as read");
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error: any) {
      console.error("Mark all as read error:", error);
      toast.error("Failed to mark all as read");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setNotifications(prev => prev.filter(n => n.id !== id));
      console.log(`Deleting notification ${id}`);
      toast.success("Notification deleted");
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error("Failed to delete notification");
    }
  };

  const handleClearAll = async () => {
    try {
      setNotifications([]);
      console.log("Clearing all notifications");
      toast.success("All notifications cleared");
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error: any) {
      console.error("Clear all error:", error);
      toast.error("Failed to clear notifications");
    }
  };

  const handleOpenSettings = () => {
    console.log("Opening notification settings...");
    toast.info("Opening settings...");
    router.push("/dashboard/admin/settings");
  };

  const filteredNotifications = filter === "all" ? notifications : notifications.filter(n => !n.read);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black">Notifications</h1>
          <p className="text-neutral-600">{unreadCount} unread notifications</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="border-black hover:bg-neutral-100" onClick={handleMarkAllAsRead}>
            <CheckCheck className="h-4 w-4 mr-2" /> Mark All Read
          </Button>
          <Button variant="outline" className="border-black hover:bg-neutral-100" onClick={handleOpenSettings}>
            <Settings className="h-4 w-4 mr-2" /> Settings
          </Button>
          <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50" onClick={handleClearAll}>
            <Trash2 className="h-4 w-4 mr-2" /> Clear All
          </Button>
        </div>
      </motion.div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <Button variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")} className={filter === "all" ? "bg-black" : "border-black"}>
          All ({notifications.length})
        </Button>
        <Button variant={filter === "unread" ? "default" : "outline"} onClick={() => setFilter("unread")} className={filter === "unread" ? "bg-black" : "border-black"}>
          Unread ({unreadCount})
        </Button>
      </div>

      {/* Notifications List */}
      <Card className="border-2 border-black">
        <CardHeader>
          <CardTitle className="text-black flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Recent Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-emerald-600" />
              <h3 className="text-lg font-bold text-black mb-2">All Caught Up!</h3>
              <p className="text-neutral-600">No notifications to display</p>
            </div>
          ) : (
            filteredNotifications.map((notification, index) => {
              const Icon = TYPE_ICONS[notification.type];
              return (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-4 rounded-lg border-2 ${TYPE_COLORS[notification.type]} ${!notification.read ? "shadow-md" : "opacity-75"} hover:shadow-lg transition-all`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded-full ${!notification.read ? "bg-white" : "bg-neutral-200"}`}>
                        <Icon className={`h-5 w-5 ${notification.type === "success" ? "text-emerald-600" : notification.type === "warning" ? "text-amber-600" : notification.type === "error" ? "text-red-600" : "text-blue-600"}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-black">{notification.title}</h3>
                          {!notification.read && <div className="h-2 w-2 rounded-full bg-blue-600" />}
                        </div>
                        <p className="text-sm text-neutral-700 mt-1">{notification.message}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Clock className="h-3 w-3 text-neutral-400" />
                          <span className="text-xs text-neutral-600">{notification.time}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!notification.read && (
                        <Button variant="ghost" size="sm" className="text-black hover:bg-neutral-100" onClick={() => handleMarkAsRead(notification.id)}>
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="text-neutral-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(notification.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
