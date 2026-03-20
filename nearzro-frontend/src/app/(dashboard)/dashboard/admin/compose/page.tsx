"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Send, Mail, MessageSquare, Smartphone
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useApiToast } from "@/components/ui/toast-provider";

export default function ComposeMessagePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { withLoadingToast } = useApiToast();
  const [sending, setSending] = useState(false);

  const [formData, setFormData] = useState({
    to: searchParams.get("email") || "",
    subject: "",
    message: "",
    method: searchParams.get("method") || "email", // email, sms, whatsapp
  });

  const handleSend = async () => {
    if (!formData.to || !formData.subject || !formData.message) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSending(true);
    try {
      // In production, this would call your email/SMS API
      // For now, we'll use mailto/sms: links as fallback
      
      if (formData.method === "email") {
        const mailtoLink = `mailto:${formData.to}?subject=${encodeURIComponent(formData.subject)}&body=${encodeURIComponent(formData.message)}`;
        window.open(mailtoLink, '_blank');
        toast.success("Email client opened");
      } else if (formData.method === "sms") {
        const smsLink = `sms:${formData.to}?body=${encodeURIComponent(formData.message)}`;
        window.open(smsLink, '_blank');
        toast.success("SMS app opened");
      } else if (formData.method === "whatsapp") {
        const whatsappLink = `https://wa.me/${formData.to}?text=${encodeURIComponent(formData.message)}`;
        window.open(whatsappLink, '_blank');
        toast.success("WhatsApp opened");
      }
      
      // Log the message (in production, save to database)
      console.log("Message sent:", formData);
      
      setTimeout(() => {
        router.back();
      }, 1000);
    } catch (error: any) {
      console.error("Send error:", error);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleCancel = () => {
    router.back();
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
            <p className="text-neutral-600">Send a message to vendor, venue owner, or customer</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleCancel} className="border-black">
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending} className="bg-black hover:bg-neutral-800">
            <Send className="h-4 w-4 mr-2" /> {sending ? "Sending..." : "Send Message"}
          </Button>
        </div>
      </div>

      {/* Message Method Selection */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card 
          className={`border-2 cursor-pointer transition-all ${formData.method === "email" ? "border-black bg-neutral-50" : "border-neutral-200"}`}
          onClick={() => setFormData({ ...formData, method: "email" })}
        >
          <CardContent className="p-6 text-center">
            <Mail className="h-8 w-8 mx-auto mb-2 text-neutral-600" />
            <p className="font-semibold">Email</p>
            <p className="text-xs text-neutral-500">Professional & detailed</p>
          </CardContent>
        </Card>

        <Card 
          className={`border-2 cursor-pointer transition-all ${formData.method === "sms" ? "border-black bg-neutral-50" : "border-neutral-200"}`}
          onClick={() => setFormData({ ...formData, method: "sms" })}
        >
          <CardContent className="p-6 text-center">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 text-neutral-600" />
            <p className="font-semibold">SMS</p>
            <p className="text-xs text-neutral-500">Quick & direct</p>
          </CardContent>
        </Card>

        <Card 
          className={`border-2 cursor-pointer transition-all ${formData.method === "whatsapp" ? "border-black bg-neutral-50" : "border-neutral-200"}`}
          onClick={() => setFormData({ ...formData, method: "whatsapp" })}
        >
          <CardContent className="p-6 text-center">
            <Smartphone className="h-8 w-8 mx-auto mb-2 text-neutral-600" />
            <p className="font-semibold">WhatsApp</p>
            <p className="text-xs text-neutral-500">Instant messaging</p>
          </CardContent>
        </Card>
      </div>

      {/* Compose Form */}
      <Card className="border-2 border-black">
        <CardHeader>
          <CardTitle className="text-black">Message Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="to">
              Recipient {formData.method === "email" ? "Email" : formData.method === "sms" ? "Phone" : "WhatsApp Number"} *
            </Label>
            <Input
              id="to"
              value={formData.to}
              onChange={(e) => setFormData({ ...formData, to: e.target.value })}
              placeholder={formData.method === "email" ? "email@example.com" : "+91 XXXXXXXXXX"}
              type={formData.method === "email" ? "email" : "tel"}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Enter message subject"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Type your message here..."
              rows={10}
              className="resize-none"
            />
          </div>

          <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
            <p className="text-sm font-semibold text-neutral-700 mb-2">Message Preview:</p>
            <div className="text-sm text-neutral-600">
              <p className="font-semibold">{formData.subject || "(No subject)"}</p>
              <p className="mt-2 whitespace-pre-wrap">{formData.message || "(Your message will appear here)"}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
