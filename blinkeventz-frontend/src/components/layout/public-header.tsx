"use client"

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, X, ShoppingCart, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/auth-context";

export function PublicHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();

  const getDashboardLink = () => {
    if (!user) return "/dashboard/customer";
    switch (user.role) {
      case "ADMIN": return "/dashboard/admin";
      case "VENDOR": return "/dashboard/vendor";
      case "VENUE_OWNER": return "/dashboard/venue";
      default: return "/dashboard/customer";
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-purple-100 bg-white/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600" />
          <span className="text-xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            BlinkEventz
          </span>
        </Link>

        <nav className="hidden md:flex items-center space-x-6">
          <Link href="/venues" className="text-sm font-medium text-gray-700 hover:text-purple-600">
            Venues
          </Link>
          <Link href="/vendors" className="text-sm font-medium text-gray-700 hover:text-purple-600">
            Vendors
          </Link>
          <Link href="/plan-event" className="text-sm font-medium text-gray-700 hover:text-purple-600">
            Plan Event
          </Link>
          
          {isAuthenticated && (
             <Link href={getDashboardLink()} className="text-sm font-medium text-purple-600 hover:text-purple-800 font-bold">
                Dashboard
             </Link>
          )}
        </nav>

        <div className="hidden md:flex items-center space-x-4">
          <Link href="/cart">
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="h-5 w-5 text-gray-700" />
            </Button>
          </Link>
          
          {isAuthenticated ? (
            <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-700">Hi, {user?.name}</span>
                <Button variant="ghost" onClick={logout}>Log out</Button>
            </div>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost">Log in</Button>
              </Link>
              <Link href="/register">
                <Button>Get Started</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden p-2"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-purple-100 bg-white px-4 py-4 space-y-4">
          <Link href="/venues" className="block text-sm font-medium text-gray-700 hover:text-purple-600">
            Venues
          </Link>
          <Link href="/vendors" className="block text-sm font-medium text-gray-700 hover:text-purple-600">
            Vendors
          </Link>
          <Link href="/plan-event" className="block text-sm font-medium text-gray-700 hover:text-purple-600">
            Plan Event
          </Link>
          
          {isAuthenticated && (
             <Link href={getDashboardLink()} className="block text-sm font-medium text-purple-600 hover:text-purple-800 font-bold">
                Dashboard
             </Link>
          )}

          <div className="pt-2 flex flex-col space-y-2">
             <Link href="/cart" className="w-full flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-purple-600">
                <ShoppingCart className="h-5 w-5" />
                <span>Cart</span>
            </Link>
            
            {isAuthenticated ? (
                <Button variant="ghost" className="w-full justify-start" onClick={logout}>Log out</Button>
            ) : (
                <>
                    <Link href="/login" className="w-full">
                    <Button variant="ghost" className="w-full justify-start">Log in</Button>
                    </Link>
                    <Link href="/register" className="w-full">
                    <Button className="w-full">Get Started</Button>
                    </Link>
                </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
