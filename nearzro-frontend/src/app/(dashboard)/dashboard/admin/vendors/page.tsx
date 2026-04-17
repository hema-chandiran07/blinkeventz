"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Store, CheckCircle2, XCircle, Clock, Eye, Search, MapPin, Mail, DollarSign
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { extractArray } from "@/lib/api-response";

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
  createdAt: string;
}

export default function AdminVendorsPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    try {
      setLoading(true);
      const response = await api.get("/vendors");
      const vendorsData = extractArray<Vendor>(response);
      setVendors(vendorsData);
    } catch (error: any) {
      console.error("Failed to load vendors:", error);
      toast.error("Failed to load vendors");
    } finally {
      setLoading(false);
    }
  };

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = vendor.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendor.user?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || vendor.verificationStatus === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: vendors.length,
    verified: vendors.filter(v => v.verificationStatus === "VERIFIED").length,
    pending: vendors.filter(v => v.verificationStatus === "PENDING").length,
    rejected: vendors.filter(v => v.verificationStatus === "REJECTED").length,
  };

  const handleApprove = async (id: number) => {
    try {
      await api.patch(`/vendors/${id}/approve`);
      setVendors(prev => prev.map(v => v.id === id ? { ...v, verificationStatus: "VERIFIED" } : v));
      toast.success("Vendor approved successfully");
    } catch (error: any) {
      toast.error("Failed to approve vendor");
    }
  };

  const handleReject = async (id: number) => {
    try {
      await api.patch(`/vendors/${id}/reject`, { reason: "Rejected by admin" });
      setVendors(prev => prev.map(v => v.id === id ? { ...v, verificationStatus: "REJECTED" } : v));
      toast.success("Vendor rejected");
    } catch (error: any) {
      toast.error("Failed to reject vendor");
    }
  };

  return (
    <div className="space-y-6 bg-neutral-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Vendor Management</h1>
            <p className="text-sm text-neutral-600 mt-1">Manage all registered vendors</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 px-6">
        <Card className="border-2 border-neutral-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Vendors</p>
                <p className="text-3xl font-bold text-neutral-900 mt-1">{stats.total}</p>
              </div>
              <div className="p-3 rounded-full bg-neutral-100">
                <Store className="h-6 w-6 text-neutral-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-emerald-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Verified</p>
                <p className="text-3xl font-bold text-emerald-600 mt-1">{stats.verified}</p>
              </div>
              <div className="p-3 rounded-full bg-emerald-100">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-amber-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Pending</p>
                <p className="text-3xl font-bold text-amber-600 mt-1">{stats.pending}</p>
              </div>
              <div className="p-3 rounded-full bg-amber-100">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Rejected</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{stats.rejected}</p>
              </div>
              <div className="p-3 rounded-full bg-red-100">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-2 border-neutral-200 mx-6">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
              <input
                type="text"
                placeholder="Search by business name or owner..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
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
                  <Badge className={`text-xs ${
                    vendor.verificationStatus === "VERIFIED" ? "bg-emerald-950/30 text-emerald-400 border-emerald-700" :
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
