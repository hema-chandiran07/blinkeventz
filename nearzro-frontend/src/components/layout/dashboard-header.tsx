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
          { name: 'My Venues', href: '/dashboard/venue' },
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
      <header className="sticky top-0 z-40 flex h-20 w-full items-center justify-between border-b border-white/5 bg-black/60 backdrop-blur-xl px-4 sm:px-6 lg:px-8 transition-all duration-500">
        <div className="flex items-center flex-1 gap-6">
          <button
            className="text-zinc-400 hover:text-white transition-colors md:hidden p-2 hover:bg-white/5 rounded-xl border border-white/10"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Premium Search Trigger */}
          <div className="flex-1 max-w-md hidden md:block">
            <button
              onClick={() => setIsPaletteOpen(true)}
              className="w-full flex items-center justify-between px-5 py-2.5 bg-zinc-900/50 hover:bg-zinc-800/50 border border-white/5 hover:border-white/10 rounded-2xl transition-all duration-500 group"
            >
              <div className="flex items-center gap-4">
                <Search className="h-4 w-4 text-zinc-500 group-hover:text-silver-300 transition-colors" />
                <span className="text-sm text-zinc-500 font-bold group-hover:text-zinc-400 tracking-tight">
                  Search Intelligence...
                </span>
              </div>
              <div className="flex items-center gap-2 opacity-30 group-hover:opacity-100 transition-opacity">
                <kbd className="inline-flex h-6 select-none items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-950 px-2 font-mono text-[10px] font-black text-zinc-400 shadow-inner">
                  <span className="text-xs font-sans">⌘</span>K
                </kbd>
              </div>
            </button>
          </div>

          {/* Mobile Search Icon */}
          <button
            onClick={() => setIsPaletteOpen(true)}
            className="md:hidden p-2.5 text-zinc-400 hover:text-white bg-zinc-900/50 border border-white/5 rounded-xl"
          >
            <Search className="h-6 w-6" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          {/* Notifications Bell */}
          <div className="relative p-1">
             <NotificationsBell />
          </div>

          <div className="h-8 w-px bg-white/5 mx-2" />

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-3 p-1.5 rounded-2xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all duration-500"
            >
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-zinc-800 to-black flex items-center justify-center text-white font-black text-sm shadow-2xl ring-1 ring-white/10 overflow-hidden">
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
                <p className="text-sm font-black text-white leading-none mb-1 uppercase tracking-tighter">
                  {user?.name || "User"}
                </p>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest leading-none">
                  {user?.role ? user.role.replace("_", " ") : "User"}
                </p>
              </div>
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {dropdownOpen && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-10"
                    onClick={() => setDropdownOpen(false)}
                  />
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="absolute right-0 mt-3 w-56 bg-zinc-950/90 backdrop-blur-2xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 z-20 overflow-hidden"
                  >
                    <div className="p-2.5">
                      <button
                        onClick={() => {
                          router.push(getProfileLink());
                          setDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                      >
                        <User className="h-4.5 w-4.5" />
                        Account Dossier
                      </button>
                      <button
                        onClick={() => {
                          router.push("/dashboard/settings");
                          setDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                      >
                        <Settings className="h-4.5 w-4.5" />
                        System Config
                      </button>
                      
                      <div className="my-2 border-t border-white/5" />
                      
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-rose-500 hover:bg-rose-500/5 rounded-xl transition-all"
                      >
                        <LogOut className="h-4.5 w-4.5" />
                        Terminate Session
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
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
