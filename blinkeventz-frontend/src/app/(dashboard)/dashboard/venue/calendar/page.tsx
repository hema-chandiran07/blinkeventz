import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon } from "lucide-react";

export default function VenueCalendarPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Availability Calendar</h1>
      
      <Card className="min-h-[500px]">
        <CardHeader>
            <CardTitle>June 2024</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="flex items-center justify-center h-96 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                <div className="text-center">
                    <CalendarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">Calendar View</h3>
                    <p className="text-gray-500">Interactive calendar component will be implemented here.</p>
                </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
