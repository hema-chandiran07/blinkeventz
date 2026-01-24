import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Calendar, Building2, DollarSign, Clock } from "lucide-react";

export default function VenueDashboard() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Venue Dashboard</h1>
          <p className="text-gray-500">Manage your venue availability and bookings.</p>
        </div>
        <Button>
           Edit Venue Details
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
          </CardContent>
        </Card>
        <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Inquiries</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
          </CardContent>
        </Card>
        <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue (Mo)</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹12,500</div>
          </CardContent>
        </Card>
        <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Building2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1.2k</div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar View Placeholder */}
      <Card className="min-h-[400px]">
          <CardHeader>
              <CardTitle>Availability Calendar</CardTitle>
          </CardHeader>
          <CardContent>
              <div className="flex items-center justify-center h-64 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                  <div className="text-center">
                      <Calendar className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">Interactive Calendar Component would go here</p>
                  </div>
              </div>
          </CardContent>
      </Card>
    </div>
  );
}
