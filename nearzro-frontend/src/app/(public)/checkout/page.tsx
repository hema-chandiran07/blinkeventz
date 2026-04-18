"use client";

import { useState, useSyncExternalStore, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { SmartImage } from "@/components/ui/smart-image";
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
  Calendar,
  Pencil,
} from "lucide-react";
import { UPIProvider, WalletProvider, BankCode, CheckoutFormData, CheckoutErrors, CartItem } from "@/types";
import { toast } from "sonner";
import { useCart } from "@/context/cart-context";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import api from "@/lib/api";

const formatCurrency = (amount: number | string): string => {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(num);
};

interface CheckoutPayload {
  cartId: number;
  items: Array<{
    id: number;
    name: string;
    itemType: string;
    unitPrice: string;
    totalPrice: string;
    quantity: number;
    date?: string;
    timeSlot?: string;
  }>;
  subtotal: string;
  platformFee: string;
  tax: string;
  totalAmount: string;
  status: string;
}

type CheckoutStep = "details" | "confirm" | "payment";

export default function CheckoutPage() {
  const router = useRouter();
  const { isAuthenticated, user: authUser } = useAuth();
  const { items: cartContextItems, clearCart, removeItem } = useCart();
  const [currentStep, setCurrentStep] = useState<CheckoutStep>("details");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingCheckout, setIsLoadingCheckout] = useState(true);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [checkoutPayload, setCheckoutPayload] = useState<CheckoutPayload | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

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

  const [eventDetails, setEventDetails] = useState({
    eventType: "",
    eventTitle: "",
    eventDate: "",
    guestCount: 300,
    specialNotes: "",
  });

  const [promoCode, setPromoCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [errors, setErrors] = useState<CheckoutErrors>({});

  const storedBooking = useSyncExternalStore(
    (subscribe) => {
      const handler = () => subscribe();
      window.addEventListener("storage", handler);
      return () => window.removeEventListener("storage", handler);
    },
    () => localStorage.getItem("NearZro_booking"),
    () => null
  );

  const bookingDataFromStorage = storedBooking ? JSON.parse(storedBooking) : null;

  const bookingCartItem =
  bookingDataFromStorage && bookingDataFromStorage.id && bookingDataFromStorage.price > 0
    ? [
        {
          id: `booking-${bookingDataFromStorage.id}`,
          type: bookingDataFromStorage.type,
          name: bookingDataFromStorage.name,
          description:
            bookingDataFromStorage.type === "venue"
              ? `${bookingDataFromStorage.package || "Full Day"} Package`
              : bookingDataFromStorage.service || "Selected Service",
          price: bookingDataFromStorage.price,
          image:
            bookingDataFromStorage.type === "venue"
              ? "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?ixlib=rb-4.0.3"
              : "https://images.unsplash.com/photo-1555244162-803834f70033?ixlib=rb-4.0.3",
          metadata: {
            package: bookingDataFromStorage.package,
            time: bookingDataFromStorage.time,
            service: bookingDataFromStorage.service,
          },
          quantity: 1,
        },
      ]
    : [];

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const waitForRazorpay = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if ((window as any).Razorpay) {
        resolve();
        return;
      }
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if ((window as any).Razorpay) {
          clearInterval(interval);
          resolve();
        } else if (attempts > 20) {
          clearInterval(interval);
          reject(new Error("Razorpay SDK failed to load"));
        }
      }, 500);
    });
  };

  useEffect(() => {
    if (authUser) {
      const nameParts = authUser.name?.split(' ') || [];
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      setFormData(prev => ({
        ...prev,
        firstName: prev.firstName || firstName,
        lastName: prev.lastName || lastName,
        email: prev.email || authUser.email || '',
      }));
    }
  }, [authUser]);

  useEffect(() => {
    const loadCheckoutData = async () => {
      try {
        setIsLoadingCheckout(true);
        await api.post("/cart/unlock").catch(() => {});
        const response = await api.get("/cart");
        const cartData = response.data;

        if (!cartData?.items?.length && !bookingDataFromStorage) {
          setCheckoutError("Your cart is empty. Please add items before checkout.");
          setIsLoadingCheckout(false);
          return;
        }

        if (!cartData?.items?.length && bookingDataFromStorage) {
          const bookingPrice = bookingDataFromStorage.price || 0;
          setCheckoutPayload({
            cartId: 0,
            items: [],
            subtotal: String(bookingPrice),
            platformFee: String(Math.round(bookingPrice * 0.02)),
            tax: String(Math.round(bookingPrice * 1.02 * 0.18)),
            totalAmount: String(Math.round(bookingPrice * 1.02 * 1.18)),
            status: "PENDING",
          });
          setIsLoadingCheckout(false);
          return;
        }

        setCheckoutPayload({
          cartId: cartData.id,
          items: cartData.items.map((item: any) => ({
            id: item.id,
            name: item.name || "Item",
            itemType: item.itemType,
            unitPrice: String(item.unitPrice),
            totalPrice: String(item.totalPrice),
            quantity: item.quantity,
            date: item.date,
            timeSlot: item.timeSlot,
          })),
          subtotal: cartData.subtotal,
          platformFee: cartData.platformFee,
          tax: cartData.tax,
          totalAmount: cartData.totalAmount,
          status: "PENDING",
        });
      } catch (error: any) {
        console.error("Failed to load checkout:", error);
        setCheckoutError(error.response?.data?.message || "Failed to load cart. Please refresh.");
      } finally {
        setIsLoadingCheckout(false);
      }
    };
    loadCheckoutData();
  }, []);

  useEffect(() => {
    return () => {
      if (checkoutPayload && paymentSuccess === null) {
        api.post("/cart/unlock").catch(() => {});
      }
    };
  }, [checkoutPayload, paymentSuccess]);

  const cartItems = [...cartContextItems, ...bookingCartItem];

  const backendSubtotal = checkoutPayload ? parseFloat(checkoutPayload.subtotal) : 0;
  const backendPlatformFee = checkoutPayload ? parseFloat(checkoutPayload.platformFee) : 0;
  const backendTax = checkoutPayload ? parseFloat(checkoutPayload.tax) : 0;
  const total = checkoutPayload ? parseFloat(checkoutPayload.totalAmount) : 0;

  const displaySubtotal = checkoutPayload
    ? backendSubtotal
    : cartItems.reduce(
        (sum, item) => sum + parseFloat(String((item as any).totalPrice || (item as any).unitPrice || (item as any).price || 0)),
        0
      );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <XCircle className="h-8 w-8 text-red-400" />
          </div>
          <h2 className="text-2xl font-medium tracking-tight text-white">Login Required</h2>
          <p className="text-zinc-500 mb-6">Please login to complete your checkout</p>
          <Button
            onClick={() => router.push("/login")}
            className="h-12 px-8 bg-zinc-100 text-zinc-950 font-semibold rounded-2xl transition-all duration-300 hover:bg-white hover:shadow-[0_0_30px_-5px_rgba(255,255,255,0.3)] active:scale-95"
          >
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  if (isLoadingCheckout) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-zinc-400" />
          <h2 className="text-2xl font-medium tracking-tight text-white">Loading checkout...</h2>
          <p className="text-zinc-500">Preparing your secure payment</p>
        </div>
      </div>
    );
  }

  if (checkoutError) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <XCircle className="h-8 w-8 text-red-400" />
          </div>
          <h2 className="text-2xl font-medium tracking-tight text-white">Checkout Error</h2>
          <p className="text-zinc-500">{checkoutError}</p>
          <Button
            onClick={() => router.push("/cart")}
            className="h-12 px-8 bg-zinc-100 text-zinc-950 font-semibold rounded-2xl transition-all duration-300 hover:bg-white hover:shadow-[0_0_30px_-5px_rgba(255,255,255,0.3)] active:scale-95"
          >
            Go to Cart
          </Button>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <div className="w-24 h-24 rounded-3xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center">
            <ShoppingBag className="h-12 w-12 text-zinc-600" />
          </div>
          <h2 className="text-2xl font-medium tracking-tight text-white">Your cart is empty</h2>
          <p className="text-zinc-500 mb-6">Add venues or vendors to your cart before checkout</p>
          <Button
            onClick={() => router.push("/venues")}
            className="h-12 px-8 bg-zinc-100 text-zinc-950 font-semibold rounded-2xl transition-all duration-300 hover:bg-white hover:shadow-[0_0_30px_-5px_rgba(255,255,255,0.3)] active:scale-95"
          >
            Browse Venues
          </Button>
        </div>
      </div>
    );
  }

  const validateContactForm = (): boolean => {
    const newErrors: CheckoutErrors = {};

    if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
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
      const checkoutResponse = await api.post(
        "/cart/checkout",
        {},
        {
          headers: { "Idempotency-Key": `checkout-${Date.now()}` },
        }
      );
      const lockedPayload = checkoutResponse.data;

      const paymentAmount = Math.round(parseFloat(lockedPayload.totalAmount) * 100);

      const orderResponse = await api.post("/payments/create-order-simple", {
        amount: Math.round(paymentAmount / 100),
        currency: "INR",
        cartId: lockedPayload.cartId,
      });

      const order = orderResponse.data;

      const razorpayKey =
          process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
          order.razorpayKey ||
          "rzp_test_SdeDiDMfA7Gt1y";

      await waitForRazorpay();

      const options = {
        key: razorpayKey,
        amount: paymentAmount,
        currency: "INR",
        name: "NearZro",
        description: "Event Booking Payment",
        order_id: order.id,
        handler: async (response: any) => {
          try {
            const venueItem =
              bookingDataFromStorage ||
              cartItems.find((item) => "type" in item && item.type === "venue");
            if (venueItem) {
              const venueId =
                ("metadata" in venueItem && venueItem.metadata?.venueId) ||
                (bookingDataFromStorage?.id ? parseInt(bookingDataFromStorage.id) : null);
              const dateStr =
                ("metadata" in venueItem && venueItem.metadata?.selectedDate) || eventDetails.eventDate;
              const timeSlot =
                ("metadata" in venueItem && venueItem.metadata?.timeSlot) || "evening";

              if (venueId && dateStr) {
                try {
                  await api.post("/booking/create", {
                    venueId,
                    date: dateStr,
                    timeSlot:
                      timeSlot === "morning"
                        ? "morning"
                        : timeSlot === "full_day"
                        ? "full_day"
                        : timeSlot === "night"
                        ? "night"
                        : "evening",
                  });
                  toast.success("Booking created successfully!");
                } catch (bookingError) {
                  console.error("Booking creation error:", bookingError);
                  toast.warning("Payment successful but booking creation failed. Please contact support.");
                }
              }
            }

            await api.post("/payments/confirm", {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              items: cartItems,
              customerDetails: formData,
            });

            setPaymentSuccess(true);
            toast.success("Payment Successful! Your booking is confirmed.");
            clearCart();
            localStorage.removeItem("NearZro_booking");

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
        theme: { color: "#1a1a1a" },
        modal: {
          ondismiss: async () => {
            await api.post("/cart/unlock").catch(() => {});
            setIsProcessing(false);
            toast.info("Payment cancelled");
          },
        },
      };

      if (typeof window === "undefined" || !(window as any).Razorpay) {
        throw new Error("Razorpay SDK not loaded");
      }

      const rzp1 = new (window as any).Razorpay(options);
      rzp1.on("payment.failed", async (response: any) => {
        await api.post("/cart/unlock").catch(() => {});
        setPaymentSuccess(false);
        setIsProcessing(false);
        toast.error(`Payment Failed: ${response.error.description || "Please try again"}`);
      });
      rzp1.open();
    } catch (error: any) {
      console.error("Payment initiation error:", error);
      await api.post("/cart/unlock").catch(() => {});
      setIsProcessing(false);
      const message = error.response?.data?.message || error.message || "Payment failed";
      toast.error(`Payment Error: ${message}`);
    }
  };

  const handleApplyPromoCode = () => {
    if (!promoCode.trim()) {
      toast.error("Please enter a promo code");
      return;
    }
    if (promoCode.toUpperCase() === "WELCOME10") {
      setDiscount(0.1);
      toast.success("Promo code applied! 10% discount");
    } else {
      toast.error("Invalid promo code");
    }
  };

  const handleRemoveItem = (itemId: string) => {
    if (itemId.startsWith("booking-")) {
      localStorage.removeItem("NearZro_booking");
      toast.info("Booking removed");
    } else {
      removeItem(itemId);
      toast.info("Item removed from cart");
    }
  };

  const handleClearCart = () => {
    clearCart();
    localStorage.removeItem("NearZro_booking");
    toast.info("Cart cleared");
  };

  const steps = ["details", "confirm", "payment"];

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Back Button */}
          {currentStep !== "details" && (
            <Button
              variant="ghost"
              onClick={handleBack}
              className="mb-4 gap-2 text-zinc-400 hover:text-white transition-all duration-300"
            >
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
                    className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all duration-300 ${
                      currentStep === item.step
                        ? "bg-zinc-100 text-zinc-950"
                        : steps.indexOf(currentStep) > index
                        ? "bg-green-500 text-white"
                        : "bg-white/[0.05] text-zinc-500"
                    }`}
                  >
                    {steps.indexOf(currentStep) > index ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      item.icon
                    )}
                  </div>
                  <span
                    className={`ml-2 text-sm font-medium ${
                      currentStep === item.step ? "text-white" : "text-zinc-500"
                    }`}
                  >
                    {item.label}
                  </span>
                  {index < arr.length - 1 && (
                    <div
                      className={`w-16 h-1 mx-4 ${
                        steps.indexOf(currentStep) > index ? "bg-green-500" : "bg-white/[0.05]"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <h1 className="text-3xl font-medium tracking-tight text-white mb-2 text-center">
            Secure Checkout
          </h1>
          <p className="text-center text-zinc-500 mb-8">
            Complete your booking with Razorpay secure payment
          </p>

          {/* Step 1: Contact Details */}
          {currentStep === "details" && (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                {/* Contact Information */}
                <div className="bg-white/[0.02] border border-white/[0.05] backdrop-blur-3xl rounded-3xl p-6">
                  <h3 className="text-lg font-medium tracking-tight text-white flex items-center gap-2 mb-6">
                    <Smartphone className="h-5 w-5 text-zinc-400" />
                    Contact Information
                  </h3>
                  <div className="space-y-4">
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
                        {errors.firstName && (
                          <p className="text-xs text-red-400">{errors.firstName}</p>
                        )}
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
                        {errors.lastName && (
                          <p className="text-xs text-red-400">{errors.lastName}</p>
                        )}
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
                      {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
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
                      {errors.phone && <p className="text-xs text-red-400">{errors.phone}</p>}
                    </div>
                  </div>
                </div>

                {/* Event Details */}
                <div className="bg-white/[0.02] border border-white/[0.05] backdrop-blur-3xl rounded-3xl p-6">
                  <h3 className="text-lg font-medium tracking-tight text-white flex items-center gap-2 mb-6">
                    <Calendar className="h-5 w-5 text-zinc-400" />
                    Event Details
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="eventType">Event Type *</Label>
                        <select
                          id="eventType"
                          value={eventDetails.eventType}
                          onChange={(e) =>
                            setEventDetails({ ...eventDetails, eventType: e.target.value })
                          }
                          className="flex h-10 w-full rounded-md border border-white/10 bg-white/[0.05] text-white px-3 py-2 text-sm"
                        >
                          <option value="">Select event type</option>
                          <option value="WEDDING">Wedding</option>
                          <option value="ENGAGEMENT">Engagement</option>
                          <option value="RECEPTION">Reception</option>
                          <option value="BIRTHDAY">Birthday</option>
                          <option value="CORPORATE">Corporate Event</option>
                          <option value="PRIVATE">Private Party</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="eventDate">Event Date *</Label>
                        <Input
                          id="eventDate"
                          type="date"
                          value={eventDetails.eventDate}
                          onChange={(e) =>
                            setEventDetails({ ...eventDetails, eventDate: e.target.value })
                          }
                          className="border-white/10 bg-white/[0.05] text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="eventTitle">Event Title</Label>
                        <Input
                          id="eventTitle"
                          placeholder="e.g., Priya & Karthik Wedding"
                          value={eventDetails.eventTitle}
                          onChange={(e) =>
                            setEventDetails({ ...eventDetails, eventTitle: e.target.value })
                          }
                          className="border-white/10 bg-white/[0.05] text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="guestCount">Expected Guest Count</Label>
                        <Input
                          id="guestCount"
                          type="number"
                          min="1"
                          value={eventDetails.guestCount}
                          onChange={(e) =>
                            setEventDetails({
                              ...eventDetails,
                              guestCount: parseInt(e.target.value) || 1,
                            })
                          }
                          className="border-white/10 bg-white/[0.05] text-white"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="specialNotes">Special Notes or Requirements</Label>
                      <textarea
                        id="specialNotes"
                        rows={3}
                        placeholder="Any special requirements..."
                        value={eventDetails.specialNotes}
                        onChange={(e) =>
                          setEventDetails({ ...eventDetails, specialNotes: e.target.value })
                        }
                        className="flex min-h-[80px] w-full rounded-md border border-white/10 bg-white/[0.05] text-white px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>
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
                        <div
                          key={item.id}
                          className="flex gap-3 items-start p-2 rounded-lg hover:bg-silver-50 transition-colors"
                        >
                          <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-silver-200 to-silver-400 flex items-center justify-center flex-shrink-0 overflow-hidden relative">
                            {"image" in item && item.image ? (
                              <Image
                                src={item.image as string}
                                alt={item.name}
                                fill
                                className="object-cover"
                              />
                            ) : ("type" in item && item.type === "venue") ||
                              ("itemType" in item && item.itemType === "VENUE") ? (
                              <svg
                                className="h-8 w-8 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.5}
                                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                />
                              </svg>
                            ) : (
                              <svg
                                className="h-8 w-8 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.5}
                                  d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-black truncate">{item.name}</p>
                            <p className="text-xs text-neutral-500">
                              {(item as any).type || (item as any).itemType || "Item"} ×{" "}
                              {item.quantity || 1}
                            </p>
                            <div className="flex items-center justify-between mt-1">
                              <span className="font-semibold text-sm text-black">
                                {formatCurrency(parseFloat(String((item as any).totalPrice || (item as any).price || 0)))}
                              </span>
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
                        <span className="font-medium text-black">
                          {formatCurrency(checkoutPayload?.subtotal || displaySubtotal)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-black font-medium">GST (18%)</span>
                        <span className="font-medium text-black">
                          {formatCurrency(checkoutPayload?.tax || backendTax)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-black font-medium">Platform Fee</span>
                        <span className="font-medium text-black">
                          {formatCurrency(checkoutPayload?.platformFee || backendPlatformFee)}
                        </span>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span className="font-medium">Discount</span>
                          <span className="font-medium">-{formatCurrency(total * discount)}</span>
                        </div>
                      )}
                      <div className="border-t pt-2 flex justify-between font-bold text-lg">
                        <span className="text-black">Total</span>
                        <span className="text-black">
                          {formatCurrency(checkoutPayload?.totalAmount || total)}
                        </span>
                      </div>
                    </div>

                    {/* Promo Code */}
                    <div className="pt-4 border-t">
                      <div className="flex gap-2 mb-2">
                        <Input
                          placeholder="Enter promo code"
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value)}
                          className="flex-1 border-neutral-300"
                        />
                        <Button variant="outline" onClick={handleApplyPromoCode} className="border-black">
                          Apply
                        </Button>
                      </div>
                      <p className="text-xs text-neutral-600">Try "WELCOME10" for 10% off!</p>
                    </div>

                    <Button
                      onClick={handleContinueToConfirm}
                      className="w-full h-12 text-base font-semibold bg-zinc-100 text-zinc-950 rounded-2xl transition-all duration-300 hover:bg-white hover:shadow-[0_0_30px_-5px_rgba(255,255,255,0.3)] active:scale-95"
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
                    <div className="flex items-center justify-between w-full">
                      <CardTitle className="flex items-center gap-2">
                        <ShoppingBag className="h-5 w-5 text-neutral-800" />
                        Order Items
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentStep("details")}
                        className="text-zinc-500 hover:text-white"
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {cartItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex gap-4 items-center p-4 rounded-lg border border-silver-200 hover:border-silver-300 hover:bg-silver-50 transition-all"
                      >
                        <div className="h-20 w-20 rounded-lg bg-gradient-to-br from-silver-200 to-silver-400 flex items-center justify-center flex-shrink-0 overflow-hidden relative">
                          {"image" in item && item.image ? (
                            <Image
                              src={item.image as string}
                              alt={item.name}
                              fill
                              className="object-cover"
                            />
                          ) : ("type" in item && item.type === "venue") ||
                            ("itemType" in item && item.itemType === "VENUE") ? (
                            <svg
                              className="h-10 w-10 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="h-10 w-10 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                              />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 text-xs font-medium bg-silver-200 text-neutral-800 rounded-full capitalize">
                              {(item as any).type
                                ? (item as any).type.replace("_", " ")
                                : (item as any).itemType
                                ? (item as any).itemType.replace("_", " ")
                                : "Item"}
                            </span>
                            {(item as any).metadata?.package && (
                              <span className="text-xs text-black">
                                {(item as any).metadata.package}
                              </span>
                            )}
                          </div>
                          <h4 className="font-semibold text-black">{item.name}</h4>
                          <p className="text-sm text-black">Quantity: {item.quantity || 1}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg text-black">
                            {formatCurrency(parseFloat(String((item as any).totalPrice || (item as any).price || 0)))}
                          </p>
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
                      <Button
                        variant="ghost"
                        onClick={handleClearCart}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Clear All Items
                      </Button>
                      <p className="text-sm text-black">
                        {cartItems.length} item{cartItems.length !== 1 ? "s" : ""} in cart
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between w-full">
                      <CardTitle className="flex items-center gap-2">
                        <Smartphone className="h-5 w-5 text-neutral-800" />
                        Contact Information
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentStep("details")}
                        className="text-zinc-500 hover:text-white"
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-black text-sm font-medium">Full Name</Label>
                        <p className="font-medium text-black">
                          {formData.firstName} {formData.lastName}
                        </p>
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
                    I agree to the <span className="font-medium">Terms of Service</span> and{" "}
                    <span className="font-medium">Privacy Policy</span>. I understand that payments are
                    processed securely through Razorpay.
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
                        <span className="font-medium text-black">
                          {formatCurrency(checkoutPayload?.subtotal || displaySubtotal)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-black font-medium">GST (18%)</span>
                        <span className="font-medium text-black">
                          {formatCurrency(checkoutPayload?.tax || backendTax)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-black font-medium">Platform Fee</span>
                        <span className="font-medium text-black">
                          {formatCurrency(checkoutPayload?.platformFee || backendPlatformFee)}
                        </span>
                      </div>
                      <div className="border-t pt-3 flex justify-between font-bold text-lg">
                        <span className="text-black">Total</span>
                        <span className="text-black">
                          {formatCurrency(checkoutPayload?.totalAmount || total)}
                        </span>
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
            <div className="max-w-2xl mx-auto">
            <div className="bg-white/[0.02] border border-white/[0.05] backdrop-blur-3xl rounded-3xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-medium tracking-tight text-white flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-zinc-400" />
                  Complete Payment
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="text-zinc-500 hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              </div>
              <div className="space-y-6">
                {paymentSuccess === null ? (
                  <>
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xl">₹</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-blue-900">Payment Amount</h3>
                          <p className="text-2xl font-bold text-blue-900 mt-1">
                            {formatCurrency(checkoutPayload?.totalAmount || total)}
                          </p>
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
                    <h2 className="text-3xl font-bold text-white mb-2">Payment Successful!</h2>
                    <p className="text-zinc-300 mb-6">
                      Your booking has been confirmed. Check your email for details.
                    </p>
                    <p className="text-sm text-zinc-500">Redirecting to dashboard...</p>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <XCircle className="h-20 w-20 text-red-400 mx-auto mb-6" />
                    <h2 className="text-3xl font-medium tracking-tight text-white mb-2">
                      Payment Failed
                    </h2>
                    <p className="text-zinc-400 mb-6">
                      Your payment could not be processed. Please try again with a different payment
                      method.
                    </p>
                    <Button
                      onClick={handlePayment}
                      className="h-12 px-8 bg-zinc-100 text-zinc-950 font-semibold rounded-2xl transition-all duration-300 hover:bg-white hover:shadow-[0_0_30px_-5px_rgba(255,255,255,0.3)] active:scale-95"
                    >
                      Try Again
                    </Button>
                  </div>
)}
              </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}