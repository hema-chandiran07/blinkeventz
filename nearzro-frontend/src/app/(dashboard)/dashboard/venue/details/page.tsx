"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { extractArray } from "@/lib/api-response";

const VENUE_TYPES = ["HALL", "MANDAPAM", "LAWN", "RESORT", "BANQUET"];

export default function VenueDetailsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "BANQUET",
    description: "",
    address: "",
    city: "Chennai",
    area: "",
    pincode: "",
    capacityMin: "",
    capacityMax: "",
    basePriceMorning: "",
    basePriceEvening: "",
    basePriceFullDay: "",
    amenities: "",
    policies: "",
  });

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "VENUE_OWNER") {
      router.push("/login");
    }

    // If editing, load venue data
    const venueId = searchParams.get('id');
    if (venueId) {
      loadVenue(venueId);
    }
  }, [isAuthenticated, user, router, searchParams]);

  const loadVenue = async (venueId: string) => {
    try {
      const response = await api.get('/venues/my');
      const venues = extractArray<any>(response);
      const venue = venues.find((v: any) => v.id === Number(venueId));
      if (venue) {
        setFormData({
          name: venue.name,
          type: venue.type,
          description: venue.description || "",
          address: venue.address,
          city: venue.city,
          area: venue.area,
          pincode: venue.pincode,
          capacityMin: venue.capacityMin.toString(),
          capacityMax: venue.capacityMax.toString(),
          basePriceMorning: venue.basePriceMorning?.toString() || "",
          basePriceEvening: venue.basePriceEvening?.toString() || "",
          basePriceFullDay: venue.basePriceFullDay?.toString() || "",
          amenities: venue.amenities || "",
          policies: venue.policies || "",
        });
        setIsEditing(true);
      }
    } catch (error) {
      console.error("Error loading venue:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const venueData = {
        ...formData,
        capacityMin: parseInt(formData.capacityMin),
        capacityMax: parseInt(formData.capacityMax),
        basePriceMorning: parseInt(formData.basePriceMorning) || 0,
        basePriceEvening: parseInt(formData.basePriceEvening) || 0,
        basePriceFullDay: parseInt(formData.basePriceFullDay) || 0,
      };

      if (isEditing) {
        await api.put(`/venues/${searchParams.get('id')}`, venueData);
        toast.success("Venue updated successfully!");
      } else {
        await api.post("/venues", venueData);
        toast.success("Venue created successfully! Awaiting admin approval.");
      }
      
      router.push("/dashboard/venue");
    } catch (error: any) {
      console.error("Venue error:", error);
      toast.error(error?.response?.data?.message || "Failed to save venue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" onClick={() => router.push("/dashboard/venue")} className="mb-6 gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Button>

      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">
            {isEditing ? "Edit Venue" : "Add New Venue"}
          </h1>
          <p className="text-neutral-600">
            {isEditing ? "Update your venue information" : "List your venue and start getting bookings"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="border-silver-200">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Venue Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Grand Ballroom"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Venue Type *</Label>
                  <select
                    id="type"
                    className="flex w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    required
                  >
                    {VENUE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your venue's features, ambiance, and unique selling points..."
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-silver-200">
            <CardHeader>
              <CardTitle>Location Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Address *</Label>
                <Input
                  id="address"
                  placeholder="Street address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="area">Area *</Label>
                  <Input
                    id="area"
                    placeholder="e.g., T Nagar"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pincode">Pincode *</Label>
                  <Input
                    id="pincode"
                    placeholder="600001"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-silver-200">
            <CardHeader>
              <CardTitle>Capacity & Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="capacityMin">Minimum Capacity *</Label>
                  <Input
                    id="capacityMin"
                    type="number"
                    placeholder="100"
                    value={formData.capacityMin}
                    onChange={(e) => setFormData({ ...formData, capacityMin: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacityMax">Maximum Capacity *</Label>
                  <Input
                    id="capacityMax"
                    type="number"
                    placeholder="500"
                    value={formData.capacityMax}
                    onChange={(e) => setFormData({ ...formData, capacityMax: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="basePriceMorning">Morning Price (₹)</Label>
                  <Input
                    id="basePriceMorning"
                    type="number"
                    placeholder="50000"
                    value={formData.basePriceMorning}
                    onChange={(e) => setFormData({ ...formData, basePriceMorning: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="basePriceEvening">Evening Price (₹)</Label>
                  <Input
                    id="basePriceEvening"
                    type="number"
                    placeholder="80000"
                    value={formData.basePriceEvening}
                    onChange={(e) => setFormData({ ...formData, basePriceEvening: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="basePriceFullDay">Full Day Price (₹)</Label>
                  <Input
                    id="basePriceFullDay"
                    type="number"
                    placeholder="120000"
                    value={formData.basePriceFullDay}
                    onChange={(e) => setFormData({ ...formData, basePriceFullDay: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-silver-200">
            <CardHeader>
              <CardTitle>Amenities & Policies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amenities">Amenities (comma-separated)</Label>
                <Textarea
                  id="amenities"
                  placeholder="e.g., Parking, AC, Power Backup, WiFi, Catering"
                  rows={3}
                  value={formData.amenities}
                  onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="policies">Policies (comma-separated)</Label>
                <Textarea
                  id="policies"
                  placeholder="e.g., No smoking, No outside catering, Music till 10 PM only"
                  rows={3}
                  value={formData.policies}
                  onChange={(e) => setFormData({ ...formData, policies: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button
              type="submit"
              variant="premium"
              className="flex-1 h-12"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  {isEditing ? "Updating Venue..." : "Creating Venue..."}
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 mr-2" />
                  {isEditing ? "Update Venue" : "Create Venue"}
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="silver"
              className="flex-1 h-12"
              onClick={() => router.push("/dashboard/venue")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
