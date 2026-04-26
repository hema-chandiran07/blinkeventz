"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Store, User, Mail, Phone, MapPin,
  Calendar, DollarSign, CheckCircle, AlertCircle, Clock, Download
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface Vendor {
  id: number;
  userId: number;
  businessName: string;
  description: string | null;
  city: string;
  area: string;
  serviceRadiusKm: number | null;
  verificationStatus: string;
  createdAt: string;
  updatedAt: string;
  images: string[];
  user: {
    id: number;
    name: string | null;
    email: string;
    phone: string | null;
    isActive: boolean;
  };
  services?: any[];
}

export default function VendorReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState<Vendor | null>(null);

  useEffect(() => {
    loadVendor();
  }, [params.id]);

  const loadVendor = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/vendors/${params.id}`);
      setVendor(response.data);
    } catch (error: any) {
      console.error("Failed to load vendor:", error);
      toast.error("Failed to load vendor details");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-neutral-600">Loading vendor details...</p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-neutral-600">Vendor not found</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, string> = {
      VERIFIED: "bg-green-100 text-green-700 border-green-300",
      PENDING: "bg-amber-100 text-amber-700 border-amber-300",
      REJECTED: "bg-red-100 text-red-700 border-red-300",
    };
    return statusConfig[status] || "bg-gray-100 text-gray-700 border-gray-300";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push("/dashboard/admin/reports/vendors")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-black">{vendor.businessName}</h1>
          <p className="text-neutral-600">Vendor Report Details</p>
        </div>
        <Button variant="outline" className="border-black">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-4">
        <Badge className={getStatusBadge(vendor.verificationStatus)}>
          {vendor.verificationStatus}
        </Badge>
        <span className="text-sm text-neutral-600 flex items-center gap-1">
          <Calendar className="h-4 w-4" />
          Joined {new Date(vendor.createdAt).toLocaleDateString()}
        </span>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Business Information */}
        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Business Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-neutral-600">Business Name</p>
              <p className="text-lg font-semibold text-black">{vendor.businessName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-600">Description</p>
              <p className="text-black">{vendor.description || "No description provided"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-600">Service Radius</p>
              <p className="text-black">{vendor.serviceRadiusKm || 0} km</p>
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
              <p className="text-lg font-semibold text-black">{vendor.user.name || "N/A"}</p>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-neutral-600" />
              <p className="text-black">{vendor.user.email}</p>
            </div>
            {vendor.user.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-neutral-600" />
                <p className="text-black">{vendor.user.phone}</p>
              </div>
            )}
            <div className="flex items-center gap-2">
              {vendor.user.isActive ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <p className="text-black">{vendor.user.isActive ? "Active" : "Inactive"}</p>
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
              <p className="text-sm font-medium text-neutral-600">City</p>
              <p className="text-black">{vendor.city}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-600">Area</p>
              <p className="text-black">{vendor.area}</p>
            </div>
          </CardContent>
        </Card>

        {/* Account Stats */}
        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Account Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-neutral-600">Created At</p>
              <p className="text-black">{new Date(vendor.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-600">Last Updated</p>
              <p className="text-black">{new Date(vendor.updatedAt).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Services */}
      {vendor.services && vendor.services.length > 0 && (
        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Services ({vendor.services.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {vendor.services.map((service: any) => (
                <Card key={service.id} className="border border-neutral-300">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-black">{service.name}</h3>
                    <p className="text-sm text-neutral-600 mt-1">{service.serviceType}</p>
                    <p className="text-lg font-bold text-black mt-2">
                      ₹{service.baseRate.toLocaleString()}
                    </p>
                    <Badge className={service.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                      {service.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <Button className="bg-black hover:bg-neutral-800">
          View Full Profile
        </Button>
        <Button variant="outline" className="border-black">
          Contact Vendor
        </Button>
        <Button variant="outline" className="border-red-600 text-red-600 hover:bg-red-50">
          Suspend Vendor
        </Button>
      </div>
    </div>
  );
}
