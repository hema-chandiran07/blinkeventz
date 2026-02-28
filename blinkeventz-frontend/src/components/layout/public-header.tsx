"use client"

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, X, ShoppingCart, ChevronDown, ArrowLeft } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { useAuth } from "@/context/auth-context";
import { useCart } from "@/context/cart-context";
import { useRouter } from "next/navigation";

export function PublicHeader() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isVenuesOpen, setIsVenuesOpen] = useState(false);
  const [isVendorsOpen, setIsVendorsOpen] = useState(false);
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const { user, isAuthenticated, logout } = useAuth();
  const { getItemCount } = useCart();
  const cartItemCount = getItemCount();

  const handleGoBack = () => {
    router.back();
  };

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
    <header className="sticky top-0 z-50 w-full border-b border-silver-200 bg-white/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-neutral-600 hover:text-black hover:bg-silver-100"
            onClick={handleGoBack}
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <Link href="/" className="flex items-center space-x-2 group">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-black to-neutral-900 group-hover:scale-110 transition-transform duration-300" />
            <span className="text-xl font-bold bg-gradient-to-r from-black to-neutral-900 bg-clip-text text-transparent">
              BlinkEventz
            </span>
          </Link>
        </div>

          {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link href="/" className="text-sm font-medium text-neutral-700 hover:text-black transition-colors">
            Home
          </Link>

          {/* VENUES DROPDOWN */}
          <div
            className="relative group"
            onMouseEnter={() => setIsVenuesOpen(true)}
            onMouseLeave={() => setIsVenuesOpen(false)}
          >
            <button
              className="flex items-center text-sm font-medium text-neutral-700 hover:text-black"
              onClick={() => setIsVenuesOpen(!isVenuesOpen)}
            >
              Venues
              <ChevronDown
                className={`ml-1 h-4 w-4 transition-transform ${isVenuesOpen ? 'rotate-180' : 'group-hover:rotate-180'}`}
              />
            </button>

            <div
              className={`absolute left-1/2 -translate-x-1/2 mt-4 w-[750px] rounded-2xl border border-silver-200 bg-white shadow-2xl p-8 grid grid-cols-3 gap-8 z-50 transition-all duration-200 ease-out ${isVenuesOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-2 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0'}`}
            >

              {/* Column 1 - Venue Types */}
              <div>
                <h3 className="text-sm font-semibold text-black mb-4">
                  Venue Types
                </h3>
                <ul className="space-y-3 text-sm text-neutral-600">
                  <li><Link href="/venues?type=BanquetHall" className="hover:text-black">Banquet Halls</Link></li>
                  <li><Link href="/venues?type=MarriageHall" className="hover:text-black">Marriage Halls</Link></li>
                  <li><Link href="/venues?type=BeachVenue" className="hover:text-black">Beach Venues</Link></li>
                  <li><Link href="/venues?type=Resort" className="hover:text-black">Resorts</Link></li>
                  <li><Link href="/venues?type=Hotel" className="hover:text-black">Hotels</Link></li>
                </ul>
              </div>

              {/* Column 2 - Popular Chennai Areas */}
              <div>
                <h3 className="text-sm font-semibold text-black mb-4">
                  Popular Areas in Chennai
                </h3>
                <ul className="space-y-3 text-sm text-neutral-600">
                  <li><Link href="/venues?area=T Nagar" className="hover:text-black" onClick={() => setIsVenuesOpen(false)}>T Nagar</Link></li>
                  <li><Link href="/venues?area=Velachery" className="hover:text-black" onClick={() => setIsVenuesOpen(false)}>Velachery</Link></li>
                  <li><Link href="/venues?area=Anna Nagar" className="hover:text-black" onClick={() => setIsVenuesOpen(false)}>Anna Nagar</Link></li>
                  <li><Link href="/venues?area=OMR" className="hover:text-black" onClick={() => setIsVenuesOpen(false)}>OMR</Link></li>
                  <li><Link href="/venues?area=Adyar" className="hover:text-black" onClick={() => setIsVenuesOpen(false)}>Adyar</Link></li>
                  <li><Link href="/venues?area=Tambaram" className="hover:text-black" onClick={() => setIsVenuesOpen(false)}>Tambaram</Link></li>
                </ul>
              </div>

              {/* Column 3 - Event Categories */}
              <div>
                <h3 className="text-sm font-semibold text-black mb-4">
                  By Event
                </h3>
                <ul className="space-y-3 text-sm text-neutral-600">
                  <li><Link href="/venues?event=Wedding" className="hover:text-black">Wedding Venues</Link></li>
                  <li><Link href="/venues?event=Engagement" className="hover:text-black">Engagement Halls</Link></li>
                  <li><Link href="/venues?event=Birthday" className="hover:text-black">Birthday Party Halls</Link></li>
                  <li><Link href="/venues?event=Corporate" className="hover:text-black">Corporate Events</Link></li>
                </ul>
              </div>

              {/* Bottom CTA */}
              <div className="col-span-3 border-t pt-6">
                <Link
                  href="/venues"
                  className="text-sm font-semibold text-black hover:text-neutral-800"
                >
                  View All Chennai Venues →
                </Link>
              </div>

            </div>
          </div>

          {/* VENDORS DROPDOWN */}
          <div
            className="relative group"
            onMouseEnter={() => setIsVendorsOpen(true)}
            onMouseLeave={() => setIsVendorsOpen(false)}
          >
            <button
              className="flex items-center text-sm font-medium text-neutral-700 hover:text-black"
              onClick={() => setIsVendorsOpen(!isVendorsOpen)}
            >
              Vendors
              <ChevronDown
                className={`ml-1 h-4 w-4 transition-transform ${isVendorsOpen ? 'rotate-180' : 'group-hover:rotate-180'}`}
              />
            </button>

            <div
              className={`absolute left-1/2 -translate-x-1/2 mt-4 w-[650px] rounded-2xl border border-silver-200 bg-white shadow-2xl p-8 grid grid-cols-3 gap-8 z-50 transition-all duration-200 ease-out ${isVendorsOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-2 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0'}`}
            >

  {/* Column 1 */}
  <div>
    <h3 className="text-sm font-semibold text-black mb-4">
      Food & Catering
    </h3>
    <ul className="space-y-3 text-sm text-neutral-600">
      <li>
        <Link href="/vendors?type=Catering" className="hover:text-black">
          Catering Services
        </Link>
      </li>
      <li>
        <Link href="/vendors?type=Bakery" className="hover:text-black">
          Cake & Bakery
        </Link>
      </li>
      <li>
        <Link href="/vendors?type=Beverages" className="hover:text-black">
          Beverage Services
        </Link>
      </li>
    </ul>
  </div>

  {/* Column 2 */}
  <div>
    <h3 className="text-sm font-semibold text-black mb-4">
      Media & Entertainment
    </h3>
    <ul className="space-y-3 text-sm text-neutral-600">
      <li>
        <Link href="/vendors?type=Photography" className="hover:text-black">
          Photography
        </Link>
      </li>
      <li>
        <Link href="/vendors?type=Videography" className="hover:text-black">
          Videography
        </Link>
      </li>
      <li>
        <Link href="/vendors?type=DJ" className="hover:text-black">
          DJ & Music
        </Link>
      </li>
      <li>
        <Link href="/vendors?type=LiveBand" className="hover:text-black">
          Live Bands
        </Link>
      </li>
    </ul>
  </div>

  {/* Column 3 */}
  <div>
    <h3 className="text-sm font-semibold text-black mb-4">
      Event Essentials
    </h3>
    <ul className="space-y-3 text-sm text-neutral-600">
      <li>
        <Link href="/vendors?type=Decoration" className="hover:text-black">
          Decoration
        </Link>
      </li>
      <li>
        <Link href="/vendors?type=Makeup" className="hover:text-black">
          Makeup Artists
        </Link>
      </li>
      <li>
        <Link href="/vendors?type=Lighting" className="hover:text-black">
          Lighting Services
        </Link>
      </li>
      <li>
        <Link href="/vendors?type=EventPlanner" className="hover:text-black">
          Event Planners
        </Link>
      </li>
    </ul>
  </div>

  {/* Bottom Section */}
  <div className="col-span-3 border-t pt-6 flex justify-between items-center">
    <Link
      href="/vendors"
      className="text-sm font-semibold text-black hover:text-neutral-800"
    >
      View All Vendors →
    </Link>
  </div>

</div>
          </div>

          <Link href="/plan-event" className="text-sm font-medium text-neutral-700 hover:text-black">
            Plan Event
          </Link>

          {isMounted && isAuthenticated && (
             <Link href={getDashboardLink()} className="text-sm font-medium text-black hover:text-neutral-800 font-bold">
                Dashboard
             </Link>
          )}
        </nav>

        <div className="hidden md:flex items-center space-x-4">
          <Link href="/cart">
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="h-5 w-5 text-neutral-700" />
              {isMounted && cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center">
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </span>
              )}
            </Button>
          </Link>

          {isMounted ? (
            isAuthenticated ? (
              <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-neutral-700">Hi, {user?.name}</span>
                  <Button variant="silver" onClick={logout}>Log out</Button>
              </div>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="silver">Log in</Button>
                </Link>
                <Link href="/register">
                  <Button variant="premium">Get Started</Button>
                </Link>
              </>
            )
          ) : (
            // Placeholder during SSR to match client initial render
            <>
              <Link href="/login">
                <Button variant="silver">Log in</Button>
              </Link>
              <Link href="/register">
                <Button variant="premium">Get Started</Button>
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
        <div className="md:hidden border-t border-silver-200 bg-white px-4 py-4 space-y-4">
          <Link href="/venues" className="block text-sm font-medium text-neutral-700 hover:text-black">
            Venues
          </Link>
          <Link href="/vendors" className="block text-sm font-medium text-neutral-700 hover:text-black">
            Vendors
          </Link>
          <Link href="/plan-event" className="block text-sm font-medium text-neutral-700 hover:text-black">
            Plan Event
          </Link>

          {isMounted && isAuthenticated && (
             <Link href={getDashboardLink()} className="block text-sm font-medium text-black hover:text-neutral-800 font-bold">
                Dashboard
             </Link>
          )}

          <div className="pt-2 flex flex-col space-y-2">
             <Link href="/cart" className="w-full flex items-center space-x-2 text-sm font-medium text-neutral-700 hover:text-black">
                <div className="relative">
                  <ShoppingCart className="h-5 w-5" />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-black text-white text-[10px] font-bold flex items-center justify-center">
                      {cartItemCount > 99 ? '99+' : cartItemCount}
                    </span>
                  )}
                </div>
                <span>Cart {cartItemCount > 0 && `(${cartItemCount})`}</span>
            </Link>

            {isMounted ? (
              isAuthenticated ? (
                  <Button variant="silver" className="w-full justify-start" onClick={logout}>Log out</Button>
              ) : (
                  <>
                      <Link href="/login" className="w-full">
                      <Button variant="silver" className="w-full justify-start">Log in</Button>
                      </Link>
                      <Link href="/register" className="w-full">
                      <Button variant="premium" className="w-full">Get Started</Button>
                      </Link>
                  </>
              )
            ) : (
              <>
                  <Link href="/login" className="w-full">
                  <Button variant="silver" className="w-full justify-start">Log in</Button>
                  </Link>
                  <Link href="/register" className="w-full">
                  <Button variant="premium" className="w-full">Get Started</Button>
                  </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
