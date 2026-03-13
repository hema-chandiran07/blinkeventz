"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FileText, CheckCircle2, XCircle, Eye, Download, AlertCircle,
  Shield, User, Building, Store
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface KycSubmission {
  id: number;
  docType: string;
  docNumber: string;
  docFileUrl: string;
  status: string;
  createdAt: string;
  user: {
    id: number;
    name: string;
    email: string;
    phone: string;
    role: string;
  };
}

export default function AdminKycApprovalsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<KycSubmission[]>([]);
  const [selectedKyc, setSelectedKyc] = useState<KycSubmission | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    try {
      const response = await api.get("/kyc/admin/submissions");
      setSubmissions(response.data);
    } catch (error: any) {
      console.error("Failed to load KYC submissions:", error);
      toast.error("Failed to load KYC submissions");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await api.patch(`/kyc/admin/${id}/status`, { status: "VERIFIED" });
      toast.success("KYC approved successfully");
      loadSubmissions();
      setSelectedKyc(null);
    } catch (error: any) {
      console.error("Approval error:", error);
      toast.error(error?.response?.data?.message || "Failed to approve KYC");
    }
  };

  const handleReject = async (id: number) => {
    if (!rejectionReason.trim()) {
      toast.error("Please enter rejection reason");
      return;
    }

    try {
      await api.patch(`/kyc/admin/${id}/status`, {
        status: "REJECTED",
        rejectionReason: rejectionReason,
      });
      toast.success("KYC rejected");
      loadSubmissions();
      setSelectedKyc(null);
      setShowRejectModal(false);
      setRejectionReason("");
    } catch (error: any) {
      console.error("Rejection error:", error);
      toast.error(error?.response?.data?.message || "Failed to reject KYC");
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "VENDOR":
        return <Store className="h-4 w-4" />;
      case "VENUE_OWNER":
        return <Building className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getDocTypeLabel = (docType: string) => {
    const labels: Record<string, string> = {
      AADHAAR: "Aadhaar",
      PAN: "PAN Card",
      PASSPORT: "Passport",
      DRIVING_LICENSE: "Driving License",
      VOTER_ID: "Voter ID",
      GST: "GST Certificate",
      BUSINESS_REG: "Business Registration",
      SHOP_ACT: "Shop & Establishment",
    };
    return labels[docType] || docType;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full border-4 border-neutral-200 border-t-black animate-spin mx-auto mb-4" />
          <p className="text-black">Loading KYC submissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black mb-2">KYC Approvals</h1>
        <p className="text-neutral-600">Review and verify user KYC submissions</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card className="border-2 border-amber-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Pending Review</p>
                <p className="text-3xl font-bold text-amber-600">{submissions.length}</p>
              </div>
              <div className="p-3 rounded-full bg-amber-600">
                <FileText className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KYC Submissions List */}
      <Card className="border-2 border-black">
        <CardHeader>
          <CardTitle className="text-black">Pending KYC Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-600" />
              <h3 className="text-lg font-bold text-black mb-2">All Caught Up!</h3>
              <p className="text-neutral-600">No pending KYC submissions</p>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((kyc) => (
                <div
                  key={kyc.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-neutral-200 hover:border-black transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-12 w-12 rounded-full bg-neutral-100 flex items-center justify-center">
                      {getRoleIcon(kyc.user.role)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-black">{kyc.user.name}</h3>
                        <Badge className="bg-neutral-100 text-black border-neutral-300">
                          {kyc.user.role.replace("_", " ")}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-neutral-600">
                        <span>{kyc.user.email}</span>
                        <span>•</span>
                        <span>{getDocTypeLabel(kyc.docType)}</span>
                        <span>•</span>
                        <span>{new Date(kyc.createdAt).toLocaleDateString("en-IN")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedKyc(kyc)}
                      className="border-black"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Review
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Modal */}
      {selectedKyc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="text-black">KYC Review</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedKyc(null)}
                >
                  <XCircle className="h-5 w-5" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* User Info */}
              <div>
                <h3 className="font-bold text-black mb-3">User Information</h3>
                <div className="grid grid-cols-2 gap-4 p-4 bg-neutral-50 rounded-lg">
                  <div>
                    <p className="text-xs text-neutral-600">Name</p>
                    <p className="font-medium text-black">{selectedKyc.user.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-600">Email</p>
                    <p className="font-medium text-black">{selectedKyc.user.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-600">Phone</p>
                    <p className="font-medium text-black">{selectedKyc.user.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-600">Role</p>
                    <p className="font-medium text-black">{selectedKyc.user.role.replace("_", " ")}</p>
                  </div>
                </div>
              </div>

              {/* Document Info */}
              <div>
                <h3 className="font-bold text-black mb-3">Document Details</h3>
                <div className="grid grid-cols-2 gap-4 p-4 bg-neutral-50 rounded-lg">
                  <div>
                    <p className="text-xs text-neutral-600">Document Type</p>
                    <p className="font-medium text-black">{getDocTypeLabel(selectedKyc.docType)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-600">Document Number</p>
                    <p className="font-medium text-black">{selectedKyc.docNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-600">Submitted On</p>
                    <p className="font-medium text-black">
                      {new Date(selectedKyc.createdAt).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Document Preview */}
              <div>
                <h3 className="font-bold text-black mb-3">Document</h3>
                <div className="border-2 border-neutral-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-neutral-400" />
                      <div>
                        <p className="font-medium text-black">KYC Document</p>
                        <p className="text-xs text-neutral-600">
                          {selectedKyc.docFileUrl.split("/").pop()}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(selectedKyc.docFileUrl, "_blank")}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                  <div className="text-center p-8 bg-neutral-50 rounded-lg">
                    <AlertCircle className="h-12 w-12 text-neutral-400 mx-auto mb-3" />
                    <p className="text-sm text-neutral-600">
                      Document preview not available. Please download to review.
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="default"
                  size="lg"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => handleApprove(selectedKyc.id)}
                >
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Approve KYC
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                  onClick={() => setShowRejectModal(true)}
                >
                  <XCircle className="h-5 w-5 mr-2" />
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-black">Reject KYC</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rejectionReason" className="text-black font-medium">
                  Rejection Reason *
                </Label>
                <textarea
                  id="rejectionReason"
                  rows={4}
                  placeholder="Please specify why this KYC is being rejected..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="flex min-h-[100px] w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
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
                  onClick={() => handleReject(selectedKyc!.id)}
                >
                  Reject KYC
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
