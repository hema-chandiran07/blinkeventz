"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function VendorBookingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Bookings</h1>

      <Card>
        <CardHeader>
          <CardTitle>All Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-sm">No bookings yet</p>
        </CardContent>
      </Card>
    </div>
  );
}
