import { MOCK_EVENTS } from "@/services/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Calendar, MapPin, Users, Plus, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function CustomerDashboard() {
  // Filter events for mock customer "cust1"
  const myEvents = MOCK_EVENTS.filter(e => e.customerId === "cust1");

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Events</h1>
          <p className="text-gray-500">Manage your upcoming and past events.</p>
        </div>
        <Link href="/plan-event">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Plan New Event
          </Button>
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Calendar className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myEvents.length}</div>
          </CardContent>
        </Card>
        <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
            <StatusBadge status="planning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myEvents.filter(e => e.status === 'planning').length}</div>
          </CardContent>
        </Card>
        <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <div className="text-sm text-gray-500">₹</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{myEvents.reduce((acc, curr) => acc + curr.totalCost, 0).toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Events List */}
      <div className="grid gap-6">
        {myEvents.map((event) => (
          <Card key={event.id} className="overflow-hidden hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between md:justify-start md:space-x-4">
                    <h3 className="text-xl font-bold text-gray-900">{event.name}</h3>
                    <StatusBadge status={event.status} />
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="mr-1.5 h-4 w-4 text-purple-500" />
                      {new Date(event.date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center">
                      <MapPin className="mr-1.5 h-4 w-4 text-purple-500" />
                      {event.city}
                    </div>
                    <div className="flex items-center">
                      <Users className="mr-1.5 h-4 w-4 text-purple-500" />
                      {event.guestCount} guests
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:flex-col md:items-end md:space-y-2">
                    <div className="text-lg font-bold text-purple-600">
                        ₹{event.totalCost.toLocaleString()}
                    </div>
                    <Link href={`/dashboard/customer/events/${event.id}`}>
                        <Button variant="outline" size="sm">
                            View Details <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
