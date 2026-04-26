"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Mail, Phone, MapPin, Send } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    try {
      const response = await fetch(`${API_BASE_URL}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to send");

      setStatus("success");
      setFormData({ name: "", email: "", message: "" });
    } catch (error) {
      console.error("Contact form error:", error);
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-black py-20 px-4 md:px-8 max-w-7xl mx-auto">
      {/* Logo & Back */}
      <div className="flex items-center gap-4 mb-12">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <div className="relative h-10 w-10 overflow-hidden rounded-lg">
          <img src="/logo.jpeg" alt="NearZro Logo" className="h-full w-full object-cover" />
        </div>
      </div>

      {/* Hero */}
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-6xl font-bold text-chrome-gradient mb-4">
          Get in Touch
        </h1>
        <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
          Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
        </p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left Column - Contact Info */}
        <div className="glass-dark-card p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Contact Information</h2>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0">
                <Mail className="h-5 w-5 text-zinc-300" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Email</h3>
                <a href="mailto:hello@nearzro.com" className="text-zinc-400 hover:text-white transition-colors">
                  hello@nearzro.com
                </a>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0">
                <Phone className="h-5 w-5 text-zinc-300" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Phone</h3>
                <a href="tel:+919876543210" className="text-zinc-400 hover:text-white transition-colors">
                  +91 98765 43210
                </a>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0">
                <MapPin className="h-5 w-5 text-zinc-300" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Address</h3>
                <p className="text-zinc-400">
                  NearZro Technologies Pvt Ltd<br />
                  Bangalore, Karnataka<br />
                  India - 560001
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Contact Form */}
        <div className="glass-dark-card p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Send us a Message</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-zinc-300 mb-2">
                Your Name
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                required
                className="glass-dark-subtle w-full p-3 rounded-xl focus-within:border-white transition-all outline-none text-white placeholder:text-zinc-600"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="john@example.com"
                required
                className="glass-dark-subtle w-full p-3 rounded-xl focus-within:border-white transition-all outline-none text-white placeholder:text-zinc-600"
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-zinc-300 mb-2">
                Message
              </label>
              <textarea
                id="message"
                value={formData.message}
                onChange={handleChange}
                rows={5}
                placeholder="How can we help you?"
                required
                className="glass-dark-subtle w-full p-3 rounded-xl focus-within:border-white transition-all outline-none text-white placeholder:text-zinc-600 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={status === "loading"}
              className="btn-premium w-full py-3 rounded-xl text-black-important font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
              {status === "loading" ? "Sending..." : "Send Message"}
            </button>

            {status === "success" && (
              <p className="text-green-400 mt-4 text-sm text-center">
                Thanks for reaching out! We will get back to you soon.
              </p>
            )}
            {status === "error" && (
              <p className="text-red-400 mt-4 text-sm text-center">
                Failed to send message. Please try again.
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}