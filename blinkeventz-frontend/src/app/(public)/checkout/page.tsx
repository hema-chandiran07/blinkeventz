"use client";

import { useState, useSyncExternalStore } from "react";
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
  Shield,
  XCircle,
  Briefcase,
  Clock,
  Trash2,
} from "lucide-react";
import { UPIProvider, WalletProvider, BankCode, CheckoutFormData, CheckoutErrors } from "@/types";
import { toast } from "sonner";
import { useCart } from "@/context/cart-context";
import { useRouter } from "next/navigation";

// Utility function for currency formatting
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
};

// Mock cart data for testing (kept for future use)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  const { items: cartContextItems, clearCart, removeItem } = useCart();
  const [currentStep, setCurrentStep] = useState<CheckoutStep>("details");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [bookingData, setBookingData] = useState<BookingData | null>(null);

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

  // Load booking data from localStorage (from Book Now button)
  // Using useSyncExternalStore to avoid setState in effect
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
  const initialBookingData = bookingData ?? bookingDataFromStorage;

  // Build cart items from both sources: CartContext (Add to Cart) and booking data (Book Now)
  const bookingCartItem = initialBookingData
    ? [{
        id: `booking-${initialBookingData.id}`,
        type: initialBookingData.type,
        name: initialBookingData.name,
        description: initialBookingData.type === 'venue'
          ? `${initialBookingData.package || 'Full Day'} Package`
          : initialBookingData.service || 'Selected Service',
        price: initialBookingData.price,
        image: initialBookingData.type === 'venue'
          ? 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?ixlib=rb-4.0.3'
          : 'https://images.unsplash.com/photo-1555244162-803834f70033?ixlib=rb-4.0.3',
        metadata: {
          package: initialBookingData.package,
          time: initialBookingData.time,
          service: initialBookingData.service,
        },
        quantity: 1,
      }]
    : [];

  // Combine cart items from context (Add to Cart) and booking data (Book Now)
  const cartItems = [...cartContextItems, ...bookingCartItem];

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);
  const taxes = subtotal * TAX_RATE;
  const serviceFee = cartItems.length > 0 ? SERVICE_FEE : 0;
  const total = subtotal + taxes + serviceFee;

  // Remove booking function
  const handleRemoveBooking = () => {
    localStorage.removeItem('blinkeventz_booking');
    setBookingData(null);
    clearCart();
    toast.info('Booking removed', {
      description: 'Your selected booking has been removed',
    });
  };

  // Remove individual item from cart
  const handleRemoveItem = (itemId: string) => {
    // If it's a booking item (from Book Now), clear booking data
    if (itemId.startsWith('booking-')) {
      localStorage.removeItem('blinkeventz_booking');
      setBookingData(null);
      toast.info('Item removed', {
        description: 'Your selected booking has been removed',
      });
    } else {
      // Remove from cart context (Add to Cart items)
      removeItem(itemId);
      toast.info('Item removed from cart', {
        description: 'The item has been removed from your cart',
      });
    }
  };

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
    if (cartItems.length === 0) {
      toast.error('No items in checkout', {
        description: 'Please select a venue or vendor to proceed with booking',
        duration: 4000,
      });
      return;
    }
    if (validateContactForm()) {
      setCurrentStep("confirm");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleConfirmBooking = () => {
    if (cartItems.length === 0) {
      toast.error('No items in checkout', {
        description: 'Please select a venue or vendor to proceed with booking',
        duration: 4000,
      });
      return;
    }
    if (!acceptTerms) {
      toast.error("Please accept the Terms & Conditions", {
        description: "You need to agree to continue with the payment",
      });
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
    // Check if cart has items
    if (cartItems.length === 0) {
      toast.error('No items in checkout', {
        description: 'Please select a venue or vendor to proceed with booking',
        duration: 4000,
      });
      return;
    }
    // Validate payment details based on selected method
    const newErrors: CheckoutErrors = {};

    if (formData.paymentMethod === "card") {
      // Validate card details
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
      // Validate UPI - either provider selected or UPI ID entered
      if (!formData.upiProvider && !formData.upiId) {
        toast.error("Please select a UPI payment method", {
          description: "Choose a UPI app (Google Pay, PhonePe, etc.) or enter your UPI ID",
        });
        return;
      }
      if (formData.upiId && !/^[a-zA-Z0-9._-]+@[a-zA-Z]+$/.test(formData.upiId)) {
        newErrors.upiId = "Please enter a valid UPI ID (e.g., yourname@upi)";
      }
    }

    if (formData.paymentMethod === "netbanking" && !formData.bankCode) {
      toast.error("Please select your bank", {
        description: "Choose a bank from the list to proceed with net banking",
      });
      return;
    }

    if (formData.paymentMethod === "wallet" && !formData.walletProvider) {
      toast.error("Please select a wallet", {
        description: "Choose a wallet provider to proceed",
      });
      return;
    }

    // Set errors if any
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fill in all required payment details", {
        description: "Complete the highlighted fields to continue",
      });
      return;
    }

    setIsProcessing(true);

    // Simulate payment processing with random success/failure
    setTimeout(() => {
      // Simulate 80% success rate for demo
      const isSuccess = Math.random() > 0.2;

      if (isSuccess) {
        setPaymentSuccess(true);
        toast.success("Payment Accepted!", {
          description: "Your booking has been confirmed. Check your email for details.",
          duration: 5000,
        });
        clearCart();
        localStorage.removeItem('blinkeventz_booking');
        setTimeout(() => {
          router.push("/dashboard/customer");
        }, 2000);
      } else {
        setPaymentSuccess(false);
        toast.error("Payment Rejected", {
          description: "Your payment could not be processed. Please try again with a different payment method.",
          duration: 5000,
        });
      }

      setIsProcessing(false);
    }, 2500);
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
                          placeholder="0000 0000 0000 0000"
                          value={formData.cardNumber}
                          onChange={(e) => handleInputChange("cardNumber", e.target.value)}
                          maxLength={19}
                        />
                        {errors.cardNumber && <p className="text-xs text-red-500">{errors.cardNumber}</p>}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="expiry">Expiry Date *</Label>
                          <Input
                            id="expiry"
                            placeholder="MM/YY"
                            value={formData.expiry}
                            onChange={(e) => handleInputChange("expiry", e.target.value)}
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
                            maxLength={4}
                          />
                          {errors.cvc && <p className="text-xs text-red-500">{errors.cvc}</p>}
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
              <div className="sticky top-24 space-y-4">
                <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                      <span className="font-medium">{formatCurrency(serviceFee)}</span>
                    </div>
                    <div className="border-t pt-3 flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span className="text-purple-600">{formatCurrency(total)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Button
                  onClick={handleContinueToConfirm}
                  size="lg"
                  disabled={cartItems.length === 0}
                  className={`w-full h-14 text-lg shadow-lg transition-all duration-300 ${
                    cartItems.length === 0
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-gradient-to-r from-pink-500 to-purple-600 hover:shadow-xl hover:scale-[1.02]'
                  }`}
                >
                  Continue to Confirm
                  <CheckCircle2 className="ml-2 h-5 w-5" />
                </Button>
              </div>
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
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-700">Selected Services</h4>
                      {cartItems.length > 0 && (
                        <button
                          onClick={handleRemoveBooking}
                          className="text-sm text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <XCircle className="h-4 w-4" />
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="space-y-3">
                      {cartItems.map((item) => (
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
                              {item.metadata?.service && (
                                <span className="text-xs text-gray-500">{item.metadata.service}</span>
                              )}
                            </div>
                            <h5 className="font-semibold text-gray-900">{item.name}</h5>
                            <p className="text-sm text-gray-500">{item.description}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                              {item.metadata?.package && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>{item.metadata.package}</span>
                                </div>
                              )}
                              {item.metadata?.time && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>{item.metadata.time}</span>
                                </div>
                              )}
                              {item.metadata?.service && (
                                <div className="flex items-center gap-1">
                                  <Briefcase className="h-3 w-3" />
                                  <span>{item.metadata.service}</span>
                                </div>
                              )}
                              {(() => {
                                const meta = item.metadata as Record<string, unknown> | undefined;
                                const selectedDate = meta?.selectedDate as string | undefined;
                                const selectedSlot = meta?.selectedSlot as string | undefined;
                                const timeSlotLabel = meta?.timeSlotLabel as string | undefined;
                                const basePrice = meta?.basePrice as number | undefined;
                                if (!selectedDate) return null;
                                return (
                                  <>
                                    <div className="flex items-center gap-1 text-green-600 font-medium">
                                      <Calendar className="h-3 w-3" />
                                      <span>
                                        {new Date(selectedDate).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                                      </span>
                                    </div>
                                    {selectedSlot && (
                                      <div className="flex items-center gap-1 text-green-600">
                                        <Clock className="h-3 w-3" />
                                        <span className="capitalize">{timeSlotLabel || selectedSlot.replace("_", " ")}</span>
                                      </div>
                                    )}
                                    {basePrice && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        Base: ₹{basePrice.toLocaleString("en-IN")} → You paid: ₹{item.price.toLocaleString("en-IN")}
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-purple-600">{formatCurrency(item.price * (item.quantity || 1))}</div>
                            {item.quantity && item.quantity > 1 && (
                              <div className="text-xs text-gray-500">₹{item.price.toLocaleString("en-IN")} × {item.quantity}</div>
                            )}
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              className="mt-2 text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors"
                              aria-label={`Remove ${item.name} from checkout`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {cartItems.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <p>No booking selected</p>
                          <p className="text-sm mt-2">Please select a venue or vendor to proceed with checkout</p>
                        </div>
                      )}
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
                  <div className="flex items-start gap-3 p-4 bg-purple-50/50 rounded-xl border border-purple-100">
                    <input 
                      type="checkbox" 
                      id="terms-checkbox"
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      className="mt-1 h-5 w-5 text-purple-600 rounded border-gray-300 focus:ring-purple-500 cursor-pointer" 
                    />
                    <label htmlFor="terms-checkbox" className="text-sm text-gray-700 leading-relaxed cursor-pointer">
                      I confirm that all details are correct and agree to the{" "}
                      <a href="#" className="text-purple-600 hover:underline font-medium">
                        Terms & Conditions
                      </a>{" "}
                      and{" "}
                      <a href="#" className="text-purple-600 hover:underline font-medium">
                        Cancellation Policy
                      </a>
                    </label>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Summary & Confirm */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-4">
                <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                      <span className="font-medium">{formatCurrency(serviceFee)}</span>
                    </div>
                    <div className="border-t pt-3 flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span className="text-purple-600">{formatCurrency(total)}</span>
                    </div>

                    {/* Trust Badges */}
                    <div className="pt-4 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Best price guarantee</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Secure payment via Razorpay</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Button 
                  onClick={handleConfirmBooking} 
                  size="lg" 
                  className={`w-full h-14 text-lg shadow-lg transition-all duration-300 transform ${
                    acceptTerms 
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:shadow-xl hover:scale-[1.02] hover:from-green-700 hover:to-emerald-700' 
                      : 'bg-gray-300 cursor-not-allowed'
                  }`}
                  disabled={!acceptTerms}
                >
                  <Shield className="mr-2 h-5 w-5" />
                  Confirm & Pay {formatCurrency(total)}
                </Button>

                <Button 
                  onClick={handleBack} 
                  variant="ghost" 
                  className="w-full h-12 hover:bg-gray-100 transition-all duration-300"
                >
                  ← Back to {currentStep === "confirm" ? "Details" : "Payment"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Payment */}
        {currentStep === "payment" && (
          <div className="max-w-2xl mx-auto">
            <Card className="animate-in fade-in zoom-in-95 duration-500">
              <CardHeader>
                <CardTitle className="text-center text-2xl">Complete Your Payment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full mb-6 shadow-lg">
                    <Shield className="h-12 w-12 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">Amount to Pay</h3>
                  <p className="text-5xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent mt-3">{formatCurrency(total)}</p>
                  <p className="text-sm text-gray-500 mt-2">Secure payment powered by Razorpay</p>
                </div>

                <div className="p-5 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                  <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-purple-600" />
                    Payment via
                  </h4>
                  <div className="flex items-center justify-center gap-3">
                    <div className="h-10 px-4 bg-white rounded-lg shadow-sm flex items-center justify-center border border-purple-200">
                      <span className="font-bold text-purple-700">Razorpay</span>
                    </div>
                    <span className="text-gray-400">→</span>
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
                  className="w-full h-16 text-xl shadow-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                      Processing Payment...
                    </>
                  ) : (
                    <>
                      <Shield className="mr-3 h-6 w-6" />
                      Pay {formatCurrency(total)} Securely
                    </>
                  )}
                </Button>

                {/* Payment Status Modal */}
                {paymentSuccess !== null && (
                  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl p-8 max-w-md mx-4 shadow-2xl animate-in zoom-in-95 duration-300">
                      <div className="text-center">
                        {paymentSuccess ? (
                          <>
                            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4 animate-in zoom-in duration-300">
                              <CheckCircle2 className="h-12 w-12 text-green-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-green-600 mb-2">Payment Successful!</h3>
                            <p className="text-gray-600 mb-6">Your booking has been confirmed. Redirecting to dashboard...</p>
                            <div className="w-full bg-green-200 rounded-full h-2 overflow-hidden">
                              <div className="bg-green-600 h-2 rounded-full animate-[progress_2s_ease-in-out_infinite]" style={{ width: '100%' }} />
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4 animate-in zoom-in duration-300">
                              <XCircle className="h-12 w-12 text-red-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-red-600 mb-2">Payment Failed</h3>
                            <p className="text-gray-600 mb-6">Your payment could not be processed. Please try again.</p>
                            <Button 
                              onClick={() => setPaymentSuccess(null)}
                              className="w-full h-12 bg-gradient-to-r from-pink-500 to-purple-600 hover:shadow-lg transition-all duration-300"
                            >
                              Try Again
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

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
