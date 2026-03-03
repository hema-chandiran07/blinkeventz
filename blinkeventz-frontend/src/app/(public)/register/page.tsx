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
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
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
    color: "from-orange-500 to-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
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
    color: "from-emerald-500 to-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
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
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-silver-50 via-white to-silver-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-silver-800/50 to-silver-700/50 backdrop-blur-md border border-silver-600/30 text-white text-sm font-medium mb-6 shadow-lg shadow-black/20">
            <Sparkles className="h-4 w-4 text-silver-300" />
            Join NearZro Today
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-black mb-4">
            Choose Your Journey
          </h1>
          <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
            Whether you're planning an event, offering services, or managing a venue -
            we have the perfect tools for you.
          </p>
        </div>

        {/* Why Choose Us */}
        <div className="grid sm:grid-cols-3 gap-6 mb-12">
          <div className="flex flex-col items-center text-center p-6">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-black mb-2">Verified & Trusted</h3>
            <p className="text-sm text-neutral-600">All vendors and venues are verified for quality assurance</p>
          </div>
          <div className="flex flex-col items-center text-center p-6">
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-black mb-2">Grow Your Business</h3>
            <p className="text-sm text-neutral-600">Reach thousands of customers and grow your revenue</p>
          </div>
          <div className="flex flex-col items-center text-center p-6">
            <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center mb-4">
              <Heart className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-black mb-2">Plan with Love</h3>
            <p className="text-sm text-neutral-600">Create memorable events with our comprehensive tools</p>
          </div>
        </div>

        {/* Role Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <Card 
                key={role.id}
                className={`group relative overflow-hidden border-2 ${role.borderColor} hover:shadow-2xl transition-all duration-300 hover:-translate-y-2`}
              >
                <CardHeader className="text-center pb-2">
                  <div className={`inline-flex h-20 w-20 rounded-2xl ${role.bgColor} items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`h-10 w-10 bg-gradient-to-br ${role.color} bg-clip-text text-transparent`} style={{ WebkitTextFillColor: 'transparent' }} />
                  </div>
                  <CardTitle className="text-2xl font-bold text-black">{role.title}</CardTitle>
                  <CardDescription className="text-neutral-600">
                    {role.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {role.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3 text-sm text-neutral-700">
                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href={role.href} className="block mt-6">
                    <Button 
                      variant="premium" 
                      className="w-full h-12 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105"
                    >
                      {role.cta}
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <p className="text-xs text-center text-neutral-500">
                    Free to get started
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Already have an account */}
        <div className="text-center mt-12">
          <p className="text-neutral-600">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-neutral-900 hover:underline">
              Sign in here
            </Link>
          </p>
        </div>

        {/* Trust Badges */}
        <div className="mt-16 pt-8 border-t border-neutral-200">
          <p className="text-center text-sm text-neutral-500 mb-6">
            Trusted by 10,000+ customers, vendors, and venue owners across India
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8">
            <div className="flex items-center gap-2 text-neutral-600">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-sm">Secure & Encrypted</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-600">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-sm">Verified Profiles</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-600">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-sm">24/7 Support</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-600">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-sm">Free to Start</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
