"use client";

import { Menu, Search, User, Settings, LogOut, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NotificationsBell } from "./notifications-bell";
import { useState, useEffect } from "react";
import { cn, getImageUrl } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { CommandPalette } from "../search/command-palette";

export function DashboardHeader() {
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const getProfileLink = () => {
    switch (user?.role) {
      case "VENDOR":
        return "/dashboard/vendor/profile";
      case "VENUE_OWNER":
        return "/dashboard/venue/profile";
      case "CUSTOMER":
        return "/dashboard/customer/profile";
      case "ADMIN":
        return "/dashboard/admin/users";
      default:
        return "/dashboard/customer/profile";
    }
  };

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    setMobileMenuOpen(false);
  };

  // Add global shortcut listener for Command Palette (Cmd+K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  const getSidebarItems = () => {
    switch (user?.role) {
      case "VENDOR":
        return [
          { name: 'Dashboard', href: '/dashboard/vendor' },
          { name: 'Services', href: '/dashboard/vendor/services' },
          { name: 'Bookings', href: '/dashboard/vendor/bookings' },
          { name: 'Calendar', href: '/dashboard/vendor/calendar' },
          { name: 'Earnings', href: '/dashboard/vendor/earnings' },
          { name: 'Analytics', href: '/dashboard/vendor/analytics' },
          { name: 'Portfolio', href: '/dashboard/vendor/portfolio' },
          { name: 'Reviews', href: '/dashboard/vendor/reviews' },
          { name: 'KYC & Bank', href: '/dashboard/vendor/kyc' },
          { name: 'Profile', href: '/dashboard/vendor/profile' },
        ];
      case "VENUE_OWNER":
        return [
          { name: 'Dashboard', href: '/dashboard/venue' },
          { name: 'My Venues', href: '/dashboard/venue/details' },
          { name: 'Bookings', href: '/dashboard/venue/bookings' },
          { name: 'Calendar', href: '/dashboard/venue/calendar' },
          { name: 'Analytics', href: '/dashboard/venue/analytics' },
          { name: 'Payouts', href: '/dashboard/venue/payouts' },
          { name: 'KYC & Bank', href: '/dashboard/venue/kyc' },
        ];
      case "CUSTOMER":
        return [
          { name: 'My Events', href: '/dashboard/customer/events' },
          { name: 'Notifications', href: '/dashboard/notifications' },
          { name: 'KYC Verification', href: '/dashboard/customer/kyc' },
          { name: 'Profile', href: '/dashboard/customer/profile' },
          { name: 'Settings', href: '/dashboard/settings' },
        ];
      case "ADMIN":
        return [
          { name: 'Overview', href: '/dashboard/admin' },
          { name: 'Transactions', href: '/dashboard/admin/transactions' },
          { name: 'Reports', href: '/dashboard/admin/reports' },
          { name: 'Payouts', href: '/dashboard/admin/payouts' },
          { name: 'Notifications', href: '/dashboard/notifications' },
          { name: 'Reviews', href: '/dashboard/admin/reviews' },
          { name: 'Promotions', href: '/dashboard/admin/promotions' },
          { name: 'KYC Approvals', href: '/dashboard/admin/kyc-approvals' },
          { name: 'Approvals', href: '/dashboard/admin/approvals' },
          { name: 'Events', href: '/dashboard/admin/events' },
          { name: 'Venues', href: '/dashboard/admin/venues' },
          { name: 'Vendors', href: '/dashboard/admin/vendors' },
          { name: 'Users', href: '/dashboard/admin/users' },
          { name: 'Audit Logs', href: '/dashboard/admin/audit-logs' },
          { name: 'System', href: '/dashboard/admin/system-settings' },
        ];
      default:
        return [];
    }
  };

  const sidebarItems = getSidebarItems();

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-silver-200 bg-white/80 backdrop-blur-xl px-4 shadow-sm sm:px-6 lg:px-8 transition-all duration-300">
        <div className="flex items-center flex-1 gap-4">
          <button
            className="text-neutral-500 hover:text-neutral-700 transition-colors md:hidden p-2 hover:bg-silver-100 rounded-lg"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Premium Search Trigger */}
          <div className="flex-1 max-w-md hidden md:block">
            <button
              onClick={() => setIsPaletteOpen(true)}
              className="w-full flex items-center justify-between px-4 py-2 bg-silver-50/50 hover:bg-silver-100/80 border border-silver-200 hover:border-silver-300 rounded-xl transition-all duration-300 group"
            >
              <div className="flex items-center gap-3">
                <Search className="h-4 w-4 text-neutral-400 group-hover:text-neutral-600 transition-colors" />
                <span className="text-sm text-neutral-400 font-medium group-hover:text-neutral-500">
                  Search everywhere...
                </span>
              </div>
              <div className="flex items-center gap-1.5 grayscale opacity-50 group-hover:opacity-100 transition-opacity">
                <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border border-silver-200 bg-white px-1.5 font-mono text-[10px] font-medium text-neutral-500">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </div>
            </button>
          </div>

          {/* Mobile Search Icon */}
          <button
            onClick={() => setIsPaletteOpen(true)}
            className="md:hidden p-2 text-neutral-500 hover:bg-silver-100 rounded-lg"
          >
            <Search className="h-6 w-6" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Notifications Bell */}
          <NotificationsBell />

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 p-1.5 rounded-full hover:bg-silver-100 transition-all duration-300"
            >
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-silver-400 to-silver-600 flex items-center justify-center text-white font-semibold text-sm shadow-md overflow-hidden">
                {user?.image ? (
                  <img
                    src={getImageUrl(user.image)}
                    alt={user.name || "User"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-5 w-5" />
                )}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-sm font-semibold text-black hover:text-neutral-700 transition-colors">
                  {user?.name || "User"}
                </p>
                <p className="text-xs text-neutral-500 capitalize">
                  {user?.role ? user.role.toLowerCase().replace("_", " ") : "User"}
                </p>
              </div>
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-silver-200 z-20 animate-scale-in">
                  <div className="p-2">
                    <button
                      onClick={() => {
                        router.push(getProfileLink());
                        setDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-silver-50 hover:text-black rounded-lg transition-colors"
                    >
                      <User className="h-4 w-4" />
                      Profile
                    </button>
                    <button
                      onClick={() => {
                        router.push("/dashboard/settings");
                        setDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-silver-50 hover:text-black rounded-lg transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </button>
                    <hr className="my-2 border-silver-200" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-white shadow-2xl z-50 md:hidden overflow-hidden"
            >
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-silver-200">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-silver-400 to-silver-600 flex items-center justify-center overflow-hidden">
                      {user?.image ? (
                        <img
                          src={getImageUrl(user.image)}
                          alt={user.name || "User"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User className="h-6 w-6 text-white" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-black">{user?.name || "User"}</p>
                      <p className="text-xs text-neutral-500 capitalize">
                        {user?.role ? user.role.toLowerCase().replace("_", " ") : "User"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 hover:bg-silver-100 rounded-lg transition-colors"
                  >
                    <X className="h-6 w-6 text-neutral-500" />
                  </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                  {sidebarItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <button
                        key={item.href}
                        onClick={() => {
                          router.push(item.href);
                          setMobileMenuOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300",
                          isActive
                            ? "bg-gradient-to-r from-silver-200 to-silver-100 text-black shadow-md"
                            : "text-neutral-600 hover:bg-silver-50 hover:text-black"
                        )}
                      >
                        {item.name}
                      </button>
                    );
                  })}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-silver-200 space-y-2">
                  <button
                    onClick={() => {
                      router.push(getProfileLink());
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-neutral-600 hover:bg-silver-50 hover:text-black transition-colors"
                  >
                    <User className="h-5 w-5" />
                    Profile
                  </button>
                  <button
                    onClick={() => {
                      router.push("/dashboard/settings");
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-neutral-600 hover:bg-silver-50 hover:text-black transition-colors"
                  >
                    <Settings className="h-5 w-5" />
                    Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-5 w-5" />
                    Logout
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <CommandPalette open={isPaletteOpen} setOpen={setIsPaletteOpen} />
    </>
  );
}
