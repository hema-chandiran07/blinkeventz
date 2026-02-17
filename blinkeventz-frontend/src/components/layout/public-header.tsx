"use client"

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, X, ShoppingCart, ChevronDown } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { useAuth } from "@/context/auth-context";

export function PublicHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isVenuesOpen, setIsVenuesOpen] = useState(false);
  const [isVendorsOpen, setIsVendorsOpen] = useState(false);
  const isMounted = useSyncExternalStore(
    () => () => {}, // noop unsubscribe
    () => true,     // getSnapshot returns true on client
    () => false     // getServerSnapshot returns false on server
  );
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

          {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">

          {/* VENUES DROPDOWN */}
          <div
            className="relative"
            onMouseEnter={() => setIsVenuesOpen(true)}
          >
            <button
              onClick={() => setIsVenuesOpen(!isVenuesOpen)}
              className="flex items-center text-sm font-medium text-gray-700 hover:text-purple-600"
            >
              Venues
              <ChevronDown
                className={`ml-1 h-4 w-4 transition-transform ${
                  isVenuesOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            <div
              className={`absolute left-1/2 -translate-x-1/2 mt-4 w-[750px] rounded-2xl border border-gray-200 bg-white shadow-2xl p-8 grid grid-cols-3 gap-8 z-50 transition-all duration-200 ease-out
              ${
                isVenuesOpen
                  ? "opacity-100 translate-y-0 pointer-events-auto"
                  : "opacity-0 translate-y-2 pointer-events-none"
              }`}
              onMouseEnter={() => setIsVenuesOpen(true)}
              onMouseLeave={() => setIsVenuesOpen(false)}
            >

              {/* Column 1 - Venue Types */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4">
                  Venue Types
                </h3>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li><Link href="/venues?type=BanquetHall" className="hover:text-purple-600">Banquet Halls</Link></li>
                  <li><Link href="/venues?type=MarriageHall" className="hover:text-purple-600">Marriage Halls</Link></li>
                  <li><Link href="/venues?type=BeachVenue" className="hover:text-purple-600">Beach Venues</Link></li>
                  <li><Link href="/venues?type=Resort" className="hover:text-purple-600">Resorts</Link></li>
                  <li><Link href="/venues?type=Hotel" className="hover:text-purple-600">Hotels</Link></li>
                </ul>
              </div>

              {/* Column 2 - Popular Chennai Areas */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4">
                  Popular Areas in Chennai
                </h3>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li><Link href="/venues?area=T Nagar" className="hover:text-purple-600">T Nagar</Link></li>
                  <li><Link href="/venues?area=Velachery" className="hover:text-purple-600">Velachery</Link></li>
                  <li><Link href="/venues?area=Anna Nagar" className="hover:text-purple-600">Anna Nagar</Link></li>
                  <li><Link href="/venues?area=OMR" className="hover:text-purple-600">OMR</Link></li>
                  <li><Link href="/venues?area=Adyar" className="hover:text-purple-600">Adyar</Link></li>
                  <li><Link href="/venues?area=Tambaram" className="hover:text-purple-600">Tambaram</Link></li>
                </ul>
              </div>

              {/* Column 3 - Event Categories */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4">
                  By Event
                </h3>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li><Link href="/venues?event=Wedding" className="hover:text-purple-600">Wedding Venues</Link></li>
                  <li><Link href="/venues?event=Engagement" className="hover:text-purple-600">Engagement Halls</Link></li>
                  <li><Link href="/venues?event=Birthday" className="hover:text-purple-600">Birthday Party Halls</Link></li>
                  <li><Link href="/venues?event=Corporate" className="hover:text-purple-600">Corporate Events</Link></li>
                </ul>
              </div>

              {/* Bottom CTA */}
              <div className="col-span-3 border-t pt-6">
                <Link
                  href="/venues"
                  className="text-sm font-semibold text-purple-600 hover:text-purple-800"
                >
                  View All Chennai Venues →
                </Link>
              </div>

            </div>
          </div>

          {/* VENDORS DROPDOWN */}
          <div
            className="relative"
            onMouseEnter={() => setIsVendorsOpen(true)}
          >
            <button
              onClick={() => setIsVendorsOpen(!isVendorsOpen)}
              className="flex items-center text-sm font-medium text-gray-700 hover:text-purple-600"
            >
              Vendors
              <ChevronDown
                className={`ml-1 h-4 w-4 transition-transform ${
                  isVendorsOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            <div
              className={`absolute left-1/2 -translate-x-1/2 mt-4 w-[650px] rounded-2xl border border-gray-200 bg-white shadow-2xl p-8 grid grid-cols-3 gap-8 z-50 transition-all duration-200 ease-out
              ${
                isVendorsOpen
                  ? "opacity-100 translate-y-0 pointer-events-auto"
                  : "opacity-0 translate-y-2 pointer-events-none"
              }`}
              onMouseEnter={() => setIsVendorsOpen(true)}
              onMouseLeave={() => setIsVendorsOpen(false)}
            >

  {/* Column 1 */}
  <div>
    <h3 className="text-sm font-semibold text-gray-900 mb-4">
      Food & Catering
    </h3>
    <ul className="space-y-3 text-sm text-gray-600">
      <li>
        <Link href="/vendors?type=Catering" className="hover:text-purple-600">
          Catering Services
        </Link>
      </li>
      <li>
        <Link href="/vendors?type=Bakery" className="hover:text-purple-600">
          Cake & Bakery
        </Link>
      </li>
      <li>
        <Link href="/vendors?type=Beverages" className="hover:text-purple-600">
          Beverage Services
        </Link>
      </li>
    </ul>
  </div>

  {/* Column 2 */}
  <div>
    <h3 className="text-sm font-semibold text-gray-900 mb-4">
      Media & Entertainment
    </h3>
    <ul className="space-y-3 text-sm text-gray-600">
      <li>
        <Link href="/vendors?type=Photography" className="hover:text-purple-600">
          Photography
        </Link>
      </li>
      <li>
        <Link href="/vendors?type=Videography" className="hover:text-purple-600">
          Videography
        </Link>
      </li>
      <li>
        <Link href="/vendors?type=DJ" className="hover:text-purple-600">
          DJ & Music
        </Link>
      </li>
      <li>
        <Link href="/vendors?type=LiveBand" className="hover:text-purple-600">
          Live Bands
        </Link>
      </li>
    </ul>
  </div>

  {/* Column 3 */}
  <div>
    <h3 className="text-sm font-semibold text-gray-900 mb-4">
      Event Essentials
    </h3>
    <ul className="space-y-3 text-sm text-gray-600">
      <li>
        <Link href="/vendors?type=Decoration" className="hover:text-purple-600">
          Decoration
        </Link>
      </li>
      <li>
        <Link href="/vendors?type=Makeup" className="hover:text-purple-600">
          Makeup Artists
        </Link>
      </li>
      <li>
        <Link href="/vendors?type=Lighting" className="hover:text-purple-600">
          Lighting Services
        </Link>
      </li>
      <li>
        <Link href="/vendors?type=EventPlanner" className="hover:text-purple-600">
          Event Planners
        </Link>
      </li>
    </ul>
  </div>

  {/* Bottom Section */}
  <div className="col-span-3 border-t pt-6 flex justify-between items-center">
    <Link
      href="/vendors"
      className="text-sm font-semibold text-purple-600 hover:text-purple-800"
    >
      View All Vendors →
    </Link>
  </div>

</div>
          </div>

          <Link href="/plan-event" className="text-sm font-medium text-gray-700 hover:text-purple-600">
            Plan Event
          </Link>

          {isMounted && isAuthenticated && (
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

          {isMounted ? (
            isAuthenticated ? (
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
            )
          ) : (
            // Placeholder during SSR to match client initial render
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

          {isMounted && isAuthenticated && (
             <Link href={getDashboardLink()} className="block text-sm font-medium text-purple-600 hover:text-purple-800 font-bold">
                Dashboard
             </Link>
          )}

          <div className="pt-2 flex flex-col space-y-2">
             <Link href="/cart" className="w-full flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-purple-600">
                <ShoppingCart className="h-5 w-5" />
                <span>Cart</span>
            </Link>

            {isMounted ? (
              isAuthenticated ? (
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
              )
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
