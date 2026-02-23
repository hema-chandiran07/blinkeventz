"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { useNotifications } from "@/context/notifications-context";
import {
  Bell,
  CheckCheck,
  Settings,
  Calendar,
  DollarSign,
  Store,
  Building2,
  AlertTriangle,
  Clock
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getNotificationColor } from "@/services/notifications";

export function NotificationsBell() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const getIconForType = (type: string) => {
    switch (type) {
      case "BOOKING_CONFIRMED":
      case "BOOKING_CANCELLED":
        return <Calendar className="h-4 w-4" />;
      case "PAYMENT_SUCCESS":
      case "PAYMENT_FAILED":
        return <DollarSign className="h-4 w-4" />;
      case "VENDOR_APPROVED":
      case "VENDOR_REJECTED":
        return <Store className="h-4 w-4" />;
      case "VENUE_APPROVED":
      case "VENUE_REJECTED":
        return <Building2 className="h-4 w-4" />;
      case "EVENT_REMINDER":
        return <Clock className="h-4 w-4" />;
      case "SYSTEM_ALERT":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-purple-50"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500 hover:bg-red-600"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            <p className="text-xs text-gray-500">
              {unreadCount} unread {unreadCount === 1 ? "notification" : "notifications"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-8 text-xs"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Bell className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">No notifications yet</p>
              <p className="text-gray-400 text-xs mt-1">
                We&apos;ll notify you when something arrives
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-4 hover:bg-gray-50 transition-colors cursor-pointer border-l-4",
                    !notification.read && "bg-purple-50/50 border-purple-500",
                    notification.read && "border-transparent"
                  )}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div
                      className={cn(
                        "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
                        getNotificationColor(notification.priority)
                      )}
                    >
                      {getIconForType(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p
                            className={cn(
                              "text-sm font-medium",
                              !notification.read ? "text-gray-900" : "text-gray-600"
                            )}
                          >
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="flex-shrink-0">
                            <div className="w-2 h-2 rounded-full bg-purple-600" />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-400">
                          {new Date(notification.createdAt).toLocaleDateString("en-IN", {
                            month: "short",
                            day: "numeric"
                          })}
                        </span>
                        {notification.priority === "CRITICAL" && (
                          <Badge className="h-5 text-xs bg-red-100 text-red-700">
                            Critical
                          </Badge>
                        )}
                        {notification.priority === "HIGH" && (
                          <Badge className="h-5 text-xs bg-orange-100 text-orange-700">
                            High
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard/notifications"
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              View all notifications
            </Link>
            <Link
              href="/dashboard/settings#notifications"
              className="text-sm text-gray-600 hover:text-gray-700 flex items-center gap-1"
            >
              <Settings className="h-3 w-3" />
              Settings
            </Link>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
