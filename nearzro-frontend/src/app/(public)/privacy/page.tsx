"use client";

import Link from "next/link";
import { ArrowLeft, Shield, Lock, Eye, CheckCircle, FileText } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black py-20 px-4 md:px-8 max-w-4xl mx-auto">
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

      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-300 text-sm font-medium mb-6">
          <Lock className="h-4 w-4" />
          Privacy & Security
        </div>
        <h1 className="text-chrome-gradient text-4xl md:text-5xl font-bold text-center mb-4">
          Privacy Policy
        </h1>
        <p className="text-silver-400 text-center">Last updated: April 14, 2026</p>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Section 1: Introduction */}
        <div className="glass-dark-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
            <Shield className="h-5 w-5 text-zinc-300" />
            1. Introduction
          </h2>
          <p className="text-silver-400 leading-relaxed">
            At NearZro, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, 
            and safeguard your information when you use our AI-powered event management platform. Your trust is 
            fundamental to our mission of creating seamless event planning experiences.
          </p>
        </div>

        {/* Section 2: Information We Collect */}
        <div className="glass-dark-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
            <Eye className="h-5 w-5 text-zinc-300" />
            2. Information We Collect
          </h2>
          
          <h3 className="text-lg font-semibold text-white mt-4 mb-2">Personal Information</h3>
          <ul className="list-disc list-inside space-y-2 text-silver-400 ml-2 mb-4">
            <li>Name and contact information (email, phone number)</li>
            <li>Account credentials (username, password - encrypted)</li>
            <li>Profile information and event preferences</li>
            <li>Payment information (processed securely via Stripe)</li>
            <li>Event details, guest lists, and dietary requirements</li>
          </ul>

          <h3 className="text-lg font-semibold text-white mt-6 mb-2">Automatically Collected Information</h3>
          <ul className="list-disc list-inside space-y-2 text-silver-400 ml-2">
            <li>Device information, IP address, and browser metadata</li>
            <li>Usage analytics and engagement patterns</li>
            <li>Cookies and similar tracking technologies</li>
          </ul>
        </div>

        {/* Section 3: How We Use Your Data */}
        <div className="glass-dark-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
            <FileText className="h-5 w-5 text-zinc-300" />
            3. How We Use Your Data
          </h2>
          <p className="text-silver-400 leading-relaxed mb-4">We use your information to:</p>
          <ul className="list-disc list-inside space-y-2 text-silver-400 ml-2">
            <li>Power our AI event planning assistant ("Event Brain")</li>
            <li>Process venue and vendor bookings seamlessly</li>
            <li>Match you with curated venues and vendors</li>
            <li>Send booking confirmations and important updates</li>
            <li>Improve our services through analytics and feedback</li>
            <li>Detect fraud and ensure platform security</li>
          </ul>
        </div>

        {/* Section 4: Data Security */}
        <div className="glass-dark-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
            <Lock className="h-5 w-5 text-zinc-300" />
            4. Data Security
          </h2>
          <p className="text-silver-400 leading-relaxed">
            We implement industry-leading security measures to protect your data. All sensitive information is encrypted 
            in transit and at rest using AES-256 encryption. Payment processing is handled exclusively through Stripe, 
            which is PCI-DSS Level 1 certified. We conduct regular security audits and penetration testing to maintain 
            the highest protection standards.
          </p>
        </div>

        {/* Section 5: Your Rights */}
        <div className="glass-dark-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-zinc-300" />
            5. Your Privacy Rights
          </h2>
          <p className="text-silver-400 leading-relaxed mb-4">You have the right to:</p>
          <ul className="list-disc list-inside space-y-2 text-silver-400 ml-2">
            <li>Access your personal data stored on our platform</li>
            <li>Correct inaccurate or outdated information</li>
            <li>Request deletion of your personal data</li>
            <li>Opt-out of marketing communications</li>
            <li>Export your data in a portable format (JSON/CSV)</li>
            <li>Withdraw consent for data processing at any time</li>
          </ul>
        </div>

        {/* Section 6: Contact */}
        <div className="glass-dark-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">6. Contact Us</h2>
          <p className="text-silver-400 leading-relaxed mb-4">
            For privacy-related questions or to exercise your rights, please contact our Data Protection Team:
          </p>
          <p className="text-silver-400">
            Email: <a href="mailto:privacy@nearzro.com" className="text-white hover:underline">privacy@nearzro.com</a><br />
            Phone: +91 98765 43210<br />
            Address: NearZro Technologies Pvt Ltd, Bangalore, Karnataka, India
          </p>
        </div>
      </div>
    </div>
  );
}