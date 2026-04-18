"use client";

import Image from "next/image";
import { useState } from "react";

interface SmartImageProps {
  src?: string | null;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  fallbackSrc?: string;
}

const DEFAULT_FALLBACKS = {
  venue: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?q=80&w=800",
  vendor: "https://images.unsplash.com/photo-1555244162-803834f70033?q=80&w=800",
  profile: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=400",
};

export function SmartImage({
  src,
  alt,
  fill = true,
  width,
  height,
  className = "",
  fallbackSrc,
}: SmartImageProps) {
  const [error, setError] = useState(false);

  const getFallback = () => {
    if (fallbackSrc) return fallbackSrc;
    const altLower = alt.toLowerCase();
    if (altLower.includes('venue')) return DEFAULT_FALLBACKS.venue;
    if (altLower.includes('vendor') || altLower.includes('service')) return DEFAULT_FALLBACKS.vendor;
    return DEFAULT_FALLBACKS.profile;
  };

  const getProcessedUrl = () => {
    if (!src || error) return getFallback();
    
    if (src.startsWith('http')) return src;
    
    if (src.startsWith('/api/uploads/') || src.startsWith('/uploads/')) {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      return `${backendUrl}${src}`;
    }
    
    return src;
  };

  const finalSrc = getProcessedUrl();

  return (
    <Image
      src={finalSrc}
      alt={alt}
      fill={fill}
      width={!fill ? width : undefined}
      height={!fill ? height : undefined}
      className={className}
      onError={() => setError(true)}
      unoptimized={finalSrc.startsWith('http') && !finalSrc.includes('localhost')}
    />
  );
}

export function VenueImage({ src, alt, className }: { src?: string | null; alt: string; className?: string }) {
  return (
    <SmartImage
      src={src}
      alt={alt}
      className={className}
      fallbackSrc={DEFAULT_FALLBACKS.venue}
    />
  );
}

export function VendorImage({ src, alt, className }: { src?: string | null; alt: string; className?: string }) {
  return (
    <SmartImage
      src={src}
      alt={alt}
      className={className}
      fallbackSrc={DEFAULT_FALLBACKS.vendor}
    />
  );
}