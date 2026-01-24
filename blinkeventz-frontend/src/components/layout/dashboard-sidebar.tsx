"use client"

import Link from "next/link";
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
  CheckSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Roles are now handled by AuthContext, but we keep the items definition here
interface SidebarItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

const SIDEBAR_ITEMS: Record<string, SidebarItem[]> = {
  CUSTOMER: [
    { name: 'My Events', href: '/dashboard/customer', icon: Calendar },
    { name: 'Profile', href: '/dashboard/customer/profile', icon: Users },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ],
  VENDOR: [
    { name: 'Dashboard', href: '/dashboard/vendor', icon: LayoutDashboard },
    { name: 'Services', href: '/dashboard/vendor/services', icon: ShoppingBag },
    { name: 'Bookings', href: '/dashboard/vendor/bookings', icon: Calendar },
    { name: 'Profile', href: '/dashboard/vendor/profile', icon: Store },
  ],
  VENUE_OWNER: [
    { name: 'Dashboard', href: '/dashboard/venue', icon: LayoutDashboard },
    { name: 'My Venue', href: '/dashboard/venue/details', icon: Building2 },
    { name: 'Bookings', href: '/dashboard/venue/bookings', icon: Calendar },
    { name: 'Calendar', href: '/dashboard/venue/calendar', icon: Calendar },
  ],
  ADMIN: [
    { name: 'Overview', href: '/dashboard/admin', icon: LayoutDashboard },
    { name: 'Approvals', href: '/dashboard/admin/approvals', icon: CheckSquare },
    { name: 'Events', href: '/dashboard/admin/events', icon: Calendar },
    { name: 'Users', href: '/dashboard/admin/users', icon: Users },
  ]
};

export function DashboardSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  
  // Use logged-in user role, or fallback to Customer (or derive from path for robustness if user is null during transition)
  const role = user?.role || 'CUSTOMER';
  const items = SIDEBAR_ITEMS[role] || SIDEBAR_ITEMS['CUSTOMER'];

  return (
    <div className="hidden border-r border-purple-100 bg-white md:block md:w-64 lg:w-72 h-screen sticky top-0">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-purple-100 px-6">
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600" />
            <span className="text-xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
              BlinkEventz
            </span>
          </Link>
        </div>

        {/* Nav Items */}
        <div className="flex-1 overflow-y-auto py-6 px-4">
          <nav className="space-y-1">
            {items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-purple-50 text-purple-700"
                      : "text-gray-700 hover:bg-gray-50 hover:text-purple-600"
                  )}
                >
                  <item.icon className={cn("h-5 w-5", isActive ? "text-purple-600" : "text-gray-400")} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Profile / Logout */}
        <div className="border-t border-purple-100 p-4">
          <div className="flex items-center space-x-3 mb-4 px-2">
            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold">
                {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
                <p className="text-sm font-medium text-gray-900">{user?.name || 'User'}</p>
                <p className="text-xs text-gray-500 capitalize">{role.toLowerCase().replace('_', ' ')}</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100"
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
