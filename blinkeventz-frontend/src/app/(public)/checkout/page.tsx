"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  CreditCard,
  Building,
  Smartphone,
  Wallet,
  Loader2,
  Calendar,
  Users,
  MapPin,
  Shield,
} from "lucide-react";
import { PaymentMethod, UPIProvider, WalletProvider, BankCode, CheckoutFormData, CheckoutErrors } from "@/types";

// Utility function for currency formatting
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
};

// Mock cart data - will come from cart context
const MOCK_CART_ITEMS = [
  {
    id: "1",
    type: "venue" as const,
    name: "Grand Ballroom Hotel",
    description: "A luxurious ballroom perfect for weddings",
    price: 5000,
    image: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?ixlib=rb-4.0.3",
    metadata: { date: "2024-06-15", guestCount: 200, city: "Chennai" },
  },
  {
    id: "2",
    type: "vendor" as const,
    name: "Delicious Catering",
    description: "Full-service catering for all occasions",
    price: 15000,
    image: "https://images.unsplash.com/photo-1555244162-803834f70033?ixlib=rb-4.0.3",
    metadata: { serviceType: "Catering" },
  },
];

const TAX_RATE = 0.18;
const SERVICE_FEE = 199;

// Payment method configurations
const UPI_PROVIDERS: { id: UPIProvider; name: string; icon: string }[] = [
  { id: "gpay", name: "Google Pay", icon: "G" },
  { id: "phonepe", name: "PhonePe", icon: "P" },
  { id: "paytm", name: "Paytm", icon: "₹" },
  { id: "bhim", name: "BHIM UPI", icon: "B" },
];

const WALLET_PROVIDERS: { id: WalletProvider; name: string }[] = [
  { id: "paytm", name: "Paytm Wallet" },
  { id: "phonepe", name: "PhonePe Wallet" },
  { id: "amazonpay", name: "Amazon Pay" },
  { id: "mobikwik", name: "MobiKwik" },
];

const BANKS: { id: BankCode; name: string }[] = [
  { id: "HDFC", name: "HDFC Bank" },
  { id: "ICICI", name: "ICICI Bank" },
  { id: "SBI", name: "State Bank of India" },
  { id: "AXIS", name: "Axis Bank" },
  { id: "KOTAK", name: "Kotak Mahindra Bank" },
  { id: "IDFC", name: "IDFC First Bank" },
  { id: "YES", name: "Yes Bank" },
];

type CheckoutStep = "details" | "confirm" | "payment";

export default function CheckoutPage() {
  const [currentStep, setCurrentStep] = useState<CheckoutStep>("details");
  const [isProcessing, setIsProcessing] = useState(false);

  const [formData, setFormData] = useState<CheckoutFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    paymentMethod: "upi",
    upiProvider: "gpay",
    upiId: "",
    walletProvider: "paytm",
    bankCode: "HDFC",
    cardNumber: "",
    expiry: "",
    cvc: "",
  });

  const [errors, setErrors] = useState<CheckoutErrors>({});

  // Calculate totals
  const subtotal = MOCK_CART_ITEMS.reduce((sum, item) => sum + item.price, 0);
  const taxes = subtotal * TAX_RATE;
  const total = subtotal + taxes + SERVICE_FEE;

  const validateContactForm = (): boolean => {
    const newErrors: CheckoutErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^[6-9]\d{9}$/.test(formData.phone.replace(/\s/g, ""))) {
      newErrors.phone = "Please enter a valid 10-digit Indian mobile number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinueToConfirm = () => {
    if (validateContactForm()) {
      setCurrentStep("confirm");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleConfirmBooking = () => {
    setCurrentStep("payment");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleInputChange = (field: keyof CheckoutFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof CheckoutErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleBack = () => {
    if (currentStep === "payment") setCurrentStep("confirm");
    else if (currentStep === "confirm") setCurrentStep("details");
  };

  const handlePayment = async () => {
    setIsProcessing(true);

    // Simulate Razorpay payment initialization
    setTimeout(() => {
      setIsProcessing(false);
      // In production: Initialize Razorpay checkout here
      // const razorpay = new Razorpay({ key: "...", amount: total * 100, ... });
      // razorpay.open();
      console.log("Payment initiated with:", formData, "Total:", total);
    }, 2000);
  };

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            <div className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all ${
                  currentStep === "details"
                    ? "bg-purple-600 text-white"
                    : "bg-green-500 text-white"
                }`}
              >
                {currentStep === "details" ? "1" : <CheckCircle2 className="h-5 w-5" />}
              </div>
              <span className={`ml-2 text-sm font-medium ${currentStep === "details" ? "text-purple-600" : "text-gray-600"}`}>
                Details
              </span>
            </div>
            <div className={`w-16 h-1 mx-4 ${currentStep === "details" ? "bg-gray-300" : "bg-green-500"}`} />
            <div className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all ${
                  currentStep === "confirm"
                    ? "bg-purple-600 text-white"
                    : currentStep === "payment"
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {currentStep === "confirm" ? "2" : currentStep === "payment" ? <CheckCircle2 className="h-5 w-5" /> : "2"}
              </div>
              <span
                className={`ml-2 text-sm font-medium ${
                  currentStep === "confirm"
                    ? "text-purple-600"
                    : currentStep === "payment"
                    ? "text-green-600"
                    : "text-gray-400"
                }`}
              >
                Confirm
              </span>
            </div>
            <div className={`w-16 h-1 mx-4 ${currentStep === "payment" ? "bg-green-500" : "bg-gray-300"}`} />
            <div className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all ${
                  currentStep === "payment"
                    ? "bg-purple-600 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                3
              </div>
              <span className={`ml-2 text-sm font-medium ${currentStep === "payment" ? "text-purple-600" : "text-gray-400"}`}>
                Payment
              </span>
            </div>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">Secure Checkout</h1>
        <p className="text-center text-gray-600 mb-8">Complete your booking with Razorpay secure payment</p>

        {/* Step 1: Contact Details */}
        {currentStep === "details" && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-purple-600" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        placeholder="John"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange("firstName", e.target.value)}
                        className={errors.firstName ? "border-red-500" : ""}
                      />
                      {errors.firstName && <p className="text-xs text-red-500">{errors.firstName}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        placeholder="Doe"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange("lastName", e.target.value)}
                        className={errors.lastName ? "border-red-500" : ""}
                      />
                      {errors.lastName && <p className="text-xs text-red-500">{errors.lastName}</p>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      className={errors.email ? "border-red-500" : ""}
                    />
                    {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Mobile Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="9876543210"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      className={errors.phone ? "border-red-500" : ""}
                      maxLength={10}
                    />
                    {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-purple-600" />
                    Preferred Payment Method
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => handleInputChange("paymentMethod", "upi")}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                        formData.paymentMethod === "upi"
                          ? "border-purple-600 bg-purple-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <Smartphone
                        className={`h-6 w-6 mb-1 ${formData.paymentMethod === "upi" ? "text-purple-600" : "text-gray-500"}`}
                      />
                      <span className={`text-xs font-medium ${formData.paymentMethod === "upi" ? "text-purple-700" : "text-gray-600"}`}>
                        UPI
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInputChange("paymentMethod", "card")}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                        formData.paymentMethod === "card"
                          ? "border-purple-600 bg-purple-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <CreditCard
                        className={`h-6 w-6 mb-1 ${formData.paymentMethod === "card" ? "text-purple-600" : "text-gray-500"}`}
                      />
                      <span className={`text-xs font-medium ${formData.paymentMethod === "card" ? "text-purple-700" : "text-gray-600"}`}>
                        Card
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInputChange("paymentMethod", "netbanking")}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                        formData.paymentMethod === "netbanking"
                          ? "border-purple-600 bg-purple-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <Building
                        className={`h-6 w-6 mb-1 ${formData.paymentMethod === "netbanking" ? "text-purple-600" : "text-gray-500"}`}
                      />
                      <span
                        className={`text-xs font-medium ${formData.paymentMethod === "netbanking" ? "text-purple-700" : "text-gray-600"}`}
                      >
                        Net Banking
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInputChange("paymentMethod", "wallet")}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                        formData.paymentMethod === "wallet"
                          ? "border-purple-600 bg-purple-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <Wallet
                        className={`h-6 w-6 mb-1 ${formData.paymentMethod === "wallet" ? "text-purple-600" : "text-gray-500"}`}
                      />
                      <span className={`text-xs font-medium ${formData.paymentMethod === "wallet" ? "text-purple-700" : "text-gray-600"}`}>
                        Wallet
                      </span>
                    </button>
                  </div>

                  {/* UPI Options */}
                  {formData.paymentMethod === "upi" && (
                    <div className="space-y-4 pt-4 border-t">
                      <Label>Popular UPI Apps</Label>
                      <div className="grid grid-cols-4 gap-3">
                        {UPI_PROVIDERS.map((provider) => (
                          <button
                            key={provider.id}
                            type="button"
                            onClick={() => {
                              handleInputChange("upiProvider", provider.id);
                              handleInputChange("upiId", "");
                            }}
                            className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                              formData.upiProvider === provider.id && !formData.upiId
                                ? "border-purple-600 bg-purple-50"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <div
                              className={`h-10 w-10 rounded-full flex items-center justify-center text-lg font-bold mb-2 ${
                                formData.upiProvider === provider.id && !formData.upiId
                                  ? "bg-purple-600 text-white"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {provider.icon}
                            </div>
                            <span className="text-xs font-medium text-gray-700">{provider.name}</span>
                          </button>
                        ))}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="upiId">Or enter UPI ID</Label>
                        <Input
                          id="upiId"
                          placeholder="yourname@upi"
                          value={formData.upiId}
                          onChange={(e) => {
                            handleInputChange("upiId", e.target.value);
                            handleInputChange("upiProvider", undefined as unknown as UPIProvider);
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Card Options */}
                  {formData.paymentMethod === "card" && (
                    <div className="space-y-4 pt-4 border-t">
                      <div className="space-y-2">
                        <Label htmlFor="cardNumber">Card Number</Label>
                        <Input id="cardNumber" placeholder="0000 0000 0000 0000" maxLength={19} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="expiry">Expiry Date</Label>
                          <Input id="expiry" placeholder="MM/YY" maxLength={5} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cvc">CVC</Label>
                          <Input id="cvc" placeholder="123" maxLength={4} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Net Banking Options */}
                  {formData.paymentMethod === "netbanking" && (
                    <div className="space-y-4 pt-4 border-t">
                      <Label>Select Your Bank</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {BANKS.map((bank) => (
                          <button
                            key={bank.id}
                            type="button"
                            onClick={() => handleInputChange("bankCode", bank.id)}
                            className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                              formData.bankCode === bank.id
                                ? "border-purple-600 bg-purple-50"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <Building
                              className={`h-5 w-5 ${formData.bankCode === bank.id ? "text-purple-600" : "text-gray-400"}`}
                            />
                            <span
                              className={`text-sm font-medium ${formData.bankCode === bank.id ? "text-purple-700" : "text-gray-700"}`}
                            >
                              {bank.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Wallet Options */}
                  {formData.paymentMethod === "wallet" && (
                    <div className="space-y-4 pt-4 border-t">
                      <Label>Select Wallet</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {WALLET_PROVIDERS.map((provider) => (
                          <button
                            key={provider.id}
                            type="button"
                            onClick={() => handleInputChange("walletProvider", provider.id)}
                            className={`p-3 rounded-lg border-2 transition-all text-center ${
                              formData.walletProvider === provider.id
                                ? "border-purple-600 bg-purple-50"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <span
                              className={`text-sm font-medium ${formData.walletProvider === provider.id ? "text-purple-700" : "text-gray-700"}`}
                            >
                              {provider.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">GST (18%)</span>
                    <span className="font-medium">{formatCurrency(taxes)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Platform Fee</span>
                    <span className="font-medium">{formatCurrency(SERVICE_FEE)}</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-purple-600">{formatCurrency(total)}</span>
                  </div>
                </CardContent>
              </Card>

              <Button onClick={handleContinueToConfirm} size="lg" className="w-full h-12 text-lg mt-4 shadow-lg">
                Continue to Confirm <CheckCircle2 className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Confirmation */}
        {currentStep === "confirm" && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    Review Your Booking
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Contact Details */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold text-gray-700 mb-2">Contact Information</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Name:</span>
                        <span className="ml-2 font-medium">
                          {formData.firstName} {formData.lastName}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Email:</span>
                        <span className="ml-2 font-medium">{formData.email}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Phone:</span>
                        <span className="ml-2 font-medium">+91 {formData.phone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Cart Items */}
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-3">Selected Services</h4>
                    <div className="space-y-3">
                      {MOCK_CART_ITEMS.map((item) => (
                        <div key={item.id} className="flex gap-4 p-4 border rounded-lg">
                          <div
                            className="h-20 w-20 bg-gray-200 rounded-lg bg-cover bg-center flex-shrink-0"
                            style={{ backgroundImage: item.image ? `url(${item.image})` : "none" }}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full capitalize">
                                {item.type}
                              </span>
                              {item.metadata?.serviceType && (
                                <span className="text-xs text-gray-500">{item.metadata.serviceType}</span>
                              )}
                            </div>
                            <h5 className="font-semibold text-gray-900">{item.name}</h5>
                            <p className="text-sm text-gray-500">{item.description}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                              {item.metadata?.date && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>{item.metadata.date}</span>
                                </div>
                              )}
                              {item.metadata?.guestCount && (
                                <div className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  <span>{item.metadata.guestCount} guests</span>
                                </div>
                              )}
                              {item.metadata?.city && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  <span>{item.metadata.city}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-purple-600">{formatCurrency(item.price)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h4 className="font-semibold text-gray-700 mb-2">Payment Method</h4>
                    <div className="flex items-center gap-3">
                      {formData.paymentMethod === "upi" && (
                        <Smartphone className="h-5 w-5 text-purple-600" />
                      )}
                      {formData.paymentMethod === "card" && (
                        <CreditCard className="h-5 w-5 text-purple-600" />
                      )}
                      {formData.paymentMethod === "netbanking" && (
                        <Building className="h-5 w-5 text-purple-600" />
                      )}
                      {formData.paymentMethod === "wallet" && (
                        <Wallet className="h-5 w-5 text-purple-600" />
                      )}
                      <span className="font-medium capitalize">
                        {formData.paymentMethod === "upi" && formData.upiId
                          ? `UPI: ${formData.upiId}`
                          : formData.paymentMethod === "upi"
                          ? `${formData.upiProvider?.toUpperCase()}`
                          : formData.paymentMethod === "netbanking"
                          ? `${formData.bankCode} Bank`
                          : formData.paymentMethod === "wallet"
                          ? `${formData.walletProvider}`
                          : "Credit/Debit Card"}
                      </span>
                    </div>
                  </div>

                  {/* Terms */}
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <input type="checkbox" className="mt-1 h-4 w-4 text-purple-600" />
                    <span>
                      I confirm that all details are correct and agree to the{" "}
                      <a href="#" className="text-purple-600 hover:underline">
                        Terms & Conditions
                      </a>{" "}
                      and{" "}
                      <a href="#" className="text-purple-600 hover:underline">
                        Cancellation Policy
                      </a>
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Summary & Confirm */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>Final Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">GST (18%)</span>
                    <span className="font-medium">{formatCurrency(taxes)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Platform Fee</span>
                    <span className="font-medium">{formatCurrency(SERVICE_FEE)}</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-purple-600">{formatCurrency(total)}</span>
                  </div>
                </CardContent>
              </Card>

              <Button onClick={handleConfirmBooking} size="lg" className="w-full h-12 text-lg mt-4 shadow-lg bg-green-600 hover:bg-green-700">
                Confirm & Proceed to Payment <Shield className="ml-2 h-5 w-5" />
              </Button>

              <Button onClick={handleBack} variant="ghost" className="w-full mt-2">
                ← Back to Details
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Payment */}
        {currentStep === "payment" && (
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-center">Complete Your Payment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-100 rounded-full mb-4">
                    <Shield className="h-10 w-10 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">Amount to Pay</h3>
                  <p className="text-4xl font-bold text-purple-600 mt-2">{formatCurrency(total)}</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-700 mb-2">Payment via</h4>
                  <div className="flex items-center justify-center gap-3">
                    <div className="h-8 px-3 bg-purple-100 rounded flex items-center justify-center">
                      <span className="font-bold text-purple-700">Razorpay</span>
                    </div>
                    <span className="text-gray-600">→</span>
                    <div className="flex items-center gap-2">
                      {formData.paymentMethod === "upi" && (
                        <>
                          <Smartphone className="h-5 w-5 text-purple-600" />
                          <span className="font-medium capitalize">
                            {formData.upiId || formData.upiProvider?.toUpperCase()}
                          </span>
                        </>
                      )}
                      {formData.paymentMethod === "card" && (
                        <>
                          <CreditCard className="h-5 w-5 text-purple-600" />
                          <span className="font-medium">Card</span>
                        </>
                      )}
                      {formData.paymentMethod === "netbanking" && (
                        <>
                          <Building className="h-5 w-5 text-purple-600" />
                          <span className="font-medium">{formData.bankCode} Bank</span>
                        </>
                      )}
                      {formData.paymentMethod === "wallet" && (
                        <>
                          <Wallet className="h-5 w-5 text-purple-600" />
                          <span className="font-medium capitalize">{formData.walletProvider}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handlePayment}
                  size="lg"
                  className="w-full h-14 text-xl shadow-lg bg-purple-600 hover:bg-purple-700"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Pay ${formatCurrency(total)} Securely`
                  )}
                </Button>

                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Your payment information is encrypted and secure
                </div>

                <div className="flex items-center justify-center gap-2 pt-4 border-t">
                  <div className="h-8 px-3 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-500">
                    🔒 SSL Secured
                  </div>
                  <div className="h-8 px-3 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-500">
                    ✓ PCI DSS Compliant
                  </div>
                  <div className="h-8 px-3 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-500">
                    🛡️ Fraud Protection
                  </div>
                </div>

                <Button onClick={handleBack} variant="ghost" className="w-full">
                  ← Back to Confirmation
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
