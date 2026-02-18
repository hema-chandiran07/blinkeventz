import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Star,
  ArrowLeft,
  Check,
  Shield,
  Award,
  Clock,
  Briefcase,
  TrendingUp,
  Zap,
  Heart,
  Users,
  ShoppingCart,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getVendorById, getVendorServices, getVendorImage, type Vendor } from "@/lib/vendors";
import { VendorBookingSidebar } from "./vendor-booking-sidebar";
import { ReviewsSection } from "./reviews-section";

interface VendorDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

const getServiceAmenities = (serviceType: string) => {
  const amenitiesMap: Record<string, string[]> = {
    Catering: ["Live Counters", "Multi-Cuisine Options", "Staff Included", "Custom Menu", "Tasting Session", "Hygiene Certified", "Timely Service", "Leftover Packing"],
    Photography: ["Drone Photography", "Candid Shots", "Same Day Edit", "Album Included", "Video Coverage", "4K Quality", "Multiple Photographers", "Online Gallery"],
    Decoration: ["Floral Arrangements", "Lighting Setup", "Stage Design", "Custom Themes", "Setup & Cleanup", "Premium Props", "Backdrop Design", "Entrance Arch"],
    DJ: ["Professional Equipment", "Light Show", "Request Taking", "MC Services", "Backup Equipment", "LED Dance Floor", "Smoke Machine", "Karaoke Setup"],
    Makeup: ["Trial Session", "Premium Products", "Bridal Specialist", "Travel Included", "Touch-up Kit", "Airbrush Makeup", "Hair Styling", "Draping Service"],
    Bakery: ["Custom Designs", "Tasting Session", "Delivery Included", "Fresh Ingredients", "Eggless Options", "Sugar Flowers", "Custom Toppers", "Cupcake Towers"],
  };
  return amenitiesMap[serviceType] || ["Professional Service", "Quality Guaranteed", "On-time Delivery", "Customer Support", "Experienced Team", "Insurance Covered"];
};

const getVendorStats = (vendor: Vendor) => {
  const completedEvents = 500 + (vendor.rating ? Math.floor(vendor.rating * 10) : 0);
  const happyClients = 450 + (vendor.verificationStatus === "VERIFIED" ? 50 : 0);
  
  return [
    { label: "Years Experience", value: "10+", icon: Briefcase },
    { label: "Events Completed", value: `${completedEvents}+`, icon: TrendingUp },
    { label: "Happy Clients", value: `${happyClients}+`, icon: Heart },
    { label: "Response Time", value: "~2hrs", icon: Zap },
    { label: "Team Members", value: "20+", icon: Users },
    { label: "Cart Status", value: "Active", icon: ShoppingCart },
  ];
};

export default async function VendorDetailPage({ params }: VendorDetailPageProps) {
  const { id } = await params;
  const vendor = await getVendorById(id);
  const services = await getVendorServices(id);

  if (!vendor) {
    notFound();
  }

  const displayName = vendor.businessName || vendor.name || "Vendor";
  const displayImage = getVendorImage(vendor);
  const displayServiceType = services[0]?.serviceType || vendor.serviceType || "Service";
  const displayRating = vendor.rating || 4.5;
  const amenities = getServiceAmenities(displayServiceType);
  const basePrice = vendor.basePrice || services[0]?.baseRate || 0;
  const stats = getVendorStats(vendor);

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 bg-gray-50 min-h-screen">
      <Link
        href="/vendors"
        className="inline-flex items-center text-sm text-gray-500 hover:text-purple-600 mb-6 transition-colors"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Vendors
      </Link>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* MAIN CONTENT */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image Gallery */}
          <div className="overflow-hidden rounded-2xl bg-gray-100 relative h-[400px]">
            <Image
              src={displayImage}
              alt={displayName}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 1024px) 100vw, 66vw"
            />
            <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-semibold text-purple-700 flex items-center shadow-lg">
              <Star className="h-4 w-4 mr-1 fill-yellow-400 text-yellow-400" />
              {vendor.rating || 4.5}
            </div>
          </div>

          {/* Business Info Header */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {displayName}
                </h1>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className="bg-purple-50 text-purple-700 border border-purple-200">
                    {vendor.verificationStatus === "VERIFIED" ? "Verified" : vendor.verificationStatus || "Verified"}
                  </Badge>
                  <div className="flex items-center text-gray-500 text-sm">
                    <MapPin className="h-4 w-4 mr-1 text-pink-500" />
                    {vendor.area ? `${vendor.area}, ` : ""}{vendor.city}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-purple-600">₹{basePrice.toLocaleString("en-IN")}</div>
                <div className="text-sm text-gray-500">starting from</div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-4 pt-4 border-t">
              {stats.map((stat) => (
                <div key={stat.label} className="flex flex-col items-center text-center">
                  <stat.icon className="h-5 w-5 text-purple-500 mb-1" />
                  <div className="text-lg font-bold text-gray-900">{stat.value}</div>
                  <div className="text-xs text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* About Business */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold mb-4 text-gray-900">About the Business</h2>
            <p className="text-gray-700 leading-relaxed">
              {vendor.description || "Professional vendor providing quality services for your special occasions. Committed to delivering excellence and creating memorable experiences for all our clients."}
            </p>
            
            {/* Why Choose Us */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-xl">
                <Shield className="h-6 w-6 text-purple-600 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-900">Verified & Trusted</h4>
                  <p className="text-sm text-gray-600">Background verified professionals</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl">
                <Award className="h-6 w-6 text-green-600 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-900">Quality Assured</h4>
                  <p className="text-sm text-gray-600">Premium service guarantee</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl">
                <Clock className="h-6 w-6 text-blue-600 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-900">On-Time Service</h4>
                  <p className="text-sm text-gray-600">Punctual and reliable</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-pink-50 rounded-xl">
                <Heart className="h-6 w-6 text-pink-600 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-900">Customer Favorite</h4>
                  <p className="text-sm text-gray-600">Highly rated by clients</p>
                </div>
              </div>
            </div>
          </div>

          {/* Services Offered */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Services Offered</h2>
            <div className="space-y-4">
              {services.map((service: unknown) => (
                <div
                  key={(service as { id: string }).id}
                  className="flex justify-between items-center p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-purple-50 transition-colors"
                >
                  <div>
                    <h3 className="font-semibold text-gray-900">{(service as { name: string }).name || (service as { title: string }).title}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {(service as { description?: string; serviceType?: string }).description || "Professional service package" }
                    </p>
                  </div>
                  <div className="font-bold text-purple-600 text-lg">
                    ₹{(service as { baseRate?: number; price?: number }).baseRate?.toLocaleString("en-IN") || (service as { baseRate?: number; price?: number }).price?.toLocaleString("en-IN")}
                  </div>
                </div>
              ))}
              {services.length === 0 && (
                <p className="text-gray-500 text-sm">Contact vendor for service details</p>
              )}
            </div>
          </div>

          {/* Amenities */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Amenities & Features</h2>
            <div className="grid grid-cols-2 gap-3">
              {amenities.map((amenity) => (
                <div key={amenity} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-50 text-green-600">
                    <Check className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{amenity}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Reviews & Ratings */}
          <ReviewsSection 
            venueId={vendor.id}
            venueName={displayName}
            initialRating={displayRating}
          />
        </div>

        {/* SIDEBAR - Sticky Booking Card */}
        <VendorBookingSidebar vendor={vendor} services={services} />
      </div>
    </div>
  );
}
