import Link from "next/link";

export function PublicFooter() {
  return (
    <footer className="border-t border-white/10 bg-zinc-950 py-12">
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
              <span className="text-lg font-bold bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                NearZro
              </span>
            </Link>
            <p className="text-sm text-zinc-400">
              Making event planning seamless and memorable.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4">Platform</h3>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li><Link href="/venues" className="hover:text-white transition-colors">Browse Venues</Link></li>
              <li><Link href="/vendors" className="hover:text-white transition-colors">Find Vendors</Link></li>
              <li><Link href="/plan-event" className="hover:text-white transition-colors">Plan Event</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4">Company</h3>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/careers" className="hover:text-white transition-colors">Careers</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4">Legal</h3>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-white/10 pt-8 text-center text-sm text-zinc-500">
          © {new Date().getFullYear()} NearZro. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
