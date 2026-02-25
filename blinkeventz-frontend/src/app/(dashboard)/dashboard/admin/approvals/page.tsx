"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Search, CheckCircle2, XCircle, Store, Building2, Eye } from "lucide-react";
import { toast } from "sonner";

interface Approval {
  id: string;
  type: "VENDOR" | "VENUE";
  name: string;
  businessName: string;
  email: string;
  phone: string;
  category: string;
  city: string;
  submittedDate: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  details: string;
}

const MOCK_APPROVALS: Approval[] = [
  {
    id: "1",
    type: "VENDOR",
    name: "Jane Smith",
    businessName: "Elegant Decor Studio",
    email: "jane@elegantdecor.com",
    phone: "+91 98765 43210",
    category: "DECOR",
    city: "Chennai",
    submittedDate: "2024-02-15",
    status: "PENDING",
    details: "Premium wedding and event decoration services with 10+ years experience"
  },
  {
    id: "2",
    type: "VENUE",
    name: "Bob Johnson",
    businessName: "Royal Convention Center",
    email: "bob@royalconvention.com",
    phone: "+91 91234 56789",
    category: "BANQUET",
    city: "Chennai",
    submittedDate: "2024-02-14",
    status: "PENDING",
    details: "Luxurious convention center with state-of-the-art facilities, capacity 1500"
  },
];

export default function AdminApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>(MOCK_APPROVALS);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const filteredApprovals = approvals.filter(approval => {
    const matchesSearch = approval.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         approval.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || approval.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleApprove = (approvalId: string) => {
    setApprovals(approvals.map(a => 
      a.id === approvalId ? { ...a, status: "APPROVED" as const } : a
    ));
    toast.success("Approval granted!", {
      description: "The vendor/venue has been notified and can now accept bookings."
    });
    setIsDetailOpen(false);
  };

  const handleReject = () => {
    if (!selectedApproval || !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    setApprovals(approvals.map(a => 
      a.id === selectedApproval.id ? { ...a, status: "REJECTED" as const } : a
    ));
    toast.success("Application rejected", {
      description: "The applicant has been notified with the rejection reason."
    });
    setIsRejectOpen(false);
    setRejectionReason("");
    setSelectedApproval(null);
  };

  const getTypeBadge = (type: string) => {
    return type === "VENDOR" ? (
      <Badge className="bg-blue-100 text-blue-700"><Store className="h-3 w-3 mr-1" />Vendor</Badge>
    ) : (
      <Badge className="bg-purple-100 text-purple-700"><Building2 className="h-3 w-3 mr-1" />Venue</Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
      case "REJECTED":
        return <Badge className="bg-red-100 text-red-700"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case "PENDING":
        return <Badge className="bg-yellow-100 text-yellow-700">Pending Review</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const stats = {
    total: approvals.length,
    pending: approvals.filter(a => a.status === "PENDING").length,
    vendors: approvals.filter(a => a.type === "VENDOR").length,
    venues: approvals.filter(a => a.type === "VENUE").length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vendor & Venue Approvals</h1>
          <p className="text-gray-500">Review and approve new applications</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Applications</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-50 text-purple-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Pending Review</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
              </div>
              <div className="p-3 rounded-full bg-yellow-50 text-yellow-600">
                <Store className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Vendors</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{stats.vendors}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-50 text-blue-600">
                <Store className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Venues</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{stats.venues}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-50 text-purple-600">
                <Building2 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by business name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="flex h-10 rounded-full border border-purple-200 bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
            >
              <option value="all">All Types</option>
              <option value="VENDOR">Vendors</option>
              <option value="VENUE">Venues</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Approvals List */}
      <div className="grid gap-4">
        {filteredApprovals.map((approval) => (
          <Card key={approval.id}>
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-full bg-gray-100">
                      {approval.type === "VENDOR" ? (
                        <Store className="h-5 w-5 text-blue-600" />
                      ) : (
                        <Building2 className="h-5 w-5 text-purple-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{approval.businessName}</h3>
                      <p className="text-sm text-gray-500">{approval.name} • {approval.category}</p>
                    </div>
                    {getTypeBadge(approval.type)}
                    {getStatusBadge(approval.status)}
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4 mb-4">
                    <div className="text-sm">
                      <p className="text-gray-500">Email</p>
                      <p className="font-medium">{approval.email}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-gray-500">Phone</p>
                      <p className="font-medium">{approval.phone}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-gray-500">Location</p>
                      <p className="font-medium">{approval.city}</p>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-4">{approval.details}</p>
                  <p className="text-xs text-gray-500">Submitted: {new Date(approval.submittedDate).toLocaleDateString("en-IN")}</p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedApproval(approval);
                      setIsDetailOpen(true);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Review
                  </Button>
                  {approval.status === "PENDING" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(approval.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedApproval(approval);
                          setIsRejectOpen(true);
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detail Dialog */}
      {selectedApproval && (
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Application Details</DialogTitle>
              <DialogDescription>Review the complete application information</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Applicant Name</p>
                  <p className="text-gray-900">{selectedApproval.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Business Name</p>
                  <p className="text-gray-900">{selectedApproval.businessName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="text-gray-900">{selectedApproval.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Phone</p>
                  <p className="text-gray-900">{selectedApproval.phone}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Category</p>
                  <Badge>{selectedApproval.category}</Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Location</p>
                  <p className="text-gray-900">{selectedApproval.city}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Description</p>
                <p className="text-gray-700">{selectedApproval.details}</p>
              </div>
            </div>
            <DialogFooter>
              {selectedApproval.status === "PENDING" && (
                <>
                  <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                    Close
                  </Button>
                  <Button variant="destructive" onClick={() => {
                    setIsDetailOpen(false);
                    setIsRejectOpen(true);
                  }}>
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button onClick={() => handleApprove(selectedApproval.id)}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approve Application
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Reject Dialog */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
            <DialogDescription>Provide a reason for rejection. This will be sent to the applicant.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Rejection Reason *</label>
              <Textarea
                placeholder="Please explain why this application is being rejected..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              <XCircle className="h-4 w-4 mr-2" />
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
