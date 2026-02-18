import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Star,
  ArrowLeft,
  Mail,
  Phone,
  Globe,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getVendorById, getVendorServices, getVendorImage } from "@/lib/vendors";

interface VendorDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function VendorDetailPage({
  params,
}: VendorDetailPageProps) {
  const { id } = await params;
  const vendor = await getVendorById(id);
  const services = await getVendorServices(id);

  if (!vendor) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/vendors"
        className="inline-flex items-center text-sm text-gray-500 hover:text-purple-600 mb-6"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Vendors
      </Link>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* MAIN */}
        <div className="lg:col-span-2 space-y-8">
          <div className="overflow-hidden rounded-2xl bg-gray-100 relative">
            <Image
              src={getVendorImage(vendor)}
              alt={vendor.businessName || vendor.name || "Vendor"}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 1024px) 100vw, 66vw"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {vendor.businessName || vendor.name || "Vendor"}
              </h1>

              <div className="flex flex-wrap items-center gap-3 mb-4">
                <Badge className="bg-purple-50 text-purple-700">
                  {vendor.verificationStatus || "verified"}
                </Badge>

                <div className="flex items-center text-gray-500 text-sm">
                  <MapPin className="h-4 w-4 mr-1 text-pink-500" />
                  {vendor.area ? `${vendor.area}, ` : ""}{vendor.city}
                </div>

                <div className="flex items-center bg-yellow-50 px-2 py-0.5 rounded-full text-sm">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-1" />
                  {vendor.rating || 4.5}
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-3">About</h2>
            <p className="text-gray-700">{vendor.description}</p>
          </div>

          {/* SERVICES */}
          <div>
            <h2 className="text-xl font-bold mb-4">Services Offered</h2>

            <div className="space-y-4">
              {services.map((service: unknown) => (
                <div
                  key={(service as { id: string }).id}
                  className="flex justify-between p-4 rounded-xl border bg-white"
                >
                  <div>
                    <h3 className="font-semibold">{(service as { name: string }).name || (service as { title: string }).title}</h3>
                    <p className="text-sm text-gray-500">
                      {(service as { description?: string; serviceType?: string }).description || (service as { serviceType?: string }).serviceType || (service as { description: string }).description}
                    </p>
                  </div>

                  <div className="font-semibold text-purple-600">
                    ₹{(service as { baseRate?: number; price?: number }).baseRate?.toLocaleString("en-IN") || (service as { baseRate?: number; price?: number }).price?.toLocaleString("en-IN")}
                  </div>
                </div>
              ))}

              {services.length === 0 && (
                <p className="text-gray-500 text-sm">
                  No services available
                </p>
              )}
            </div>
          </div>
        </div>

        {/* SIDEBAR */}
        <div className="space-y-6">
          <div className="rounded-2xl border bg-white p-6 sticky top-24">
            <h3 className="text-lg font-semibold mb-4">
              Contact Vendor
            </h3>

            <div className="space-y-4 mb-6">
              <Button className="w-full h-12">
                Request Quote
              </Button>
              <Button variant="outline" className="w-full">
                Message
              </Button>
            </div>

            <div className="space-y-3 pt-4 border-t text-sm text-gray-600">
              <div className="flex items-center">
                <Mail className="h-4 w-4 mr-3 text-purple-400" />
                Response time ~2 hours
              </div>
              <div className="flex items-center">
                <Phone className="h-4 w-4 mr-3 text-purple-400" />
                Contact via platform
              </div>
              <div className="flex items-center">
                <Globe className="h-4 w-4 mr-3 text-purple-400" />
                Website available
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
