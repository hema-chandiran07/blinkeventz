"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Send, Mail, MessageSquare, Smartphone, Loader2, CheckCircle2, AlertCircle
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import api from "@/lib/api";

export default function ComposeMessagePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);

  const [formData, setFormData] = useState({
    to: searchParams.get("email") || "",
    subject: "",
    message: "",
    method: searchParams.get("method") || "email",
    channels: [searchParams.get("method") === "email" ? "EMAIL" : "IN_APP"],
  });

  // If userId is provided, fetch user details
  useEffect(() => {
    const uid = searchParams.get("userId");
    if (uid) {
      setUserId(parseInt(uid, 10));
      loadUserDetails(parseInt(uid, 10));
    }
  }, [searchParams]);

  const loadUserDetails = async (uid: number) => {
    try {
      setLoadingUser(true);
      const response = await api.get(`/users/${uid}`);
      if (response.data) {
        setFormData(prev => ({
          ...prev,
          to: response.data.email || prev.to,
        }));
      }
    } catch (error) {
      console.error("Failed to load user details:", error);
    } finally {
      setLoadingUser(false);
    }
  };

  // Real-time validation
  const validation = useMemo(() => {
    const errors: Record<string, string> = {};
    if (!formData.to.trim()) {
      errors.to = "Recipient is required";
    } else if (formData.method === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.to)) {
      errors.to = "Please enter a valid email address";
    } else if ((formData.method === "sms" || formData.method === "whatsapp") && !/^\+?[\d\s-]{10,}$/.test(formData.to)) {
      errors.to = "Please enter a valid phone number";
    }
    if (!formData.subject.trim()) {
      errors.subject = "Subject is required";
    } else if (formData.subject.trim().length < 3) {
      errors.subject = "Subject must be at least 3 characters";
    }
    if (!formData.message.trim()) {
      errors.message = "Message is required";
    } else if (formData.message.trim().length < 10) {
      errors.message = "Message must be at least 10 characters";
    }
    return errors;
  }, [formData.to, formData.subject, formData.message, formData.method]);

  const isValid = Object.keys(validation).length === 0;
  const hasContent = formData.to.trim() || formData.subject.trim() || formData.message.trim();

  // Send message via backend API
  const handleSend = useCallback(async () => {
    if (!isValid) {
      toast.error("Please fix the errors before sending");
      return;
    }

    setSending(true);
    try {
      // Determine channels based on method
      const channels = formData.method === "email" 
        ? ["IN_APP", "EMAIL"]  // Send both notification AND email
        : ["IN_APP"];  // Just in-app notification for other methods

      // Call the new compose endpoint
      if (userId) {
        // Use new endpoint with userId
        await api.post("/notifications/compose", {
          userId,
          title: formData.subject.trim(),
          message: formData.message.trim(),
          channels,
          priority: "NORMAL",
        });
      } else {
        // Fallback to old endpoint if no userId
        const channel = formData.method === "email" ? "EMAIL" : formData.method === "sms" ? "SMS" : "WHATSAPP";
        await api.post("/notifications/send", {
          type: "SYSTEM_ALERT",
          title: formData.subject.trim(),
          message: formData.message.trim(),
          channels: [channel],
          priority: "NORMAL",
          recipient: formData.to.trim(),
          targetAudience: "all",
        });
      }

      setSent(true);
      toast.success("Message sent successfully!", {
        description: formData.method === "email"
          ? "In-app notification created and email sent to recipient."
          : "In-app notification sent to recipient.",
        icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
      });

      // Redirect after showing success
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error: any) {
      console.error("Send error:", error);
      const errorMsg = error?.response?.data?.message;
      if (errorMsg) {
        toast.error(errorMsg);
      } else if (error?.code === "ERR_NETWORK") {
        toast.error("Cannot connect to server. Please ensure the backend is running.");
      } else {
        toast.error("Failed to send message. Please try again.");
      }
    } finally {
      setSending(false);
    }
  }, [isValid, formData, userId, router]);

  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  const getMethodIcon = () => {
    switch (formData.method) {
      case "email": return <Mail className="h-4 w-4" />;
      case "sms": return <MessageSquare className="h-4 w-4" />;
      case "whatsapp": return <Smartphone className="h-4 w-4" />;
      default: return <Mail className="h-4 w-4" />;
    }
  };

  const getMethodLabel = () => {
    switch (formData.method) {
      case "email": return "Email";
      case "sms": return "Phone";
      case "whatsapp": return "WhatsApp Number";
      default: return "Email";
    }
  };

  const getPlaceholder = () => {
    switch (formData.method) {
      case "email": return "email@example.com";
      case "sms": return "+91 XXXXXXXXXX";
      case "whatsapp": return "+91 XXXXXXXXXX";
      default: return "email@example.com";
    }
  };

  const getInputType = () => {
    return formData.method === "email" ? "email" : "tel";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleCancel} className="hover:bg-neutral-100">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-black">Compose Message</h1>
            <p className="text-neutral-600">
              {loadingUser 
                ? "Loading user details..." 
                : userId 
                  ? "Send message to user (notification + email)" 
                  : "Send a message to vendor, venue owner, or customer"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleCancel} className="border-black text-black" disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending || !isValid || loadingUser} className="bg-black hover:bg-neutral-800 text-white">
            {sent ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Sent!
              </>
            ) : sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Message
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Message Method Selection */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card
          className={`border-2 cursor-pointer transition-all ${formData.method === "email" ? "border-black bg-neutral-50" : "border-neutral-200"}`}
          onClick={() => setFormData({ ...formData, method: "email", channels: ["IN_APP", "EMAIL"] })}
        >
          <CardContent className="p-6 text-center">
            <Mail className="h-8 w-8 mx-auto mb-2 text-neutral-600" />
            <p className="font-semibold text-black">Email + Notification</p>
            <p className="text-xs text-neutral-500">Bell icon + email delivery</p>
          </CardContent>
        </Card>

        <Card
          className={`border-2 cursor-pointer transition-all ${formData.method === "sms" ? "border-black bg-neutral-50" : "border-neutral-200"}`}
          onClick={() => setFormData({ ...formData, method: "sms", channels: ["IN_APP"] })}
        >
          <CardContent className="p-6 text-center">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 text-neutral-600" />
            <p className="font-semibold text-black">In-App Only</p>
            <p className="text-xs text-neutral-500">Notification bell only</p>
          </CardContent>
        </Card>

        <Card
          className={`border-2 cursor-pointer transition-all ${formData.method === "whatsapp" ? "border-black bg-neutral-50" : "border-neutral-200"}`}
          onClick={() => setFormData({ ...formData, method: "whatsapp", channels: ["IN_APP"] })}
        >
          <CardContent className="p-6 text-center">
            <Smartphone className="h-8 w-8 mx-auto mb-2 text-neutral-600" />
            <p className="font-semibold text-black">In-App Only</p>
            <p className="text-xs text-neutral-500">Notification bell only</p>
          </CardContent>
        </Card>
      </div>

      {/* Compose Form */}
      <Card className="border-2 border-black bg-white">
        <CardHeader>
          <CardTitle className="text-black">Message Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="to" className="text-black">
              Recipient {getMethodLabel()} *
            </Label>
            <div className="relative">
              <Input
                id="to"
                value={formData.to}
                onChange={(e) => setFormData({ ...formData, to: e.target.value })}
                placeholder={getPlaceholder()}
                type={getInputType()}
                disabled={loadingUser || !!userId}
                className={`bg-white text-black border-neutral-300 ${validation.to ? "border-red-300" : ""}`}
              />
              {loadingUser && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-neutral-400" />
              )}
              {validation.to && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {validation.to}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject" className="text-black">Subject *</Label>
            <div className="relative">
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Enter message subject"
                className={`bg-white text-black border-neutral-300 ${validation.subject ? "border-red-300" : ""}`}
              />
              {validation.subject && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {validation.subject}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message" className="text-black">Message *</Label>
            <div className="relative">
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Type your message here..."
                rows={10}
                className={`resize-none bg-white text-black border-neutral-300 ${validation.message ? "border-red-300" : ""}`}
              />
              {validation.message && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {validation.message}
                </p>
              )}
              {formData.message.trim() && (
                <p className="text-xs text-neutral-500 mt-1 text-right">
                  {formData.message.trim().length} characters
                </p>
              )}
            </div>
          </div>

          {/* Live Message Preview */}
          <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
            <div className="flex items-center gap-2 mb-2">
              {getMethodIcon()}
              <p className="text-sm font-semibold text-black">Message Preview:</p>
            </div>
            <div className="text-sm text-neutral-700">
              <p className="font-semibold text-black">{formData.subject || "(No subject)"}</p>
              <p className="mt-2 whitespace-pre-wrap">{formData.message || "(Your message will appear here)"}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
