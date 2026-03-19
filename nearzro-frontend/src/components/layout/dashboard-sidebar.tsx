"use client"

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import {
  LayoutDashboard,
  Calendar,
  ShoppingBag,
  Settings,
  LogOut,
  Store,
  Building2,
  Users,
  CheckSquare,
  CreditCard,
  BarChart3,
  DollarSign,
  Bell,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
    { name: 'Profile', href: '/dashboard/customer/profile', icon: Users },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ],
  VENDOR: [
    { name: 'Dashboard', href: '/dashboard/vendor', icon: LayoutDashboard },
    { name: 'Services', href: '/dashboard/vendor/services', icon: ShoppingBag },
    { name: 'Bookings', href: '/dashboard/vendor/bookings', icon: Calendar },
    { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
    { name: 'KYC & Bank', href: '/dashboard/vendor/kyc', icon: CheckSquare },
    { name: 'Profile', href: '/dashboard/vendor/profile', icon: Store },
  ],
  VENUE_OWNER: [
    { name: 'Dashboard', href: '/dashboard/venue', icon: LayoutDashboard },
    { name: 'My Venues', href: '/dashboard/venue#venues', icon: Building2 },
    { name: 'Bookings', href: '/dashboard/venue/bookings', icon: Calendar },
    { name: 'Calendar', href: '/dashboard/venue/calendar', icon: Calendar },
    { name: 'Analytics', href: '/dashboard/venue/analytics', icon: BarChart3 },
    { name: 'Payouts', href: '/dashboard/venue/payouts', icon: DollarSign },
    { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
    { name: 'KYC & Bank', href: '/dashboard/venue/kyc', icon: CheckSquare },
  ],
  ADMIN: [
    { name: 'Overview', href: '/dashboard/admin', icon: LayoutDashboard },
    { name: 'Transactions', href: '/dashboard/admin/transactions', icon: CreditCard },
    { name: 'Reports', href: '/dashboard/admin/reports', icon: BarChart3 },
    { name: 'Payouts', href: '/dashboard/admin/payouts', icon: DollarSign },
    { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
    { name: 'Reviews', href: '/dashboard/admin/reviews', icon: CheckSquare },
    { name: 'Promotions', href: '/dashboard/admin/promotions', icon: CheckSquare },
    { name: 'KYC Approvals', href: '/dashboard/admin/kyc-approvals', icon: CheckSquare },
    { name: 'Approvals', href: '/dashboard/admin/approvals', icon: CheckSquare },
    { name: 'Events', href: '/dashboard/admin/events', icon: Calendar },
    { name: 'Venues', href: '/dashboard/admin/venues', icon: Building2 },
    { name: 'Vendors', href: '/dashboard/admin/vendors', icon: Store },
    { name: 'Users', href: '/dashboard/admin/users', icon: Users },
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
        "group flex items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-300",
        isActive
          ? "bg-gradient-to-r from-silver-100 to-silver-200 text-black shadow-md"
          : "text-neutral-700 hover:bg-gradient-to-r hover:from-silver-50 hover:to-silver-100 hover:text-black"
      )}
    >
      <Icon className={cn(
        "h-5 w-5 transition-all duration-300",
        isActive ? "text-black" : "text-neutral-400 group-hover:text-black"
      )} />
      <span>{item.name}</span>
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

  if (!isMounted) {
    return (
      <div className="hidden border-r border-silver-200 bg-white md:block md:w-64 lg:w-72 h-screen sticky top-0">
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center border-b border-silver-200 px-6">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-silver-400 to-silver-600" />
              <span className="text-xl font-bold text-black">
                NearZro
              </span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto py-6 px-4">
            <nav className="space-y-1">
              {SIDEBAR_ITEMS['CUSTOMER'].map((item) => (
                <div
                  key={item.href}
                  className="flex items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-700"
                >
                  <item.icon className="h-5 w-5 text-neutral-400" />
                  <span>{item.name}</span>
                </div>
              ))}
            </nav>
          </div>
          <div className="border-t border-silver-200 p-4">
            <div className="flex items-center space-x-3 mb-4 px-2">
              <div className="h-10 w-10 rounded-full bg-silver-200" />
              <div>
                <div className="h-4 w-24 bg-silver-200 rounded" />
                <div className="h-3 w-16 bg-silver-200 rounded mt-2" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hidden border-r border-silver-200 bg-white md:block md:w-64 lg:w-72 h-screen sticky top-0 overflow-hidden">
      <div className="flex h-full flex-col">
        {/* Logo - NearZro with Animation */}
        <div className="flex h-16 items-center border-b border-silver-200 px-6 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-silver-50 to-transparent" />
          <Link href="/" className="flex items-center space-x-3 relative z-10 group">
            <motion.div
              className="relative h-10 w-10 overflow-hidden rounded-lg shadow-lg shadow-silver-400/30"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <Image
                src="/logo.jpeg"
                alt="NearZro Logo"
                fill
                className="object-cover"
              />
            </motion.div>
            <span className="text-xl font-bold bg-gradient-to-r from-black to-neutral-700 bg-clip-text text-transparent group-hover:from-neutral-800 group-hover:to-black transition-all">
              NearZro
            </span>
          </Link>
        </div>

        {/* Nav Items */}
        <div className="flex-1 overflow-y-auto py-6 px-4">
          <nav className="space-y-1 relative">
            {items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <div key={item.href} className="relative">
                  <NavItem item={item} isActive={isActive} />
                </div>
              );
            })}
          </nav>
        </div>

        {/* User Profile / Logout */}
        <div className="border-t border-silver-200 p-4 bg-gradient-to-t from-silver-50/50 to-transparent">
          <div className="flex items-center space-x-3 mb-4 px-2">
            <motion.div 
              className="h-10 w-10 rounded-full bg-gradient-to-br from-silver-300 to-silver-500 flex items-center justify-center text-white font-bold shadow-lg shadow-silver-300/30"
              whileHover={{ scale: 1.05 }}
            >
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </motion.div>
            <div>
              <p className="text-sm font-semibold text-black">{user?.name || 'User'}</p>
              <p className="text-xs text-neutral-500 capitalize">{role.toLowerCase().replace('_', ' ')}</p>
            </div>
          </div>
          <Button
            variant="silver"
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={logout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </Button>
        </div>
      </div>
    </div>
  );
}
