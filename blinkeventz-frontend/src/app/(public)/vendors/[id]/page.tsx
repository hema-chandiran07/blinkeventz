import { MOCK_VENDORS } from "@/services/mock-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, Check, ArrowLeft, Mail, Phone, Globe } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface VendorDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function VendorDetailPage({ params }: VendorDetailPageProps) {
  const { id } = await params;
  const vendor = MOCK_VENDORS.find((v) => v.id === id);

  if (!vendor) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/vendors" className="inline-flex items-center text-sm text-gray-500 hover:text-purple-600 mb-6">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Vendors
      </Link>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Cover Image */}
          <div className="overflow-hidden rounded-2xl bg-gray-100">
            <img
              src={vendor.images[0]}
              alt={vendor.name}
              className="h-[350px] w-full object-cover"
            />
          </div>

          {/* Profile Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
             <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{vendor.name}</h1>
                <div className="flex flex-wrap items-center gap-3 mb-4">
                     <Badge variant="secondary" className="text-purple-700 bg-purple-50 hover:bg-purple-100">
                        {vendor.serviceType}
                     </Badge>
                     <div className="flex items-center text-gray-500 text-sm">
                        <MapPin className="h-4 w-4 mr-1 text-pink-500" />
                        {vendor.city}
                     </div>
                     <div className="flex items-center bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-100 text-sm">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-1" />
                        <span className="font-bold text-yellow-700">{vendor.rating}</span>
                     </div>
                </div>
             </div>
             <div className="text-right hidden sm:block">
                 <div className="text-2xl font-bold text-purple-600">{vendor.priceRange}</div>
                 <div className="text-xs text-gray-500">Price Range</div>
             </div>
          </div>

          {/* Description */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">About</h2>
            <p className="text-gray-700 leading-relaxed">
              {vendor.description}
            </p>
          </div>

          {/* Services - Mocked for now since not in Vendor type explicitly but implied */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Services Offered</h2>
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-white hover:border-purple-100 hover:shadow-sm transition-all">
                        <div>
                            <h3 className="font-semibold text-gray-900">Service Package {i}</h3>
                            <p className="text-sm text-gray-500">Includes consultation and standard coverage.</p>
                        </div>
                        <div className="font-semibold text-purple-600">Starting at ₹500</div>
                    </div>
                ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-purple-100 bg-white p-6 shadow-sm sticky top-24">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Vendor</h3>
            
            <div className="space-y-4 mb-6">
                 <Button className="w-full h-12 text-lg">Request Quote</Button>
                 <Button variant="outline" className="w-full">Message</Button>
            </div>

            <div className="space-y-3 pt-4 border-t border-gray-100">
                <div className="flex items-center text-gray-600 text-sm">
                    <Mail className="h-4 w-4 mr-3 text-purple-400" />
                    <span>Response time: ~2 hours</span>
                </div>
                <div className="flex items-center text-gray-600 text-sm">
                    <Phone className="h-4 w-4 mr-3 text-purple-400" />
                    <span>(555) 123-4567</span>
                </div>
                <div className="flex items-center text-gray-600 text-sm">
                    <Globe className="h-4 w-4 mr-3 text-purple-400" />
                    <span>Visit Website</span>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
