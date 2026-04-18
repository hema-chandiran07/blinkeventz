"use client";

import { useState, useEffect, useCallback } from "react";
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

  const loadAllStats = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const [usersRes, venuesRes, vendorsRes, eventsRes, paymentsRes] = await Promise.all([
        api.get("/users", { signal }).catch(() => ({ data: [] })),
        api.get("/venues", { signal }).catch(() => ({ data: { data: [] } })),
        api.get("/vendors", { signal }).catch(() => ({ data: [] })),
        api.get("/events", { signal }).catch(() => ({ data: { data: [], total: 0 } })),
        api.get("/payments", { signal }).catch(() => ({ data: { payments: [], pagination: { total: 0 } } })),
      ]);

      const users = usersRes.data || [];
      const venues = venuesRes.data?.data || venuesRes.data || [];
      const vendors = vendorsRes.data || [];
      const events = eventsRes.data?.data || eventsRes.data || [];
      const payments = paymentsRes.data?.payments || paymentsRes.data || [];

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
        successRate: payments.length > 0 ? (successCount / payments.length) * 100 : 0,
      });

      setVenueStats(`${venues.filter((v: any) => v.status === "ACTIVE").length} Active Venues`);
      setVendorStats(`${vendors.filter((v: any) => v.verificationStatus === "VERIFIED").length} Active Vendors`);
    } catch (error: any) {
      if (error?.name === 'AbortError' || error?.code === 'ERR_CANCELED') return;
      console.error("Failed to load report stats:", error);
      setStats({ monthlyRevenue: 0, revenueGrowth: 0, newUsers: 0, userGrowth: 0, totalBookings: 0, bookingsGrowth: 0, successRate: 0 });
      setVenueStats("0 Active Venues");
      setVendorStats("0 Active Vendors");
      toast.error("Failed to load report statistics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadAllStats(controller.signal);
    return () => controller.abort();
  }, [loadAllStats]);

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
      <div className="flex items-center justify-center min-h-[60vh] bg-zinc-950">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full border-4 border-zinc-800 border-t-zinc-400 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100">Reports &amp; Analytics</h1>
          <p className="text-zinc-400">Comprehensive business intelligence and insights</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800" onClick={() => loadAllStats()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800" onClick={handleExportAll} disabled={exporting}>
            <Download className="h-4 w-4 mr-2" />
            {exporting ? "Exporting..." : "Export All Reports"}
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Monthly Revenue</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">{formatCurrency(stats?.monthlyRevenue || 0)}</p>
                {stats?.revenueGrowth !== undefined && stats.revenueGrowth !== 0 ? (
                  <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    +{stats.revenueGrowth}% vs last month
                  </p>
                ) : (
                  <p className="text-xs text-zinc-500 mt-2">No historical data</p>
                )}
              </div>
              <div className="p-3 rounded-full bg-emerald-950/30">
                <DollarSign className="h-6 w-6 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Total Users</p>
                <p className="text-2xl font-bold text-blue-400 mt-1">{stats?.newUsers.toLocaleString() || 0}</p>
                {stats?.userGrowth !== undefined && stats.userGrowth !== 0 ? (
                  <p className="text-xs text-blue-400 mt-2 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    +{stats.userGrowth}% vs last month
                  </p>
                ) : (
                  <p className="text-xs text-zinc-500 mt-2">No historical data</p>
                )}
              </div>
              <div className="p-3 rounded-full bg-blue-950/30">
                <Users className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Confirmed Bookings</p>
                <p className="text-2xl font-bold text-amber-400 mt-1">{stats?.totalBookings || 0}</p>
                {stats?.bookingsGrowth !== undefined && stats.bookingsGrowth !== 0 ? (
                  <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    +{stats.bookingsGrowth}% vs last month
                  </p>
                ) : (
                  <p className="text-xs text-zinc-500 mt-2">No historical data</p>
                )}
              </div>
              <div className="p-3 rounded-full bg-amber-950/30">
                <Calendar className="h-6 w-6 text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Payment Success Rate</p>
                <p className="text-2xl font-bold text-purple-400 mt-1">{stats?.successRate.toFixed(1) || 0}%</p>
                <p className="text-xs text-purple-400 mt-2 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Platform average
                </p>
              </div>
              <div className="p-3 rounded-full bg-purple-950/30">
                <BarChart3 className="h-6 w-6 text-purple-400" />
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
              className="border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 transition-all duration-200 cursor-pointer"
              onClick={() => router.push(report.href)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-xl ${report.color}`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-zinc-100">{report.title}</h3>
                      <p className="text-sm text-zinc-400 mt-1">{report.description}</p>
                      <p className="text-sm font-semibold text-zinc-300 mt-2">{report.stats}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <ArrowRight className="h-4 w-4 text-zinc-400" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Card */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="text-zinc-100">Platform Reports Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-sm font-semibold text-zinc-100">Financial Reports</span>
              </div>
              <p className="text-sm text-zinc-400">
                Track revenue, payments, and financial performance across all events and bookings.
              </p>
              <Button variant="link" className="p-0 h-auto text-zinc-300 hover:text-zinc-100 underline" onClick={() => router.push("/dashboard/admin/reports/revenue")}>
                View revenue reports
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="text-sm font-semibold text-zinc-100">User Analytics</span>
              </div>
              <p className="text-sm text-zinc-400">
                Monitor user growth, engagement, and retention across all customer segments.
              </p>
              <Button variant="link" className="p-0 h-auto text-zinc-300 hover:text-zinc-100 underline" onClick={() => router.push("/dashboard/admin/reports/users")}>
                View user reports
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-sm font-semibold text-zinc-100">Performance Metrics</span>
              </div>
              <p className="text-sm text-zinc-400">
                Analyze venue and vendor performance with detailed booking and revenue metrics.
              </p>
              <Button variant="link" className="p-0 h-auto text-zinc-300 hover:text-zinc-100 underline" onClick={() => router.push("/dashboard/admin/reports/venues")}>
                View performance reports
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
