"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2, XCircle, Clock, AlertCircle, Search, Filter,
  RefreshCw, Loader2, Eye, FileText, Building, Store, User,
  Download, ChevronLeft, ChevronRight, TrendingUp
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { motion } from "framer-motion";
import { cn, getImageUrl } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

// ==================== Types ====================
interface KycSubmission {
  id: number;
  userId: number;
  entityType: "VENDOR" | "VENUE_OWNER" | "CUSTOMER";
  docType: string;
  docNumber: string;
  documentUrl: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason?: string | null;
  submittedAt: string;
  reviewedAt?: string | null;
  reviewedBy?: number | null;
  user?: {
    id: number;
    name: string | null;
    email: string;
  };
  vendor?: {
    id: number;
    businessName: string;
  } | null;
  venue?: {
    id: number;
    name: string;
  } | null;
}

interface KycStats {
  totalPending: number;
  totalApproved: number;
  totalRejected: number;
  approvalRate: number;
}

// ==================== Constants ====================
const STATUS_CONFIG: Record<string, { className: string; label: string; icon: any }> = {
  PENDING: { className: "bg-amber-100 text-amber-700 border-amber-300", label: "Pending", icon: Clock },
  APPROVED: { className: "bg-green-100 text-green-700 border-green-300", label: "Approved", icon: CheckCircle2 },
  VERIFIED: { className: "bg-green-100 text-green-700 border-green-300", label: "Approved", icon: CheckCircle2 },
  REJECTED: { className: "bg-red-100 text-red-700 border-red-300", label: "Rejected", icon: XCircle },
};

const DOC_TYPE_LABELS: Record<string, string> = {
  PAN: "PAN Card",
  GST: "GST Certificate",
  BUSINESS_REG: "Business Registration",
  SHOP_ACT: "Shop & Establishment License",
  AADHAAR: "Aadhaar Card",
  PASSPORT: "Passport",
  DRIVING_LICENSE: "Driving License",
};

// Helper to reliably serve large Base64 Data URLs by converting them to Blob URLs
function getSafeFileUrl(dataUrl: string): string {
  if (!dataUrl || !dataUrl.startsWith("data:")) return dataUrl;
  try {
    const parts = dataUrl.split(",");
    if (parts.length < 2) return dataUrl;
    
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
    
    // Use window.atob and handle potential padding issues
    const byteCharacters = atob(parts[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mime });
    return URL.createObjectURL(blob);
  } catch (e) {
    console.error("Could not parse data URL to Blob URL", e);
    return dataUrl;
  }
}

// ==================== Main Component ====================
export default function AdminKycApprovalsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submissions, setSubmissions] = useState<KycSubmission[]>([]);
  const [stats, setStats] = useState<KycStats | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("PENDING");
  const [filterType, setFilterType] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 15;

  const [selectedSubmission, setSelectedSubmission] = useState<KycSubmission | null>(null);
  const [safeDocUrl, setSafeDocUrl] = useState<string | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject">("approve");
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  // Load KYC submissions
  const loadSubmissions = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const endpoint = filterStatus === "PENDING"
        ? "/kyc/pending"
        : "/kyc/admin/submissions";

      const response = await api.get(endpoint, {
        params: { page, limit, status: filterStatus !== "all" ? filterStatus : undefined },
      });

      const data = response.data;

      // Backend returns: { kycDocuments: [...], pagination: { total, totalPages } }
      // OR may return: { data: [...], totalPages } from other endpoints
      let submissionList: any[] = [];
      let totalPagesVal = 1;

      if (data?.kycDocuments && Array.isArray(data.kycDocuments)) {
        // Map backend KYC doc shape to frontend KycSubmission shape
        submissionList = data.kycDocuments.map((kyc: any) => ({
          id: kyc.id,
          userId: kyc.userId,
          entityType: kyc.user?.role || "CUSTOMER",
          docType: kyc.docType || "",
          docNumber: kyc.docNumber || "",
          documentUrl: kyc.docFileUrl || "",
          status: kyc.status === "VERIFIED" ? "APPROVED" : kyc.status,
          rejectionReason: kyc.rejectionReason,
          submittedAt: kyc.createdAt,
          reviewedAt: kyc.verifiedAt,
          reviewedBy: null,
          user: kyc.user || null,
          vendor: null,
          venue: null,
        }));
        totalPagesVal = data.pagination?.totalPages || 1;
      } else if (Array.isArray(data?.data)) {
        submissionList = data.data;
        totalPagesVal = data.totalPages || data.pagination?.totalPages || 1;
      } else if (Array.isArray(data)) {
        submissionList = data;
      }

      setSubmissions(submissionList);
      setTotalPages(totalPagesVal);

      // Calculate stats
      const pending = submissionList.filter((s: KycSubmission) => s.status === "PENDING").length;
      const approved = submissionList.filter((s: KycSubmission) => s.status === "APPROVED").length;
      const rejected = submissionList.filter((s: KycSubmission) => s.status === "REJECTED").length;

      setStats({
        totalPending: pending,
        totalApproved: approved,
        totalRejected: rejected,
        approvalRate: (approved + rejected) > 0
          ? Math.round((approved / (approved + rejected)) * 100)
          : 0,
      });
    } catch (error: any) {
      console.error("Failed to load KYC submissions:", error);
      toast.error(error?.response?.data?.message || "Failed to load KYC submissions");
      setSubmissions([]);
      setStats(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, filterStatus]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  // Filter submissions
  const filteredSubmissions = submissions.filter(s => {
    const name = s.user?.name || s.vendor?.businessName || s.venue?.name || "";
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         s.docNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || s.entityType === filterType;
    return matchesSearch && matchesType;
  });

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || { className: "bg-neutral-100 text-neutral-700", label: status, icon: null };
    const Icon = config.icon;
    return (
      <Badge className={cn("text-xs font-medium", config.className)}>
        {Icon && <Icon className="h-3 w-3 mr-1" />}
        {config.label}
      </Badge>
    );
  };

  // Get entity name
  const getEntityName = (submission: KycSubmission) => {
    if (submission.vendor?.businessName) return submission.vendor.businessName;
    if (submission.venue?.name) return submission.venue.name;
    return submission.user?.name || "Unknown";
  };

  // Get entity type label
  const getEntityTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      VENDOR: "Vendor",
      VENUE_OWNER: "Venue Owner",
      CUSTOMER: "Customer",
    };
    return labels[type] || type;
  };

  // Handle close view
  const handleCloseView = () => {
    setViewDialogOpen(false);
    if (safeDocUrl && safeDocUrl.startsWith('blob:')) {
      URL.revokeObjectURL(safeDocUrl);
    }
    setSafeDocUrl(null);
  };

  // Handle view
  const handleView = (submission: KycSubmission) => {
    setSelectedSubmission(submission);
    setPreviewError(false);
    setSafeDocUrl(submission.documentUrl ? getSafeFileUrl(submission.documentUrl) : null);
    setViewDialogOpen(true);
  };

  // Handle approve
  const handleApprove = async () => {
    if (!selectedSubmission) return;

    setActionLoading(true);
    try {
      // Backend expects "VERIFIED" not "APPROVED"
      await api.patch(`/kyc/admin/${selectedSubmission.id}/status`, {
        status: "VERIFIED",
      });
      toast.success("KYC approved successfully");
      loadSubmissions();
      setActionDialogOpen(false);
      setViewDialogOpen(false);
      setSelectedSubmission(null);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to approve KYC");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle reject
  const handleReject = async () => {
    if (!selectedSubmission || !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    setActionLoading(true);
    try {
      await api.patch(`/kyc/admin/${selectedSubmission.id}/status`, {
        status: "REJECTED",
        rejectionReason: rejectionReason.trim(),
      });
      toast.success("KYC rejected");
      setActionDialogOpen(false);
      setViewDialogOpen(false);
      setSelectedSubmission(null);
      setRejectionReason("");
      loadSubmissions();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to reject KYC");
    } finally {
      setActionLoading(false);
    }
  };

  // Open action dialog
  const openActionDialog = (type: "approve" | "reject") => {
    setActionType(type);
    setActionDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-neutral-400" />
          <p className="text-neutral-600">Loading KYC submissions...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6 bg-neutral-50 min-h-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border-b border-neutral-200 px-6 py-4"
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">KYC Approvals</h1>
            <p className="text-sm text-neutral-600 mt-1">Review and approve KYC submissions</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="border-neutral-300" onClick={() => loadSubmissions(true)} disabled={refreshing}>
              <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} /> 
              Refresh
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div 
        className="grid gap-4 md:grid-cols-4 px-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-700">Pending Review</p>
                <p className="text-3xl font-bold text-amber-900 mt-1">{stats?.totalPending || 0}</p>
                <p className="text-xs text-amber-600 mt-1">Awaiting approval</p>
              </div>
              <div className="p-3 rounded-full bg-amber-600">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Approved</p>
                <p className="text-3xl font-bold text-green-900 mt-1">{stats?.totalApproved || 0}</p>
                <p className="text-xs text-green-600 mt-1">Verified users</p>
              </div>
              <div className="p-3 rounded-full bg-green-600">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-gradient-to-br from-red-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700">Rejected</p>
                <p className="text-3xl font-bold text-red-900 mt-1">{stats?.totalRejected || 0}</p>
                <p className="text-xs text-red-600 mt-1">Requires resubmission</p>
              </div>
              <div className="p-3 rounded-full bg-red-600">
                <XCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-neutral-200 bg-gradient-to-br from-neutral-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-700">Approval Rate</p>
                <p className="text-3xl font-bold text-neutral-900 mt-1">{stats?.approvalRate || 0}%</p>
                <p className="text-xs text-neutral-600 mt-1">Of reviewed submissions</p>
              </div>
              <div className="p-3 rounded-full bg-neutral-900">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div 
        className="px-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-neutral-500" />
                <span className="text-sm font-medium text-neutral-700">Filters:</span>
              </div>
              <div className="flex-1 relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  placeholder="Search by name, business, or document number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="filter-status" className="text-sm whitespace-nowrap">Status:</Label>
                <select
                  id="filter-status"
                  value={filterStatus}
                  onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                  className="flex h-10 rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-600"
                >
                  <option value="PENDING">Pending</option>
                  <option value="all">All Status</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="filter-type" className="text-sm whitespace-nowrap">Type:</Label>
                <select
                  id="filter-type"
                  value={filterType}
                  onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
                  className="flex h-10 rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-600"
                >
                  <option value="all">All Types</option>
                  <option value="VENDOR">Vendors</option>
                  <option value="VENUE_OWNER">Venue Owners</option>
                  <option value="CUSTOMER">Customers</option>
                </select>
              </div>
              {(searchTerm || filterStatus !== "PENDING" || filterType !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setFilterStatus("PENDING");
                    setFilterType("all");
                  }}
                  className="text-neutral-600"
                >
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Submissions Table */}
      <motion.div 
        className="px-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-black">KYC Submissions</CardTitle>
                <p className="text-sm text-neutral-600 mt-1">
                  {filteredSubmissions.length} submissions found • Page {page} of {totalPages}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredSubmissions.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">No submissions found</h3>
                <p className="text-neutral-600">
                  {searchTerm || filterType !== "all"
                    ? "Try adjusting your filters"
                    : filterStatus === "PENDING"
                    ? "No pending KYC submissions to review"
                    : "No KYC submissions available"}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-neutral-50 border-b-2 border-neutral-200">
                      <tr>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Submission ID</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Entity</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Type</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Document</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Doc Number</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Status</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Submitted</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {filteredSubmissions.map((submission) => (
                        <tr key={submission.id} className="hover:bg-neutral-50 transition-colors">
                          <td className="py-3 px-4">
                            <span className="text-xs font-mono text-neutral-600">#{submission.id}</span>
                          </td>
                          <td className="py-3 px-4">
                            <div>
                              <p className="text-sm font-medium text-neutral-900">{getEntityName(submission)}</p>
                              <p className="text-xs text-neutral-500">{getEntityTypeLabel(submission.entityType)}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={submission.entityType === "VENDOR" ? "default" : "outline"} className="text-xs">
                              {getEntityTypeLabel(submission.entityType)}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-neutral-700">{DOC_TYPE_LABELS[submission.docType] || submission.docType}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm font-mono text-neutral-600">{submission.docNumber}</span>
                          </td>
                          <td className="py-3 px-4">
                            {getStatusBadge(submission.status)}
                            {submission.rejectionReason && (
                              <p className="text-xs text-red-600 mt-1 max-w-[150px] truncate" title={submission.rejectionReason}>
                                {submission.rejectionReason}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-neutral-600">{formatDate(submission.submittedAt)}</span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleView(submission)}
                                className="text-neutral-600 hover:bg-neutral-100"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {submission.status === "PENDING" && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedSubmission(submission);
                                      openActionDialog("approve");
                                    }}
                                    className="text-green-600 hover:bg-green-50 border-green-200"
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedSubmission(submission);
                                      openActionDialog("reject");
                                    }}
                                    className="text-red-600 hover:bg-red-50 border-red-200"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-6 border-t">
                    <p className="text-sm text-neutral-600">
                      Showing {(page - 1) * limit + 1} to {Math.min(page * limit, filteredSubmissions.length)} of {filteredSubmissions.length} submissions
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const pageNum = i + 1;
                          return (
                            <Button
                              key={pageNum}
                              variant={page === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => setPage(pageNum)}
                              className={page === pageNum ? "bg-neutral-900" : ""}
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* View Dialog */}
      {selectedSubmission && (
        <Dialog open={viewDialogOpen} onOpenChange={(open) => { if (!open) handleCloseView(); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader className="shrink-0">
              <DialogTitle>KYC Submission Details</DialogTitle>
              <DialogDescription>Review the submitted KYC documents</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Entity Name</p>
                  <p className="text-black font-medium">{getEntityName(selectedSubmission)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600">Entity Type</p>
                  <p className="text-black">{getEntityTypeLabel(selectedSubmission.entityType)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600">Document Type</p>
                  <p className="text-black">{DOC_TYPE_LABELS[selectedSubmission.docType] || selectedSubmission.docType}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600">Document Number</p>
                  <p className="text-black font-mono">{selectedSubmission.docNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600">Status</p>
                  <div>{getStatusBadge(selectedSubmission.status)}</div>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600">Submitted On</p>
                  <p className="text-black">{formatDate(selectedSubmission.submittedAt)}</p>
                </div>
              </div>

              {selectedSubmission.user && (
                <div>
                  <p className="text-sm font-medium text-neutral-600 mb-2">User Information</p>
                  <div className="p-3 bg-neutral-50 rounded-lg border">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-neutral-600" />
                      <div>
                        <p className="text-sm font-medium text-black">{selectedSubmission.user.name || "N/A"}</p>
                        <p className="text-xs text-neutral-600">{selectedSubmission.user.email}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedSubmission.documentUrl ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-neutral-600">Uploaded Document</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => {
                        // Download the document using the blob URL if available
                        const downloadUrl = getImageUrl(safeDocUrl || selectedSubmission.documentUrl);
                        
                        if (downloadUrl.startsWith('data:')) {
                           const link = document.createElement('a');
                           link.href = downloadUrl;
                           // Determine extension from MIME type
                           let ext = 'file';
                           if (downloadUrl.includes('application/pdf')) ext = 'pdf';
                           else if (downloadUrl.includes('image/png')) ext = 'png';
                           else if (downloadUrl.includes('image/jpeg')) ext = 'jpg';
                           
                           link.download = `kyc-${DOC_TYPE_LABELS[selectedSubmission.docType] || 'doc'}-${selectedSubmission.docNumber || selectedSubmission.id}.${ext}`;
                           document.body.appendChild(link);
                           link.click();
                           document.body.removeChild(link);
                        } else {
                          // For external/legacy files, open in new tab for download/view
                          window.open(downloadUrl, '_blank');
                        }
                      }}
                    >
                      <Download className="h-3 w-3" />
                      Download
                    </Button>
                  </div>
                  <div className="rounded-lg border overflow-hidden bg-white">
                    {(() => {
                      const originalDataUrl = selectedSubmission.documentUrl;
                      const docUrlToUse = safeDocUrl || originalDataUrl;
                      
                      // Detect file type from original data URL
                      // Detect file type from original data URL or file extension
                      const isPdf = originalDataUrl.includes('application/pdf') || originalDataUrl.endsWith('.pdf');
                      const isImage = originalDataUrl.includes('image/') || 
                                     originalDataUrl.endsWith('.jpg') || 
                                     originalDataUrl.endsWith('.jpeg') || 
                                     originalDataUrl.endsWith('.png');

                      if (isPdf && !previewError) {
                        return (
                          <div className="relative">
                            <iframe
                              src={getImageUrl(docUrlToUse)}
                              className="w-full h-96 border-0 bg-neutral-100"
                              title="Document Preview"
                              onLoad={() => {
                                // Basic check if content is meaningful
                              }}
                            />
                            <div className="bg-neutral-50 px-4 py-2 border-t flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-neutral-500" />
                                <span className="text-xs text-neutral-600">PDF Document — Interactive Preview</span>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 text-[10px] text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => setPreviewError(true)}
                              >
                                Preview not loading?
                              </Button>
                            </div>
                          </div>
                        );
                      }

                      if (isImage && !previewError && docUrlToUse) {
                        return (
                          <div className="relative">
                            <img
                              src={getImageUrl(docUrlToUse)}
                              alt="KYC Document"
                              className="w-full h-auto max-h-96 object-contain mx-auto"
                              onError={() => setPreviewError(true)}
                            />
                            <div className="bg-neutral-50 px-4 py-2 border-t flex items-center gap-2">
                              <FileText className="h-4 w-4 text-neutral-500" />
                              <span className="text-xs text-neutral-600">Image Document</span>
                            </div>
                          </div>
                        );
                      }

                      // Fallback: unsupported file type, empty URL, or Error
                      const isMissing = !docUrlToUse || docUrlToUse === '';
                      return (
                        <div className="flex flex-col items-center justify-center p-12 bg-neutral-50 rounded-lg border border-dashed border-neutral-300">
                           <div className="p-4 bg-white rounded-2xl shadow-sm mb-4">
                              <AlertCircle className="h-8 w-8 text-red-500" />
                           </div>
                           <h4 className="text-lg font-bold text-neutral-900">
                             {isMissing ? "Document Required" : "Document Unavailable"}
                           </h4>
                           <p className="text-sm text-neutral-500 text-center max-w-xs mt-2">
                             {isMissing 
                               ? "No document file was found for this submission. The record might have been created without a valid upload."
                               : "The original file could not be retrieved from the storage server. It may have been relocated or corrupted."
                             }
                           </p>
                           <div className="flex gap-3 mt-6">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => window.open(getImageUrl(docUrlToUse), '_blank')}
                              >
                                Try Direct Link
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => {
                                  setActionType("reject");
                                  setRejectionReason("The submitted document file is missing or corrupted. Please re-upload a clear copy of your KYC document.");
                                  setActionDialogOpen(true);
                                }}
                              >
                                Request Re-upload
                              </Button>
                           </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-neutral-600 mb-2">Uploaded Document</p>
                  <div className="p-4 bg-neutral-50 rounded-lg border text-center">
                    <AlertCircle className="h-8 w-8 text-neutral-400 mx-auto mb-2" />
                    <p className="text-sm text-neutral-600">No document attached</p>
                  </div>
                </div>
              )}

              {selectedSubmission.rejectionReason && (
                <div>
                  <p className="text-sm font-medium text-neutral-600 mb-2">Rejection Reason</p>
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm text-red-700">{selectedSubmission.rejectionReason}</p>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCloseView}>Close</Button>
              {selectedSubmission.status === "PENDING" && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleCloseView();
                      openActionDialog("reject");
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    onClick={() => {
                      handleCloseView();
                      openActionDialog("approve");
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === "approve" ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Approve KYC
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  Reject KYC
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve" 
                ? "This will approve the KYC submission and verify the user."
                : "This will reject the KYC submission. Please provide a reason."}
            </DialogDescription>
          </DialogHeader>
          {selectedSubmission && (
            <div className="py-4">
              <p className="text-sm text-neutral-600 mb-1">Entity:</p>
              <p className="font-medium text-black mb-3">{getEntityName(selectedSubmission)}</p>
              {actionType === "reject" && (
                <div className="space-y-2">
                  <Label htmlFor="rejection-reason" className="text-black">Rejection Reason *</Label>
                  <Textarea
                    id="rejection-reason"
                    placeholder="Please explain why this KYC is being rejected..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={4}
                    className="resize-none bg-white text-black"
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setActionDialogOpen(false); setRejectionReason(""); }} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              onClick={actionType === "approve" ? handleApprove : handleReject}
              disabled={actionLoading || (actionType === "reject" && !rejectionReason.trim())}
              className={actionType === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {actionType === "approve" ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Approve
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
