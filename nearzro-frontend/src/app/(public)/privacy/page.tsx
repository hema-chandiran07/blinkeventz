"use client";

import Link from "next/link";
import { ArrowLeft, Shield, Lock, Eye, CheckCircle } from "lucide-react";

export default function PrivacyPage() {
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
            <Lock className="h-4 w-4" />
            Privacy & Security
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-black mb-4">
            Privacy Policy
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
              1. Introduction
            </h2>
            <p className="text-black leading-relaxed">
              At NearZro, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose,
              and safeguard your information when you use our event management platform.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 border-2 border-silver-200 shadow-lg">
            <h2 className="text-2xl font-bold text-black mb-4">2. Information We Collect</h2>

            <h3 className="text-lg font-semibold text-black mt-6 mb-2">Personal Information</h3>
            <ul className="list-disc list-inside space-y-2 text-black ml-4 mb-4">
              <li>Name and contact information (email, phone number)</li>
              <li>Account credentials (username, password)</li>
              <li>Profile information and preferences</li>
              <li>Payment information (processed securely by third parties)</li>
              <li>Event details and requirements</li>
            </ul>

            <h3 className="text-lg font-semibold text-black mt-6 mb-2">Automatically Collected Information</h3>
            <ul className="list-disc list-inside space-y-2 text-black ml-4">
              <li>Device information and IP address</li>
              <li>Browser type and operating system</li>
              <li>Usage data and browsing patterns</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-silver-50 to-white rounded-2xl p-8 border-2 border-silver-200 shadow-lg">
            <h2 className="text-2xl font-bold text-black mb-4 flex items-center gap-2">
              <Eye className="h-6 w-6 text-black" />
              3. How We Use Your Information
            </h2>
            <p className="text-black leading-relaxed mb-4">We use your information to:</p>
            <ul className="list-disc list-inside space-y-2 text-black ml-4">
              <li>Provide, maintain, and improve our services</li>
              <li>Process your transactions and bookings</li>
              <li>Send you technical notices and support messages</li>
              <li>Respond to your comments and questions</li>
              <li>Develop new features and services</li>
              <li>Protect against fraud and abuse</li>
            </ul>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-black mb-4">4. Information Sharing</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">
              We do not sell your personal information. We may share your information with:
            </p>
            <ul className="list-disc list-inside space-y-2 text-neutral-700 ml-4">
              <li><strong>Venues and Vendors:</strong> When you make a booking, relevant information is shared to fulfill your reservation</li>
              <li><strong>Service Providers:</strong> Third-party vendors who perform services on our behalf (payment processing, hosting, etc.)</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
            </ul>
          </div>

          <div className="bg-neutral-50 rounded-2xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-black mb-4 flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-neutral-900" />
              5. Data Security
            </h2>
            <p className="text-neutral-700 leading-relaxed">
              We implement appropriate technical and organizational measures to protect your personal information against 
              unauthorized access, alteration, disclosure, or destruction. This includes encryption, secure servers, 
              and regular security audits.
            </p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-black mb-4">6. Your Privacy Rights</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">You have the right to:</p>
            <ul className="list-disc list-inside space-y-2 text-neutral-700 ml-4">
              <li>Access your personal information</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Opt-out of marketing communications</li>
              <li>Export your data in a portable format</li>
              <li>Withdraw consent for data processing</li>
            </ul>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-black mb-4">7. Cookies and Tracking</h2>
            <p className="text-neutral-700 leading-relaxed mb-4">
              We use cookies and similar tracking technologies to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-neutral-700 ml-4">
              <li>Remember your preferences</li>
              <li>Understand how you use our services</li>
              <li>Improve user experience</li>
              <li>Provide relevant advertisements</li>
            </ul>
            <p className="text-neutral-700 leading-relaxed mt-4">
              You can control cookies through your browser settings, but disabling cookies may limit your ability to use certain features.
            </p>
          </div>

          <div className="bg-neutral-50 rounded-2xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-black mb-4">8. Third-Party Links</h2>
            <p className="text-neutral-700 leading-relaxed">
              Our service may contain links to third-party websites (venue websites, vendor portfolios, payment gateways). 
              We are not responsible for the privacy practices of these external sites. We encourage you to review their 
              privacy policies.
            </p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-black mb-4">9. Children's Privacy</h2>
            <p className="text-neutral-700 leading-relaxed">
              Our services are not intended for children under 18 years of age. We do not knowingly collect personal 
              information from children. If we discover that we have collected information from a child, we will delete 
              it immediately.
            </p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-black mb-4">10. International Data Transfers</h2>
            <p className="text-neutral-700 leading-relaxed">
              Your information may be transferred to and processed in countries other than your country of residence. 
              We ensure appropriate safeguards are in place to protect your information in accordance with this policy.
            </p>
          </div>

          <div className="bg-neutral-50 rounded-2xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-black mb-4">11. Changes to This Policy</h2>
            <p className="text-neutral-700 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new 
              policy on this page and updating the "Last updated" date. Your continued use of the service after changes 
              constitutes acceptance of the updated policy.
            </p>
          </div>

          <div className="bg-neutral-50 rounded-2xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-black mb-4">12. Contact Us</h2>
            <p className="text-neutral-700 leading-relaxed mb-2">
              For privacy-related questions, please contact our Data Protection Officer:
            </p>
            <p className="text-neutral-700">
              Email: privacy@NearZro.com<br />
              Phone: +91-XXX-XXX-XXXX<br />
              Address: Chennai, Tamil Nadu, India
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
