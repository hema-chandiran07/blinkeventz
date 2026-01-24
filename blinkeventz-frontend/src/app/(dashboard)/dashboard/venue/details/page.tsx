import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function VenueDetailsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">My Venue</h1>
      <Card>
        <CardHeader>
          <CardTitle>Venue Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="venueName">Venue Name</Label>
            <Input id="venueName" defaultValue="Grand Ballroom Hotel" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" defaultValue="A luxurious ballroom perfect for weddings and large corporate events." />
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" defaultValue="New York" />
             </div>
             <div className="space-y-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input id="capacity" type="number" defaultValue="500" />
             </div>
          </div>
           <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input id="price" type="number" defaultValue="5000" />
             </div>
             <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                    <option value="per_day">Per Day</option>
                    <option value="per_hour">Per Hour</option>
                </select>
             </div>
          </div>
          <Button>Save Details</Button>
        </CardContent>
      </Card>
    </div>
  );
}
