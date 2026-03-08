"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell, CheckCircle2, XCircle, Clock, AlertCircle,
  Trash2, CheckCheck, Calendar, DollarSign, Gift
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await api.get("/notifications");
      setNotifications(response.data || []);
    } catch (error: any) {
      console.error("Failed to load notifications:", error);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      ));
      toast.success("Notification marked as read");
    } catch (error: any) {
      toast.error("Failed to mark as read");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      toast.success("All notifications marked as read");
    } catch (error: any) {
      toast.error("Failed to mark all as read");
    }
  };

  const handleDeleteNotification = async (id: number) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(notifications.filter(n => n.id !== id));
      toast.success("Notification deleted");
    } catch (error: any) {
      toast.error("Failed to delete notification");
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "BOOKING_CONFIRMED":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "PAYMENT_SUCCESS":
        return <DollarSign className="h-5 w-5 text-green-600" />;
      case "BOOKING_PENDING":
        return <Clock className="h-5 w-5 text-blue-600" />;
      case "PAYMENT_FAILED":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "EVENT_REMINDER":
        return <Calendar className="h-5 w-5 text-amber-600" />;
      case "PROMOTION":
        return <Gift className="h-5 w-5 text-purple-600" />;
      default:
        return <Bell className="h-5 w-5 text-neutral-600" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "BOOKING_CONFIRMED":
      case "PAYMENT_SUCCESS":
        return "border-l-4 border-l-green-500";
      case "BOOKING_PENDING":
      case "EVENT_REMINDER":
        return "border-l-4 border-l-blue-500";
      case "PAYMENT_FAILED":
        return "border-l-4 border-l-red-500";
      default:
        return "border-l-4 border-l-neutral-300";
    }
  };

  const filteredNotifications = filter === "unread" 
    ? notifications.filter(n => !n.read)
    : notifications;

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full border-4 border-neutral-200 border-t-black animate-spin mx-auto mb-4" />
          <p className="text-black">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">Notifications</h1>
            <p className="text-neutral-600">Stay updated with your events and bookings</p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={handleMarkAllAsRead}
              className="border-black"
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card className="border-2 border-black">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total</p>
                <p className="text-3xl font-bold text-black">{notifications.length}</p>
              </div>
              <div className="p-3 rounded-full bg-black text-white">
                <Bell className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-blue-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Unread</p>
                <p className="text-3xl font-bold text-blue-600">{unreadCount}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-50 text-blue-600">
                <AlertCircle className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-green-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Read</p>
                <p className="text-3xl font-bold text-green-600">{notifications.length - unreadCount}</p>
              </div>
              <div className="p-3 rounded-full bg-green-50 text-green-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
          className={filter === "all" ? "bg-black" : "border-black"}
        >
          All Notifications
        </Button>
        <Button
          variant={filter === "unread" ? "default" : "outline"}
          onClick={() => setFilter("unread")}
          className={filter === "unread" ? "bg-black" : "border-black"}
        >
          Unread Only
        </Button>
      </div>

      {/* Notifications List */}
      <Card className="border-2 border-black">
        <CardHeader>
          <CardTitle className="text-black">
            {filter === "unread" ? "Unread Notifications" : "All Notifications"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-16 w-16 mx-auto mb-4 text-neutral-300" />
              <h3 className="text-lg font-bold text-black mb-2">
                {filter === "unread" ? "No Unread Notifications" : "No Notifications Yet"}
              </h3>
              <p className="text-neutral-600">
                {filter === "unread" 
                  ? "You've read all your notifications" 
                  : "New notifications will appear here"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border border-neutral-200 hover:border-black transition-colors ${getNotificationColor(notification.type)} ${!notification.read ? "bg-blue-50" : ""}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-black">{notification.title}</h3>
                          {!notification.read && (
                            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                              New
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-neutral-700 mb-2">{notification.message}</p>
                        <p className="text-xs text-neutral-500">
                          {new Date(notification.createdAt).toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="text-blue-600 hover:bg-blue-50"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteNotification(notification.id)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
