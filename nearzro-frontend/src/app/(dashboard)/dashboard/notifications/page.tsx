"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Bell, CheckCircle2, XCircle, Clock, AlertCircle, 
  Trash2, CheckCheck, Calendar, DollarSign, Gift,
  Search, Filter, Inbox, Mail, Share2, 
  MoreVertical, Shield, Store, Building2, RefreshCw, Loader2,
  Copy, EyeOff, Info, ChevronRight
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

// ==================== Types ====================
interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  priority: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
  createdAt: string;
  metadata?: Record<string, any>;
  deepLink?: string;
}

// ==================== Constants ====================
const NOTIFICATION_CONFIG: Record<string, { icon: any, color: string, bg: string, border: string }> = {
  BOOKING_CONFIRMED: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  BOOKING_CANCELLED: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20" },
  PAYMENT_SUCCESS: { icon: DollarSign, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  KYC_APPROVED: { icon: Shield, color: "text-indigo-500", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
  KYC_REJECTED: { icon: AlertCircle, color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20" },
  VENUE_APPROVED: { icon: Building2, color: "text-teal-500", bg: "bg-teal-500/10", border: "border-teal-500/20" },
  VENUE_REJECTED: { icon: XCircle, color: "text-zinc-500", bg: "bg-zinc-500/10", border: "border-zinc-500/20" },
  SYSTEM_ALERT: { icon: AlertCircle, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  DEFAULT: { icon: Bell, color: "text-zinc-500", bg: "bg-zinc-500/10", border: "border-zinc-500/20" }
};

// ==================== Main Component ====================
export default function NotificationsInboxPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread" | "priority">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  const loadNotifications = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await api.get("/notifications");
      const data = response.data;
      const list = Array.isArray(data) ? data : (data?.notifications || data?.data || []);
      setNotifications(list);
    } catch (error: any) {
      toast.error("Failed to sync notifications");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkAsRead = async (id: number) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (error) {
       // Silently update locally for better UX
       setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast.success("All messages marked as read");
    } catch (error) {
      toast.error("Batch update failed");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (selectedNotification?.id === id) setSelectedNotification(null);
    } catch (error) {
      toast.error("Could not delete message");
    }
  };

  const handleMarkAsUnread = async (id: number) => {
    try {
      await api.patch(`/notifications/${id}/unread`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: false } : n));
      if (selectedNotification?.id === id) {
        setSelectedNotification({ ...selectedNotification, read: false });
      }
      toast.success("Message marked as unread");
    } catch (error) {
      toast.error("Status update failed");
    }
  };

  const handleShare = async (notification: Notification) => {
    const text = `${notification.title}\n\n${notification.message}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: notification.title,
          text: notification.message,
        });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard");
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        toast.error("Could not share notification");
      }
    }
  };

  const filteredList = notifications.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          n.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === "all" ? true : filter === "unread" ? !n.read : n.priority === "HIGH" || n.priority === "CRITICAL";
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
         <Loader2 className="h-10 w-10 animate-spin text-zinc-300" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col bg-zinc-50 overflow-hidden">
      
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between p-6 bg-white border-b border-zinc-200">
        <div>
          <h1 className="text-2xl font-black text-black tracking-tight flex items-center gap-2">
            <Inbox className="h-6 w-6 text-indigo-600" />
            Communication Hub
          </h1>
          <p className="text-sm font-medium text-zinc-500">Service messages and system alerts protocol</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => loadNotifications(true)} disabled={refreshing} className="rounded-full shadow-sm">
             <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
             Sync
          </Button>
          <Button onClick={handleMarkAllRead} className="bg-black text-white hover:bg-zinc-800 rounded-full shadow-md font-bold">
             <CheckCheck className="h-4 w-4 mr-2" /> Mark All Read
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* Left: Feed */}
        <div className="w-full md:w-[450px] flex flex-col border-r border-zinc-200 bg-white">
          <div className="p-4 border-b border-zinc-100 flex flex-col gap-3">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input 
                  placeholder="Filter inbox..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 bg-zinc-50 border-zinc-200 rounded-xl text-sm"
                />
             </div>
             <div className="flex gap-2">
                {(["all", "unread", "priority"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all",
                      filter === f ? "bg-black text-white" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                    )}
                  >
                    {f}
                  </button>
                ))}
             </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-zinc-100">
             {filteredList.length === 0 ? (
               <div className="p-12 text-center">
                 <Mail className="h-10 w-10 text-zinc-200 mx-auto mb-3" />
                 <p className="text-sm font-bold text-zinc-400">Zero unread messages in queue.</p>
               </div>
             ) : (
               filteredList.map((n) => {
                 const config = NOTIFICATION_CONFIG[n.type] || NOTIFICATION_CONFIG.DEFAULT;
                 const Icon = config.icon;
                 return (
                   <div
                     key={n.id}
                     onClick={() => { setSelectedNotification(n); if(!n.read) handleMarkAsRead(n.id); }}
                     className={cn(
                       "p-4 cursor-pointer transition-all hover:bg-zinc-50 group border-l-4",
                       selectedNotification?.id === n.id ? "bg-indigo-50/50 border-indigo-600" : n.read ? "border-transparent" : "border-indigo-400 bg-indigo-50/20"
                     )}
                   >
                     <div className="flex items-start gap-4">
                        <div className={cn("shrink-0 p-2.5 rounded-xl border", config.bg, config.color, config.border)}>
                           <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className="flex items-start justify-between">
                              <p className={cn("text-sm font-black truncate", n.read ? "text-zinc-600" : "text-black")}>{n.title}</p>
                              <span className="text-[10px] font-mono text-zinc-400">{new Date(n.createdAt).toLocaleDateString()}</span>
                           </div>
                           <p className="text-xs text-zinc-500 line-clamp-2 mt-1 leading-relaxed">{n.message}</p>
                           <div className="flex items-center gap-2 mt-3">
                              <Badge className="text-[9px] font-black uppercase bg-zinc-100 text-zinc-500 border-zinc-200 px-1.5 h-4">{n.type.replace('_', ' ')}</Badge>
                              {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />}
                           </div>
                        </div>
                     </div>
                   </div>
                 );
               })
             )}
          </div>
        </div>

        {/* Right: Detailed Reader */}
        <div className="hidden md:flex flex-1 flex-col bg-zinc-50/50 p-6 overflow-y-auto">
          <AnimatePresence mode="wait">
            {selectedNotification ? (
              <motion.div
                key={selectedNotification.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-3xl mx-auto w-full"
              >
                <div className="bg-white rounded-3xl border border-zinc-200 shadow-xl overflow-hidden">
                   <div className="p-8 border-b border-zinc-100">
                      <div className="flex items-center justify-between mb-6">
                        <Badge className={cn("px-3 py-1 text-[10px] font-black uppercase", 
                          selectedNotification.priority === 'CRITICAL' ? "bg-red-100 text-red-600" : "bg-indigo-100 text-indigo-600")}>
                          Priority: {selectedNotification.priority}
                        </Badge>
                        <div className="flex gap-2">
                           <Button 
                             variant="ghost" 
                             size="icon" 
                             onClick={() => handleDelete(selectedNotification.id)} 
                             className="text-red-500 hover:bg-red-50"
                             title="Delete message"
                           >
                             <Trash2 className="h-4 w-4" />
                           </Button>
                           
                           <Button 
                             variant="ghost" 
                             size="icon" 
                             onClick={() => handleShare(selectedNotification)}
                             className="text-zinc-500 hover:bg-zinc-50"
                             title="Share message"
                           >
                             <Share2 className="h-4 w-4" />
                           </Button>

                           <Popover>
                             <PopoverTrigger asChild>
                               <Button variant="ghost" size="icon" className="text-zinc-500 hover:bg-zinc-50">
                                 <MoreVertical className="h-4 w-4" />
                               </Button>
                             </PopoverTrigger>
                             <PopoverContent className="w-48 p-2 bg-white border border-zinc-200 shadow-xl rounded-xl" align="end">
                               <div className="flex flex-col gap-1">
                                 <button
                                   onClick={() => handleMarkAsUnread(selectedNotification.id)}
                                   className="flex items-center gap-2 w-full px-3 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50 hover:text-indigo-600 rounded-lg transition-colors"
                                 >
                                   <EyeOff className="h-3.5 w-3.5" />
                                   Mark as Unread
                                 </button>
                                 <button
                                   onClick={() => {
                                     navigator.clipboard.writeText(`MSG-${selectedNotification.id}`);
                                     toast.success("Message ID copied");
                                   }}
                                   className="flex items-center gap-2 w-full px-3 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50 hover:text-black rounded-lg transition-colors border-t border-zinc-50 mt-1"
                                 >
                                   <Info className="h-3.5 w-3.5" />
                                   Copy Message ID
                                 </button>
                                 <button
                                   onClick={() => handleDelete(selectedNotification.id)}
                                   className="flex items-center gap-2 w-full px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors mt-1"
                                 >
                                   <Trash2 className="h-3.5 w-3.5" />
                                   Move to Trash
                                 </button>
                               </div>
                             </PopoverContent>
                           </Popover>
                        </div>
                      </div>
                      <h2 className="text-4xl font-black text-black tracking-tighter leading-none mb-4">{selectedNotification.title}</h2>
                      <p className="text-zinc-400 font-mono text-xs">Message ID: MSG-{selectedNotification.id} • {new Date(selectedNotification.createdAt).toLocaleString()}</p>
                   </div>
                   <div className="p-8 space-y-8">
                      <div className="prose prose-zinc prose-sm max-w-none">
                         <p className="text-lg font-medium text-zinc-800 leading-relaxed whitespace-pre-wrap">
                            {selectedNotification.message}
                         </p>
                      </div>

                      {selectedNotification.deepLink && (
                        <Card className="bg-indigo-600 text-white border-0 shadow-lg shadow-indigo-200">
                           <CardContent className="p-6 flex items-center justify-between">
                             <div>
                               <p className="font-black text-lg">Action Required</p>
                               <p className="text-xs text-indigo-100">Interaction required to complete lifecycle</p>
                             </div>
                             <Button 
                                onClick={() => router.push(selectedNotification.deepLink!)}
                                className="bg-white text-indigo-600 hover:bg-indigo-50 font-black rounded-full shadow-md"
                             >
                               Navigate Now <ChevronRight className="h-4 w-4 ml-1" />
                             </Button>
                           </CardContent>
                        </Card>
                      )}

                      {!selectedNotification.deepLink && (
                        <div className="p-6 bg-zinc-50 border border-zinc-200 rounded-3xl flex items-center gap-4">
                           <div className="p-3 bg-white rounded-2xl shadow-sm border border-zinc-100">
                              <Bolt className="h-6 w-6 text-zinc-400" />
                           </div>
                           <div>
                             <p className="font-bold text-zinc-800">Operational Update</p>
                             <p className="text-xs text-zinc-500 font-medium">This message is for situational awareness and requires no explicit action.</p>
                           </div>
                        </div>
                      )}
                   </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center space-y-4 text-center">
                 <div className="h-24 w-24 rounded-full bg-zinc-100 flex items-center justify-center border border-zinc-200">
                    <Inbox className="h-8 w-8 text-zinc-300" />
                 </div>
                 <div>
                   <p className="text-lg font-black text-zinc-800">Select a message to expand</p>
                   <p className="text-sm text-zinc-500 font-medium">Choose an item from your operational feed to see details</p>
                 </div>
              </div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}

function Bolt({ className }: { className: string }) {
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
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  );
}
