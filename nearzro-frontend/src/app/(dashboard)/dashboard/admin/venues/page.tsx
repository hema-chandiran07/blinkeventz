"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Search,
  MapPin,
  DollarSign,
  Users,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { extractArray } from "@/lib/api-response";

interface Venue {
  id: number;
  name: string;
  type: string;
  description?: string;
  city: string;
  area: string;
  capacityMax: number;
  basePriceEvening: number;
  status: string;
  owner?: {
    name: string;
    email: string;
    phone?: string;
  };
  createdAt: string;
}

const statusStyle: Record<string, string> = {
  ACTIVE: "bg-emerald-950/40 text-emerald-400 border border-emerald-800",
  PENDING_APPROVAL: "bg-amber-950/40 text-amber-400 border border-amber-800",
  INACTIVE: "bg-red-950/40 text-red-400 border border-red-800",
  REJECTED: "bg-red-950/40 text-red-400 border border-red-800",
};

export default function AdminVenuesPage() {
  const router = useRouter();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const abortRef = useRef<AbortController | null>(null);

  const loadVenues = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      setLoading(true);
      const response = await api.get("/venues", {
        signal: abortRef.current.signal,
      });
      const venuesData = extractArray<Venue>(response);
      setVenues(venuesData);
    } catch (error: any) {
      if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED")
        return;
      console.error("Failed to load venues:", error);
      toast.error("Failed to load venues");
      setVenues([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVenues();
    return () => abortRef.current?.abort();
  }, [loadVenues]);

  const filteredVenues = venues.filter((venue) => {
    const name = venue?.name?.toLowerCase() ?? "";
    const city = venue?.city?.toLowerCase() ?? "";
    const matchesSearch =
      name.includes(searchTerm.toLowerCase()) ||
      city.includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === "all" || venue.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: venues.length,
    active: venues.filter((v) => v.status === "ACTIVE").length,
    pending: venues.filter((v) => v.status === "PENDING_APPROVAL").length,
    inactive: venues.filter(
      (v) => v.status === "INACTIVE" || v.status === "REJECTED"
    ).length,
  };

  const handleApprove = async (id: number) => {
    try {
      await api.post(`/venues/${id}/approve`);
      setVenues(prev => prev.map(v => v.id === id ? { ...v, status: "ACTIVE" } : v));
      toast.success("Venue approved successfully");
    } catch {
      toast.error("Failed to approve venue");
    }
  };

  const handleReject = async (id: number) => {
    try {
      await api.post(`/venues/${id}/reject`, { reason: "Rejected by admin" });
      setVenues(prev => prev.map(v => v.id === id ? { ...v, status: "REJECTED" } : v));
      toast.success("Venue rejected");
    } catch {
      toast.error("Failed to reject venue");
    }
  };

  return (
    <div className="space-y-6 bg-zinc-950 min-h-screen">
      {/* ─── Header ─── */}
      <div className="border-b border-zinc-800 bg-zinc-950 px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">
              Venue Management
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Manage all registered venues
            </p>
          </div>
          <Button
            variant="outline"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 self-start sm:self-auto"
            onClick={loadVenues}
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* ─── Stats ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 sm:px-6">
        {[
          {
            label: "Total Venues",
            value: stats.total,
            icon: Building,
            color: "bg-zinc-800 border-zinc-700",
            text: "text-zinc-100",
          },
          {
            label: "Active",
            value: stats.active,
            icon: CheckCircle2,
            color: "bg-emerald-950/40 border-emerald-800",
            text: "text-emerald-400",
          },
          {
            label: "Pending Approval",
            value: stats.pending,
            icon: Clock,
            color: "bg-amber-950/40 border-amber-800",
            text: "text-amber-400",
          },
          {
            label: "Inactive",
            value: stats.inactive,
            icon: XCircle,
            color: "bg-red-950/40 border-red-800",
            text: "text-red-400",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className="border border-zinc-800 bg-zinc-900/60"
            >
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-zinc-400">
                      {stat.label}
                    </p>
                    <p className={`text-2xl sm:text-3xl font-bold mt-1 ${stat.text}`}>
                      {stat.value}
                    </p>
                  </div>
                  <div className={`p-2.5 rounded-lg border ${stat.color}`}>
                    <Icon className={`h-5 w-5 ${stat.text}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ─── Filters ─── */}
      <div className="px-4 sm:px-6">
        <Card className="border border-zinc-800 bg-zinc-900/60">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by venue name or city..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-600 font-medium"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-zinc-700 bg-zinc-900 text-zinc-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-600"
              >
                <option value="all">All Status</option>
                <option value="PENDING_APPROVAL">Pending</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Content ─── */}
      <div className="px-4 sm:px-6 pb-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-52 rounded-xl border border-zinc-800 bg-zinc-900/40 animate-pulse"
              />
            ))}
          </div>
        ) : filteredVenues.length === 0 ? (
          <Card className="border border-zinc-800 bg-zinc-900/40">
            <CardContent className="py-16 flex flex-col items-center text-center">
              <div className="h-16 w-16 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-4">
                <Building className="h-8 w-8 text-zinc-500" />
              </div>
              <p className="text-lg font-semibold text-zinc-200">
                No Venues Found
              </p>
              <p className="text-sm text-zinc-500 mt-2 max-w-sm">
                {venues.length === 0
                  ? "No venues have been registered yet."
                  : "No venues match your search criteria."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredVenues.map((venue) => (
            <Card key={venue.id} className="border border-zinc-800 bg-zinc-900/50 hover:border-zinc-600 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg text-zinc-100">{venue.name}</CardTitle>
                    <p className="text-sm text-zinc-400 mt-1">{venue.type}</p>
                  </div>
                  <Badge className={`text-xs ${venue.status === "ACTIVE" ? "bg-emerald-950/30 text-emerald-400 border border-emerald-700" :
                    venue.status === "PENDING_APPROVAL" ? "bg-amber-950/30 text-amber-400 border border-amber-700" :
                      "bg-red-950/30 text-red-400 border border-red-700"
                    }`}>
                    {venue.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <MapPin className="h-4 w-4" />
                  <span>{venue.area}, {venue.city}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <Users className="h-4 w-4" />
                  <span>Capacity: {venue.capacityMax}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <DollarSign className="h-4 w-4" />
                  <span>₹{venue.basePriceEvening.toLocaleString()} / evening</span>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
                    onClick={() => router.push(`/dashboard/admin/venues/${venue.id}`)}
                  >
                    <Eye className="h-4 w-4 mr-1" /> View
                  </Button>
                  {venue.status === "PENDING_APPROVAL" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-emerald-700 text-emerald-400 hover:bg-emerald-950/30"
                        onClick={() => handleApprove(venue.id)}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-red-700 text-red-400 hover:bg-red-950/30"
                        onClick={() => handleReject(venue.id)}
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
