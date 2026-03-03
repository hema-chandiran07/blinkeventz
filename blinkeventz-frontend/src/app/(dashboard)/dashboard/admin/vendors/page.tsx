"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Store, Search, Eye, Plus, Filter, RefreshCw, MapPin, Users,
  DollarSign, CheckCircle2, Clock, Star, Briefcase, Camera, Utensils, Music,
  TrendingUp, Download, Edit
} from "lucide-react";
import { toast } from "sonner";

const MOCK_VENDORS = [
  { id: 1, name: "Elite Photography", owner: "John Smith", serviceType: "PHOTOGRAPHY", location: "Anna Nagar, Chennai", area: "Anna Nagar", city: "Chennai", price: 50000, rating: 4.8, bookings: 67, status: "VERIFIED" },
  { id: 2, name: "Divine Caterers", owner: "Senthil Kumar", serviceType: "CATERING", location: "T Nagar, Chennai", area: "T Nagar", city: "Chennai", price: 75000, rating: 4.7, bookings: 89, status: "VERIFIED" },
  { id: 3, name: "DJ Sounds Pro", owner: "Michael Raj", serviceType: "DJ", location: "Velachery, Chennai", area: "Velachery", city: "Chennai", price: 35000, rating: 4.6, bookings: 54, status: "VERIFIED" },
  { id: 4, name: "Floral Decor Studio", owner: "Priya Menon", serviceType: "DECOR", location: "Adyar, Chennai", area: "Adyar", city: "Chennai", price: 100000, rating: 4.9, bookings: 42, status: "PENDING" },
  { id: 5, name: "Makeup by Lakshmi", owner: "Lakshmi Devi", serviceType: "MAKEUP", location: "OMR, Chennai", area: "OMR", city: "Chennai", price: 25000, rating: 4.5, bookings: 38, status: "VERIFIED" },
];

const SERVICE_ICONS: Record<string, any> = {
  PHOTOGRAPHY: Camera,
  CATERING: Utensils,
  DJ: Music,
  DECOR: Star,
  MAKEUP: Star,
  OTHER: Briefcase,
};

const STATUS_COLORS: Record<string, string> = {
  VERIFIED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  SUSPENDED: "bg-red-50 text-red-700 border-red-200",
};

export default function AdminVendorsPage() {
  const router = useRouter();
  const [vendors] = useState(MOCK_VENDORS);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterService, setFilterService] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setRefreshing(false);
    toast.success("Vendors refreshed");
  };

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         vendor.owner.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesService = filterService === "all" || vendor.serviceType === filterService;
    const matchesStatus = filterStatus === "all" || vendor.status === filterStatus;
    return matchesSearch && matchesService && matchesStatus;
  });

  const stats = {
    total: vendors.length,
    verified: vendors.filter(v => v.status === "VERIFIED").length,
    pending: vendors.filter(v => v.status === "PENDING").length,
    totalRevenue: vendors.reduce((sum, v) => sum + (v.bookings * v.price), 0),
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
            <h1 className="text-2xl font-bold text-neutral-900">Vendor Management</h1>
            <p className="text-sm text-neutral-600 mt-1">Manage all service providers in Chennai</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="border-neutral-300">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button className="bg-neutral-900 hover:bg-neutral-800">
              <Plus className="h-4 w-4 mr-2" />
              Add Vendor
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
                <p className="text-sm font-medium text-neutral-600">Total Vendors</p>
                <p className="text-3xl font-bold text-neutral-900 mt-1">{stats.total}</p>
                <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +10.7% from last month
                </p>
              </div>
              <div className="p-3 rounded-lg bg-neutral-900">
                <Store className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-neutral-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Verified</p>
                <p className="text-3xl font-bold text-emerald-600 mt-1">{stats.verified}</p>
                <p className="text-xs text-neutral-500 mt-2">Active vendors</p>
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
                <p className="text-sm font-medium text-neutral-600">Pending</p>
                <p className="text-3xl font-bold text-amber-600 mt-1">{stats.pending}</p>
                <p className="text-xs text-neutral-500 mt-2">Awaiting verification</p>
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
                  +14.2% from last month
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
                placeholder="Search vendors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-neutral-300"
              />
            </div>
            <select
              value={filterService}
              onChange={(e) => setFilterService(e.target.value)}
              className="flex h-10 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            >
              <option value="all">All Services</option>
              <option value="PHOTOGRAPHY">Photography</option>
              <option value="CATERING">Catering</option>
              <option value="DJ">DJ</option>
              <option value="DECOR">Decor</option>
              <option value="MAKEUP">Makeup</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex h-10 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            >
              <option value="all">All Status</option>
              <option value="VERIFIED">Verified</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Vendors Grid */}
      <div className="grid gap-4 md:grid-cols-2 mx-6">
        {filteredVendors.map((vendor) => {
          const IconComponent = SERVICE_ICONS[vendor.serviceType] || Briefcase;
          return (
            <Card 
              key={vendor.id} 
              className="border border-neutral-200 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push(`/dashboard/admin/vendors/${vendor.id}`)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-full bg-neutral-900 flex items-center justify-center">
                      <IconComponent className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-neutral-900">{vendor.name}</h3>
                      <p className="text-sm text-neutral-600">{vendor.owner}</p>
                    </div>
                  </div>
                  <Badge className={`${STATUS_COLORS[vendor.status]} border text-xs font-medium`}>
                    {vendor.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm text-neutral-700">
                    <MapPin className="h-4 w-4 text-neutral-400" />
                    <span>{vendor.area}, {vendor.city}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-neutral-700">
                    <Briefcase className="h-4 w-4 text-neutral-400" />
                    <span>{vendor.serviceType}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-neutral-700">
                    <DollarSign className="h-4 w-4 text-neutral-400" />
                    <span>{formatCurrency(vendor.price)} / event</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-neutral-700">
                    <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                    <span className="font-bold text-neutral-900">{vendor.rating}</span>
                    <span className="text-neutral-500">({vendor.bookings} bookings)</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
                  <Button variant="ghost" size="sm" className="text-neutral-700">
                    <Eye className="h-4 w-4 mr-2" />
                    View Profile
                  </Button>
                  <Button size="sm" className="bg-neutral-900 hover:bg-neutral-800">
                    Manage
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
