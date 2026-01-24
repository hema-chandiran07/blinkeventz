import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

export default function AdminApprovalsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Pending Approvals</h1>
      
      <div className="grid gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">New Vendor Registration: "Elite Catering"</h3>
                    <p className="text-sm text-gray-500 mb-2">Submitted by Jane Smith • 2 hours ago</p>
                    <p className="text-gray-700">Premium catering service specializing in corporate events and weddings. Based in New York.</p>
                </div>
                <div className="flex gap-2 items-start">
                    <Button className="bg-green-600 hover:bg-green-700">
                        <Check className="mr-2 h-4 w-4" /> Approve
                    </Button>
                    <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                        <X className="mr-2 h-4 w-4" /> Reject
                    </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
