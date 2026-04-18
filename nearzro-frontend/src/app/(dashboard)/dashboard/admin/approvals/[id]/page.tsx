"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, CheckCircle2, XCircle, Download, AlertCircle,
  Loader2, Store, Building, FileText
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import api from "@/lib/api";

interface ApprovalDetail {
  id: number;
  type: 'VENDOR' | 'VENUE' | 'KYC';
  title: string;
  subtitle: string;
  description?: string;
  status: string;
  submittedAt: string;
  user?: {
    name: string;
    email: string;
    phone?: string;
    role: string;
  };
  businessName?: string;
  venueName?: string;
  docType?: string;
  docNumber?: string;
  docFileUrl?: string;
  images?: string[];
  city?: string;
  area?: string;
  rejectionReason?: string;
}

export default function ApprovalDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [approval, setApproval] = useState<ApprovalDetail | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    loadApproval(controller.signal);
    return () => controller.abort();
  }, [params.id]);

  const loadApproval = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      // Try to load from all three sources
      const [vendors, venues, kyc] = await Promise.all([
        api.get("/vendors", { signal }).catch(() => ({ data: [] })),
        api.get("/venues", { signal }).catch(() => ({ data: [] })),
        api.get("/kyc/admin/submissions", { signal }).catch(() => ({ data: [] })),
      ]);

      const id = parseInt(params.id as string);
      
      // Search in vendors
      const vendor = vendors.data.find((v: any) => v.id === id);
      if (vendor) {
        setApproval({
          id: vendor.id,
          type: 'VENDOR',
          title: vendor.businessName,
          subtitle: `${vendor.city}, ${vendor.area}`,
          description: vendor.description,
          status: vendor.verificationStatus,
          submittedAt: vendor.createdAt,
          user: vendor.user,
          images: vendor.images,
          city: vendor.city,
          area: vendor.area,
        });
        return;
      }

      // Search in venues
      const venue = venues.data.find((v: any) => v.id === id);
      if (venue) {
        setApproval({
          id: venue.id,
          type: 'VENUE',
          title: venue.name,
          subtitle: `${venue.city}, ${venue.area}`,
          description: venue.description,
          status: venue.status,
          submittedAt: venue.createdAt,
          user: venue.owner,
          images: venue.images,
          city: venue.city,
          area: venue.area,
        });
        return;
      }

      // Search in KYC
      const kycItem = kyc.data.find((k: any) => k.id === id);
      if (kycItem) {
        setApproval({
          id: kycItem.id,
          type: 'KYC',
          title: `${kycItem.docType} - ${kycItem.user?.name}`,
          subtitle: kycItem.docNumber,
          status: kycItem.status,
          submittedAt: kycItem.createdAt,
          user: kycItem.user,
          docType: kycItem.docType,
          docNumber: kycItem.docNumber,
          docFileUrl: kycItem.docFileUrl,
        });
        return;
      }

      toast.error("Approval not found");
      router.push("/dashboard/admin/approvals");
    } catch (error: any) {
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') return;
      console.error("Failed to load approval:", error);
      toast.error("Failed to load approval details");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!approval) return;
    try {
      setActionLoading(true);
      const endpoint = approval.type === 'VENDOR'
        ? `/vendors/${approval.id}/approve`
        : approval.type === 'VENUE'
        ? `/venues/${approval.id}/approve`
        : `/kyc/admin/${approval.id}/status`;

      await api.patch(endpoint, approval.type === 'KYC' ? { status: 'VERIFIED' } : {});
      toast.success(`${approval.type} approved successfully!`);
      router.push("/dashboard/admin/approvals");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to approve");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!approval) return;
    if (!rejectionReason.trim()) {
      toast.error("Please enter rejection reason");
      return;
    }

    try {
      setActionLoading(true);
      const endpoint = approval.type === 'VENDOR'
        ? `/vendors/${approval.id}/reject`
        : approval.type === 'VENUE'
        ? `/venues/${approval.id}/reject`
        : `/kyc/admin/${approval.id}/status`;

      await api.patch(endpoint, {
        ...(approval.type === 'KYC' ? { status: 'REJECTED' } : {}),
        reason: rejectionReason
      });
      toast.success(`${approval.type} rejected`);
      router.push("/dashboard/admin/approvals");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to reject");
    } finally {
      setActionLoading(false);
      setShowRejectModal(false);
      setRejectionReason("");
    }
  };

  const handleDownloadDocument = async () => {
    if (!approval?.docFileUrl) return;
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}${approval.docFileUrl}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${approval.docType}-${approval.docNumber}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success("Document downloaded successfully");
    } catch (error) {
      toast.error("Failed to download document");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-zinc-400" />
          <p className="text-zinc-400">Loading approval details...</p>
        </div>
      </div>
    );
  }

  if (!approval) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-400" />
          <h3 className="text-lg font-bold text-zinc-100 mb-2">Approval Not Found</h3>
          <Button onClick={() => router.push("/dashboard/admin/approvals")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Approvals
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
          <div className="flex items-center gap-3">
            {approval.type === 'VENDOR' && <Store className="h-8 w-8 text-zinc-400" />}
            {approval.type === 'VENUE' && <Building className="h-8 w-8 text-zinc-400" />}
            {approval.type === 'KYC' && <FileText className="h-8 w-8 text-zinc-400" />}
            <div>
              <h1 className="text-3xl font-bold text-zinc-100">{approval.title}</h1>
              <p className="text-zinc-400">{approval.subtitle}</p>
            </div>
          </div>
        </div>
        <Badge className={
          approval.status === 'PENDING' || approval.status === 'PENDING_APPROVAL'
            ? "bg-amber-950/30 text-amber-400 border border-amber-800"
            : approval.status === 'VERIFIED' || approval.status === 'APPROVED'
            ? "bg-emerald-950/30 text-emerald-400 border border-emerald-800"
            : "bg-red-950/30 text-red-400 border border-red-800"
        }>
          {approval.status}
        </Badge>
      </div>

      {/* Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-zinc-800 bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="text-zinc-100">Approval Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-zinc-500">Type</p>
              <p className="font-medium text-zinc-100">{approval.type}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Title</p>
              <p className="font-medium text-zinc-100">{approval.title}</p>
            </div>
            {approval.description && (
              <div>
                <p className="text-xs text-zinc-500">Description</p>
                <p className="font-medium text-zinc-100">{approval.description}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-zinc-500">Location</p>
              <p className="font-medium text-zinc-100">{approval.area}, {approval.city}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Submitted</p>
              <p className="font-medium text-zinc-100">{new Date(approval.submittedAt).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-zinc-800 bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="text-zinc-100">User Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-zinc-500">Name</p>
              <p className="font-medium text-zinc-100">{approval.user?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Email</p>
              <p className="font-medium text-zinc-100">{approval.user?.email || 'N/A'}</p>
            </div>
            {approval.user?.phone && (
              <div>
                <p className="text-xs text-zinc-500">Phone</p>
                <p className="font-medium text-zinc-100">{approval.user.phone}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-zinc-500">Role</p>
              <p className="font-medium text-zinc-100">{approval.user?.role || 'N/A'}</p>
            </div>
          </CardContent>
        </Card>

        {approval.type === 'KYC' && (
          <>
            <Card className="border border-zinc-800 bg-zinc-900/50 md:col-span-2">
              <CardHeader>
                <CardTitle className="text-zinc-100">KYC Document Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-zinc-500">Document Type</p>
                    <p className="font-medium text-zinc-100">{approval.docType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Document Number</p>
                    <p className="font-medium text-zinc-100">{approval.docNumber}</p>
                  </div>
                </div>

                {approval.docFileUrl && (
                  <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-950/50">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-zinc-500" />
                        <div>
                          <p className="font-medium text-zinc-100">KYC Document</p>
                          <p className="text-xs text-zinc-400">{approval.docFileUrl.split('/').pop()}</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleDownloadDocument} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>

                    {approval.docFileUrl.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                      <img
                        src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${approval.docFileUrl}`}
                        alt="KYC Document"
                        className="max-w-full h-auto max-h-64 mx-auto rounded border border-zinc-800"
                      />
                    ) : (
                      <div className="text-center p-8 bg-zinc-900/50 rounded-lg border border-zinc-800">
                        <FileText className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
                        <p className="text-sm text-zinc-400 mb-4">
                          Click download to view the document
                        </p>
                        <Button variant="outline" onClick={handleDownloadDocument} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                          <Download className="h-4 w-4 mr-2" />
                          Download Document
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {approval.images && approval.images.length > 0 && (
          <Card className="border border-zinc-800 bg-zinc-900/50 md:col-span-2">
            <CardHeader>
              <CardTitle className="text-zinc-100">Images</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {approval.images.map((img, idx) => (
                  <div key={idx} className="aspect-video rounded-lg overflow-hidden border border-zinc-800">
                    <img
                      src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${img}`}
                      alt={`Image ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {approval.rejectionReason && (
          <Card className="border border-red-900/50 bg-red-950/20 md:col-span-2">
            <CardHeader>
              <CardTitle className="text-red-400 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Rejection Reason
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-300">{approval.rejectionReason}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Actions */}
      {(approval.status === 'PENDING' || approval.status === 'PENDING_APPROVAL') && (
        <Card className="border border-zinc-800 bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="text-zinc-100">Admin Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button
                variant="default"
                className="bg-emerald-700 hover:bg-emerald-600 text-zinc-100"
                onClick={handleApprove}
                disabled={actionLoading}
              >
                <CheckCircle2 className="h-5 w-5 mr-2" />
                Approve {approval.type}
              </Button>
              <Button
                variant="outline"
                className="border-red-800 text-red-400 hover:bg-red-950/30"
                onClick={() => setShowRejectModal(true)}
                disabled={actionLoading}
              >
                <XCircle className="h-5 w-5 mr-2" />
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-xl font-bold text-zinc-100">Reject {approval.type}</h2>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Rejection Reason *</label>
                <textarea
                  rows={4}
                  placeholder="Please specify why this is being rejected..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="flex min-h-[100px] w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectionReason("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleReject}
                >
                  Reject
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
