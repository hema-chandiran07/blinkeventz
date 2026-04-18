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
  Clock,
  Shield,
  XCircle,
  Inbox
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
        return <Calendar className="h-4 w-4" />;
      case "BOOKING_CANCELLED":
        return <XCircle className="h-4 w-4" />;
      case "PAYMENT_SUCCESS":
      case "PAYMENT_FAILED":
        return <DollarSign className="h-4 w-4" />;
      case "VENDOR_APPROVED":
      case "VENDOR_REJECTED":
        return <Store className="h-4 w-4" />;
      case "VENUE_APPROVED":
      case "VENUE_REJECTED":
        return <Building2 className="h-4 w-4" />;
      case "KYC_APPROVED":
      case "KYC_REJECTED":
        return <Shield className="h-4 w-4" />;
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
          className="relative hover:bg-zinc-100 rounded-full transition-all duration-300"
        >
          <Bell className="h-5 w-5 text-zinc-600" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[10px] font-black text-white items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0 bg-white border border-zinc-200 shadow-2xl rounded-2xl overflow-hidden" align="end">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-zinc-50 border-b border-zinc-100">
          <div>
            <h3 className="font-black text-black tracking-tight flex items-center gap-2">
              <Inbox className="h-4 w-4 text-indigo-600" />
              Notifications
            </h3>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-0.5">
              {unreadCount} unread items pending
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-8 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-[420px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Syncing Feed...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="p-4 bg-zinc-50 rounded-full mb-4">
                <Bell className="h-10 w-10 text-zinc-200" />
              </div>
              <p className="text-sm font-bold text-zinc-800">Operational Inbox Clear</p>
              <p className="text-xs text-zinc-400 mt-1 max-w-[200px]">
                New system events and transaction alerts will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-50">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-4 transition-all cursor-pointer border-l-4 group",
                    !notification.read ? "bg-indigo-50/30 border-indigo-500 hover:bg-indigo-50/50" : "border-transparent hover:bg-zinc-50"
                  )}
                  onClick={() => { markAsRead(notification.id); setIsOpen(false); }}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div
                      className={cn(
                        "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border",
                        getNotificationColor(notification.priority),
                        "shadow-sm group-hover:scale-105 transition-transform"
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
                              "text-sm font-bold mb-0.5",
                              !notification.read ? "text-black" : "text-zinc-600"
                            )}
                          >
                            {notification.title}
                          </p>
                          <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed font-medium">
                            {notification.message}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="flex-shrink-0 mt-1.5">
                            <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <span className="text-[10px] font-mono text-zinc-400 uppercase">
                          {new Date(notification.createdAt).toLocaleDateString("en-IN", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                        {notification.priority === "CRITICAL" && (
                          <Badge className="h-4 text-[9px] font-black bg-red-50 text-red-600 border-red-100 uppercase tracking-tighter">
                            Critical
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
        <div className="p-4 border-t border-zinc-100 bg-zinc-50">
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard/notifications"
              className="text-[11px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-widest flex items-center gap-1 group"
              onClick={() => setIsOpen(false)}
            >
              Full Inbox
              <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/dashboard/settings"
              className="text-[11px] font-black text-zinc-400 hover:text-zinc-600 uppercase tracking-widest flex items-center gap-1.5"
              onClick={() => setIsOpen(false)}
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

function ChevronRight({ className }: { className: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="m9 18 6-6-6-6"/>
    </svg>
  );
}
