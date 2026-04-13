"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Edit, MapPin, CheckCircle2, XCircle, Calendar, Download, Share2, Store,
  Package, Loader2, X
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import api from "@/lib/api";

interface VendorDetail {
  id: number;
  userId: number;
  businessName: string;
  description?: string;
  city: string;
  area: string;
  serviceRadiusKm?: number;
  verificationStatus: string;
  images?: string[];
  user?: {
    name: string;
    email: string;
    phone?: string;
  };
  services?: any[];
  createdAt: string;
  updatedAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  VERIFIED: "bg-emerald-500 text-white",
  PENDING: "bg-amber-500 text-white",
  REJECTED: "bg-red-500 text-white",
  SUSPENDED: "bg-red-500 text-white",
};

export default function VendorDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState<VendorDetail | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadVendor();
  }, [params.id]);

  const loadVendor = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/vendors/${params.id}`);
      setVendor(response.data || null);
    } catch (error: any) {
      console.error("Failed to load vendor:", error);
      toast.error("Failed to load vendor details");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setActionLoading(true);
      await api.patch(`/vendors/${vendor?.id}/approve`);
      toast.success("Vendor approved successfully!");
      loadVendor();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to approve vendor");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    const reason = prompt("Please enter rejection reason:");
    if (!reason) return;

    try {
      setActionLoading(true);
      await api.patch(`/vendors/${vendor?.id}/reject`, { reason });
      toast.success("Vendor rejected");
      loadVendor();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to reject vendor");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async () => {
    if (!confirm("Are you sure you want to suspend this vendor?")) return;

    try {
      setActionLoading(true);
      await api.patch(`/vendors/${vendor?.id}`, { verificationStatus: 'SUSPENDED' });
      toast.success("Vendor suspended");
      loadVendor();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to suspend vendor");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-black" />
          <p className="text-neutral-600">Loading vendor details...</p>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <X className="h-16 w-16 mx-auto mb-4 text-red-600" />
          <h3 className="text-lg font-bold text-black mb-2">Vendor Not Found</h3>
          <Button onClick={() => router.push("/dashboard/admin/vendors")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Vendors
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
            <h1 className="text-3xl font-bold text-black">{vendor.businessName}</h1>
            <p className="text-neutral-600 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {vendor.area}, {vendor.city}
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
                <p className="text-2xl font-bold text-black mt-1">{vendor.verificationStatus}</p>
              </div>
              <div className="p-3 rounded-full bg-black">
                <Store className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Services</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{vendor.services?.length || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-600">
                <Package className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-amber-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">City</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{vendor.city}</p>
              </div>
              <div className="p-3 rounded-full bg-amber-600">
                <MapPin className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-emerald-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Joined</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">
                  {new Date(vendor.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="p-3 rounded-full bg-emerald-600">
                <Calendar className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vendor Info */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle className="text-black">Business Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-neutral-600">Business Name</p>
              <p className="font-medium text-black">{vendor.businessName}</p>
            </div>
            {vendor.description && (
              <div>
                <p className="text-xs text-neutral-600">Description</p>
                <p className="font-medium text-black">{vendor.description}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-neutral-600">Location</p>
              <p className="font-medium text-black">{vendor.area}, {vendor.city}{vendor.serviceRadiusKm ? ` (${vendor.serviceRadiusKm}km radius)` : ''}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle className="text-black">Owner Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-neutral-600">Owner Name</p>
              <p className="font-medium text-black">{vendor.user?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-600">Email</p>
              <p className="font-medium text-black">{vendor.user?.email || 'N/A'}</p>
            </div>
            {vendor.user?.phone && (
              <div>
                <p className="text-xs text-neutral-600">Phone</p>
                <p className="font-medium text-black">{vendor.user.phone}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {vendor.services && vendor.services.length > 0 && (
          <Card className="border-2 border-black md:col-span-2">
            <CardHeader>
              <CardTitle className="text-black">Services ({vendor.services.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {vendor.services.map((svc: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-lg border border-neutral-200 bg-neutral-50">
                    <h4 className="font-semibold text-black">{svc.name || svc.serviceType}</h4>
                    <div className="text-sm text-neutral-600 mt-1">
                      Type: {svc.serviceType} | Pricing: {svc.pricingModel}
                    </div>
                    <div className="text-lg font-bold text-black mt-2">
                      Rs.{svc.baseRate?.toLocaleString()}
                    </div>
                    <div className="text-xs text-neutral-600">
                      Status: {svc.isActive ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Admin Actions */}
      <Card className="border-2 border-black">
        <CardHeader>
          <CardTitle className="text-black">Admin Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            {vendor.verificationStatus === 'PENDING' && (
              <>
                <Button
                  variant="default"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleApprove}
                  disabled={actionLoading}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve Vendor
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

            {vendor.verificationStatus !== 'SUSPENDED' && vendor.verificationStatus !== 'REJECTED' && (
              <Button
                variant="destructive"
                onClick={handleSuspend}
                disabled={actionLoading}
                className="bg-red-600 hover:bg-red-700"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Suspend Vendor
              </Button>
            )}

            <Button
              variant="outline"
              className="border-black"
              onClick={() => router.push(`/dashboard/admin/vendors/${vendor.id}/edit`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Vendor
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
