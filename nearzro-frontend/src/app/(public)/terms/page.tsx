"use client";

import Link from "next/link";
import { ArrowLeft, Shield, FileText, CheckCircle } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Logo & Back Button */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-black transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div className="relative h-12 w-12 overflow-hidden rounded-lg shadow-lg">
            <img
              src="/logo.jpeg"
              alt="NearZro Logo"
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-gradient-to-r from-silver-200 to-silver-300 text-black text-sm font-medium mb-6 shadow-md">
            <FileText className="h-4 w-4" />
            Legal Document
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-black mb-4">
            Terms of Service
          </h1>
          <p className="text-xl text-neutral-600">
            Last updated: February 27, 2026
          </p>
        </div>

        {/* Content */}
        <div className="space-y-8">
          <div className="bg-gradient-to-br from-silver-50 to-white rounded-2xl p-8 border-2 border-silver-200 shadow-lg">
            <h2 className="text-2xl font-bold text-black mb-4 flex items-center gap-2">
              <Shield className="h-6 w-6 text-black" />
              1. Acceptance of Terms
            </h2>
            <p className="text-black leading-relaxed">
              By accessing and using NearZro, you accept and agree to be bound by the terms and provision of this agreement.
              If you do not agree to abide by these terms, please do not use this service.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 border-2 border-silver-200 shadow-lg">
            <h2 className="text-2xl font-bold text-black mb-4">2. Services</h2>
            <p className="text-black leading-relaxed mb-4">
              NearZro provides an event management platform that connects customers with venues and vendors. Our services include:
            </p>
            <ul className="list-disc list-inside space-y-2 text-black ml-4">
              <li>Venue discovery and booking</li>
              <li>Vendor discovery and booking</li>
              <li>Event planning tools</li>
              <li>AI-powered event planning</li>
              <li>Payment processing</li>
              <li>Event management dashboard</li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl p-8 border-2 border-silver-200 shadow-lg">
            <h2 className="text-2xl font-bold text-black mb-4">3. User Accounts</h2>
            <p className="text-black leading-relaxed mb-4">
              To use our services, you must create an account. You agree to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-black ml-4">
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account</li>
              <li>Notify us immediately of any unauthorized access</li>
              <li>Be at least 18 years of age</li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-silver-50 to-white rounded-2xl p-8 border-2 border-silver-200 shadow-lg">
            <h2 className="text-2xl font-bold text-black mb-4 flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-black" />
              4. User Responsibilities
            </h2>
            <p className="text-black leading-relaxed">
              You are responsible for all activities that occur under your account. You agree not to use NearZro for any
              unlawful purpose or to solicit others to perform or participate in any unlawful acts.
            </p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-black mb-4">5. Payments and Fees</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">
              All payments are processed securely through our payment gateway. We reserve the right to modify our fee structure 
              at any time with prior notice. Refund policies are determined by individual venues and vendors.
            </p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-black mb-4">6. Cancellation Policy</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">
              Cancellation policies vary by venue and vendor. Please review the specific cancellation terms before making a booking. 
              NearZro acts as an intermediary and is not liable for cancellation disputes.
            </p>
          </div>

          <div className="bg-neutral-50 rounded-2xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-black mb-4">7. Limitation of Liability</h2>
            <p className="text-neutral-700 leading-relaxed">
              NearZro is not liable for any indirect, incidental, special, consequential, or punitive damages resulting from 
              your use or inability to use the service, unauthorized access to your data, or any other matter relating to our services.
            </p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-black mb-4">8. Modifications to Service</h2>
            <p className="text-neutral-700 leading-relaxed">
              We reserve the right to modify or discontinue, temporarily or permanently, the service with or without notice. 
              We will not be liable to you or any third party for any modification, suspension, or discontinuance of the service.
            </p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-black mb-4">9. Governing Law</h2>
            <p className="text-neutral-700 leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict 
              of law provisions.
            </p>
          </div>

          <div className="bg-neutral-50 rounded-2xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-black mb-4">10. Contact Information</h2>
            <p className="text-neutral-700 leading-relaxed mb-2">
              For questions about these Terms of Service, please contact us:
            </p>
            <p className="text-neutral-700">
              Email: legal@NearZro.com<br />
              Phone: +91-XXX-XXX-XXXX<br />
              Address: Chennai, Tamil Nadu, India
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
