"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Calendar, Users, DollarSign, CheckCircle2, XCircle, Clock,
  Phone, Mail, AlertCircle, MapPin, Building, Loader2, IndianRupee,
  MessageSquare
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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
  entityType: "VENDOR" | "VENUE";
  entityId: number;
  venue?: Venue;
  eventTitle?: string;
  name?: string;
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

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: any; description: string }> = {
  PENDING: {
    label: "Pending",
    className: "bg-yellow-100 text-yellow-700 border-yellow-300",
    icon: Clock,
    description: "Awaiting your response"
  },
  CONFIRMED: {
    label: "Confirmed",
    className: "bg-green-100 text-green-700 border-green-300",
    icon: CheckCircle2,
    description: "Booking confirmed by vendor"
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-red-100 text-red-700 border-red-300",
    icon: XCircle,
    description: "Booking has been cancelled"
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-blue-100 text-blue-700 border-blue-300",
    icon: CheckCircle2,
    description: "Service has been completed"
  },
};

// ==================== Main Component ====================
export default function VendorBookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject" | "complete" | "cancel" | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    if (bookingId) {
      loadBooking();
    }
  }, [bookingId]);

  const loadBooking = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/booking/${bookingId}`);
      const foundBooking = response.data;

      if (!foundBooking) {
        toast.error("Booking not found");
        router.push("/dashboard/vendor/bookings");
        return;
      }

      setBooking(foundBooking);
    } catch (error: any) {
      console.error("Failed to load booking:", error);
      toast.error(error?.response?.data?.message || "Failed to load booking details");
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (type: "approve" | "reject" | "complete" | "cancel") => {
    setActionType(type);
    if (type === "reject") {
      setRejectionReason("");
    }
    setActionDialogOpen(true);
  };

  const confirmAction = async () => {
    if (!actionType || !booking) return;

    setActionLoading(true);
    try {
      const statusMap: Record<string, "CONFIRMED" | "CANCELLED" | "COMPLETED"> = {
        approve: "CONFIRMED",
        reject: "CANCELLED",
        cancel: "CANCELLED",
        complete: "COMPLETED",
      };

      await api.patch(`/vendors/me/bookings/${booking.id}/status`, {
        status: statusMap[actionType],
        reason: actionType === "reject" ? rejectionReason || undefined : undefined,
      });

      setBooking({
        ...booking,
        status: statusMap[actionType] as any,
        updatedAt: new Date().toISOString(),
        completedAt: actionType === "complete" ? new Date().toISOString() : booking.completedAt,
      });

      const messages: Record<string, string> = {
        approve: "Booking confirmed successfully! Customer has been notified.",
        reject: "Booking rejected. Customer has been notified.",
        cancel: "Booking cancelled. Customer has been notified.",
        complete: "Booking marked as completed! Earnings will be processed.",
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
    const config = STATUS_CONFIG[status] || {
      label: status,
      className: "bg-neutral-100 text-neutral-700 border-neutral-300",
      icon: Clock,
      description: ""
    };
    const Icon = config.icon;
    return (
      <Badge className={cn("flex items-center gap-1", config.className)}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const canApprove = booking?.status === "PENDING";
  const canReject = booking?.status === "PENDING";
  const canComplete = booking?.status === "CONFIRMED";
  const canCancel = booking?.status === "CONFIRMED" || booking?.status === "PENDING";

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
          <Button onClick={() => router.push("/dashboard/vendor/bookings")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Bookings
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push("/dashboard/vendor/bookings")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-black">Booking Details</h1>
            <p className="text-neutral-600">Booking ID: #{booking.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {getStatusBadge(booking.status)}
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Event Details */}
          <Card className="border-neutral-200 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-black">
                <Calendar className="h-5 w-5 text-neutral-500" />
                Event Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Event Name</p>
                  <p className="text-black font-medium">{booking.slot.eventTitle || booking.slot.name || "Service Booking"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600">Service Type</p>
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
                  <p className="text-black font-medium">{TIME_SLOT_LABELS[booking.slot.timeSlot] || booking.slot.timeSlot}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600">Guest Count</p>
                  <p className="text-black font-medium">{booking.guestCount || "Not specified"}</p>
                </div>
              </div>

              {booking.notes && (
                <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="h-5 w-5 text-neutral-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-neutral-700">Customer Notes</p>
                      <p className="text-neutral-600 mt-1 italic">"{booking.notes}"</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card className="border-neutral-200 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-black">
                <Users className="h-5 w-5 text-neutral-500" />
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
                  <div className="flex items-center gap-2 mt-1 text-black">
                    <Mail className="h-4 w-4 text-neutral-500" />
                    <span>{booking.user.email}</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600">Phone</p>
                  <div className="flex items-center gap-2 mt-1 text-black">
                    <Phone className="h-4 w-4 text-neutral-500" />
                    <span>{booking.user.phone || "Not provided"}</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600">Customer ID</p>
                  <p className="text-black font-medium">#{booking.user.id}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Venue Information (if applicable) */}
          {booking.slot.venue && (
            <Card className="border-neutral-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-black">
                  <Building className="h-5 w-5 text-neutral-500" />
                  Venue Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-neutral-600">Venue Name</p>
                    <p className="text-black font-medium">{booking.slot.venue.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-600">City</p>
                    <p className="text-black font-medium">{booking.slot.venue.city}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600">Address</p>
                  <div className="flex items-start gap-2 mt-1 text-black">
                    <MapPin className="h-4 w-4 text-neutral-500 mt-0.5" />
                    <span>
                      {booking.slot.venue.address}
                      {booking.slot.venue.area && `, ${booking.slot.venue.area}`}
                      {booking.slot.venue.city && `, ${booking.slot.venue.city}`}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card className="border-neutral-200 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-black">
                <Clock className="h-5 w-5 text-neutral-500" />
                Booking Timeline
              </CardTitle>
              <CardDescription className="text-neutral-600">History of this booking</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-4 w-4 text-neutral-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-black">Booking Created</p>
                  <p className="text-xs text-neutral-500">
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
                  <div className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-4 w-4 text-neutral-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-black">Status Updated</p>
                    <p className="text-xs text-neutral-500">
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
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-black">Booking Completed</p>
                    <p className="text-xs text-neutral-500">
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

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Details */}
          <Card className="border-neutral-200 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-black">
                <IndianRupee className="h-5 w-5 text-neutral-500" />
                Payment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Amount</p>
                <p className="text-3xl font-bold text-black mt-1">
                  ₹{booking.totalAmount?.toLocaleString("en-IN") || "0"}
                </p>
              </div>
              <div className="pt-4 border-t border-neutral-200">
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
                <div className="pt-4 border-t border-neutral-200">
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
            </CardContent>
          </Card>

          {/* Actions */}
          <Card className="border-neutral-200 bg-white">
            <CardHeader>
              <CardTitle className="text-black">Actions</CardTitle>
              <CardDescription className="text-neutral-600">Manage this booking</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {canApprove && (
                <Button
                  onClick={() => handleActionClick("approve")}
                  className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Approve Booking
                </Button>
              )}
              {canReject && (
                <Button
                  onClick={() => handleActionClick("reject")}
                  variant="outline"
                  className="w-full text-red-600 hover:bg-red-50 border-red-300 gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  Reject Booking
                </Button>
              )}
              {canComplete && (
                <Button
                  onClick={() => handleActionClick("complete")}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Mark as Completed
                </Button>
              )}
              {canCancel && booking.status !== "PENDING" && (
                <Button
                  onClick={() => handleActionClick("cancel")}
                  variant="outline"
                  className="w-full text-neutral-600 hover:bg-neutral-100 border-neutral-300 gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  Cancel Booking
                </Button>
              )}
              {!canApprove && !canReject && !canComplete && !canCancel && (
                <p className="text-sm text-neutral-500 text-center py-2">
                  No actions available for this booking status
                </p>
              )}
            </CardContent>
          </Card>

          {/* Status Info */}
          <Card className="border-neutral-200 bg-white">
            <CardHeader>
              <CardTitle className="text-black">Status Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200">
                <p className="text-xs text-neutral-600">Current Status</p>
                <p className="text-black font-medium mt-1">{STATUS_CONFIG[booking.status]?.description || "N/A"}</p>
              </div>
              {booking.status === "PENDING" && (
                <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                  <p className="text-xs text-yellow-700">Action Required</p>
                  <p className="text-neutral-700 mt-1">Please approve or reject this booking</p>
                </div>
              )}
              {booking.status === "CONFIRMED" && (
                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                  <p className="text-xs text-green-700">Next Step</p>
                  <p className="text-neutral-700 mt-1">Provide the service and mark as completed</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Confirmation Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-black flex items-center gap-2">
              {actionType === "approve" && <CheckCircle2 className="h-5 w-5 text-green-600" />}
              {actionType === "reject" && <XCircle className="h-5 w-5 text-red-600" />}
              {actionType === "complete" && <CheckCircle2 className="h-5 w-5 text-blue-600" />}
              {actionType === "cancel" && <AlertCircle className="h-5 w-5 text-amber-600" />}
              {actionType === "approve" && "Confirm Approval"}
              {actionType === "reject" && "Confirm Rejection"}
              {actionType === "complete" && "Mark as Completed"}
              {actionType === "cancel" && "Confirm Cancellation"}
            </DialogTitle>
            <DialogDescription className="text-neutral-600">
              {actionType === "approve" && "This will confirm the booking and notify the customer."}
              {actionType === "reject" && "This will reject the booking and notify the customer."}
              {actionType === "complete" && "This will mark the booking as completed and initiate payout processing."}
              {actionType === "cancel" && "This will cancel the booking and notify the customer."}
            </DialogDescription>
          </DialogHeader>

          {actionType === "reject" && (
            <div className="space-y-2">
              <Label htmlFor="reason" className="text-neutral-700">Rejection Reason (optional)</Label>
              <Textarea
                id="reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Provide a reason for rejection..."
                rows={3}
                className="border-neutral-300 bg-white text-black placeholder:text-neutral-400"
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)} disabled={actionLoading} className="border-neutral-300 text-black hover:bg-neutral-100">
              Cancel
            </Button>
            <Button
              onClick={confirmAction}
              disabled={actionLoading}
              className={
                actionType === "approve"
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : actionType === "reject"
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : actionType === "complete"
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-neutral-600 hover:bg-neutral-700 text-white"
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
                  {actionType === "complete" && <CheckCircle2 className="h-4 w-4 mr-2" />}
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
