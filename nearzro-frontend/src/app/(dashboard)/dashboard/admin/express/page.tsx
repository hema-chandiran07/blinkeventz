"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Timer, ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { expressApi } from "@/lib/api-endpoints";
import { useState } from "react";

export default function AdminExpressPage() {
  const [requests, setRequests] = useState([1, 2, 3, 4, 5]);

  const handleProcess = async (id: number) => {
    try {
      console.log(`Processing express request ${id}`);
      toast.success(`Express request #${1000 + id} processed!`);
      setRequests(prev => prev.filter(r => r !== id));
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error: any) {
      console.error("Process error:", error);
      toast.error("Failed to process request");
    }
  };

  const handleReject = async (id: number) => {
    const reason = prompt("Please enter rejection reason:");
    if (!reason) return;
    
    try {
      console.log(`Rejecting express request ${id}`);
      toast.error(`Express request #${1000 + id} rejected`);
      setRequests(prev => prev.filter(r => r !== id));
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error: any) {
      console.error("Reject error:", error);
      toast.error("Failed to reject request");
    }
  };

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

      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-emerald-600" />
            <h3 className="text-lg font-bold text-black mb-2">All Caught Up!</h3>
            <p className="text-neutral-600">No express requests to process</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {requests.map((i) => (
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
                            <div className="flex items-center gap-2">
                              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleProcess(i)}>
                                <CheckCircle2 className="h-4 w-4 mr-2" /> Process
                              </Button>
                              <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50" onClick={() => handleReject(i)}>
                                <XCircle className="h-4 w-4 mr-2" /> Reject
                              </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
             </Card>
          ))}
        </div>
      )}
    </div>
  );
}
