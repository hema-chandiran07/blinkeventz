"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Calendar, Users, DollarSign, CheckCircle2, XCircle, Clock,
  Phone, Mail, AlertCircle, MapPin, Building, CheckCircle, Loader2
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

// ==================== Types ====================
interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
}

interface Venue {
  id: number;
  name: string;
  address: string;
  city: string;
  area: string;
}

interface AvailabilitySlot {
  id: number;
  date: string;
  timeSlot: "morning" | "evening" | "full_day" | "night";
  entityType: "VENUE" | "SERVICE";
  entityId: number;
  venue?: Venue;
}

interface Booking {
  id: number;
  userId: number;
  slotId: number;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  guestCount?: number;
  totalAmount?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  user: User;
  slot: AvailabilitySlot;
}

// ==================== Constants ====================
const TIME_SLOT_LABELS: Record<string, string> = {
  morning: "Morning (6:00 AM - 12:00 PM)",
  evening: "Evening (4:00 PM - 10:00 PM)",
  full_day: "Full Day (6:00 AM - 12:00 AM)",
  night: "Night (8:00 PM - 2:00 AM)"
};

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: any }> = {
  PENDING: { label: "Pending", className: "bg-yellow-100 text-yellow-700 border-yellow-300", icon: Clock },
  CONFIRMED: { label: "Confirmed", className: "bg-green-100 text-green-700 border-green-300", icon: CheckCircle },
  CANCELLED: { label: "Cancelled", className: "bg-red-100 text-red-700 border-red-300", icon: XCircle },
  COMPLETED: { label: "Completed", className: "bg-blue-100 text-blue-700 border-blue-300", icon: CheckCircle2 },
};

// ==================== Main Component ====================
export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject" | "cancel" | null>(null);

  useEffect(() => {
    if (bookingId) {
      loadBooking();
    }
  }, [bookingId]);

  const loadBooking = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/booking/${bookingId}`);
      setBooking(response.data);
    } catch (error: any) {
      console.error("Failed to load booking:", error);
      toast.error(error?.response?.data?.message || "Failed to load booking details");
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (type: "approve" | "reject" | "cancel") => {
    setActionType(type);
    setActionDialogOpen(true);
  };

  const confirmAction = async () => {
    if (!actionType || !booking) return;

    setActionLoading(true);
    try {
      const statusMap: Record<string, "CONFIRMED" | "CANCELLED" | "REJECTED"> = {
        approve: "CONFIRMED",
        reject: "REJECTED",
        cancel: "CANCELLED",
      };

      await api.patch(`/booking/${booking.id}/status`, {
        status: statusMap[actionType],
      });

      // Update local state
      setBooking({
        ...booking,
        status: statusMap[actionType] as any,
      });

      const messages = {
        approve: "Booking confirmed successfully! Customer has been notified.",
        reject: "Booking rejected. Customer has been notified.",
        cancel: "Booking cancelled. Customer has been notified.",
      };
      toast.success(messages[actionType]);

      setActionDialogOpen(false);
    } catch (error: any) {
      console.error("Action error:", error);
      toast.error(error?.response?.data?.message || `Failed to ${actionType} booking`);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || { label: status, className: "bg-neutral-100 text-neutral-700", icon: Clock };
    const Icon = config.icon;
    return (
      <Badge className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-neutral-400" />
          <p className="text-neutral-600">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-black mb-2">Booking Not Found</h2>
          <p className="text-neutral-600 mb-4">The booking you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const canApprove = booking.status === "PENDING";
  const canCancel = booking.status === "CONFIRMED" || booking.status === "PENDING";

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-black">Booking Details</h1>
            <p className="text-neutral-600">Booking ID: #{booking.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(booking.status)}
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Booking Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Event Details */}
          <Card className="border-silver-200 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-neutral-600" />
                Event Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Event Type</p>
                  <p className="text-black font-medium">{booking.slot.entityType}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600">Date</p>
                  <p className="text-black font-medium">
                    {new Date(booking.slot.date).toLocaleDateString("en-IN", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600">Time Slot</p>
                  <p className="text-black font-medium">{TIME_SLOT_LABELS[booking.slot.timeSlot]}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600">Guest Count</p>
                  <p className="text-black font-medium">{booking.guestCount || "N/A"}</p>
                </div>
              </div>

              {booking.notes && (
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">Customer Notes</p>
                      <p className="text-sm text-amber-700 mt-1">{booking.notes}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Venue Information */}
          <Card className="border-silver-200 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5 text-neutral-600" />
                Venue Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Venue Name</p>
                  <p className="text-black font-medium">{booking.slot.venue?.name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600">City</p>
                  <p className="text-black font-medium">{booking.slot.venue?.city || "N/A"}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-600">Address</p>
                <div className="flex items-start gap-2 mt-1">
                  <MapPin className="h-4 w-4 text-neutral-400 mt-0.5" />
                  <p className="text-black">
                    {booking.slot.venue?.address
                      ? `${booking.slot.venue.address}, ${booking.slot.venue.area || ""}, ${booking.slot.venue.city}`
                      : "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card className="border-silver-200 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-neutral-600" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Name</p>
                  <p className="text-black font-medium">{booking.user.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600">Email</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Mail className="h-4 w-4 text-neutral-400" />
                    <p className="text-black">{booking.user.email}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600">Phone</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Phone className="h-4 w-4 text-neutral-400" />
                    <p className="text-black">{booking.user.phone || "N/A"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600">Customer ID</p>
                  <p className="text-black">#{booking.user.id}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Details */}
          <Card className="border-silver-200 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-neutral-600" />
                Payment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Amount</p>
                <p className="text-2xl font-bold text-black mt-1">
                  ₹{booking.totalAmount?.toLocaleString("en-IN") || "0"}
                </p>
              </div>
              <div className="pt-4 border-t border-silver-200">
                <p className="text-sm font-medium text-neutral-600">Booking Date</p>
                <p className="text-black mt-1">
                  {new Date(booking.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              {booking.completedAt && (
                <div className="pt-4 border-t border-silver-200">
                  <p className="text-sm font-medium text-neutral-600">Completed At</p>
                  <p className="text-black mt-1">
                    {new Date(booking.completedAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              )}
              {booking.updatedAt && booking.status !== booking.createdAt && (
                <div className="pt-4 border-t border-silver-200">
                  <p className="text-sm font-medium text-neutral-600">Last Updated</p>
                  <p className="text-black mt-1">
                    {new Date(booking.updatedAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card className="border-silver-200 bg-white">
            <CardHeader>
              <CardTitle className="text-black">Actions</CardTitle>
              <CardDescription className="text-neutral-600">Manage this booking</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {canApprove && (
                <>
                  <Button
                    onClick={() => handleActionClick("approve")}
                    className="w-full bg-green-600 hover:bg-green-700 gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve Booking
                  </Button>
                  <Button
                    onClick={() => handleActionClick("reject")}
                    variant="outline"
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject Booking
                  </Button>
                </>
              )}
              {canCancel && (
                <Button
                  onClick={() => handleActionClick("cancel")}
                  variant="outline"
                  className="w-full text-neutral-600 hover:text-neutral-700 gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  {booking.status === "CONFIRMED" ? "Cancel Confirmed Booking" : "Cancel Booking"}
                </Button>
              )}
              {!canApprove && !canCancel && (
                <p className="text-sm text-neutral-600 text-center py-2">
                  No actions available for this booking status
                </p>
              )}
            </CardContent>
          </Card>

          {/* Booking Timeline */}
          <Card className="border-silver-200 bg-white">
            <CardHeader>
              <CardTitle className="text-black">Timeline</CardTitle>
              <CardDescription className="text-neutral-600">Booking history</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-black">Booking Created</p>
                  <p className="text-xs text-neutral-600">
                    {new Date(booking.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
              {booking.updatedAt && booking.status !== "PENDING" && (
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-black">Status Updated</p>
                    <p className="text-xs text-neutral-600">
                      {new Date(booking.updatedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              )}
              {booking.completedAt && (
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-black">Booking Completed</p>
                    <p className="text-xs text-neutral-600">
                      {new Date(booking.completedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Confirmation Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === "approve" && <CheckCircle2 className="h-5 w-5 text-green-600" />}
              {actionType === "reject" && <XCircle className="h-5 w-5 text-red-600" />}
              {actionType === "cancel" && <AlertCircle className="h-5 w-5 text-amber-600" />}
              {actionType === "approve" && "Confirm Approval"}
              {actionType === "reject" && "Confirm Rejection"}
              {actionType === "cancel" && "Confirm Cancellation"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve" && "This will confirm the booking and notify the customer."}
              {actionType === "reject" && "This will reject the booking and notify the customer."}
              {actionType === "cancel" && "This will cancel the booking and notify the customer."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              onClick={confirmAction}
              disabled={actionLoading}
              className={
                actionType === "approve"
                  ? "bg-green-600 hover:bg-green-700"
                  : actionType === "reject"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-neutral-600 hover:bg-neutral-700"
              }
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {actionType === "approve" && <CheckCircle2 className="h-4 w-4 mr-2" />}
                  {actionType === "reject" && <XCircle className="h-4 w-4 mr-2" />}
                  {actionType === "cancel" && <AlertCircle className="h-4 w-4 mr-2" />}
                  Confirm
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
