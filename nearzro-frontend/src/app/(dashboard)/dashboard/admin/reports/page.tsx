"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart3, TrendingUp, Download, Calendar,
  DollarSign, Users, Building, Store, ArrowRight
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function ReportsPage() {
  const router = useRouter();

  const reportCards = [
    {
      title: "Revenue Report",
      description: "Detailed revenue analytics and trends",
      icon: DollarSign,
      color: "bg-emerald-600",
      href: "/dashboard/admin/reports/revenue",
      stats: "₹4.75Cr Total",
    },
    {
      title: "User Analytics",
      description: "User growth and engagement metrics",
      icon: Users,
      color: "bg-blue-600",
      href: "/dashboard/admin/reports/users",
      stats: "1,247 Total Users",
    },
    {
      title: "Venue Performance",
      description: "Venue bookings and revenue breakdown",
      icon: Building,
      color: "bg-orange-600",
      href: "/dashboard/admin/reports/venues",
      stats: "89 Active Venues",
    },
    {
      title: "Vendor Analytics",
      description: "Vendor performance and bookings",
      icon: Store,
      color: "bg-purple-600",
      href: "/dashboard/admin/reports/vendors",
      stats: "156 Active Vendors",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black">Reports & Analytics</h1>
          <p className="text-neutral-600">Comprehensive business intelligence and insights</p>
        </div>
        <Button variant="outline" className="border-black">
          <Download className="h-4 w-4 mr-2" />
          Export All Reports
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-2 border-emerald-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Monthly Revenue</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">₹38.5L</p>
                <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +18.4% vs last month
                </p>
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
                <p className="text-sm font-medium text-neutral-600">New Users</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">+127</p>
                <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +22.1% vs last month
                </p>
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
                <p className="text-sm font-medium text-neutral-600">Total Bookings</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">534</p>
                <p className="text-xs text-orange-600 mt-2 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +12.5% vs last month
                </p>
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
                <p className="text-sm font-medium text-neutral-600">Success Rate</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">94.2%</p>
                <p className="text-xs text-purple-600 mt-2 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +2.3% vs last month
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

      {/* Recent Activity */}
      <Card className="border-2 border-black">
        <CardHeader>
          <CardTitle className="text-black">Platform Activity Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-600" />
                <span className="text-sm font-semibold text-black">Revenue Trends</span>
              </div>
              <p className="text-sm text-neutral-600">
                Total revenue increased by 18.4% this month with 534 successful bookings.
              </p>
              <Button variant="link" className="p-0 h-auto text-black underline">
                View detailed report
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-600" />
                <span className="text-sm font-semibold text-black">User Growth</span>
              </div>
              <p className="text-sm text-neutral-600">
                127 new users registered this month with 94.2% retention rate.
              </p>
              <Button variant="link" className="p-0 h-auto text-black underline">
                View user analytics
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-orange-600" />
                <span className="text-sm font-semibold text-black">Top Performers</span>
              </div>
              <p className="text-sm text-neutral-600">
                Anna Nagar and T Nagar venues showing highest booking rates.
              </p>
              <Button variant="link" className="p-0 h-auto text-black underline">
                View venue rankings
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
