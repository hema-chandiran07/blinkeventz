"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, Building, Store, Eye } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface ApprovalItem {
  id: number;
  type: "VENUE" | "VENDOR";
  name: string;
  owner: string;
  city: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

export default function AdminApprovalsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "ADMIN") {
      router.push("/login");
      return;
    }
    loadApprovals();
  }, [isAuthenticated, user, router]);

  const loadApprovals = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API calls
      setApprovals([
        { id: 1, type: "VENUE", name: "Grand Ballroom", owner: "John Doe", city: "Chennai", status: "PENDING", createdAt: "2024-03-15" },
        { id: 2, type: "VENDOR", name: "Elite Photography", owner: "Jane Smith", city: "Bangalore", status: "PENDING", createdAt: "2024-03-14" },
        { id: 3, type: "VENUE", name: "Royal Gardens", owner: "Mike Johnson", city: "Mumbai", status: "PENDING", createdAt: "2024-03-13" },
      ]);
    } catch (error) {
      console.error("Error loading approvals:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number, type: string) => {
    try {
      // API call to approve
      await api.patch(`/admin/${type.toLowerCase()}s/${id}/approve`);
      toast.success(`${type} approved successfully!`);
      loadApprovals();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || `Failed to approve ${type}`);
    }
  };

  const handleReject = async (id: number, type: string) => {
    try {
      // API call to reject
      await api.patch(`/admin/${type.toLowerCase()}s/${id}/reject`);
      toast.success(`${type} rejected`);
      loadApprovals();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || `Failed to reject ${type}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full border-4 border-neutral-200 border-t-neutral-800 animate-spin mx-auto mb-4" />
          <p className="text-neutral-600">Loading approvals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black">Approvals</h1>
          <p className="text-neutral-600 mt-1">Review and approve pending venues and vendors</p>
        </div>
        <Button variant="ghost" onClick={() => router.push("/dashboard/admin")}>
          Back to Dashboard
        </Button>
      </div>

      <Card className="border-silver-200">
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          {approvals.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-black mb-2">All Caught Up!</h3>
              <p className="text-neutral-600">No pending approvals at the moment</p>
            </div>
          ) : (
            <div className="space-y-4">
              {approvals.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-neutral-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center">
                      {item.type === "VENUE" ? (
                        <Building className="h-6 w-6 text-neutral-800" />
                      ) : (
                        <Store className="h-6 w-6 text-neutral-800" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-black">{item.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-neutral-600 mt-1">
                        <span>{item.type}</span>
                        <span>•</span>
                        <span>{item.owner}</span>
                        <span>•</span>
                        <span>{item.city}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                      <Clock className="h-3 w-3 mr-1" />
                      Pending
                    </Badge>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/dashboard/admin/approvals?id=${item.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => handleApprove(item.id, item.type)}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleReject(item.id, item.type)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-silver-200 bg-gradient-to-br from-neutral-50 to-white">
        <CardHeader>
          <CardTitle>Approval Guidelines</CardTitle>
          <CardDescription>Best practices for reviewing submissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 rounded-lg bg-white border border-neutral-200">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-black">Verify Information</p>
                <p className="text-sm text-neutral-600 mt-1">
                  Ensure all provided information is accurate and complete before approving
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-lg bg-white border border-neutral-200">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Building className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-black">Check Compliance</p>
                <p className="text-sm text-neutral-600 mt-1">
                  Verify that venues and vendors meet platform standards and requirements
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
