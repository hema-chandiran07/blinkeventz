"use client";

import Link from "next/link";
import { MapPin, IndianRupee, CheckCircle2, Star } from "lucide-react";
import { motion } from "framer-motion";
import type { Vendor, VendorService } from "@/types";

const getBackendUrl = () => {
  if (typeof window !== 'undefined') {
    return 'http://localhost:3000';
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
};

interface VendorCardProps {
  vendor: Vendor;
  services?: VendorService[];
}

export function VendorCard({ vendor, services }: VendorCardProps) {
  const vendorServices = services || vendor.services || [];
  const safeName = vendor.businessName ?? "Unknown Vendor";
  const safeCity = vendor.city ?? "";
  const safeArea = vendor.area ?? "";
  
  const safePrice = vendorServices[0]?.baseRate || vendor.basePrice || 10000;
  const displayServiceType = vendorServices[0]?.serviceType || "Service";

  const rawPath = vendor.businessImages?.[0] || vendor.images?.[0];

  const getFallbackImage = () => {
    const type = displayServiceType.toUpperCase();
    const imageMap: Record<string, string> = {
      "CATERING": "https://images.unsplash.com/photo-1555244162-803834f70033?w=800&q=80",
      "PHOTOGRAPHY": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80",
      "DECOR": "https://images.unsplash.com/photo-1519225421980-715cb0202128?w=800&q=80",
      "DJ": "https://images.unsplash.com/photo-1516280440614-6697288d5d38?w=800&q=80",
      "MAKEUP": "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800&q=80",
      "BAKERY": "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80",
    };
    return imageMap[type] || "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80";
  };

  let imageUrl = getFallbackImage();
  
  if (rawPath && typeof rawPath === 'string') {
    if (rawPath.startsWith('http')) {
      imageUrl = rawPath;
    } else {
      const backendUrl = getBackendUrl();
      imageUrl = `${backendUrl}${rawPath.startsWith('/') ? '' : '/'}${rawPath}`;
    }
  }

  return (
    <Link href={`/vendors/${vendor.id}`} className="block h-full outline-none">
      <motion.div
        className="group flex flex-col h-full rounded-2xl border border-silver-800 bg-card overflow-hidden cursor-pointer hover:border-silver-500 transition-all duration-300 hover:-translate-y-1"
        whileHover={{ y: -4 }}
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-silver-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={safeName}
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = getFallbackImage();
            }}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>

        <div className="p-5 flex flex-col flex-grow">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="text-lg font-bold text-card-foreground truncate group-hover:text-silver-200 transition-colors">
              {safeName}
            </h3>
            <div className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-500/10 border border-green-500/20 backdrop-blur-sm">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              <span className="text-[10px] uppercase tracking-wider font-semibold text-green-500">
                Verified
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 text-silver-400 text-sm mb-4">
            <MapPin className="h-4 w-4 shrink-0 text-silver-500" />
            <span className="truncate">{safeArea ? `${safeArea}, ` : ''}{safeCity}</span>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <span
              className="bg-silver-800/50 text-silver-300 text-xs px-2.5 py-1 rounded-md border border-silver-700 uppercase tracking-wider font-medium"
            >
              {displayServiceType.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="mt-auto pt-4 border-t border-silver-800 flex items-center justify-between">
            <div>
              {safePrice > 0 ? (
                <>
                  <p className="text-xs text-silver-500 font-medium mb-0.5 uppercase tracking-wide">Starting at</p>
                  <div className="flex items-baseline gap-0.5">
                    <IndianRupee className="h-4 w-4 text-silver-400" />
                    <span className="text-xl font-bold text-card-foreground">
                      {safePrice.toLocaleString('en-IN')}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs text-silver-500 font-medium mb-0.5 uppercase tracking-wide">Pricing</p>
                  <span className="text-base font-bold text-card-foreground block mt-0.5">Price on Request</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-silver-400">
                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                <span className="text-sm font-medium">4.5</span>
              </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
