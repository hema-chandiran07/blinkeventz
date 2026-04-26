"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Store, CheckCircle2, XCircle, Clock, Eye, Search, MapPin, Mail, DollarSign,
  Briefcase, ShieldCheck, AlertCircle, TrendingUp, RefreshCw, Filter, MoreHorizontal
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { extractArray } from "@/lib/api-response";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Vendor {
  id: number;
  businessName: string;
  description?: string;
  city: string;
  area: string;
  verificationStatus: string;
  user?: {
    name: string;
    email: string;
    phone?: string;
  };
  services?: any[];
  _count?: {
    services: number;
    reviews: number;
  };
  createdAt: string;
}

export default function AdminVendorsPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    const controller = new AbortController();
    loadVendors(controller.signal);
    return () => controller.abort();
  }, []);

  const loadVendors = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const response = await api.get("/vendors", { signal });
      const vendorsData = extractArray<Vendor>(response);
      setVendors(vendorsData);
    } catch (error: any) {
      if (error?.name === 'AbortError' || error?.code === 'ERR_CANCELED') return;
      console.error("Failed to load vendors:", error);
      toast.error("Transmission Error while fetching vendor data");
    } finally {
      setLoading(false);
    }
  };

  const filteredVendors = vendors.filter(vendor => {
    const searchStr = searchTerm.toLowerCase();
    const matchesSearch = vendor.businessName.toLowerCase().includes(searchStr) ||
      vendor.user?.name.toLowerCase().includes(searchStr) ||
      vendor.city.toLowerCase().includes(searchStr);
    const matchesStatus = filterStatus === "all" || vendor.verificationStatus === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: vendors.length,
    verified: vendors.filter(v => v.verificationStatus === "VERIFIED").length,
    pending: vendors.filter(v => v.verificationStatus === "PENDING" || v.verificationStatus === "PENDING_APPROVAL").length,
    rejected: vendors.filter(v => v.verificationStatus === "REJECTED").length,
    critical: vendors.filter(v => v.verificationStatus === "REJECTED" || v.verificationStatus === "SUSPENDED" || v.verificationStatus === "DELISTED").length,
  };

  const handleApprove = async (vendorId: number) => {
    try {
      await api.patch(`/approvals/${vendorId}/approve`, { approvalType: 'VENDOR' });
      toast.success("Vendor application authorized successfully");
      loadVendors();
    } catch (error: any) {
      console.error("Authorization error:", error);
      toast.error(error?.response?.data?.message || "Authorization failed");
    }
  };

  const handleReject = async (vendorId: number) => {
    const reason = prompt("Enter rejection reason:");
    if (reason === null) return;
    
    try {
      await api.patch(`/approvals/${vendorId}/reject`, { 
        approvalType: 'VENDOR',
        reason: reason 
      });
      toast.success("Vendor application rejected");
      loadVendors();
    } catch (error: any) {
      console.error("Rejection error:", error);
      toast.error(error?.response?.data?.message || "Rejection protocol failed");
    }
  };

  return (
    <div className="space-y-6 bg-zinc-950 min-h-screen">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Vendor Management</h1>
            <p className="text-sm text-zinc-400 mt-1">Manage all registered vendors</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 px-6">
        <Card className="border-zinc-700 bg-zinc-900/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Total Vendors</p>
                <p className="text-3xl font-bold text-zinc-100 mt-1">{stats.total}</p>
              </div>
              <div className="p-3 rounded-full bg-zinc-800">
                <Store className="h-6 w-6 text-zinc-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-800 bg-emerald-950/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-400">Verified</p>
                <p className="text-3xl font-bold text-emerald-400 mt-1">{stats.verified}</p>
              </div>
              <div className="p-3 rounded-full bg-emerald-950/30">
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-800 bg-amber-950/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-400">Pending</p>
                <p className="text-3xl font-bold text-amber-400 mt-1">{stats.pending}</p>
              </div>
              <div className="p-3 rounded-full bg-amber-950/30">
                <Clock className="h-6 w-6 text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-800 bg-red-950/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-400">Rejected</p>
                <p className="text-3xl font-bold text-red-400 mt-1">{stats.rejected}</p>
              </div>
              <div className="p-3 rounded-full bg-red-950/30">
                <XCircle className="h-6 w-6 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-zinc-800 bg-zinc-900/50 mx-6">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search by business name or owner..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-zinc-700 bg-zinc-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-600 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-zinc-700 bg-zinc-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-600 text-zinc-100"
            >
              <option value="all">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="VERIFIED">Verified</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Vendors Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 px-6">
        {loading ? (
          <div className="col-span-full text-center py-8 text-zinc-400">Loading vendors...</div>
        ) : filteredVendors.length === 0 ? (
          <div className="col-span-full text-center py-8 text-zinc-400">No vendors found</div>
        ) : (
          filteredVendors.map((vendor) => (
            <Card key={vendor.id} className="border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-zinc-100">{vendor.businessName || "N/A"}</CardTitle>
                    <p className="text-sm text-zinc-400 mt-1">{vendor.user?.name || "N/A"}</p>
                  </div>
                  <Badge className={`text-xs ${vendor.verificationStatus === "VERIFIED" ? "bg-emerald-950/30 text-emerald-400 border-emerald-700" :
                      vendor.verificationStatus === "PENDING" ? "bg-amber-950/30 text-amber-400 border-amber-700" :
                        "bg-red-950/30 text-red-400 border-red-700"
                    }`}>
                    {vendor.verificationStatus || "N/A"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <Mail className="h-4 w-4" />
                  <span>{vendor.user?.email || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <MapPin className="h-4 w-4" />
                  <span>{vendor.area || "N/A"}, {vendor.city || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <DollarSign className="h-4 w-4" />
                  <span>From ₹{vendor.services?.[0]?.baseRate?.toLocaleString() ?? "0"}</span>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                    onClick={() => router.push(`/dashboard/admin/vendors/${vendor.id}`)}
                  >
                    <Eye className="h-4 w-4 mr-1" /> View
                  </Button>
                  {vendor.verificationStatus === "PENDING" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-emerald-700 text-emerald-400 hover:bg-emerald-950/30"
                        onClick={() => handleApprove(vendor.id)}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-red-800 text-red-400 hover:bg-red-950/30"
                        onClick={() => handleReject(vendor.id)}
                      >
                        <XCircle className="h-4 w-4 mr-1" /> Reject
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>

  );
}
