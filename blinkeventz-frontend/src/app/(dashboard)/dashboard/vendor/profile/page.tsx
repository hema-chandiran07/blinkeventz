"use client";

import { useEffect, useState } from "react";
import { getMyVendor } from "@/lib/vendor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function VendorProfilePage() {
  const [vendor, setVendor] = useState<unknown>(null);

  useEffect(() => {
    getMyVendor().then(setVendor);
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Vendor Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Business Name</Label>
            <Input defaultValue={(vendor as { businessName?: string })?.businessName ?? ""} />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea defaultValue={(vendor as { description?: string })?.description ?? ""} />
          </div>

          <Button>Update Profile</Button>
        </CardContent>
      </Card>
    </div>
  );
}
