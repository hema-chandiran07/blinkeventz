"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  User,
  Store,
  Building2,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Heart,
  TrendingUp,
  Shield
} from "lucide-react";

const roles = [
  {
    id: "customer",
    title: "Customer",
    description: "Plan your dream events with ease",
    icon: User,
    features: [
      "Browse & compare venues",
      "Find verified vendors",
      "Manage event bookings",
      "Track payments & budgets",
      "Get AI-powered event plans"
    ],
    cta: "Sign up as Customer",
    href: "/register/customer"
  },
  {
    id: "vendor",
    title: "Vendor",
    description: "Grow your event services business",
    icon: Store,
    features: [
      "List your services",
      "Manage bookings & calendar",
      "Connect with customers",
      "Track earnings & analytics",
      "Get verified badge"
    ],
    cta: "Sign up as Vendor",
    href: "/register/vendor"
  },
  {
    id: "venue-owner",
    title: "Venue Owner",
    description: "Showcase your event spaces",
    icon: Building2,
    features: [
      "List multiple venues",
      "Manage availability calendar",
      "Handle bookings & inquiries",
      "Dynamic pricing tools",
      "Analytics dashboard"
    ],
    cta: "Sign up as Venue Owner",
    href: "/register/venue-owner"
  }
];

export default function RegisterPage() {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden py-12 px-4 sm:px-6 lg:px-8">
      {/* Dynamic Fluid Mercury/Chrome Texture Background - Matching Home Page */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-black to-zinc-800" />
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_30%,rgba(192,192,192,0.4),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_70%,rgba(163,163,163,0.3),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(229,229,229,0.2),transparent_60%)]" />
        </div>
        {/* Background overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-600/10 to-transparent" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-zinc-800/50 to-zinc-700/50 backdrop-blur-md border border-white/10 text-white text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4 text-zinc-300" />
            Join NearZro Today
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Choose Your Journey
          </h1>
          <p className="text-xl text-zinc-300 max-w-2xl mx-auto">
            Whether you're planning an event, offering services, or managing a venue -
            we have the perfect tools for you.
          </p>
        </div>

        {/* Why Choose Us */}
        <div className="grid sm:grid-cols-3 gap-6 mb-12">
          <div className="flex flex-col items-center text-center p-6">
            <div className="h-12 w-12 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-zinc-200" />
            </div>
            <h3 className="font-semibold text-white mb-2">Verified & Trusted</h3>
            <p className="text-sm text-zinc-400">All vendors and venues are verified for quality assurance</p>
          </div>
          <div className="flex flex-col items-center text-center p-6">
            <div className="h-12 w-12 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center mb-4">
              <TrendingUp className="h-6 w-6 text-zinc-200" />
            </div>
            <h3 className="font-semibold text-white mb-2">Grow Your Business</h3>
            <p className="text-sm text-zinc-400">Reach thousands of customers and grow your revenue</p>
          </div>
          <div className="flex flex-col items-center text-center p-6">
            <div className="h-12 w-12 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center mb-4">
              <Heart className="h-6 w-6 text-zinc-200" />
            </div>
            <h3 className="font-semibold text-white mb-2">Plan with Love</h3>
            <p className="text-sm text-zinc-400">Create memorable events with our comprehensive tools</p>
          </div>
        </div>

        {/* Role Cards - CRED-style premium glass cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <Card
                key={role.id}
                className="group relative flex flex-col bg-silver-950/95 backdrop-blur-xl border border-silver-800 rounded-2xl transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_15px_30px_-10px_rgba(163,163,163,0.08)] cursor-pointer overflow-hidden"
              >
                {/* Subtle gradient spotlight overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                <CardHeader className="text-center pb-2 relative">
                  {/* Premium glass icon container with glow on hover */}
                  <div className="h-12 w-12 rounded-full bg-silver-900/80 border border-silver-700/30 flex items-center justify-center mx-auto mb-5 relative group-hover:border-silver-600/60 group-hover:bg-silver-800/80 transition-all duration-400">
                    <Icon className="h-5 w-5 text-silver-300 transition-colors duration-300 group-hover:text-white" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-silver-100 mb-2 group-hover:text-white transition-colors duration-300 tracking-tight">{role.title}</CardTitle>
                  <CardDescription className="text-silver-500 group-hover:text-silver-400 transition-colors duration-300">
                    {role.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 relative">
                  <ul className="space-y-3">
                    {role.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3 text-sm text-silver-500 group-hover:text-silver-400 transition-colors duration-300">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500/60 flex-shrink-0 mt-0.5 group-hover:text-emerald-500/80 transition-colors duration-300" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href={role.href} className="block mt-6">
                    <Button
                      className="w-full py-3.5 rounded-xl text-silver-300 font-semibold flex items-center justify-center gap-2 border transition-all duration-300 ease-out cursor-pointer overflow-hidden bg-silver-950 border-silver-700/50 hover:bg-white/10 hover:text-white hover:border-silver-400 group/btn"
                    >
                      {role.cta}
                      <ArrowRight className="ml-2 h-5 w-5 group-hover/btn:translate-x-1 transition-transform duration-300" />
                    </Button>
                  </Link>
                  <p className="text-xs text-center text-silver-600 group-hover:text-silver-500 transition-colors duration-300">
                    Free to get started
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Already have an account */}
        <div className="text-center mt-12">
          <p className="text-zinc-400">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-white transition-all duration-300 ease-in-out hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.4)] underline underline-offset-4 decoration-white/30 hover:decoration-white"
            >
              Sign in here
            </Link>
          </p>
        </div>

        {/* Trust Badges */}
        <div className="mt-16 pt-8 border-t border-white/10">
          <p className="text-center text-sm text-zinc-400 mb-6">
            Trusted by 10,000+ customers, vendors, and venue owners across India
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8">
            <div className="flex items-center gap-2 text-zinc-400">
              <CheckCircle2 className="h-5 w-5 text-emerald-500/80" />
              <span className="text-sm">Secure & Encrypted</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <CheckCircle2 className="h-5 w-5 text-emerald-500/80" />
              <span className="text-sm">Verified Profiles</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <CheckCircle2 className="h-5 w-5 text-emerald-500/80" />
              <span className="text-sm">24/7 Support</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <CheckCircle2 className="h-5 w-5 text-emerald-500/80" />
              <span className="text-sm">Free to Start</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
