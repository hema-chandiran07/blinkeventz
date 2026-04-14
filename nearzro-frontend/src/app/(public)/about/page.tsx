"use client";

import Link from "next/link";
import { ArrowLeft, Target, Heart, Zap, Users, Award } from "lucide-react";

export default function AboutPage() {
  const values = [
    {
      icon: Heart,
      title: "Customer First",
      description: "Every decision we make is guided by what's best for our users — event planners, venue owners, and vendors alike.",
    },
    {
      icon: Zap,
      title: "Innovation at Scale",
      description: "We leverage cutting-edge AI and automation to simplify complex event planning workflows.",
    },
    {
      icon: Users,
      title: "Community Driven",
      description: "Building connections between people is at the heart of everything we do. We empower local businesses.",
    },
    {
      icon: Award,
      title: "Excellence Always",
      description: "From UI polish to backend reliability, we hold ourselves to the highest standards in every detail.",
    },
  ];

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
          About NearZro
        </h1>
        <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
          We're building the future of event planning — one seamless experience at a time.
        </p>
      </div>

      {/* Mission Statement */}
      <div className="glass-dark-card p-8 text-center mb-16">
        <Target className="h-12 w-12 text-zinc-300 mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-white mb-4">Our Mission</h2>
        <p className="text-lg text-zinc-300 leading-relaxed max-w-3xl mx-auto">
          NearZro exists to eliminate the friction in event planning. We connect dreamers with the perfect venues, 
          talented vendors, and AI-powered tools — creating memorable occasions without the chaos.
        </p>
      </div>

      {/* Our Values */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-chrome-gradient text-center mb-10">Our Values</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {values.map((value, index) => (
            <div key={index} className="glass-dark-card p-6 hover:translate-y-[-2px] transition-transform">
              <value.icon className="h-8 w-8 text-zinc-300 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">{value.title}</h3>
              <p className="text-zinc-400">{value.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { number: "500+", label: "Venues" },
          { number: "1,200+", label: "Vendors" },
          { number: "10K+", label: "Events Planned" },
          { number: "50K+", label: "Happy Users" },
        ].map((stat, index) => (
          <div key={index} className="glass-dark-card p-6 text-center">
            <div className="text-3xl font-bold text-chrome-gradient mb-1">{stat.number}</div>
            <div className="text-sm text-zinc-400">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}