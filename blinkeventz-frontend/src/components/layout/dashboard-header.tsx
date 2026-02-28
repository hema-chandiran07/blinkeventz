"use client";

import { Menu, Search, User, Settings, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NotificationsBell } from "./notifications-bell";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";

export function DashboardHeader() {
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user, logout } = useAuth();
  const router = useRouter();

  const getProfileLink = () => {
    switch (user?.role) {
      case "VENDOR":
        return "/dashboard/vendor/profile";
      case "VENUE_OWNER":
        return "/dashboard/venue/details";
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
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-silver-200 bg-white/80 backdrop-blur-xl px-4 shadow-sm sm:px-6 lg:px-8 transition-all duration-300">
      <div className="flex items-center flex-1 gap-4">
        <button className="text-neutral-500 hover:text-neutral-700 transition-colors md:hidden">
          <Menu className="h-6 w-6" />
        </button>

        {/* Animated Search */}
        <div className={cn(
          "relative transition-all duration-300 ease-out",
          searchFocused ? "w-full max-w-md" : "w-full max-w-sm"
        )}>
          <Search className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-300",
            searchFocused ? "text-neutral-700" : "text-neutral-400"
          )} />
          <Input
            placeholder="Search events, venues, vendors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className={cn(
              "pl-10 transition-all duration-300 border-silver-200",
              searchFocused
                ? "bg-white border-silver-300 ring-2 ring-silver-200 shadow-md"
                : "bg-silver-50/50 hover:bg-silver-50"
            )}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              <span className="sr-only">Clear</span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
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
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-silver-400 to-silver-600 flex items-center justify-center text-white font-semibold text-sm shadow-md">
              <User className="h-5 w-5" />
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
  );
}
