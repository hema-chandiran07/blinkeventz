"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, XCircle, Eye, Download, FileText, Store, Building,
  Clock, Activity
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface ApprovalItem {
  id: number;
  type: 'VENDOR' | 'VENUE' | 'KYC';
  title: string;
  subtitle: string;
  user: {
    name: string;
    email: string;
    role: string;
  };
  status: string;
  submittedAt: string;
  documentUrl?: string;
  docType?: string;
  docNumber?: string;
}

export default function UnifiedApprovalsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'VENDOR' | 'VENUE' | 'KYC'>('ALL');
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    loadApprovals();
  }, []);

  const loadApprovals = async () => {
    try {
      setLoading(true);
      const [vendors, venues, kyc] = await Promise.all([
        api.get("/vendors"),
        api.get("/venues"),
        api.get("/kyc/admin/submissions"),
      ]);

      // Filter pending vendors
      const pendingVendors = (vendors.data || []).filter(
        (v: any) => v.verificationStatus === 'PENDING'
      );
      
      // Filter pending venues  
      const pendingVenues = (venues.data || []).filter(
        (v: any) => v.status === 'PENDING_APPROVAL'
      );

      // Filter pending KYC
      const pendingKyc = (kyc.data?.kycDocuments || []).filter(
        (k: any) => k.status === 'PENDING'
      );

      const items: ApprovalItem[] = [
        ...pendingVendors.map((v: any) => ({
          id: v.id,
          type: 'VENDOR' as const,
          title: v.businessName,
          subtitle: `${v.city}, ${v.area}`,
          user: { name: v.user?.name, email: v.user?.email, role: 'VENDOR' },
          status: v.verificationStatus,
          submittedAt: v.createdAt,
          documentUrl: v.images?.[0],
        })),
        ...pendingVenues.map((v: any) => ({
          id: v.id,
          type: 'VENUE' as const,
          title: v.name,
          subtitle: `${v.city}, ${v.area} | ${v.type}`,
          user: { name: v.owner?.name, email: v.owner?.email, role: 'VENUE_OWNER' },
          status: v.status,
          submittedAt: v.createdAt,
          documentUrl: v.venueImages?.[0],
        })),
        ...pendingKyc.map((k: any) => ({
          id: k.id,
          type: 'KYC' as const,
          title: `${k.docType} - ${k.user?.name}`,
          subtitle: k.docNumber,
          user: { name: k.user?.name, email: k.user?.email, role: k.user?.role },
          status: k.status,
          submittedAt: k.createdAt,
          documentUrl: k.docFileUrl,
          docType: k.docType,
          docNumber: k.docNumber,
        })),
      ];

      setApprovals(items);
    } catch (error: any) {
      console.error("Failed to load approvals:", error);
      toast.error("Failed to load approvals");
    } finally {
      setLoading(false);
    }
  };

  const filteredApprovals = activeTab === 'ALL' 
    ? approvals 
    : approvals.filter(a => a.type === activeTab);

  const stats = {
    total: approvals.length,
    vendors: approvals.filter(a => a.type === 'VENDOR').length,
    venues: approvals.filter(a => a.type === 'VENUE').length,
    kyc: approvals.filter(a => a.type === 'KYC').length,
  };

  const handleApprove = async (approval: ApprovalItem) => {
    try {
      const endpoint = approval.type === 'VENDOR'
        ? `/vendors/${approval.id}/approve`
        : approval.type === 'VENUE'
        ? `/venues/${approval.id}/approve`
        : `/kyc/admin/${approval.id}/status`;

      await api.patch(endpoint, approval.type === 'KYC' ? { status: 'VERIFIED' } : {});
      toast.success(`${approval.type} approved successfully!`);
      loadApprovals();
      setSelectedApproval(null);
    } catch (error: any) {
      console.error("Approval error:", error);
      toast.error(error?.response?.data?.message || "Failed to approve");
    }
  };

  const handleReject = async (approval: ApprovalItem) => {
    if (!rejectionReason.trim()) {
      toast.error("Please enter rejection reason");
      return;
    }

    try {
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
      loadApprovals();
      setSelectedApproval(null);
      setShowRejectModal(false);
      setRejectionReason("");
    } catch (error: any) {
      console.error("Rejection error:", error);
      toast.error(error?.response?.data?.message || "Failed to reject");
    }
  };

  const handleExport = () => {
    const csvRows = [
      ['ID', 'Type', 'Title', 'User', 'Email', 'Status', 'Submitted At'],
      ...approvals.map(a => [
        a.id,
        a.type,
        a.title,
        a.user.name,
        a.user.email,
        a.status,
        new Date(a.submittedAt).toISOString(),
      ]),
    ];
    const csv = csvRows.map(r => r.join(',')).join('\n');
    const blob = new Blob([`ID,Type,Title,User,Email,Status,Submitted\n${csv}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `approvals-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success("Approvals exported successfully!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full border-4 border-neutral-200 border-t-black animate-spin mx-auto mb-4" />
          <p className="text-black">Loading approvals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black">Approvals Dashboard</h1>
          <p className="text-neutral-600">Manage vendor, venue, and KYC approvals</p>
        </div>
        <Button onClick={handleExport} variant="outline" className="border-black">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-2 border-amber-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Pending</p>
                <p className="text-3xl font-bold text-amber-600">{stats.total}</p>
              </div>
              <div className="p-3 rounded-full bg-amber-600">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-blue-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Vendors</p>
                <p className="text-3xl font-bold text-blue-600">{stats.vendors}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-600">
                <Store className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-purple-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Venues</p>
                <p className="text-3xl font-bold text-purple-600">{stats.venues}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-600">
                <Building className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-green-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">KYC Documents</p>
                <p className="text-3xl font-bold text-green-600">{stats.kyc}</p>
              </div>
              <div className="p-3 rounded-full bg-green-600">
                <FileText className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Card className="border-2 border-black">
        <CardContent className="p-4">
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'ALL' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('ALL')}
              className={activeTab === 'ALL' ? 'bg-black' : 'border-black'}
            >
              All ({stats.total})
            </Button>
            <Button
              variant={activeTab === 'VENDOR' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('VENDOR')}
              className={activeTab === 'VENDOR' ? 'bg-black' : 'border-black'}
            >
              <Store className="h-4 w-4 mr-2" />
              Vendors ({stats.vendors})
            </Button>
            <Button
              variant={activeTab === 'VENUE' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('VENUE')}
              className={activeTab === 'VENUE' ? 'bg-black' : 'border-black'}
            >
              <Building className="h-4 w-4 mr-2" />
              Venues ({stats.venues})
            </Button>
            <Button
              variant={activeTab === 'KYC' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('KYC')}
              className={activeTab === 'KYC' ? 'bg-black' : 'border-black'}
            >
              <FileText className="h-4 w-4 mr-2" />
              KYC ({stats.kyc})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Approvals List */}
      <Card className="border-2 border-black">
        <CardHeader>
          <CardTitle className="text-black">
            <Activity className="h-5 w-5" />
            Pending Approvals
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredApprovals.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-600" />
              <h3 className="text-lg font-bold text-black mb-2">All Caught Up!</h3>
              <p className="text-neutral-600">No pending approvals in this category</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredApprovals.map((approval) => (
                <div
                  key={approval.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-neutral-200 hover:border-black transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-12 w-12 rounded-full bg-neutral-100 flex items-center justify-center">
                      {approval.type === 'VENDOR' && <Store className="h-6 w-6" />}
                      {approval.type === 'VENUE' && <Building className="h-6 w-6" />}
                      {approval.type === 'KYC' && <FileText className="h-6 w-6" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-black">{approval.title}</h3>
                        <Badge className="bg-neutral-100 text-black border-neutral-300">
                          {approval.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-neutral-600">{approval.subtitle}</p>
                      <p className="text-xs text-neutral-500 mt-1">
                        {approval.user.name} • {new Date(approval.submittedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedApproval(approval)}
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
      {selectedApproval && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="text-black">
                <span className="text-black">Review {selectedApproval.type}</span>
                <Button variant="ghost" size="sm" onClick={() => setSelectedApproval(null)}>
                  <XCircle className="h-5 w-5" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Details */}
              <div>
                <h3 className="font-bold text-black mb-3">Details</h3>
                <div className="grid grid-cols-2 gap-4 p-4 bg-neutral-50 rounded-lg">
                  <div>
                    <p className="text-xs text-neutral-600">Name</p>
                    <p className="font-medium text-black">{selectedApproval.title}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-600">User</p>
                    <p className="font-medium text-black">{selectedApproval.user.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-600">Email</p>
                    <p className="font-medium text-black">{selectedApproval.user.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-600">Submitted</p>
                    <p className="font-medium text-black">
                      {new Date(selectedApproval.submittedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Document Preview for KYC */}
              {selectedApproval.type === 'KYC' && selectedApproval.documentUrl && (
                <div>
                  <h3 className="font-bold text-black mb-3">KYC Document</h3>
                  <div className="border-2 border-neutral-200 rounded-lg p-4">
                    <p className="text-sm text-neutral-600 mb-2">
                      Type: {selectedApproval.docType} | Number: {selectedApproval.docNumber}
                    </p>
                    {(() => {
                      const fileUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${selectedApproval.documentUrl}`;
                      const isImage = selectedApproval.documentUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i);
                      const isPdf = selectedApproval.documentUrl.match(/\.pdf$/i);
                      
                      if (isImage) {
                        return (
                          <div className="border rounded-lg overflow-hidden">
                            <img
                              src={fileUrl}
                              alt="KYC Document"
                              className="max-w-full h-auto max-h-96 mx-auto"
                            />
                            <div className="p-2 bg-neutral-50 border-t flex gap-2 justify-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(fileUrl, '_blank')}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                View Full Size
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const a = document.createElement('a');
                                  a.href = fileUrl;
                                  a.download = selectedApproval.documentUrl?.split('/').pop() || 'kyc-document';
                                  a.click();
                                }}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </Button>
                            </div>
                          </div>
                        );
                      }
                      
                      if (isPdf) {
                        return (
                          <div className="border rounded-lg overflow-hidden">
                            <iframe
                              src={fileUrl}
                              className="w-full h-96 border-0"
                              title="KYC Document Preview"
                            />
                            <div className="p-2 bg-neutral-50 border-t flex gap-2 justify-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(fileUrl, '_blank')}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Open in New Tab
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const a = document.createElement('a');
                                  a.href = fileUrl;
                                  a.download = selectedApproval.documentUrl?.split('/').pop() || 'kyc-document';
                                  a.click();
                                }}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </Button>
                            </div>
                          </div>
                        );
                      }
                      
                      // For any other file type
                      return (
                        <div className="text-center p-8">
                          <FileText className="h-12 w-12 text-neutral-400 mx-auto mb-3" />
                          <p className="text-sm text-neutral-600 mb-3">Preview not available for this file type</p>
                          <div className="flex gap-2 justify-center">
                            <Button
                              variant="outline"
                              onClick={() => window.open(fileUrl, '_blank')}
                            >
                              View File
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                const a = document.createElement('a');
                                a.href = fileUrl;
                                a.download = selectedApproval.documentUrl?.split('/').pop() || 'kyc-document';
                                a.click();
                              }}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download File
                            </Button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => handleApprove(selectedApproval)}
                >
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="outline"
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
      {showRejectModal && selectedApproval && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-black">Reject {selectedApproval.type}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-black">Rejection Reason *</label>
                <textarea
                  rows={4}
                  placeholder="Please specify why this is being rejected..."
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
                  onClick={() => handleReject(selectedApproval)}
                >
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
