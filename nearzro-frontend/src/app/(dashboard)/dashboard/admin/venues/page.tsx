"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building, CheckCircle2, XCircle, Clock, Eye, Edit, Trash2,
  Search, Filter, Mail, Phone, MapPin, DollarSign, Users
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

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

export default function AdminVenuesPage() {
  const router = useRouter();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    loadVenues();
  }, []);

  const loadVenues = async () => {
    try {
      setLoading(true);
      const response = await api.get("/venues");
      setVenues(response.data.data || response.data || []);
    } catch (error: any) {
      console.error("Failed to load venues:", error);
      toast.error("Failed to load venues");
    } finally {
      setLoading(false);
    }
  };

  const filteredVenues = venues.filter(venue => {
    const matchesSearch = venue.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         venue.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || venue.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: venues.length,
    active: venues.filter(v => v.status === "ACTIVE").length,
    pending: venues.filter(v => v.status === "PENDING_APPROVAL").length,
    inactive: venues.filter(v => v.status === "INACTIVE").length,
  };

  const handleApprove = async (id: number) => {
    try {
      await api.post(`/venues/${id}/approve`);
      setVenues(prev => prev.map(v => v.id === id ? { ...v, status: "ACTIVE" } : v));
      toast.success("Venue approved successfully");
    } catch (error: any) {
      toast.error("Failed to approve venue");
    }
  };

  const handleReject = async (id: number) => {
    try {
      await api.post(`/venues/${id}/reject`, { reason: "Rejected by admin" });
      setVenues(prev => prev.map(v => v.id === id ? { ...v, status: "REJECTED" } : v));
      toast.success("Venue rejected");
    } catch (error: any) {
      toast.error("Failed to reject venue");
    }
  };

  return (
    <div className="space-y-6 bg-neutral-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Venue Management</h1>
            <p className="text-sm text-neutral-600 mt-1">Manage all registered venues</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 px-6">
        <Card className="border-2 border-neutral-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Venues</p>
                <p className="text-3xl font-bold text-neutral-900 mt-1">{stats.total}</p>
              </div>
              <div className="p-3 rounded-full bg-neutral-100">
                <Building className="h-6 w-6 text-neutral-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-emerald-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Active</p>
                <p className="text-3xl font-bold text-emerald-600 mt-1">{stats.active}</p>
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
                <p className="text-sm font-medium text-neutral-600">Pending Approval</p>
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
                <p className="text-sm font-medium text-neutral-600">Inactive</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{stats.inactive}</p>
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
                placeholder="Search by venue name or city..."
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
              <option value="PENDING_APPROVAL">Pending</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Venues Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 px-6">
        {loading ? (
          <div className="col-span-full text-center py-8 text-neutral-600">Loading venues...</div>
        ) : filteredVenues.length === 0 ? (
          <div className="col-span-full text-center py-8 text-neutral-600">No venues found</div>
        ) : (
          filteredVenues.map((venue) => (
            <Card key={venue.id} className="border-2 border-neutral-200 hover:border-black transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg text-black">{venue.name}</CardTitle>
                    <p className="text-sm text-neutral-600 mt-1">{venue.type}</p>
                  </div>
                  <Badge className={`text-xs ${
                    venue.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" :
                    venue.status === "PENDING_APPROVAL" ? "bg-amber-100 text-amber-700" :
                    "bg-red-100 text-red-700"
                  }`}>
                    {venue.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-neutral-600">
                  <MapPin className="h-4 w-4" />
                  <span>{venue.area}, {venue.city}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-neutral-600">
                  <Users className="h-4 w-4" />
                  <span>Capacity: {venue.capacityMax}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-neutral-600">
                  <DollarSign className="h-4 w-4" />
                  <span>₹{venue.basePriceEvening.toLocaleString()} / evening</span>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-black"
                    onClick={() => router.push(`/dashboard/admin/venues/${venue.id}`)}
                  >
                    <Eye className="h-4 w-4 mr-1" /> View
                  </Button>
                  {venue.status === "PENDING_APPROVAL" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                        onClick={() => handleApprove(venue.id)}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-red-600 text-red-600 hover:bg-red-50"
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
