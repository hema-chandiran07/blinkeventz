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
    loadEvent();
  }, [params.id]);

  const loadEvent = async () => {
    try {
      const response = await api.get(`/customer/me/events/${params.id}`);
      setEvent(response.data);
    } catch (error: any) {
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
        return "bg-green-100 text-green-800 border-green-200";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "COMPLETED":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "CANCELLED":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-neutral-100 text-neutral-800 border-neutral-200";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full border-4 border-neutral-200 border-t-black animate-spin mx-auto mb-4" />
          <p className="text-black">Loading event details...</p>
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
            <h1 className="text-3xl font-bold text-black mb-2">{event.title}</h1>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(event.status)}>
                {event.status.replace("_", " ")}
              </Badge>
              {event.isExpress && (
                <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                  <Clock className="h-3 w-3 mr-1" />
                  Express 50
                </Badge>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleDownloadInvoice}
            className="border-black"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Invoice
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Event Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card className="border-2 border-black">
            <CardHeader>
              <CardTitle className="text-black flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Event Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-neutral-600 mb-1">Event Type</p>
                  <p className="font-semibold text-black">{event.eventType}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600 mb-1">Date & Time</p>
                  <p className="font-semibold text-black">
                    {new Date(event.date).toLocaleDateString("en-IN")}
                  </p>
                  <p className="text-sm text-neutral-600">{event.timeSlot}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600 mb-1">Location</p>
                  <p className="font-semibold text-black">{event.area}, {event.city}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-600 mb-1">Guest Count</p>
                  <p className="font-semibold text-black">{event.guestCount} guests</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Venue Details */}
          {event.venue && (
            <Card className="border-2 border-black">
              <CardHeader>
                <CardTitle className="text-black flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Venue Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="font-bold text-black mb-2">{event.venue.name}</p>
                  <div className="flex items-center gap-2 text-sm text-neutral-600 mb-2">
                    <MapPin className="h-4 w-4" />
                    <span>{event.venue.address}</span>
                  </div>
                  {event.venue.phone && (
                    <div className="flex items-center gap-2 text-sm text-neutral-600">
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
            <Card className="border-2 border-black">
              <CardHeader>
                <CardTitle className="text-black flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Booked Services
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {event.services.map((service, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg border border-neutral-200"
                    >
                      <div>
                        <p className="font-semibold text-black">{service.name}</p>
                        <p className="text-sm text-neutral-600">{service.serviceType}</p>
                      </div>
                      <p className="font-bold text-black">
                        {formatCurrency(service.finalPrice)}
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
          <Card className="border-2 border-black sticky top-8">
            <CardHeader>
              <CardTitle className="text-black">Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Subtotal</span>
                  <span className="font-medium text-black">
                    {formatCurrency(event.totalAmount * 0.82)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">GST (18%)</span>
                  <span className="font-medium text-black">
                    {formatCurrency(event.totalAmount * 0.18)}
                  </span>
                </div>
                <div className="border-t-2 border-black pt-3 flex justify-between font-bold text-lg">
                  <span className="text-black">Total Paid</span>
                  <span className="text-black">
                    {formatCurrency(event.totalAmount)}
                  </span>
                </div>
              </div>

              <div className="pt-4">
                <div className="flex items-center gap-2 text-sm text-green-600 mb-3">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Payment Completed</span>
                </div>
                <Button
                  variant="outline"
                  onClick={handleDownloadInvoice}
                  className="w-full border-black"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Invoice
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
