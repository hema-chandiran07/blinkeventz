"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, CheckCircle2, XCircle, Building, Store, Mail, Phone,
  MapPin, Calendar, Users, AlertCircle, Clock
} from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface ApprovalDetail {
  id: number;
  type: "VENUE" | "VENDOR";
  title: string;
  owner: string;
  email: string;
  phone: string;
  location: string;
  area: string;
  city: string;
  description: string;
  capacity?: number;
  serviceType?: string;
  price: number;
  status: string;
  submittedDate: string;
}

const MOCK_APPROVAL: ApprovalDetail = {
  id: 1,
  type: "VENUE",
  title: "Grand Ballroom ITC",
  owner: "ITC Hotels",
  email: "hotels@itchotels.in",
  phone: "+91 44 2231 1111",
  location: "123 GST Road",
  area: "Guindy",
  city: "Chennai",
  description: "Luxury ballroom with state-of-the-art facilities perfect for weddings and corporate events. Features high ceilings, premium lighting, and capacity for up to 800 guests.",
  capacity: 800,
  price: 150000,
  status: "PENDING_APPROVAL",
  submittedDate: "2024-03-15",
};

export default function ApprovalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [approval] = useState<ApprovalDetail>(MOCK_APPROVAL);

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    return `₹${(amount / 1000).toFixed(2)}K`;
  };

  const handleApprove = async () => {
    if (confirm("Are you sure you want to approve this submission?")) {
      try {
        console.log(`Approving ${approval.type} ${approval.id}`);
        toast.success(`${approval.type} approved successfully!`);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        router.push("/dashboard/admin/approvals");
      } catch (error: any) {
        console.error("Approve error:", error);
        toast.error("Failed to approve");
      }
    }
  };

  const handleReject = async () => {
    if (confirm("Are you sure you want to reject this submission?")) {
      const reason = prompt("Please enter rejection reason:");
      if (!reason) return;

      try {
        console.log(`Rejecting ${approval.type} ${approval.id}`);
        toast.success(`${approval.type} rejected`);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        router.push("/dashboard/admin/approvals");
      } catch (error: any) {
        console.error("Reject error:", error);
        toast.error("Failed to reject");
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="hover:bg-neutral-100">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-black">{approval.title}</h1>
            <p className="text-neutral-600">Approval ID: #{approval.id}</p>
          </div>
        </div>
      </motion.div>

      {/* Alert Banner */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        <Card className="border-2 border-amber-300 bg-amber-50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-amber-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-900">Pending Approval</h3>
                <p className="text-sm text-amber-800 mt-1">
                  This {approval.type.toLowerCase()} submission is awaiting your review. Please verify all information before approving.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Action Buttons */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex items-center justify-end gap-3">
        <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50" onClick={handleReject}>
          <XCircle className="h-4 w-4 mr-2" /> Reject Submission
        </Button>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleApprove}>
          <CheckCircle2 className="h-4 w-4 mr-2" /> Approve {approval.type}
        </Button>
      </motion.div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-2 border-black hover:shadow-lg">
            <CardHeader>
              <CardTitle className="text-black flex items-center gap-2">
                {approval.type === "VENUE" ? <Building className="h-5 w-5" /> : <Store className="h-5 w-5" />}
                {approval.type} Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-neutral-600">Description</p>
                <p className="text-black leading-relaxed mt-1">{approval.description}</p>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {approval.capacity && (
                  <div>
                    <p className="text-sm font-medium text-neutral-600">Capacity</p>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-neutral-400" />
                      <p className="text-lg font-bold text-black">{approval.capacity} guests</p>
                    </div>
                  </div>
                )}
                {approval.serviceType && (
                  <div>
                    <p className="text-sm font-medium text-neutral-600">Service Type</p>
                    <p className="text-lg font-bold text-black">{approval.serviceType}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-neutral-600">Base Price</p>
                  <p className="text-2xl font-bold text-black">{formatCurrency(approval.price)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600">Submitted On</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-neutral-400" />
                    <p className="text-lg font-bold text-black">{new Date(approval.submittedDate).toLocaleDateString("en-IN")}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-black hover:shadow-lg">
            <CardHeader>
              <CardTitle className="text-black">Location Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-neutral-400 mt-0.5" />
                <div>
                  <p className="text-lg font-bold text-black">{approval.location}</p>
                  <p className="text-sm text-neutral-600">{approval.area}, {approval.city}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-black hover:shadow-lg">
            <CardHeader>
              <CardTitle className="text-black flex items-center gap-2">
                <Users className="h-5 w-5" /> Owner Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Owner Name</p>
                  <p className="text-lg font-bold text-black">{approval.owner}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600">Email Address</p>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-neutral-400" />
                    <p className="text-lg font-bold text-black">{approval.email}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600">Phone Number</p>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-neutral-400" />
                    <p className="text-lg font-bold text-black">{approval.phone}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="border-2 border-black hover:shadow-lg">
            <CardHeader>
              <CardTitle className="text-black">Submission Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50">
                <span className="text-sm text-neutral-600">Type</span>
                <Badge className="bg-black text-white">{approval.type}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50">
                <span className="text-sm text-neutral-600">Status</span>
                <Badge className="bg-amber-500 text-white">
                  <Clock className="h-3 w-3 mr-1" />
                  Pending
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50">
                <span className="text-sm text-neutral-600">Submitted</span>
                <span className="text-sm font-bold text-black">{new Date(approval.submittedDate).toLocaleDateString("en-IN")}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-900 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Verification Required
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-red-800">
                Before approving, please verify:
              </p>
              <ul className="space-y-2 text-sm text-red-800">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5" />
                  <span>All information is accurate and complete</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5" />
                  <span>Owner contact details are verified</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5" />
                  <span>Pricing is competitive and reasonable</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5" />
                  <span>Location details are correct</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
