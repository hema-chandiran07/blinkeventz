import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";

export default function VenueBookingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Venue Bookings</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 rounded-full bg-pink-100 flex items-center justify-center font-bold text-pink-700">
                    SM
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Smith Wedding</p>
                    <p className="text-sm text-gray-500">200 Guests • June 15, 2024</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <StatusBadge status={i === 1 ? 'confirmed' : 'planning'} />
                  <Button size="sm" variant="outline">View Details</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
