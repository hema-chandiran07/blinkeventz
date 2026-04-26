"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Building, User, Mail, Phone, MapPin,
  Calendar, DollarSign, CheckCircle, AlertCircle, Users, Download
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface Venue {
  id: number;
  ownerId: number;
  name: string;
  type: string;
  description: string | null;
  address: string;
  city: string;
  area: string;
  pincode: string;
  capacityMin: number | null;
  capacityMax: number | null;
  basePriceMorning: number | null;
  basePriceEvening: number | null;
  basePriceFullDay: number | null;
  amenities: string | null;
  policies: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  images: string[];
  owner: {
    id: number;
    name: string | null;
    email: string;
  };
}

export default function VenueReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [venue, setVenue] = useState<Venue | null>(null);

  useEffect(() => {
    loadVenue();
  }, [params.id]);

  const loadVenue = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/venues/${params.id}`);
      setVenue(response.data);
    } catch (error: any) {
      console.error("Failed to load venue:", error);
      toast.error("Failed to load venue details");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-neutral-600">Loading venue details...</p>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-neutral-600">Venue not found</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, string> = {
      ACTIVE: "bg-green-100 text-green-700 border-green-300",
      PENDING: "bg-amber-100 text-amber-700 border-amber-300",
      INACTIVE: "bg-red-100 text-red-700 border-red-300",
    };
    return statusConfig[status] || "bg-gray-100 text-gray-700 border-gray-300";
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "N/A";
    return `₹${amount.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push("/dashboard/admin/reports/venues")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-black">{venue.name}</h1>
          <p className="text-neutral-600">Venue Report Details</p>
        </div>
        <Button variant="outline" className="border-black">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-4">
        <Badge className={getStatusBadge(venue.status)}>
          {venue.status}
        </Badge>
        <span className="text-sm text-neutral-600 flex items-center gap-1">
          <Calendar className="h-4 w-4" />
          Listed {new Date(venue.createdAt).toLocaleDateString()}
        </span>
      </div>

      {/* Images */}
      {venue.images && venue.images.length > 0 && (
        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle>Gallery</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {venue.images.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`${venue.name} - Image ${idx + 1}`}
                  className="w-full h-48 object-cover rounded-lg border border-neutral-300"
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Venue Information */}
        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Venue Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-neutral-600">Venue Name</p>
              <p className="text-lg font-semibold text-black">{venue.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-600">Type</p>
              <p className="text-black">{venue.type.replace(/_/g, " ")}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-600">Description</p>
              <p className="text-black">{venue.description || "No description provided"}</p>
            </div>
          </CardContent>
        </Card>

        {/* Owner Information */}
        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Owner Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-neutral-600">Owner Name</p>
              <p className="text-lg font-semibold text-black">{venue.owner.name || "N/A"}</p>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-neutral-600" />
              <p className="text-black">{venue.owner.email}</p>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-neutral-600">Address</p>
              <p className="text-black">{venue.address}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-neutral-600">City</p>
                <p className="text-black">{venue.city}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-600">Area</p>
                <p className="text-black">{venue.area}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-600">Pincode</p>
              <p className="text-black">{venue.pincode}</p>
            </div>
          </CardContent>
        </Card>

        {/* Capacity & Pricing */}
        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Capacity & Pricing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-neutral-600">Min Capacity</p>
                <p className="text-black">{venue.capacityMin || "N/A"} guests</p>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-600">Max Capacity</p>
                <p className="text-black">{venue.capacityMax || "N/A"} guests</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <p className="text-sm font-medium text-neutral-600">Morning Rate</p>
                <p className="font-semibold text-black">{formatCurrency(venue.basePriceMorning)}</p>
              </div>
              <div className="flex justify-between">
                <p className="text-sm font-medium text-neutral-600">Evening Rate</p>
                <p className="font-semibold text-black">{formatCurrency(venue.basePriceEvening)}</p>
              </div>
              <div className="flex justify-between">
                <p className="text-sm font-medium text-neutral-600">Full Day Rate</p>
                <p className="font-semibold text-black">{formatCurrency(venue.basePriceFullDay)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Amenities */}
        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Amenities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-black">{venue.amenities || "No amenities listed"}</p>
          </CardContent>
        </Card>

        {/* Policies */}
        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Policies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-black">{venue.policies || "No policies specified"}</p>
          </CardContent>
        </Card>

        {/* Account Stats */}
        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-neutral-600">Created At</p>
              <p className="text-black">{new Date(venue.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-600">Last Updated</p>
              <p className="text-black">{new Date(venue.updatedAt).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <Button className="bg-black hover:bg-neutral-800">
          View Full Profile
        </Button>
        <Button variant="outline" className="border-black">
          Contact Owner
        </Button>
        <Button variant="outline" className="border-amber-600 text-amber-600 hover:bg-amber-50">
          Request Verification
        </Button>
      </div>
    </div>
  );
}
