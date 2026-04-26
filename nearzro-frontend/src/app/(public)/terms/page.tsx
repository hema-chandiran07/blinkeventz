"use client";

import Link from "next/link";
import { ArrowLeft, Shield, FileText, CheckCircle, Gavel, CreditCard, AlertCircle } from "lucide-react";

export default function TermsPage() {
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
          <FileText className="h-4 w-4" />
          Legal Document
        </div>
        <h1 className="text-chrome-gradient text-4xl md:text-5xl font-bold text-center mb-4">
          Terms of Service
        </h1>
        <p className="text-silver-400 text-center">Last updated: April 14, 2026</p>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Section 1: Acceptance */}
        <div className="glass-dark-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
            <Shield className="h-5 w-5 text-zinc-300" />
            1. Acceptance of Terms
          </h2>
          <p className="text-silver-400 leading-relaxed">
            By accessing and using NearZro, you accept and agree to be bound by the terms and provisions of this agreement. 
            If you do not agree to abide by these terms, please do not use our platform. These Terms of Service constitute 
            a legally binding contract between you and NearZro Technologies Pvt Ltd.
          </p>
        </div>

        {/* Section 2: Our Services */}
        <div className="glass-dark-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
            <FileText className="h-5 w-5 text-zinc-300" />
            2. Our Services
          </h2>
          <p className="text-silver-400 leading-relaxed mb-4">
            NearZro provides an AI-powered event management platform that connects customers with venues and vendors. 
            Our services include:
          </p>
          <ul className="list-disc list-inside space-y-2 text-silver-400 ml-2">
            <li>AI-driven event planning assistance ("Event Brain")</li>
            <li>Venue discovery, browsing, and booking</li>
            <li>Vendor discovery and service booking</li>
            <li>Secure payment processing via Stripe</li>
            <li>Event management dashboard for organizers</li>
            <li>Shareable event plans and timelines</li>
          </ul>
        </div>

        {/* Section 3: User Accounts */}
        <div className="glass-dark-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-zinc-300" />
            3. User Accounts & Responsibilities
          </h2>
          <p className="text-silver-400 leading-relaxed mb-4">
            To access our services, you must create an account. You agree to:
          </p>
          <ul className="list-disc list-inside space-y-2 text-silver-400 ml-2 mb-4">
            <li>Provide accurate and complete registration information</li>
            <li>Maintain the security of your account credentials</li>
            <li>Notify us immediately of any unauthorized access</li>
            <li>Be at least 18 years of age to create an account</li>
          </ul>
          <p className="text-silver-400 leading-relaxed">
            <strong className="text-white">Vendor KYC:</strong> Venue owners and vendors must complete identity verification 
            (KYC) before listing properties or services on our platform.
          </p>
        </div>

        {/* Section 4: Payments */}
        <div className="glass-dark-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-zinc-300" />
            4. Payments & Refunds
          </h2>
          <p className="text-silver-400 leading-relaxed mb-4">
            All payments are processed securely through our integrated payment gateway (Stripe). We reserve the right to 
            modify our platform fee structure at any time with prior notice.
          </p>
          <p className="text-silver-400 leading-relaxed mb-4">
            <strong className="text-white">Refund Policy:</strong> Cancellation and refund terms vary by venue and vendor. 
            Please review the specific cancellation policy before making a booking. NearZro acts as an intermediary 
            platform and facilitates transactions between customers and service providers.
          </p>
        </div>

        {/* Section 5: Limitation of Liability */}
        <div className="glass-dark-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-zinc-300" />
            5. Limitation of Liability
          </h2>
          <p className="text-silver-400 leading-relaxed">
            NearZro is not liable for any indirect, incidental, special, consequential, or punitive damages resulting from 
            your use or inability to use the service, unauthorized access to your data, or any other matter relating to our services. 
            Our total liability shall not exceed the amount paid by you for the specific transaction in question. 
            This limitation applies regardless of the theory of liability, whether in contract, tort, or otherwise.
          </p>
        </div>

        {/* Section 6: Modifications */}
        <div className="glass-dark-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
            <Gavel className="h-5 w-5 text-zinc-300" />
            6. Modifications to Service
          </h2>
          <p className="text-silver-400 leading-relaxed">
            We reserve the right to modify or discontinue, temporarily or permanently, the service with or without notice. 
            We will not be liable to you or any third party for any modification, suspension, or discontinuance of the service. 
            Any material changes will be communicated via email or platform notification.
          </p>
        </div>

        {/* Section 7: Governing Law */}
        <div className="glass-dark-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">7. Governing Law</h2>
          <p className="text-silver-400 leading-relaxed">
            These Terms shall be governed by and construed in accordance with the laws of India, specifically the laws 
            of Karnataka, without regard to its conflict of law provisions. Any disputes arising from these terms 
            will be subject to the exclusive jurisdiction of the courts in Bangalore, Karnataka.
          </p>
        </div>

        {/* Section 8: Contact */}
        <div className="glass-dark-card p-6 md:p-8 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">8. Contact Information</h2>
          <p className="text-silver-400 leading-relaxed mb-4">
            For questions about these Terms of Service, please contact us:
          </p>
          <p className="text-silver-400">
            Email: <a href="mailto:legal@nearzro.com" className="text-white hover:underline">legal@nearzro.com</a><br />
            Phone: +91 98765 43210<br />
            Address: NearZro Technologies Pvt Ltd, Bangalore, Karnataka, India
          </p>
        </div>
      </div>
    </div>
  );
}