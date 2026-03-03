"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CreditCard,
  Building,
  Smartphone,
  Wallet,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  ArrowRight,
  Trash2,
  X,
  ShoppingBag,
} from "lucide-react";
import { UPIProvider, WalletProvider, BankCode, CheckoutFormData, CheckoutErrors, CartItem } from "@/types";
import { toast } from "sonner";
import { useCart } from "@/context/cart-context";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import api from "@/lib/api";

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
};

const TAX_RATE = 0.18;
const SERVICE_FEE = 199;

type CheckoutStep = "details" | "confirm" | "payment";

interface BookingData {
  type: 'venue' | 'vendor';
  id: string;
  name: string;
  price: number;
  package?: string;
  time?: string;
  service?: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { items: cartContextItems, clearCart, removeItem } = useCart();
  const [currentStep, setCurrentStep] = useState<CheckoutStep>("details");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);

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

  // Load booking data from localStorage
  const storedBooking = useSyncExternalStore(
    (subscribe) => {
      const handler = () => subscribe();
      window.addEventListener('storage', handler);
      return () => window.removeEventListener('storage', handler);
    },
    () => localStorage.getItem('NearZro_booking'),
    () => null
  );

  const bookingDataFromStorage = storedBooking ? JSON.parse(storedBooking) : null;
  
  const bookingCartItem = bookingDataFromStorage
    ? [{
        id: `booking-${bookingDataFromStorage.id}`,
        type: bookingDataFromStorage.type,
        name: bookingDataFromStorage.name,
        description: bookingDataFromStorage.type === 'venue'
          ? `${bookingDataFromStorage.package || 'Full Day'} Package`
          : bookingDataFromStorage.service || 'Selected Service',
        price: bookingDataFromStorage.price,
        image: bookingDataFromStorage.type === 'venue'
          ? 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?ixlib=rb-4.0.3'
          : 'https://images.unsplash.com/photo-1555244162-803834f70033?ixlib=rb-4.0.3',
        metadata: {
          package: bookingDataFromStorage.package,
          time: bookingDataFromStorage.time,
          service: bookingDataFromStorage.service,
        },
        quantity: 1,
      }]
    : [];

  const cartItems = [...cartContextItems, ...bookingCartItem];
  const subtotal = cartItems.reduce((sum, item) => sum + ((item as any).price || (item as CartItem).unitPrice || 0) * (item.quantity || 1), 0);
  const taxes = subtotal * TAX_RATE;
  const serviceFee = cartItems.length > 0 ? SERVICE_FEE : 0;
  const total = subtotal + taxes + serviceFee;

  // Check authentication
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-black mb-2">Login Required</h2>
        <p className="text-neutral-800 mb-6">Please login to complete your checkout</p>
        <Button variant="premium" onClick={() => router.push("/login")}>
          Go to Login
        </Button>
      </div>
    );
  }

  // Check if cart has items
  if (cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-black mb-2">Your cart is empty</h2>
        <p className="text-neutral-800 mb-6">Add venues or vendors to your cart before checkout</p>
        <Button variant="premium" onClick={() => router.push("/venues")}>
          Browse Venues
        </Button>
      </div>
    );
  }

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
    if (!acceptTerms) {
      toast.error("Please accept the Terms & Conditions");
      return;
    }
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
    // Validate payment details
    const newErrors: CheckoutErrors = {};

    if (formData.paymentMethod === "card") {
      if (!formData.cardNumber || formData.cardNumber.replace(/\s/g, "").length < 16) {
        newErrors.cardNumber = "Please enter a valid 16-digit card number";
      }
      if (!formData.expiry || !/^\d{2}\/\d{2}$/.test(formData.expiry)) {
        newErrors.expiry = "Please enter a valid expiry date (MM/YY)";
      }
      if (!formData.cvc || !/^\d{3,4}$/.test(formData.cvc)) {
        newErrors.cvc = "Please enter a valid CVC (3-4 digits)";
      }
    }

    if (formData.paymentMethod === "upi") {
      if (!formData.upiProvider && !formData.upiId) {
        toast.error("Please select a UPI payment method");
        return;
      }
      if (formData.upiId && !/^[a-zA-Z0-9._-]+@[a-zA-Z]+$/.test(formData.upiId)) {
        newErrors.upiId = "Please enter a valid UPI ID";
      }
    }

    if (formData.paymentMethod === "netbanking" && !formData.bankCode) {
      toast.error("Please select your bank");
      return;
    }

    if (formData.paymentMethod === "wallet" && !formData.walletProvider) {
      toast.error("Please select a wallet");
      return;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fill in all required payment details");
      return;
    }

    setIsProcessing(true);

    try {
      // Create Razorpay order using simplified endpoint
      const orderResponse = await api.post("/payments/create-order-simple", {
        amount: Math.round(total),
        currency: "INR",
        items: cartItems.map(item => ({
          name: item.name,
          price: (item as any).price || (item as any).unitPrice || 0,
          quantity: item.quantity || 1,
        })),
      });

      const order = orderResponse.data;

      // Configure Razorpay options
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_1234567890",
        amount: Math.round(total * 100), // Amount in paise
        currency: "INR",
        name: "NearZro",
        description: "Event Booking Payment",
        order_id: order.id,
        handler: async (response: any) => {
          // Payment successful
          try {
            await api.post("/payments/confirm", {
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              items: cartItems,
              customerDetails: formData,
            });

            setPaymentSuccess(true);
            toast.success("Payment Successful! Your booking is confirmed.");
            clearCart();
            localStorage.removeItem('NearZro_booking');

            setTimeout(() => {
              router.push("/dashboard/customer");
            }, 3000);
          } catch (error) {
            console.error("Payment confirmation error:", error);
            toast.error("Payment completed but confirmation failed. Please contact support.");
            setPaymentSuccess(true);
          }
        },
        prefill: {
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          contact: formData.phone,
        },
        theme: {
          color: "#1a1a1a",
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            toast.info("Payment cancelled");
          },
        },
      };

      // Check if Razorpay is loaded
      if (typeof window !== 'undefined' && (window as any).Razorpay) {
        const rzp1 = new (window as any).Razorpay(options);
        rzp1.on("payment.failed", (response: any) => {
          setPaymentSuccess(false);
          toast.error(`Payment Failed: ${response.error.description}`);
          setIsProcessing(false);
        });
        rzp1.open();
      } else {
        // Razorpay not loaded - simulate payment for development
        console.warn("Razorpay SDK not loaded, using simulated payment");
        await simulatePayment();
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      // Fallback to simulated payment for development
      await simulatePayment();
    }
  };

  const simulatePayment = async () => {
    // Simulate payment processing with 80% success rate
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    const isSuccess = Math.random() > 0.2;
    
    if (isSuccess) {
      setPaymentSuccess(true);
      toast.success("Payment Accepted! Your booking has been confirmed.");
      clearCart();
      localStorage.removeItem('NearZro_booking');
      setTimeout(() => {
        router.push("/dashboard/customer");
      }, 3000);
    } else {
      setPaymentSuccess(false);
      toast.error("Payment Rejected. Please try again with a different payment method.");
      setIsProcessing(false);
    }
  };

  const handleRemoveItem = (itemId: string) => {
    if (itemId.startsWith('booking-')) {
      localStorage.removeItem('NearZro_booking');
      toast.info('Booking removed');
    } else {
      removeItem(itemId);
      toast.info('Item removed from cart');
    }
  };

  const handleClearCart = () => {
    clearCart();
    localStorage.removeItem('NearZro_booking');
    toast.info('Cart cleared');
  };

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Back Button */}
        {currentStep !== "details" && (
          <Button variant="ghost" onClick={handleBack} className="mb-4 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        )}

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            {[
              { step: "details", label: "Details", icon: 1 },
              { step: "confirm", label: "Confirm", icon: 2 },
              { step: "payment", label: "Payment", icon: 3 },
            ].map((item, index, arr) => (
              <div key={item.step} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all ${
                    currentStep === item.step
                      ? "bg-black text-white"
                      : ["details", "confirm", "payment"].indexOf(currentStep) > index
                      ? "bg-green-500 text-white"
                      : "bg-silver-200 text-neutral-600"
                  }`}
                >
                  {["details", "confirm", "payment"].indexOf(currentStep) > index ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    item.icon
                  )}
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  currentStep === item.step ? "text-black" : "text-neutral-700"
                }`}>
                  {item.label}
                </span>
                {index < arr.length - 1 && (
                  <div className={`w-16 h-1 mx-4 ${
                    ["details", "confirm", "payment"].indexOf(currentStep) > index
                      ? "bg-green-500"
                      : "bg-silver-300"
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <h1 className="text-3xl font-bold text-black mb-2 text-center">Secure Checkout</h1>
        <p className="text-center text-neutral-800 mb-8">Complete your booking with Razorpay secure payment</p>

        {/* Step 1: Contact Details */}
        {currentStep === "details" && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-neutral-800" />
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
                    <CreditCard className="h-5 w-5 text-neutral-800" />
                    Preferred Payment Method
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: "upi", label: "UPI", icon: Smartphone },
                      { id: "card", label: "Card", icon: CreditCard },
                      { id: "netbanking", label: "Net Banking", icon: Building },
                      { id: "wallet", label: "Wallet", icon: Wallet },
                    ].map((method) => (
                      <button
                        key={method.id}
                        onClick={() => handleInputChange("paymentMethod", method.id)}
                        className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                          formData.paymentMethod === method.id
                            ? "border-black bg-silver-100"
                            : "border-silver-200 hover:border-silver-300"
                        }`}
                      >
                        <method.icon className={`h-6 w-6 mb-1 ${
                          formData.paymentMethod === method.id ? "text-black" : "text-neutral-600"
                        }`} />
                        <span className="text-xs font-medium">{method.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* UPI Options */}
                  {formData.paymentMethod === "upi" && (
                    <div className="space-y-4 pt-4 border-t">
                      <Label>Popular UPI Apps</Label>
                      <div className="grid grid-cols-4 gap-3">
                        {[
                          { id: "gpay", name: "Google Pay" },
                          { id: "phonepe", name: "PhonePe" },
                          { id: "paytm", name: "Paytm" },
                          { id: "bhim", name: "BHIM" },
                        ].map((provider) => (
                          <button
                            key={provider.id}
                            onClick={() => {
                              handleInputChange("upiProvider", provider.id as UPIProvider);
                              handleInputChange("upiId", "");
                            }}
                            className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                              formData.upiProvider === provider.id && !formData.upiId
                                ? "border-black bg-silver-100"
                                : "border-silver-200 hover:border-silver-300"
                            }`}
                          >
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center text-lg font-bold mb-2 ${
                              formData.upiProvider === provider.id && !formData.upiId
                                ? "bg-black text-white"
                                : "bg-silver-100 text-neutral-700"
                            }`}>
                              {provider.name.charAt(0)}
                            </div>
                            <span className="text-xs font-medium">{provider.name}</span>
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
                          className={errors.upiId ? "border-red-500" : ""}
                        />
                        {errors.upiId && <p className="text-xs text-red-500">{errors.upiId}</p>}
                      </div>
                    </div>
                  )}

                  {/* Card Options */}
                  {formData.paymentMethod === "card" && (
                    <div className="space-y-4 pt-4 border-t">
                      <div className="space-y-2">
                        <Label htmlFor="cardNumber">Card Number *</Label>
                        <Input
                          id="cardNumber"
                          placeholder="1234 5678 9012 3456"
                          value={formData.cardNumber}
                          onChange={(e) => handleInputChange("cardNumber", e.target.value)}
                          className={errors.cardNumber ? "border-red-500" : ""}
                          maxLength={19}
                        />
                        {errors.cardNumber && <p className="text-xs text-red-500">{errors.cardNumber}</p>}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="expiry">Expiry (MM/YY) *</Label>
                          <Input
                            id="expiry"
                            placeholder="12/25"
                            value={formData.expiry}
                            onChange={(e) => handleInputChange("expiry", e.target.value)}
                            className={errors.expiry ? "border-red-500" : ""}
                            maxLength={5}
                          />
                          {errors.expiry && <p className="text-xs text-red-500">{errors.expiry}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cvc">CVC *</Label>
                          <Input
                            id="cvc"
                            placeholder="123"
                            value={formData.cvc}
                            onChange={(e) => handleInputChange("cvc", e.target.value)}
                            className={errors.cvc ? "border-red-500" : ""}
                            maxLength={4}
                          />
                          {errors.cvc && <p className="text-xs text-red-500">{errors.cvc}</p>}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Net Banking */}
                  {formData.paymentMethod === "netbanking" && (
                    <div className="space-y-4 pt-4 border-t">
                      <Label>Select Your Bank</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: "HDFC", name: "HDFC Bank" },
                          { id: "ICICI", name: "ICICI Bank" },
                          { id: "SBI", name: "State Bank of India" },
                          { id: "AXIS", name: "Axis Bank" },
                          { id: "KOTAK", name: "Kotak Mahindra Bank" },
                          { id: "IDFC", name: "IDFC First Bank" },
                          { id: "YES", name: "Yes Bank" },
                        ].map((bank) => (
                          <button
                            key={bank.id}
                            onClick={() => handleInputChange("bankCode", bank.id as BankCode)}
                            className={`p-3 rounded-lg border-2 text-left transition-all ${
                              formData.bankCode === bank.id
                                ? "border-black bg-silver-100"
                                : "border-silver-200 hover:border-silver-300"
                            }`}
                          >
                            <span className="font-medium">{bank.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Wallet */}
                  {formData.paymentMethod === "wallet" && (
                    <div className="space-y-4 pt-4 border-t">
                      <Label>Select Wallet</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: "paytm", name: "Paytm Wallet" },
                          { id: "phonepe", name: "PhonePe Wallet" },
                          { id: "amazonpay", name: "Amazon Pay" },
                          { id: "mobikwik", name: "MobiKwik" },
                        ].map((wallet) => (
                          <button
                            key={wallet.id}
                            onClick={() => handleInputChange("walletProvider", wallet.id as WalletProvider)}
                            className={`p-3 rounded-lg border-2 text-left transition-all ${
                              formData.walletProvider === wallet.id
                                ? "border-black bg-silver-100"
                                : "border-silver-200 hover:border-silver-300"
                            }`}
                          >
                            <span className="font-medium">{wallet.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Order Summary - Sticky Sidebar */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Order Summary</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearCart}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 px-2"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear All
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex gap-3 items-start p-2 rounded-lg hover:bg-silver-50 transition-colors">
                        <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-silver-200 to-silver-400 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {(item as any).image ? (
                            <img src={(item as any).image} alt={item.name} className="h-full w-full object-cover" />
                          ) : (
                            (item as any).type === 'venue' || (item as any).itemType === 'VENUE' ? (
                              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                            ) : (
                              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            )
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-black truncate">{item.name}</p>
                          <p className="text-xs text-neutral-500">{(item as any).type || (item as any).itemType || 'Item'} × {item.quantity || 1}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="font-semibold text-sm text-black">{formatCurrency(((item as any).price || 0) * (item.quantity || 1))}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => handleRemoveItem(String(item.id))}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t pt-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-black font-medium">Subtotal</span>
                      <span className="font-medium text-black">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-black font-medium">GST (18%)</span>
                      <span className="font-medium text-black">{formatCurrency(taxes)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-black font-medium">Platform Fee</span>
                      <span className="font-medium text-black">{formatCurrency(serviceFee)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-bold text-lg">
                      <span className="text-black">Total</span>
                      <span className="text-black">{formatCurrency(total)}</span>
                    </div>
                  </div>
                  <Button
                    variant="premium"
                    size="lg"
                    onClick={handleContinueToConfirm}
                    className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-shadow"
                  >
                    Continue to Confirm
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Step 2: Confirm */}
        {currentStep === "confirm" && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5 text-neutral-800" />
                    Order Items
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex gap-4 items-center p-4 rounded-lg border border-silver-200 hover:border-silver-300 hover:bg-silver-50 transition-all">
                      <div className="h-20 w-20 rounded-lg bg-gradient-to-br from-silver-200 to-silver-400 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {(item as any).image ? (
                          <img src={(item as any).image} alt={item.name} className="h-full w-full object-cover" />
                        ) : (
                          (item as any).type === 'venue' || (item as any).itemType === 'VENUE' ? (
                            <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                          ) : (
                            <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          )
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 text-xs font-medium bg-silver-200 text-neutral-800 rounded-full capitalize">
                            {(item as any).type ? (item as any).type.replace("_", " ") : (item as any).itemType ? (item as any).itemType.replace("_", " ") : "Item"}
                          </span>
                          {(item as any).metadata?.package && (
                            <span className="text-xs text-black">{(item as any).metadata.package}</span>
                          )}
                        </div>
                        <h4 className="font-semibold text-black">{item.name}</h4>
                        <p className="text-sm text-black">Quantity: {item.quantity || 1}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-black">{formatCurrency(((item as any).price || 0) * (item.quantity || 1))}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(String(item.id))}
                          className="mt-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <Button variant="ghost" onClick={handleClearCart} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                      <X className="h-4 w-4 mr-2" />
                      Clear All Items
                    </Button>
                    <p className="text-sm text-black">
                      {cartItems.length} item{cartItems.length !== 1 ? 's' : ''} in cart
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-neutral-800" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-black text-sm font-medium">Full Name</Label>
                      <p className="font-medium text-black">{formData.firstName} {formData.lastName}</p>
                    </div>
                    <div>
                      <Label className="text-black text-sm font-medium">Email Address</Label>
                      <p className="font-medium text-black">{formData.email}</p>
                    </div>
                    <div>
                      <Label className="text-black text-sm font-medium">Phone Number</Label>
                      <p className="font-medium text-black">+91 {formData.phone}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                <input
                  type="checkbox"
                  id="terms"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 text-green-600 border-green-300 rounded focus:ring-green-500"
                />
                <Label htmlFor="terms" className="text-sm font-normal cursor-pointer text-green-900">
                  I agree to the <span className="font-medium">Terms of Service</span> and <span className="font-medium">Privacy Policy</span>. I understand that payments are processed securely through Razorpay.
                </Label>
              </div>
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>Price Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-black font-medium">Subtotal</span>
                      <span className="font-medium text-black">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-black font-medium">GST (18%)</span>
                      <span className="font-medium text-black">{formatCurrency(taxes)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-black font-medium">Platform Fee</span>
                      <span className="font-medium text-black">{formatCurrency(serviceFee)}</span>
                    </div>
                    <div className="border-t pt-3 flex justify-between font-bold text-lg">
                      <span className="text-black">Total</span>
                      <span className="text-black">{formatCurrency(total)}</span>
                    </div>
                  </div>

                  <div className="pt-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs text-black">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>Free cancellation up to 24 hours before event</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-black">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>Instant booking confirmation</span>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button variant="silver" onClick={handleBack} className="flex-1 h-12">
                      Back
                    </Button>
                    <Button
                      variant="premium"
                      onClick={handleConfirmBooking}
                      disabled={!acceptTerms}
                      className="flex-1 h-12"
                    >
                      Proceed
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Step 3: Payment */}
        {currentStep === "payment" && (
          <Card>
            <CardHeader>
              <CardTitle>Complete Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {paymentSuccess === null ? (
                <>
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xl">₹</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-blue-900">Payment Amount</h3>
                        <p className="text-2xl font-bold text-blue-900 mt-1">{formatCurrency(total)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="text-center py-8">
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-black" />
                        <p className="text-lg font-medium text-black">Processing Payment...</p>
                        <p className="text-neutral-800 mt-2">Please do not close this window</p>
                      </>
                    ) : (
                      <>
                        <p className="text-lg font-medium text-black mb-4">Ready to pay</p>
                        <Button
                          variant="premium"
                          size="lg"
                          onClick={handlePayment}
                          disabled={isProcessing}
                          className="h-14 px-12 text-lg"
                        >
                          <CreditCard className="h-5 w-5 mr-2" />
                          Pay {formatCurrency(total)}
                        </Button>
                      </>
                    )}
                  </div>

                  <div className="flex items-center justify-center gap-6 text-sm text-black">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="font-medium">Secure Payment</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="font-medium">Instant Confirmation</span>
                    </div>
                  </div>
                </>
              ) : paymentSuccess ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-20 w-20 text-green-500 mx-auto mb-6" />
                  <h2 className="text-3xl font-bold text-black mb-2">Payment Successful!</h2>
                  <p className="text-black mb-6">
                    Your booking has been confirmed. Check your email for details.
                  </p>
                  <p className="text-sm text-neutral-800">Redirecting to dashboard...</p>
                </div>
              ) : (
                <div className="text-center py-12">
                  <XCircle className="h-20 w-20 text-red-500 mx-auto mb-6" />
                  <h2 className="text-3xl font-bold text-black mb-2">Payment Failed</h2>
                  <p className="text-black mb-6">
                    Your payment could not be processed. Please try again with a different payment method.
                  </p>
                  <Button variant="premium" onClick={handlePayment} className="h-12 px-8">
                    Try Again
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
