"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart3, TrendingUp, Download, Calendar,
  DollarSign, Users, Building, Store, ArrowRight, RefreshCw
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import api from "@/lib/api";

interface ReportStats {
  monthlyRevenue: number;
  revenueGrowth: number;
  newUsers: number;
  userGrowth: number;
  totalBookings: number;
  bookingsGrowth: number;
  successRate: number;
}

export default function ReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [venueStats, setVenueStats] = useState<string>("0 Active Venues");
  const [vendorStats, setVendorStats] = useState<string>("0 Active Vendors");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadAllStats();
  }, []);

  // Merged single effect: fetches all data once, derives all stats
  const loadAllStats = async () => {
    try {
      setLoading(true);
      // Fetch all data in a single Promise.all call
      const [usersRes, venuesRes, vendorsRes, eventsRes, paymentsRes] = await Promise.all([
        api.get("/users").catch(() => ({ data: [] })),
        api.get("/venues").catch(() => ({ data: { data: [] } })),
        api.get("/vendors").catch(() => ({ data: [] })),
        api.get("/events").catch(() => ({ data: { data: [], total: 0 } })),
        api.get("/payments").catch(() => ({ data: { payments: [], pagination: { total: 0 } } })),
      ]);

      const users = usersRes.data || [];
      const venues = venuesRes.data?.data || venuesRes.data || [];
      const vendors = vendorsRes.data || [];
      const events = eventsRes.data?.data || eventsRes.data || [];
      const payments = paymentsRes.data?.payments || paymentsRes.data || [];

      // Derive report stats
      const totalRevenue = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
      const confirmedEvents = events.filter((e: any) => e.status === "CONFIRMED" || e.status === "COMPLETED").length;
      const successCount = payments.filter((p: any) => p.status === "SUCCESS" || p.status === "CAPTURED").length;

      setStats({
        monthlyRevenue: totalRevenue,
        revenueGrowth: 0,
        newUsers: users.length,
        userGrowth: 0,
        totalBookings: confirmedEvents,
        bookingsGrowth: 0,
        successRate: payments.length > 0
          ? (successCount / payments.length) * 100
          : 0,
      });

      // Derive venue/vendor stats from the same data
      setVenueStats(`${venues.filter((v: any) => v.status === "ACTIVE").length} Active Venues`);
      setVendorStats(`${vendors.filter((v: any) => v.verificationStatus === "VERIFIED").length} Active Vendors`);
    } catch (error: any) {
      console.error("Failed to load report stats:", error);
      setStats({
        monthlyRevenue: 0,
        revenueGrowth: 0,
        newUsers: 0,
        userGrowth: 0,
        totalBookings: 0,
        bookingsGrowth: 0,
        successRate: 0,
      });
      setVenueStats("0 Active Venues");
      setVendorStats("0 Active Vendors");
      toast.error("Failed to load report statistics");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    return `₹${(amount / 1000).toFixed(2)}K`;
  };

  const handleExportAll = async () => {
    setExporting(true);
    try {
      // Fetch all data for export
      const [usersRes, venuesRes, vendorsRes, eventsRes, paymentsRes] = await Promise.all([
        api.get("/users").catch(() => ({ data: [] })),
        api.get("/venues").catch(() => ({ data: { data: [] } })),
        api.get("/vendors").catch(() => ({ data: [] })),
        api.get("/events").catch(() => ({ data: { data: [], total: 0 } })),
        api.get("/payments").catch(() => ({ data: { payments: [], pagination: { total: 0 } } })),
      ]);

      const users = usersRes.data || [];
      const venues = venuesRes.data?.data || venuesRes.data || [];
      const vendors = vendorsRes.data || [];
      const events = eventsRes.data?.data || eventsRes.data || [];
      const payments = paymentsRes.data?.payments || paymentsRes.data || [];

      // Build CSV content
      const csvSections = [
        // Users
        "=== USERS REPORT ===",
        "ID,Name,Email,Role,Status,Created",
        ...users.map((u: any) => `${u.id},"${u.name}","${u.email}",${u.role},${u.isActive ? 'Active' : 'Inactive'},${new Date(u.createdAt).toLocaleDateString()}`),
        
        // Venues
        "\n=== VENUES REPORT ===",
        "ID,Name,Type,City,Status,Base Price",
        ...venues.map((v: any) => `${v.id},"${v.name}",${v.type},"${v.city}",${v.status},₹${v.basePriceEvening || 0}`),
        
        // Vendors
        "\n=== VENDORS REPORT ===",
        "ID,Business Name,Category,City,Verification,Base Price",
        ...vendors.map((v: any) => `${v.id},"${v.businessName}",${v.serviceCategory},"${v.city}",${v.verificationStatus},₹${v.basePrice || 0}`),
        
        // Events/Bookings
        "\n=== EVENTS/BOOKINGS REPORT ===",
        "ID,Title,Status,Total Amount,Created",
        ...events.map((e: any) => `${e.id},"${e.title || 'N/A'}",${e.status},₹${e.totalAmount || 0},${new Date(e.createdAt).toLocaleDateString()}`),
        
        // Payments
        "\n=== PAYMENTS REPORT ===",
        "ID,Amount,Status,Method,Created",
        ...payments.map((p: any) => `${p.id},₹${p.amount},${p.status},${p.method || 'N/A'},${new Date(p.createdAt).toLocaleDateString()}`),
      ];

      const csvContent = csvSections.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `all-reports-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success("All reports exported successfully");
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error(error?.response?.data?.message || "Failed to export reports");
    } finally {
      setExporting(false);
    }
  };

  const reportCards = [
    {
      title: "Revenue Report",
      description: "Detailed revenue analytics and trends",
      icon: DollarSign,
      color: "bg-emerald-600",
      href: "/dashboard/admin/reports/revenue",
      stats: stats ? formatCurrency(stats.monthlyRevenue) : "₹0",
    },
    {
      title: "User Analytics",
      description: "User growth and engagement metrics",
      icon: Users,
      color: "bg-blue-600",
      href: "/dashboard/admin/reports/users",
      stats: stats ? `${stats.newUsers.toLocaleString()} Total Users` : "0 Users",
    },
    {
      title: "Venue Performance",
      description: "Venue bookings and revenue breakdown",
      icon: Building,
      color: "bg-orange-600",
      href: "/dashboard/admin/reports/venues",
      stats: venueStats,
    },
    {
      title: "Vendor Analytics",
      description: "Vendor performance and bookings",
      icon: Store,
      color: "bg-purple-600",
      href: "/dashboard/admin/reports/vendors",
      stats: vendorStats,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full border-4 border-neutral-200 border-t-black animate-spin mx-auto mb-4" />
          <p className="text-black">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black">Reports & Analytics</h1>
          <p className="text-neutral-600">Comprehensive business intelligence and insights</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-black" onClick={loadAllStats}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" className="border-black" onClick={handleExportAll} disabled={exporting}>
            <Download className="h-4 w-4 mr-2" />
            {exporting ? "Exporting..." : "Export All Reports"}
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-2 border-emerald-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Monthly Revenue</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(stats?.monthlyRevenue || 0)}</p>
                {stats?.revenueGrowth !== undefined && stats.revenueGrowth !== 0 ? (
                  <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    +{stats.revenueGrowth}% vs last month
                  </p>
                ) : (
                  <p className="text-xs text-neutral-500 mt-2">No historical data</p>
                )}
              </div>
              <div className="p-3 rounded-full bg-emerald-600">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Users</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{stats?.newUsers.toLocaleString() || 0}</p>
                {stats?.userGrowth !== undefined && stats.userGrowth !== 0 ? (
                  <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    +{stats.userGrowth}% vs last month
                  </p>
                ) : (
                  <p className="text-xs text-neutral-500 mt-2">No historical data</p>
                )}
              </div>
              <div className="p-3 rounded-full bg-blue-600">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-orange-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Confirmed Bookings</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{stats?.totalBookings || 0}</p>
                {stats?.bookingsGrowth !== undefined && stats.bookingsGrowth !== 0 ? (
                  <p className="text-xs text-orange-600 mt-2 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    +{stats.bookingsGrowth}% vs last month
                  </p>
                ) : (
                  <p className="text-xs text-neutral-500 mt-2">No historical data</p>
                )}
              </div>
              <div className="p-3 rounded-full bg-orange-600">
                <Calendar className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Payment Success Rate</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{stats?.successRate.toFixed(1) || 0}%</p>
                <p className="text-xs text-purple-600 mt-2 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Platform average
                </p>
              </div>
              <div className="p-3 rounded-full bg-purple-600">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Categories */}
      <div className="grid gap-6 md:grid-cols-2">
        {reportCards.map((report, index) => {
          const Icon = report.icon;
          return (
            <Card
              key={index}
              className="border-2 border-black hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push(report.href)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-lg ${report.color}`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-black">{report.title}</h3>
                      <p className="text-sm text-neutral-600 mt-1">{report.description}</p>
                      <p className="text-sm font-semibold text-black mt-2">{report.stats}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <ArrowRight className="h-4 w-4 text-black" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Card */}
      <Card className="border-2 border-black">
        <CardHeader>
          <CardTitle className="text-black">Platform Reports Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-600" />
                <span className="text-sm font-semibold text-black">Financial Reports</span>
              </div>
              <p className="text-sm text-neutral-600">
                Track revenue, payments, and financial performance across all events and bookings.
              </p>
              <Button variant="link" className="p-0 h-auto text-black underline" onClick={() => router.push("/dashboard/admin/reports/revenue")}>
                View revenue reports
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-600" />
                <span className="text-sm font-semibold text-black">User Analytics</span>
              </div>
              <p className="text-sm text-neutral-600">
                Monitor user growth, engagement, and retention across all customer segments.
              </p>
              <Button variant="link" className="p-0 h-auto text-black underline" onClick={() => router.push("/dashboard/admin/reports/users")}>
                View user reports
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-orange-600" />
                <span className="text-sm font-semibold text-black">Performance Metrics</span>
              </div>
              <p className="text-sm text-neutral-600">
                Analyze venue and vendor performance with detailed booking and revenue metrics.
              </p>
              <Button variant="link" className="p-0 h-auto text-black underline" onClick={() => router.push("/dashboard/admin/reports/venues")}>
                View performance reports
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
