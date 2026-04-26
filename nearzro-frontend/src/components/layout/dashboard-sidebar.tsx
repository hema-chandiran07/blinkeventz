"use client"

import Link from "next/link";
import NextImage from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import {
  LayoutDashboard, Calendar, ShoppingBag, Settings, LogOut, Store,
  Building2, Users, CheckSquare, CreditCard, BarChart3, DollarSign,
  Bell, Shield, Image as ImageIcon, Star, FileText, Send, UserPlus,
  Zap, Tag, ClipboardCheck, Wallet, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

const SIDEBAR_ITEMS: Record<string, SidebarItem[]> = {
  CUSTOMER: [
    { name: 'My Events', href: '/dashboard/customer/events', icon: Calendar },
    { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
    { name: 'KYC Verification', href: '/dashboard/customer/kyc', icon: CheckSquare },
    { name: 'Profile', href: '/dashboard/customer/profile', icon: User },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ],
  VENDOR: [
    { name: 'Dashboard', href: '/dashboard/vendor', icon: LayoutDashboard },
    { name: 'Services', href: '/dashboard/vendor/services', icon: ShoppingBag },
    { name: 'Bookings', href: '/dashboard/vendor/bookings', icon: ClipboardCheck },
    { name: 'Calendar', href: '/dashboard/vendor/calendar', icon: Calendar },
    { name: 'Earnings', href: '/dashboard/vendor/earnings', icon: DollarSign },
    { name: 'Analytics', href: '/dashboard/vendor/analytics', icon: BarChart3 },
    { name: 'Portfolio', href: '/dashboard/vendor/portfolio', icon: ImageIcon },
    { name: 'Reviews', href: '/dashboard/vendor/reviews', icon: Star },
    { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
    { name: 'KYC & Bank', href: '/dashboard/vendor/kyc', icon: CheckSquare },
    { name: 'Profile', href: '/dashboard/vendor/profile', icon: Store },
  ],
  VENUE_OWNER: [
    { name: 'Dashboard', href: '/dashboard/venue', icon: LayoutDashboard },
    { name: 'My Venues', href: '/dashboard/venue/details', icon: Building2 },
    { name: 'Bookings', href: '/dashboard/venue/bookings', icon: ClipboardCheck },
    { name: 'Calendar', href: '/dashboard/venue/calendar', icon: Calendar },
    { name: 'Analytics', href: '/dashboard/venue/analytics', icon: BarChart3 },
    { name: 'Earnings', href: '/dashboard/venue/earnings', icon: Wallet },
    { name: 'Reviews', href: '/dashboard/venue/reviews', icon: Star },
    { name: 'Payouts', href: '/dashboard/venue/payouts', icon: DollarSign },
    { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
    { name: 'KYC & Bank', href: '/dashboard/venue/kyc', icon: CheckSquare },
    { name: 'Profile', href: '/dashboard/venue/profile', icon: User },
  ],
  ADMIN: [
    { name: 'Overview', href: '/dashboard/admin', icon: LayoutDashboard },
    { name: 'Analytics', href: '/dashboard/admin/analytics', icon: BarChart3 },
    { name: 'Transactions', href: '/dashboard/admin/transactions', icon: CreditCard },
    { name: 'Reports', href: '/dashboard/admin/reports', icon: FileText },
    { name: 'Payouts', href: '/dashboard/admin/payouts', icon: DollarSign },
    { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
    { name: 'Compose', href: '/dashboard/admin/compose', icon: Send },
    { name: 'Reviews', href: '/dashboard/admin/reviews', icon: Star },
    { name: 'Promotions', href: '/dashboard/admin/promotions', icon: Tag },
    { name: 'KYC Approvals', href: '/dashboard/admin/kyc-approvals', icon: CheckSquare },
    { name: 'Approvals', href: '/dashboard/admin/approvals', icon: ClipboardCheck },
    { name: 'Events', href: '/dashboard/admin/events', icon: Calendar },
    { name: 'Venues', href: '/dashboard/admin/venues', icon: Building2 },
    { name: 'Vendors', href: '/dashboard/admin/vendors', icon: Store },
    { name: 'Users', href: '/dashboard/admin/users', icon: Users },
    { name: 'Create Admin', href: '/dashboard/admin/create-admin', icon: UserPlus },
    { name: 'Express Setup', href: '/dashboard/admin/express', icon: Zap },
    { name: 'Audit Logs', href: '/dashboard/admin/audit-logs', icon: Shield },
    { name: 'System', href: '/dashboard/admin/system-settings', icon: Settings },
  ]
};

function NavItem({ item, isActive }: { item: SidebarItem; isActive: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center space-x-3 rounded-2xl px-4 py-3 text-sm font-bold transition-all duration-500",
        isActive
          ? "bg-gradient-to-br from-white to-silver-300 text-black shadow-[0_0_20px_rgba(255,255,255,0.15)] ring-1 ring-white/20"
          : "text-zinc-500 hover:text-white hover:bg-white/5"
      )}
    >
      <Icon className={cn(
        "h-5 w-5 transition-all duration-300",
        isActive ? "text-black" : "text-zinc-500 group-hover:text-white group-hover:scale-110"
      )} />
      <span className="tracking-tight">{item.name}</span>
    </Link>
  );
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const role = isMounted && user?.role ? user.role : 'CUSTOMER';
  const items = SIDEBAR_ITEMS[role] || SIDEBAR_ITEMS['CUSTOMER'];

  if (!isMounted) return null;

  return (
    <div className="hidden border-r border-white/5 bg-[#000000] backdrop-blur-3xl md:block md:w-64 lg:w-72 h-screen sticky top-0 overflow-hidden shadow-2xl">
      {/* Animated background highlights */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[100px] rounded-full" />
      </div>

      <div className="flex h-full flex-col relative z-10">
        {/* Premium Brand Header */}
        <div className="flex h-20 items-center justify-center border-b border-white/5 px-6 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-zinc-400/20 to-transparent" />
          <Link href="/" className="flex items-center space-x-3 group">
            <motion.div
              className="relative h-10 w-10 overflow-hidden rounded-xl shadow-[0_0_15px_rgba(255,255,255,0.1)] border border-white/10"
              whileHover={{ scale: 1.1, rotate: 5 }}
            >
              <NextImage
                src="/logo.jpeg"
                alt="NearZro Logo"
                fill
                className="object-cover"
              />
            </motion.div>
            <span className="text-2xl font-black text-white tracking-tighter uppercase group-hover:text-zinc-300 transition-colors">
              NearZro
            </span>
          </Link>
        </div>

        {/* Dynamic Navigation */}
        <div className="flex-1 overflow-y-auto py-8 px-4 scrollbar-hide">
          <nav className="space-y-2">
            {items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <NavItem key={item.href} item={item} isActive={isActive} />
              );
            })}
          </nav>
        </div>

        {/* Elevated Profile Section */}
        <div className="p-6 border-t border-white/5 bg-white/[0.02]">
          <div className="flex items-center space-x-4 mb-6 px-1">
            <motion.div 
              className="h-12 w-12 rounded-2xl bg-gradient-to-br from-zinc-800 to-black flex items-center justify-center text-white font-black text-lg shadow-xl ring-1 ring-white/10"
              whileHover={{ scale: 1.05 }}
            >
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </motion.div>
            <div className="overflow-hidden">
              <p className="text-sm font-black text-white truncate leading-none mb-1 uppercase tracking-tighter">{user?.name || 'User'}</p>
              <div className="inline-flex items-center px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[8px] font-black text-zinc-500 uppercase tracking-widest">
                {role.replace('_', ' ')}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start h-12 rounded-xl text-zinc-500 hover:text-rose-500 hover:bg-rose-500/5 font-bold transition-all"
            onClick={logout}
          >
            <LogOut className="mr-3 h-5 w-5" />
            <span className="uppercase text-[10px] tracking-widest">Terminate Session</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

