import Link from "next/link";

export function PublicFooter() {
  return (
    <footer className="border-t border-silver-300 bg-gradient-to-br from-silver-200 via-silver-300 to-silver-400 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="relative h-8 w-8 overflow-hidden rounded-lg transition-transform duration-300 group-hover:scale-110">
                <img
                  src="/logo.jpeg"
                  alt="NearZro Logo"
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-black via-neutral-800 to-black bg-clip-text text-transparent">
                NearZro
              </span>
            </Link>
            <p className="text-sm text-neutral-700">
              Making event planning seamless and memorable.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-black mb-4">Platform</h3>
            <ul className="space-y-2 text-sm text-neutral-800">
              <li><Link href="/venues" className="hover:text-black hover:bg-gradient-to-r hover:from-silver-100 hover:to-silver-200 px-2 py-1 rounded transition-all">Browse Venues</Link></li>
              <li><Link href="/vendors" className="hover:text-black hover:bg-gradient-to-r hover:from-silver-100 hover:to-silver-200 px-2 py-1 rounded transition-all">Find Vendors</Link></li>
              <li><Link href="/plan-event" className="hover:text-black hover:bg-gradient-to-r hover:from-silver-100 hover:to-silver-200 px-2 py-1 rounded transition-all">Plan Event</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-black mb-4">Company</h3>
            <ul className="space-y-2 text-sm text-neutral-800">
              <li><Link href="/about" className="hover:text-black hover:bg-gradient-to-r hover:from-silver-100 hover:to-silver-200 px-2 py-1 rounded transition-all">About Us</Link></li>
              <li><Link href="/careers" className="hover:text-black hover:bg-gradient-to-r hover:from-silver-100 hover:to-silver-200 px-2 py-1 rounded transition-all">Careers</Link></li>
              <li><Link href="/contact" className="hover:text-black hover:bg-gradient-to-r hover:from-silver-100 hover:to-silver-200 px-2 py-1 rounded transition-all">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-black mb-4">Legal</h3>
            <ul className="space-y-2 text-sm text-neutral-800">
              <li><Link href="/privacy" className="hover:text-black hover:bg-gradient-to-r hover:from-silver-100 hover:to-silver-200 px-2 py-1 rounded transition-all">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-black hover:bg-gradient-to-r hover:from-silver-100 hover:to-silver-200 px-2 py-1 rounded transition-all">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-silver-400 pt-8 text-center text-sm text-neutral-800">
          © {new Date().getFullYear()} NearZro. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
