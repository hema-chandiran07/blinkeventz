"use client";

import { useEffect, useState } from "react";
import { getMyServices } from "@/lib/vendor";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Edit, Trash2 } from "lucide-react";

export default function VendorServicesPage() {
  const [services, setServices] = useState<unknown[]>([]);

  useEffect(() => {
    getMyServices().then(setServices);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">My Services</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Add Service
        </Button>
      </div>

      <div className="grid gap-6">
        {services.length === 0 && (
          <p className="text-gray-500 text-sm">No services added yet</p>
        )}

        {services.map((service, i) => {
          const s = service as { name?: string; description?: string };
          return (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {s.name ?? "Service"}
                  </h3>
                  <p className="text-gray-500">
                    {s.description ?? "—"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          );
        })}
      </div>
    </div>
  );
}
