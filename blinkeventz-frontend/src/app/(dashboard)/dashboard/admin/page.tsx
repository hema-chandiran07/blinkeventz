import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Store, Building2, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Overview</h1>
          <p className="text-gray-500">Platform statistics and approval requests.</p>
        </div>
        <Link href="/dashboard/admin/express">
            <Button variant="secondary" className="bg-purple-100 text-purple-700 hover:bg-purple-200">
                Go to Express 50
            </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
          </CardContent>
        </Card>
        <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Vendors</CardTitle>
            <Store className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">56</div>
          </CardContent>
        </Card>
        <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Venues</CardTitle>
            <Building2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">32</div>
          </CardContent>
        </Card>
        <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals Table */}
      <Card>
        <CardHeader>
            <CardTitle>Pending Vendor & Venue Approvals</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg bg-white">
                        <div className="flex items-center space-x-4">
                            <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                {i % 2 === 0 ? <Store className="h-5 w-5 text-gray-500" /> : <Building2 className="h-5 w-5 text-gray-500" />}
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900">{i % 2 === 0 ? 'New Vendor Application' : 'New Venue Listing'}</p>
                                <p className="text-sm text-gray-500">Submitted by {i % 2 === 0 ? 'Jane Smith' : 'Bob Johnson'} • 2 hours ago</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">Approve</Button>
                            <Button size="sm" variant="destructive">Reject</Button>
                            <Button size="sm" variant="outline">Details</Button>
                        </div>
                    </div>
                ))}
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
