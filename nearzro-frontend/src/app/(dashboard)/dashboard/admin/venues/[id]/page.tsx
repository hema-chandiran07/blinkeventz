"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Edit, MapPin, CheckCircle2, XCircle, Calendar, Download, Share2, Building2, Star, Users,
  Loader2
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import api from "@/lib/api";

interface VenueDetail {
  id: number;
  ownerId: number;
  name: string;
  type: string;
  description?: string;
  address: string;
  city: string;
  area: string;
  pincode: string;
  capacityMin: number;
  capacityMax: number;
  basePriceMorning?: number;
  basePriceEvening?: number;
  basePriceFullDay?: number;
  amenities?: string;
  status: string;
  images?: string[];
  owner?: {
    name: string;
    email: string;
    phone?: string;
  };
  createdAt: string;
  updatedAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-500 text-white",
  PENDING_APPROVAL: "bg-amber-500 text-white",
  INACTIVE: "bg-neutral-500 text-white",
  SUSPENDED: "bg-red-500 text-white",
  REJECTED: "bg-red-500 text-white",
};

const TYPE_LABELS: Record<string, string> = {
  HALL: "Hall",
  MANDAPAM: "Mandapam",
  LAWN: "Lawn",
  RESORT: "Resort",
  BANQUET: "Banquet",
  BANQUET_HALL: "Banquet Hall",
  MARRIAGE_HALL: "Marriage Hall",
  BEACH_VENUE: "Beach Venue",
  HOTEL: "Hotel",
  COMMUNITY_HALL: "Community Hall",
  OTHER: "Other",
};

export default function VenueDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [venue, setVenue] = useState<VenueDetail | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadVenue();
  }, [params.id]);

  const loadVenue = async () => {
    try {
      setLoading(true);
      const response = await api.get("/venues");
      const found = response.data.find((v: any) => v.id === parseInt(params.id as string));
      setVenue(found || null);
    } catch (error: any) {
      console.error("Failed to load venue:", error);
      toast.error("Failed to load venue details");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setActionLoading(true);
      await api.post(`/venues/${venue?.id}/approve`);
      toast.success("Venue approved successfully!");
      loadVenue();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to approve venue");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    const reason = prompt("Please enter rejection reason:");
    if (!reason) return;
    
    try {
      setActionLoading(true);
      await api.post(`/venues/${venue?.id}/reject`, { reason });
      toast.success("Venue rejected");
      loadVenue();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to reject venue");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!venue) return;
    const newStatus = venue.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    
    try {
      setActionLoading(true);
      await api.patch(`/venues/${venue.id}`, { status: newStatus });
      toast.success(`Venue ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'}`);
      loadVenue();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update venue status");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-black" />
          <p className="text-neutral-600">Loading venue details...</p>
        </div>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <XCircle className="h-16 w-16 mx-auto mb-4 text-red-600" />
          <h3 className="text-lg font-bold text-black mb-2">Venue Not Found</h3>
          <Button onClick={() => router.push("/dashboard/admin/venues")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Venues
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-black">{venue.name}</h1>
            <p className="text-neutral-600 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {venue.area}, {venue.city}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-black">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" className="border-black">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-2 border-black">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Status</p>
                <p className="text-2xl font-bold text-black mt-1">{venue.status.replace('_', ' ')}</p>
              </div>
              <div className="p-3 rounded-full bg-black">
                <Building2 className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Type</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{TYPE_LABELS[venue.type] || venue.type}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-600">
                <Star className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-amber-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Capacity</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{venue.capacityMin}-{venue.capacityMax}</p>
              </div>
              <div className="p-3 rounded-full bg-amber-600">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-emerald-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Listed</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">
                  {new Date(venue.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="p-3 rounded-full bg-emerald-600">
                <Calendar className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Venue Information */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle className="text-black">Venue Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-neutral-600">Venue Name</p>
              <p className="font-medium text-black">{venue.name}</p>
            </div>
            {venue.description && (
              <div>
                <p className="text-xs text-neutral-600">Description</p>
                <p className="font-medium text-black">{venue.description}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-neutral-600">Address</p>
              <p className="font-medium text-black">{venue.address}, {venue.area}, {venue.city} - {venue.pincode}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-600">Capacity</p>
              <p className="font-medium text-black">{venue.capacityMin} to {venue.capacityMax} guests</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle className="text-black">Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {venue.basePriceMorning && (
              <div>
                <p className="text-xs text-neutral-600">Morning Slot (6AM-12PM)</p>
                <p className="font-medium text-black">₹{(venue.basePriceMorning / 1000).toFixed(2)}K</p>
              </div>
            )}
            {venue.basePriceEvening && (
              <div>
                <p className="text-xs text-neutral-600">Evening Slot (4PM-10PM)</p>
                <p className="font-medium text-black">₹{(venue.basePriceEvening / 1000).toFixed(2)}K</p>
              </div>
            )}
            {venue.basePriceFullDay && (
              <div>
                <p className="text-xs text-neutral-600">Full Day (24 Hours)</p>
                <p className="font-medium text-black">₹{(venue.basePriceFullDay / 1000).toFixed(2)}K</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-2 border-black md:col-span-2">
          <CardHeader>
            <CardTitle className="text-black">Owner Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-neutral-600">Owner Name</p>
                <p className="font-medium text-black">{venue.owner?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-600">Email</p>
                <p className="font-medium text-black">{venue.owner?.email || 'N/A'}</p>
              </div>
              {venue.owner?.phone && (
                <div>
                  <p className="text-xs text-neutral-600">Phone</p>
                  <p className="font-medium text-black">{venue.owner.phone}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Images */}
      {venue.images && venue.images.length > 0 && (
        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle className="text-black">Venue Images</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {venue.images.map((img, idx) => (
                <div key={idx} className="aspect-video rounded-lg overflow-hidden border-2 border-neutral-200">
                  <img
                    src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${img}`}
                    alt={`Venue image ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin Actions */}
      <Card className="border-2 border-black">
        <CardHeader>
          <CardTitle className="text-black">Admin Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            {venue.status === 'PENDING_APPROVAL' && (
              <>
                <Button
                  variant="default"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleApprove}
                  disabled={actionLoading}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve Venue
                </Button>
                <Button
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                  onClick={handleReject}
                  disabled={actionLoading}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </>
            )}

            <Button
              variant={venue.status === 'ACTIVE' ? 'destructive' : 'default'}
              onClick={handleToggleStatus}
              disabled={actionLoading}
              className={venue.status === 'ACTIVE' ? 'bg-red-600 hover:bg-red-700' : 'bg-black'}
            >
              {venue.status === 'ACTIVE' ? (
                <XCircle className="h-4 w-4 mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              {venue.status === 'ACTIVE' ? 'Deactivate Venue' : 'Activate Venue'}
            </Button>

            <Button
              variant="outline"
              className="border-black"
              onClick={() => router.push(`/dashboard/admin/venues/${venue.id}/edit`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Venue
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
