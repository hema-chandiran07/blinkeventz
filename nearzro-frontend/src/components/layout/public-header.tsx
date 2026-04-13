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
    <header className="sticky top-0 z-[100] w-full border-b border-white/5 bg-black/60 backdrop-blur-md">
      <div className="container mx-auto flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/10"
            onClick={handleGoBack}
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <Link href="/" className="flex items-center space-x-2 group">
            <div className="relative h-12 w-12 overflow-hidden rounded-xl transition-transform duration-300 group-hover:scale-110">
              <img
                src="/logo.jpeg"
                alt="NearZro Logo"
                className="h-full w-full object-cover brightness-110 contrast-110"
              />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent group-hover:from-zinc-100 group-hover:to-white transition-all">
              NearZro
            </span>
          </Link>
        </div>

          {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link href="/" className="text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-all">
            Home
          </Link>

          {/* VENUES DROPDOWN */}
          <div
            className="relative group"
            onMouseEnter={() => setIsVenuesOpen(true)}
            onMouseLeave={() => setIsVenuesOpen(false)}
          >
            <div className="flex items-center">
              <Link
                href="/venues"
                className="text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/10 px-3 py-2 rounded-l-lg transition-all"
              >
                Venues
              </Link>
              <button
                className="text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/10 px-2 py-2 rounded-r-lg transition-all"
                onClick={() => setIsVenuesOpen(!isVenuesOpen)}
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${isVenuesOpen ? 'rotate-180' : 'group-hover:rotate-180'}`}
                />
              </button>
            </div>

            <div
              className={`absolute left-1/2 -translate-x-1/2 mt-4 w-[750px] rounded-2xl border border-white/8 bg-zinc-950/95 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] p-8 grid grid-cols-3 gap-8 z-[100] transition-all duration-200 ease-out ${isVenuesOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-2 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0'}`}
            >

              {/* Column 1 - Venue Types */}
              <div>
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">
                  Venue Types
                </h3>
                <ul className="space-y-3 text-sm text-zinc-400">
                  <li><Link href="/venues?type=BANQUET_HALL" className="hover:text-white transition-colors">Banquet Halls</Link></li>
                  <li><Link href="/venues?type=MARRIAGE_HALL" className="hover:text-white transition-colors">Marriage Halls</Link></li>
                  <li><Link href="/venues?type=BEACH_VENUE" className="hover:text-white transition-colors">Beach Venues</Link></li>
                  <li><Link href="/venues?type=RESORT" className="hover:text-white transition-colors">Resorts</Link></li>
                  <li><Link href="/venues?type=HOTEL" className="hover:text-white transition-colors">Hotels</Link></li>
                </ul>
              </div>

              {/* Column 2 - Popular Chennai Areas */}
              <div>
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">
                  Popular Areas
                </h3>
                <ul className="space-y-3 text-sm text-zinc-400">
                  <li><Link href="/venues?area=T Nagar" className="hover:text-white transition-colors" onClick={() => setIsVenuesOpen(false)}>T Nagar</Link></li>
                  <li><Link href="/venues?area=Velachery" className="hover:text-white transition-colors" onClick={() => setIsVenuesOpen(false)}>Velachery</Link></li>
                  <li><Link href="/venues?area=Anna Nagar" className="hover:text-white transition-colors" onClick={() => setIsVenuesOpen(false)}>Anna Nagar</Link></li>
                  <li><Link href="/venues?area=OMR" className="hover:text-white transition-colors" onClick={() => setIsVenuesOpen(false)}>OMR</Link></li>
                  <li><Link href="/venues?area=Adyar" className="hover:text-white transition-colors" onClick={() => setIsVenuesOpen(false)}>Adyar</Link></li>
                  <li><Link href="/venues?area=Tambaram" className="hover:text-white transition-colors" onClick={() => setIsVenuesOpen(false)}>Tambaram</Link></li>
                </ul>
              </div>

              {/* Column 3 - Event Categories */}
              <div>
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">
                  By Event
                </h3>
                <ul className="space-y-3 text-sm text-zinc-400">
                  <li><Link href="/venues?event=Wedding" className="hover:text-white transition-colors">Wedding Venues</Link></li>
                  <li><Link href="/venues?event=Engagement" className="hover:text-white transition-colors">Engagement Halls</Link></li>
                  <li><Link href="/venues?event=Birthday" className="hover:text-white transition-colors">Birthday Party Halls</Link></li>
                  <li><Link href="/venues?event=Corporate" className="hover:text-white transition-colors">Corporate Events</Link></li>
                </ul>
              </div>

              {/* Bottom CTA */}
              <div className="col-span-3 border-t border-white/8 pt-6">
                <Link
                  href="/venues"
                  className="text-sm font-semibold text-zinc-300 hover:text-white transition-colors"
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
            <div className="flex items-center">
              <Link
                href="/vendors"
                className="text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/10 px-3 py-2 rounded-l-lg transition-all"
              >
                Vendors
              </Link>
              <button
                className="text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/10 px-2 py-2 rounded-r-lg transition-all"
                onClick={() => setIsVendorsOpen(!isVendorsOpen)}
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${isVendorsOpen ? 'rotate-180' : 'group-hover:rotate-180'}`}
                />
              </button>
            </div>

            <div
              className={`absolute left-1/2 -translate-x-1/2 mt-4 w-[650px] rounded-2xl border border-white/8 bg-zinc-950/95 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] p-8 grid grid-cols-3 gap-8 z-[100] transition-all duration-200 ease-out ${isVendorsOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-2 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0'}`}
            >

  {/* Column 1 */}
  <div>
    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">
      Food & Catering
    </h3>
    <ul className="space-y-3 text-sm text-zinc-400">
      <li>
        <Link href="/vendors?type=CATERING" className="hover:text-white transition-colors">
          Catering Services
        </Link>
      </li>
    </ul>
  </div>

  {/* Column 2 */}
  <div>
    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">
      Media & Entertainment
    </h3>
    <ul className="space-y-3 text-sm text-zinc-400">
      <li>
        <Link href="/vendors?type=PHOTOGRAPHY" className="hover:text-white transition-colors">
          Photography
        </Link>
      </li>
      <li>
        <Link href="/vendors?type=VIDEOGRAPHY" className="hover:text-white transition-colors">
          Videography
        </Link>
      </li>
      <li>
        <Link href="/vendors?type=DJ" className="hover:text-white transition-colors">
          DJ & Music
        </Link>
      </li>
      <li>
        <Link href="/vendors?type=MUSIC" className="hover:text-white transition-colors">
          Live Bands
        </Link>
      </li>
    </ul>
  </div>

  {/* Column 3 */}
  <div>
    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">
      Event Essentials
    </h3>
    <ul className="space-y-3 text-sm text-zinc-400">
      <li>
        <Link href="/vendors?type=DECOR" className="hover:text-white transition-colors">
          Decoration
        </Link>
      </li>
      <li>
        <Link href="/vendors?type=MAKEUP" className="hover:text-white transition-colors">
          Makeup Artists
        </Link>
      </li>
    </ul>
  </div>

  {/* Bottom Section */}
  <div className="col-span-3 border-t border-white/8 pt-6 flex justify-between items-center">
    <Link
      href="/vendors"
      className="text-sm font-semibold text-zinc-300 hover:text-white transition-colors"
    >
      View All Vendors →
    </Link>
  </div>

</div>
          </div>

          <Link href="/plan-event" className="text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-all">
            Plan Event
          </Link>

          {isMounted && isAuthenticated && (
             <Link href={getDashboardLink()} className="text-sm font-medium text-zinc-200 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-all font-semibold">
                Dashboard
             </Link>
          )}
        </nav>

        <div className="hidden md:flex items-center space-x-4">
          <Link href="/cart">
            <Button variant="ghost" size="icon" className="relative hover:bg-white/10">
              <ShoppingCart className="h-5 w-5 text-zinc-400 group-hover:text-white" />
              {isMounted && cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-white text-black text-xs font-bold flex items-center justify-center">
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </span>
              )}
            </Button>
          </Link>

          {isMounted ? (
            isAuthenticated ? (
              <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-zinc-300">Hi, {user?.name}</span>
                  <Button variant="ghost" className="text-zinc-300 hover:text-white hover:bg-white/10" onClick={logout}>Log out</Button>
              </div>
            ) : (
              <>
                <Link href="/login">
                  <Button className="px-5 py-2 rounded-xl text-sm font-semibold text-silver-200 border border-silver-500/20 glass-dark-subtle transition-all duration-300">Log in</Button>
                </Link>
                <Link href="/register">
                  <Button className="px-6 py-2.5 rounded-xl text-sm font-bold text-black-important btn-premium shadow-[0_0_15px_rgba(255,255,255,0.15)]">Get Started</Button>
                </Link>
              </>
            )
          ) : (
            // Placeholder during SSR to match client initial render
            <>
              <Link href="/login">
                <Button className="px-5 py-2 rounded-xl text-sm font-semibold text-silver-200 border border-silver-500/20 glass-dark-subtle transition-all duration-300">Log in</Button>
              </Link>
              <Link href="/register">
                <Button className="px-6 py-2.5 rounded-xl text-sm font-bold text-black-important btn-premium shadow-[0_0_15px_rgba(255,255,255,0.15)]">Get Started</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden p-2 text-zinc-300 hover:text-white transition-colors"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-white/8 bg-zinc-950/98 backdrop-blur-xl px-4 py-4 space-y-4">
          <Link href="/venues" className="block text-sm font-medium text-zinc-400 hover:text-white transition-colors">
            Venues
          </Link>
          <Link href="/vendors" className="block text-sm font-medium text-zinc-400 hover:text-white transition-colors">
            Vendors
          </Link>
          <Link href="/plan-event" className="block text-sm font-medium text-zinc-400 hover:text-white transition-colors">
            Plan Event
          </Link>

          {isMounted && isAuthenticated && (
             <Link href={getDashboardLink()} className="block text-sm font-medium text-zinc-200 hover:text-white transition-colors font-semibold">
                Dashboard
             </Link>
          )}

          <div className="pt-2 flex flex-col space-y-2">
             <Link href="/cart" className="w-full flex items-center space-x-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                <div className="relative">
                  <ShoppingCart className="h-5 w-5" />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-white text-black text-[10px] font-bold flex items-center justify-center">
                      {cartItemCount > 99 ? '99+' : cartItemCount}
                    </span>
                  )}
                </div>
                <span>Cart {cartItemCount > 0 && `(${cartItemCount})`}</span>
            </Link>

            {isMounted ? (
              isAuthenticated ? (
                  <Button variant="ghost" className="w-full justify-start text-zinc-300 hover:text-white hover:bg-white/10" onClick={logout}>Log out</Button>
              ) : (
                  <>
                      <Link href="/login" className="w-full">
                      <Button className="w-full px-5 py-2 rounded-xl text-sm font-semibold text-silver-200 border border-silver-500/20 glass-dark-subtle transition-all duration-300">Log in</Button>
                      </Link>
                      <Link href="/register" className="w-full">
                      <Button className="w-full px-6 py-2.5 rounded-xl text-sm font-bold text-black-important btn-premium shadow-[0_0_15px_rgba(255,255,255,0.15)]">Get Started</Button>
                      </Link>
                  </>
              )
            ) : (
              <>
                  <Link href="/login" className="w-full">
                  <Button className="w-full px-5 py-2 rounded-xl text-sm font-semibold text-silver-200 border border-silver-500/20 glass-dark-subtle transition-all duration-300">Log in</Button>
                  </Link>
                  <Link href="/register" className="w-full">
                  <Button className="w-full px-6 py-2.5 rounded-xl text-sm font-bold text-black-important btn-premium shadow-[0_0_15px_rgba(255,255,255,0.15)]">Get Started</Button>
                  </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
