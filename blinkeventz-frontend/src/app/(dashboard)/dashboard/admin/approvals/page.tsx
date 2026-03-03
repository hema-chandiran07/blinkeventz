"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, XCircle, Clock, Building, Store, Eye, AlertCircle,
  RefreshCw, Filter, Mail, Phone, MapPin, Calendar, User, Users,
  DollarSign, TrendingUp
} from "lucide-react";
import { toast } from "sonner";

const MOCK_APPROVALS = [
  {
    id: 1,
    type: "VENUE",
    title: "Grand Ballroom ITC",
    owner: "ITC Hotels",
    contact: "hotels@itchotels.in",
    phone: "+91 44 2231 1111",
    location: "Guindy, Chennai",
    area: "Guindy",
    city: "Chennai",
    capacity: 800,
    price: 150000,
    status: "PENDING_APPROVAL",
    submittedDate: "2024-03-15",
    description: "Luxury ballroom with state-of-the-art facilities",
  },
  {
    id: 2,
    type: "VENDOR",
    title: "Elite Photography",
    owner: "John Smith",
    contact: "john@elitephoto.in",
    phone: "+91 98765 43210",
    location: "Anna Nagar, Chennai",
    area: "Anna Nagar",
    city: "Chennai",
    serviceType: "PHOTOGRAPHY",
    price: 50000,
    status: "PENDING",
    submittedDate: "2024-03-14",
    description: "Professional wedding and event photography services",
  },
  {
    id: 3,
    type: "VENUE",
    title: "Taj Coromandel Hall",
    owner: "Taj Hotels",
    contact: "events@tajhotels.com",
    phone: "+91 44 2815 7777",
    location: "Nungambakkam, Chennai",
    area: "Nungambakkam",
    city: "Chennai",
    capacity: 500,
    price: 200000,
    status: "PENDING_APPROVAL",
    submittedDate: "2024-03-13",
    description: "Premium event hall with modern amenities",
  },
  {
    id: 4,
    type: "VENDOR",
    title: "Divine Caterers",
    owner: "Senthil Kumar",
    contact: "divine@caterers.in",
    phone: "+91 91234 56789",
    location: "T Nagar, Chennai",
    area: "T Nagar",
    city: "Chennai",
    serviceType: "CATERING",
    price: 75000,
    status: "PENDING",
    submittedDate: "2024-03-12",
    description: "Authentic South Indian and multi-cuisine catering",
  },
];

const TYPE_ICONS: Record<string, any> = {
  VENUE: Building,
  VENDOR: Store,
};

export default function AdminApprovalsPage() {
  const router = useRouter();
  const [approvals, setApprovals] = useState(MOCK_APPROVALS);
  const [filterType, setFilterType] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setRefreshing(false);
    toast.success("Approvals refreshed");
  };

  const handleApprove = async (id: number, type: string) => {
    setApprovals(prev => prev.filter(item => item.id !== id));
    toast.success(`${type} approved successfully!`);
  };

  const handleReject = async (id: number, type: string) => {
    setApprovals(prev => prev.filter(item => item.id !== id));
    toast.success(`${type} rejected`);
  };

  const filteredApprovals = approvals.filter(item => {
    if (filterType === "all") return true;
    return item.type === filterType;
  });

  const stats = {
    total: approvals.length,
    venues: approvals.filter(a => a.type === "VENUE").length,
    vendors: approvals.filter(a => a.type === "VENDOR").length,
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    return `₹${(amount / 1000).toFixed(2)}K`;
  };

  return (
    <div className="space-y-6 bg-neutral-50 min-h-screen">
      {/* Professional Header */}
      <div className="bg-white border-b border-neutral-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Approvals Queue</h1>
            <p className="text-sm text-neutral-600 mt-1">Review and approve pending submissions</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="border-neutral-300">
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      <Card className="border border-amber-200 bg-amber-50 mx-6">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900">Pending Approvals</p>
              <p className="text-sm text-amber-800 mt-1">
                You have <span className="font-bold">{stats.total}</span> items waiting for approval. Please review carefully before approving.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 px-6">
        <Card className="border border-neutral-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Pending</p>
                <p className="text-3xl font-bold text-neutral-900 mt-1">{stats.total}</p>
              </div>
              <div className="p-3 rounded-lg bg-neutral-900">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-neutral-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Venues Pending</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">{stats.venues}</p>
              </div>
              <div className="p-3 rounded-lg bg-orange-600">
                <Building className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-neutral-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Vendors Pending</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">{stats.vendors}</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-600">
                <Store className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border border-neutral-200 mx-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-neutral-600" />
              <span className="font-medium text-neutral-900">Filter by Type:</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterType === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType("all")}
                className={filterType === "all" ? "bg-neutral-900 hover:bg-neutral-800" : "border-neutral-300"}
              >
                All ({stats.total})
              </Button>
              <Button
                variant={filterType === "VENUE" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType("VENUE")}
                className={filterType === "VENUE" ? "bg-neutral-900 hover:bg-neutral-800" : "border-neutral-300"}
              >
                Venues ({stats.venues})
              </Button>
              <Button
                variant={filterType === "VENDOR" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType("VENDOR")}
                className={filterType === "VENDOR" ? "bg-neutral-900 hover:bg-neutral-800" : "border-neutral-300"}
              >
                Vendors ({stats.vendors})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Approvals List */}
      <div className="space-y-4 mx-6">
        {filteredApprovals.length === 0 ? (
          <Card className="border border-neutral-200">
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-emerald-600" />
              <h3 className="text-xl font-bold text-neutral-900 mb-2">All Caught Up!</h3>
              <p className="text-neutral-600">No pending approvals at the moment</p>
            </CardContent>
          </Card>
        ) : (
          filteredApprovals.map((item) => {
            const IconComponent = TYPE_ICONS[item.type];
            return (
              <Card key={item.id} className="border border-neutral-200 hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="h-14 w-14 rounded-full bg-neutral-900 flex items-center justify-center">
                          <IconComponent className="h-7 w-7 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-neutral-900">{item.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={
                              item.type === "VENUE" 
                                ? "bg-orange-50 text-orange-700 border-orange-200"
                                : "bg-purple-50 text-purple-700 border-purple-200"
                            }>
                              {item.type}
                            </Badge>
                            <Badge className="bg-amber-50 text-amber-700 border-amber-200">
                              <Clock className="h-3 w-3 mr-1" />
                              {item.status.replace("_", " ")}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-neutral-700">
                            <User className="h-4 w-4 text-neutral-400" />
                            <span className="font-medium">Owner:</span>
                            <span>{item.owner}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-neutral-700">
                            <Mail className="h-4 w-4 text-neutral-400" />
                            <span className="font-medium">Email:</span>
                            <span>{item.contact}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-neutral-700">
                            <Phone className="h-4 w-4 text-neutral-400" />
                            <span className="font-medium">Phone:</span>
                            <span>{item.phone}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-neutral-700">
                            <MapPin className="h-4 w-4 text-neutral-400" />
                            <span className="font-medium">Location:</span>
                            <span>{item.location}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-neutral-700">
                            <Calendar className="h-4 w-4 text-neutral-400" />
                            <span className="font-medium">Submitted:</span>
                            <span>{new Date(item.submittedDate).toLocaleDateString("en-IN", { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                          </div>
                          {item.type === "VENUE" && (
                            <div className="flex items-center gap-2 text-sm text-neutral-700">
                              <Users className="h-4 w-4 text-neutral-400" />
                              <span className="font-medium">Capacity:</span>
                              <span>{item.capacity} guests</span>
                            </div>
                          )}
                          {item.type === "VENDOR" && (
                            <div className="flex items-center gap-2 text-sm text-neutral-700">
                              <Store className="h-4 w-4 text-neutral-400" />
                              <span className="font-medium">Service:</span>
                              <span>{item.serviceType}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200 mb-4">
                        <p className="text-sm font-medium text-neutral-900 mb-1">Description:</p>
                        <p className="text-sm text-neutral-700">{item.description}</p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-neutral-900">Base Price:</span>
                          <span className="text-lg font-bold text-neutral-900">{formatCurrency(item.price)}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/dashboard/admin/${item.type === 'VENUE' ? 'venues' : 'vendors'}/${item.id}`)}
                          className="border border-neutral-300"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Full Details
                        </Button>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2">
                      <Button
                        size="lg"
                        onClick={() => handleApprove(item.id, item.type)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <CheckCircle2 className="h-5 w-5 mr-2" />
                        Approve
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => handleReject(item.id, item.type)}
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="h-5 w-5 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
