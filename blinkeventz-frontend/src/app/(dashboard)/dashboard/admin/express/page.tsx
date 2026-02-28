import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Timer, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AdminExpressPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
             <Link href="/dashboard/admin">
                <Button variant="ghost" size="icon">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
             </Link>
            <div>
            <h1 className="text-3xl font-bold text-black">Express 50</h1>
            <p className="text-neutral-600">Manage time-sensitive express requests.</p>
            </div>
        </div>
      </div>

      <div className="grid gap-6">
        {[1, 2, 3, 4, 5].map((i) => (
             <Card key={i} className="border-l-4 border-l-red-500">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                                <h3 className="font-bold text-lg text-black">Express Request #{1000 + i}</h3>
                                <StatusBadge status="pending" className="bg-red-100 text-red-700 border-red-200" />
                            </div>
                            <p className="text-neutral-700">Urgent catering requirement for 50 people tomorrow.</p>
                        </div>
                        
                        <div className="flex items-center space-x-6">
                            <div className="text-right">
                                <div className="text-sm text-neutral-600 mb-1">Time Remaining</div>
                                <div className="flex items-center text-xl font-bold text-red-600 font-mono">
                                    <Timer className="h-5 w-5 mr-2" />
                                    00:45:2{i}
                                </div>
                            </div>
                            <Button>Process Now</Button>
                        </div>
                    </div>
                </CardContent>
             </Card>
        ))}
      </div>
    </div>
  );
}
