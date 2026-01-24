import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users } from "lucide-react";

export default function AdminEventsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">All Events</h1>
      
      <div className="grid gap-4">
         {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
                <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                             <h3 className="font-bold text-lg">Event #{1000 + i}</h3>
                             <StatusBadge status={i % 2 === 0 ? 'booked' : 'planning'} />
                        </div>
                        <div className="flex gap-4 text-sm text-gray-500">
                            <div className="flex items-center"><Calendar className="h-4 w-4 mr-1"/> 2024-08-{10+i}</div>
                            <div className="flex items-center"><MapPin className="h-4 w-4 mr-1"/> New York</div>
                            <div className="flex items-center"><Users className="h-4 w-4 mr-1"/> {100 * i} Guests</div>
                        </div>
                    </div>
                    <div className="ml-4">
                        <Button variant="ghost" size="sm">Manage</Button>
                    </div>
                </CardContent>
            </Card>
         ))}
      </div>
    </div>
  );
}
