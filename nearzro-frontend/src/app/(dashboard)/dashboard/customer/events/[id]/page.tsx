"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Calendar, MapPin, Clock,
  CheckCircle2, Download, FileText, Phone, Building
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface EventDetail {
  id: number;
  title: string;
  eventType: string;
  date: string;
  timeSlot: string;
  city: string;
  area: string;
  guestCount: number;
  status: string;
  totalAmount: number;
  venue?: {
    name: string;
    address: string;
    phone: string;
  };
  services: Array<{
    name: string;
    serviceType: string;
    finalPrice: number;
  }>;
  isExpress: boolean;
  createdAt: string;
}

export default function CustomerEventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<EventDetail | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    loadEvent(controller.signal);
    return () => controller.abort();
  }, [params.id]);

  const loadEvent = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const response = await api.get(`/events/${params.id}`, { signal });
      setEvent(response.data);
    } catch (error: any) {
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        return;
      }
      console.error("Failed to load event:", error);
      toast.error("Failed to load event details");
      router.push("/dashboard/customer/events");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async () => {
    try {
      const response = await api.get(`/customer/events/${event?.id}/invoice`, {
        responseType: 'blob',
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${event?.title?.replace(/\s+/g, '-')}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      toast.success("Invoice downloaded successfully");
    } catch (error: any) {
      console.error("Invoice download error:", error);
      toast.error("Failed to download invoice");
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    return `₹${(amount / 1000).toFixed(2)}K`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return "bg-emerald-950/30 text-emerald-400 border-emerald-700";
      case "IN_PROGRESS":
        return "bg-blue-950/30 text-blue-400 border-blue-700";
      case "COMPLETED":
        return "bg-purple-950/30 text-purple-400 border-purple-700";
      case "CANCELLED":
        return "bg-red-950/30 text-red-400 border-red-700";
      default:
        return "bg-zinc-800/50 text-zinc-400 border-zinc-700";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full border-4 border-zinc-800 border-t-zinc-400 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-100 mb-2">{event.title || "Event Details"}</h1>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(event.status)}>
                {event.status?.replace("_", " ") || "Unknown"}
              </Badge>
              {event.isExpress && (
                <Badge className="bg-amber-950/30 text-amber-400 border-amber-700">
                  <Clock className="h-3 w-3 mr-1" />
                  Express 50
                </Badge>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            disabled
            className="border-zinc-700 text-zinc-500 opacity-50 cursor-not-allowed"
          >
            <Download className="h-4 w-4 mr-2" />
            Unavailable
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Event Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader>
              <CardTitle className="text-zinc-100 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Event Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-zinc-400 mb-1">Event Type</p>
                  <p className="font-semibold text-zinc-100">{event.eventType || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-400 mb-1">Date & Time</p>
                  <p className="font-semibold text-zinc-100">
                    {event.date ? new Date(event.date).toLocaleDateString("en-IN") : "TBA"}
                  </p>
                  <p className="text-sm text-zinc-500">{event.timeSlot || "TBA"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-400 mb-1">Location</p>
                  <p className="font-semibold text-zinc-100">{event.area || "TBA"}, {event.city || "TBA"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-400 mb-1">Guest Count</p>
                  <p className="font-semibold text-zinc-100">{event.guestCount || 0} guests</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Venue Details */}
          {event.venue && (
            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardHeader>
                <CardTitle className="text-zinc-100 flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Venue Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="font-bold text-zinc-100 mb-2">{event.venue.name || "Venue"}</p>
                  <div className="flex items-center gap-2 text-sm text-zinc-400 mb-2">
                    <MapPin className="h-4 w-4" />
                    <span>{event.venue.address || "Address TBA"}</span>
                  </div>
                  {event.venue.phone && (
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <Phone className="h-4 w-4" />
                      <span>{event.venue.phone}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Services */}
          {event.services && event.services.length > 0 && (
            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardHeader>
                <CardTitle className="text-zinc-100 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Booked Services
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {event.services.map((service, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg border border-zinc-800"
                    >
                      <div>
                        <p className="font-semibold text-zinc-100">{service.name || "Service"}</p>
                        <p className="text-sm text-zinc-400">{service.serviceType || "N/A"}</p>
                      </div>
                      <p className="font-bold text-zinc-100">
                        {formatCurrency(service.finalPrice || 0)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Payment Summary */}
        <div className="lg:col-span-1">
          <Card className="border-zinc-800 bg-zinc-900/50 sticky top-8">
            <CardHeader>
              <CardTitle className="text-zinc-100">Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Subtotal</span>
                  <span className="font-medium text-zinc-100">
                    {formatCurrency((event.totalAmount || 0) * 0.82)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">GST (18%)</span>
                  <span className="font-medium text-zinc-100">
                    {formatCurrency((event.totalAmount || 0) * 0.18)}
                  </span>
                </div>
                <div className="border-t border-zinc-700 pt-3 flex justify-between font-bold text-lg">
                  <span className="text-zinc-100">Total Paid</span>
                  <span className="text-zinc-100">
                    {formatCurrency(event.totalAmount || 0)}
                  </span>
                </div>
              </div>

              <div className="pt-4">
                <div className="flex items-center gap-2 text-sm text-emerald-400 mb-3">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Payment Completed</span>
                </div>
                <Button
                  variant="outline"
                  disabled
                  className="w-full border-zinc-700 text-zinc-500 opacity-50 cursor-not-allowed"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Unavailable
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
