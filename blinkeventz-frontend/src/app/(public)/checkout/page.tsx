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
    () => localStorage.getItem('blinkeventz_booking'),
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
        <p className="text-neutral-600 mb-6">Please login to complete your checkout</p>
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
        <p className="text-neutral-600 mb-6">Add venues or vendors to your cart before checkout</p>
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
        name: "BlinkEventz",
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
            localStorage.removeItem('blinkeventz_booking');

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
        const rzp = new (window as any).Razorpay(options);
        rzp.on("payment.failed", (response: any) => {
          setPaymentSuccess(false);
          toast.error(`Payment Failed: ${response.error.description}`);
          setIsProcessing(false);
        });
        rzp.render();
      } else {
        // Razorpay not loaded - simulate payment for development
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
      localStorage.removeItem('blinkeventz_booking');
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
      localStorage.removeItem('blinkeventz_booking');
      toast.info('Booking removed');
    } else {
      removeItem(itemId);
      toast.info('Item removed from cart');
    }
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
        <p className="text-center text-neutral-700 mb-8">Complete your booking with Razorpay secure payment</p>

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

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-neutral-500">{(item as any).type || (item as any).itemType || 'Item'} × {item.quantity || 1}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{formatCurrency(((item as any).price || 0) * (item.quantity || 1))}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-500 hover:text-red-600"
                            onClick={() => handleRemoveItem(String(item.id))}
                          >
                            <span className="sr-only">Remove</span>
                            ×
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t pt-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-700">Subtotal</span>
                      <span className="font-medium">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-700">GST (18%)</span>
                      <span className="font-medium">{formatCurrency(taxes)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-700">Platform Fee</span>
                      <span className="font-medium">{formatCurrency(serviceFee)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span className="text-black">{formatCurrency(total)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Step 2: Confirm */}
        {currentStep === "confirm" && (
          <Card>
            <CardHeader>
              <CardTitle>Confirm Your Booking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="p-4 bg-silver-50 rounded-lg border">
                  <h3 className="font-semibold mb-2">Contact Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-neutral-600">Name:</span>
                      <span className="ml-2 font-medium">{formData.firstName} {formData.lastName}</span>
                    </div>
                    <div>
                      <span className="text-neutral-600">Email:</span>
                      <span className="ml-2 font-medium">{formData.email}</span>
                    </div>
                    <div>
                      <span className="text-neutral-600">Phone:</span>
                      <span className="ml-2 font-medium">+91 {formData.phone}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-silver-50 rounded-lg border">
                  <h3 className="font-semibold mb-2">Order Items</h3>
                  <div className="space-y-2">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>{item.name} × {item.quantity || 1}</span>
                        <span className="font-medium">{formatCurrency(((item as any).price || 0) * (item.quantity || 1))}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-silver-50 rounded-lg border">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-1"
                  />
                  <Label htmlFor="terms" className="text-sm font-normal cursor-pointer">
                    I agree to the Terms of Service and Privacy Policy. I understand that payments are processed securely through Razorpay.
                  </Label>
                </div>
              </div>

              <div className="flex gap-4">
                <Button variant="silver" onClick={handleBack} className="flex-1 h-12">
                  Back
                </Button>
                <Button
                  variant="premium"
                  onClick={handleConfirmBooking}
                  disabled={!acceptTerms}
                  className="flex-1 h-12"
                >
                  Proceed to Payment
                </Button>
              </div>
            </CardContent>
          </Card>
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
                        <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-neutral-800" />
                        <p className="text-lg font-medium text-black">Processing Payment...</p>
                        <p className="text-neutral-600 mt-2">Please do not close this window</p>
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

                  <div className="flex items-center justify-center gap-6 text-sm text-neutral-600">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>Secure Payment</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>Instant Confirmation</span>
                    </div>
                  </div>
                </>
              ) : paymentSuccess ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-20 w-20 text-green-500 mx-auto mb-6" />
                  <h2 className="text-3xl font-bold text-black mb-2">Payment Successful!</h2>
                  <p className="text-neutral-600 mb-6">
                    Your booking has been confirmed. Check your email for details.
                  </p>
                  <p className="text-sm text-neutral-500">Redirecting to dashboard...</p>
                </div>
              ) : (
                <div className="text-center py-12">
                  <XCircle className="h-20 w-20 text-red-500 mx-auto mb-6" />
                  <h2 className="text-3xl font-bold text-black mb-2">Payment Failed</h2>
                  <p className="text-neutral-600 mb-6">
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
