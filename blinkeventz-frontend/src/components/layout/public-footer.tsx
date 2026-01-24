import Link from "next/link";

export function PublicFooter() {
  return (
    <footer className="border-t border-purple-100 bg-white py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <Link href="/" className="flex items-center space-x-2">
              <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600" />
              <span className="text-lg font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
                BlinkEventz
              </span>
            </Link>
            <p className="text-sm text-gray-500">
              Making event planning seamless and memorable.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Platform</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href="/venues" className="hover:text-purple-600">Browse Venues</Link></li>
              <li><Link href="/vendors" className="hover:text-purple-600">Find Vendors</Link></li>
              <li><Link href="/plan-event" className="hover:text-purple-600">Plan Event</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Company</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href="/about" className="hover:text-purple-600">About Us</Link></li>
              <li><Link href="/careers" className="hover:text-purple-600">Careers</Link></li>
              <li><Link href="/contact" className="hover:text-purple-600">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Legal</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href="/privacy" className="hover:text-purple-600">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-purple-600">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-purple-50 pt-8 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} BlinkEventz. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
