"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Building, Search, Eye, Plus, Filter, RefreshCw, MapPin, Users,
  DollarSign, CheckCircle2, Clock, Star, TrendingUp, Download, Edit
} from "lucide-react";
import { toast } from "sonner";

const MOCK_VENUES = [
  { id: 1, name: "Grand Ballroom ITC", owner: "ITC Hotels", location: "Guindy, Chennai", area: "Guindy", city: "Chennai", capacity: 800, price: 150000, rating: 4.8, bookings: 45, status: "ACTIVE" },
  { id: 2, name: "Taj Coromandel Hall", owner: "Taj Hotels", location: "Nungambakkam, Chennai", area: "Nungambakkam", city: "Chennai", capacity: 500, price: 200000, rating: 4.9, bookings: 38, status: "ACTIVE" },
  { id: 3, name: "Leela Palace Ballroom", owner: "Leela Hotels", location: "Adyar, Chennai", area: "Adyar", city: "Chennai", capacity: 600, price: 180000, rating: 4.7, bookings: 32, status: "PENDING_APPROVAL" },
  { id: 4, name: "Raintree Convention Center", owner: "Raintree Group", location: "OMR, Chennai", area: "OMR", city: "Chennai", capacity: 1000, price: 250000, rating: 4.6, bookings: 28, status: "ACTIVE" },
  { id: 5, name: "Chettinad Mansion", owner: "Chettinad Group", location: "Anna Nagar, Chennai", area: "Anna Nagar", city: "Chennai", capacity: 400, price: 120000, rating: 4.5, bookings: 22, status: "INACTIVE" },
];

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PENDING_APPROVAL: "bg-amber-50 text-amber-700 border-amber-200",
  INACTIVE: "bg-neutral-100 text-neutral-600 border-neutral-200",
  SUSPENDED: "bg-red-50 text-red-700 border-red-200",
};

export default function AdminVenuesPage() {
  const router = useRouter();
  const [venues] = useState(MOCK_VENUES);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setRefreshing(false);
    toast.success("Venues refreshed");
  };

  const filteredVenues = venues.filter(venue => {
    const matchesSearch = venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         venue.owner.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || venue.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: venues.length,
    active: venues.filter(v => v.status === "ACTIVE").length,
    pending: venues.filter(v => v.status === "PENDING_APPROVAL").length,
    totalRevenue: venues.reduce((sum, v) => sum + (v.bookings * v.price), 0),
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    return `₹${(amount / 1000).toFixed(2)}K`;
  };

  return (
    <div className="space-y-6 bg-neutral-50 min-h-screen">
      {/* Professional Header */}
      <div className="bg-white border-b border-neutral-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Venue Management</h1>
            <p className="text-sm text-neutral-600 mt-1">Manage all registered venues in Chennai</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="border-neutral-300">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button className="bg-neutral-900 hover:bg-neutral-800">
              <Plus className="h-4 w-4 mr-2" />
              Add Venue
            </Button>
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 px-6">
        <Card className="border border-neutral-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Venues</p>
                <p className="text-3xl font-bold text-neutral-900 mt-1">{stats.total}</p>
                <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +15.3% from last month
                </p>
              </div>
              <div className="p-3 rounded-lg bg-neutral-900">
                <Building className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-neutral-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Active Venues</p>
                <p className="text-3xl font-bold text-emerald-600 mt-1">{stats.active}</p>
                <p className="text-xs text-neutral-500 mt-2">Currently listed</p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-600">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-neutral-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Pending Approval</p>
                <p className="text-3xl font-bold text-amber-600 mt-1">{stats.pending}</p>
                <p className="text-xs text-neutral-500 mt-2">Awaiting review</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-600">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-neutral-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Revenue</p>
                <p className="text-2xl font-bold text-neutral-900 mt-1">{formatCurrency(stats.totalRevenue)}</p>
                <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +22.1% from last month
                </p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-600">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border border-neutral-200 mx-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                placeholder="Search venues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-neutral-300"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex h-10 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            >
              <option value="all">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Venues Grid */}
      <div className="grid gap-4 md:grid-cols-2 mx-6">
        {filteredVenues.map((venue) => (
          <Card 
            key={venue.id} 
            className="border border-neutral-200 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => router.push(`/dashboard/admin/venues/${venue.id}`)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 rounded-full bg-neutral-900 flex items-center justify-center">
                    <Building className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-neutral-900">{venue.name}</h3>
                    <p className="text-sm text-neutral-600">{venue.owner}</p>
                  </div>
                </div>
                <Badge className={`${STATUS_COLORS[venue.status]} border text-xs font-medium`}>
                  {venue.status.replace("_", " ")}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm text-neutral-700">
                  <MapPin className="h-4 w-4 text-neutral-400" />
                  <span>{venue.area}, {venue.city}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-neutral-700">
                  <Users className="h-4 w-4 text-neutral-400" />
                  <span>{venue.capacity} guests</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-neutral-700">
                  <DollarSign className="h-4 w-4 text-neutral-400" />
                  <span>{formatCurrency(venue.price)} / event</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-neutral-700">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                  <span className="font-bold text-neutral-900">{venue.rating}</span>
                  <span className="text-neutral-500">({venue.bookings} bookings)</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
                <Button variant="ghost" size="sm" className="text-neutral-700">
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Button>
                <Button size="sm" className="bg-neutral-900 hover:bg-neutral-800">
                  Manage
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
