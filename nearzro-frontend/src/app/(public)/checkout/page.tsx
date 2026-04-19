"use client";

import { useState, useSyncExternalStore, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  ShoppingBag,
  Calendar,
  Zap,
} from "lucide-react";
import { CheckoutFormData, CheckoutErrors } from "@/types";
import { toast } from "sonner";
import axios from "axios";
import { useCart } from "@/context/cart-context";
import { useAuth } from "@/context/auth-context";
import api from "@/lib/api";
import Script from "next/script";
import { motion } from "framer-motion";

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
  isExpress?: boolean;
  expressFee?: string;
  status: string;
}

interface Settings {
  deliveryFee: number;
  platformFee: number;
  taxRate: number;
  minOrderAmount: number;
}

type CheckoutStep = "details" | "confirm" | "payment";

export default function CheckoutPage() {
  const router = useRouter();
  const { isAuthenticated, user: authUser } = useAuth();
  const { items: cartContextItems, clearCart } = useCart();
  const [currentStep, setCurrentStep] = useState<CheckoutStep>("details");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingCheckout, setIsLoadingCheckout] = useState(true);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [checkoutPayload, setCheckoutPayload] = useState<CheckoutPayload | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const [settings, setSettings] = useState<Settings>({
    deliveryFee: 0,
    platformFee: 0.02,
    taxRate: 0.18,
    minOrderAmount: 0,
  });

  const [formData, setFormData] = useState<CheckoutFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  const [eventDetails, setEventDetails] = useState({
    eventType: "",
    eventTitle: "",
    eventDate: "",
    guestCount: 300,
    specialNotes: "",
  });

   const [promoCode, setPromoCode] = useState("");
   const [errors, setErrors] = useState<CheckoutErrors>({});

   const isStep1Valid = Boolean(
     formData.firstName?.trim() &&
     formData.email?.trim() &&
     formData.phone?.trim() &&
     eventDetails.eventType?.trim() &&
     eventDetails.eventDate
   );

   useEffect(() => {
     loadSettings();
     loadCheckoutData();
   }, []);

  const loadSettings = async () => {
    try {
      const { data } = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/settings/fees`
      );
      setSettings({
        deliveryFee: data.deliveryFee ?? 0,
        platformFee: data.platformFee ?? 0.02,
        taxRate: data.taxRate ?? 0.18,
        minOrderAmount: data.minOrderAmount ?? 0,
      });
    } catch (error: any) {
      console.error('[Checkout] Failed to load fee settings:', error);
      toast.error('Unable to load pricing information. Showing estimated fees.', { duration: 6000 });
    }
  };

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

  useEffect(() => {
    if (authUser) {
      const nameParts = authUser.name?.split(' ') || [];
      setFormData(prev => ({
        ...prev,
        firstName: prev.firstName || nameParts[0] || '',
        lastName: prev.lastName || nameParts.slice(1).join(' ') || '',
        email: prev.email || authUser.email || '',
      }));
    }
  }, [authUser]);

  const loadCheckoutData = async () => {
    try {
      setIsLoadingCheckout(true);
      await api.post("/cart/unlock").catch(() => {});
      const response = await api.get("/cart");
      const cartData = response.data;

      if (!cartData?.items?.length && !bookingDataFromStorage) {
        setCheckoutError("Your cart is empty.");
        setIsLoadingCheckout(false);
        return;
      }

      if (!cartData?.items?.length && bookingDataFromStorage) {
        const bookingPrice = bookingDataFromStorage.price || 0;
        setCheckoutPayload({
          cartId: 0,
          items: [],
          subtotal: String(bookingPrice),
          platformFee: String(Math.round(bookingPrice * settings.platformFee)),
          tax: String(Math.round((bookingPrice + bookingPrice * settings.platformFee) * settings.taxRate)),
          totalAmount: String(Math.round(bookingPrice * (1 + settings.platformFee) * (1 + settings.taxRate))),
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
        isExpress: cartData.isExpress,
        expressFee: cartData.expressFee,
        status: "PENDING",
      });
    } catch (error: any) {
      console.error("Failed to load checkout:", error);
      setCheckoutError("Failed to load cart. Please refresh.");
    } finally {
      setIsLoadingCheckout(false);
    }
  };

  const deduplicatedItems: any[] = [...cartContextItems];
  (checkoutPayload?.items || []).forEach(apiItem => {
    if (!deduplicatedItems.find(cItem => String(cItem.id) === String(apiItem.id))) {
      deduplicatedItems.push(apiItem);
    }
  });

  const cartItems = deduplicatedItems;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof CheckoutErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateDetails = (): boolean => {
    const newErrors: CheckoutErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = "Invalid email";
    if (!formData.phone.trim()) newErrors.phone = "Phone is required";
    else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) newErrors.phone = "Invalid phone";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinueToConfirm = () => {
    if (validateDetails()) {
      setCurrentStep("confirm");
    }
  };

  const handleContinueToPayment = () => {
    if (!acceptTerms) {
      toast.error("Please accept the terms and conditions");
      return;
    }
    setCurrentStep("payment");
  };

   const initiateRazorpayPayment = async () => {
     if (!checkoutPayload) return;

     setIsProcessing(true);

     try {
       const { data } = await api.post('/payments/create-order', {
         cartId: Number(checkoutPayload.cartId)
       });

       const order = data;

      const cleanItems = cartItems
        .filter((item: any) => item !== null && item !== undefined)
        .map((item: any) => ({
          id: Number(item.id),
          type: item.type || item.itemType || 'VENUE',
          venueId: item.venueId ? Number(item.venueId) : Number(item.id),
          vendorServiceId: item.vendorServiceId ? Number(item.vendorServiceId) : undefined,
          date: item.date,
          timeSlot: item.timeSlot || 'FULL_DAY',
          price: Number(item.price || 0),
          quantity: Number(item.quantity || 1),
        }));

      const pureItems = JSON.parse(JSON.stringify(cleanItems));

      if (typeof window === "undefined" || !(window as any).Razorpay) {
        throw new Error("Razorpay SDK not loaded");
      }

      const rzp1 = new (window as any).Razorpay({
        key: order.razorpayKey || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "NearZro",
        description: "Event Booking Payment",
        order_id: order.id,
        handler: async (response: any) => {
          try {
            await api.post("/payments/confirm", {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              items: pureItems,
              customerDetails: formData,
            });

            setPaymentSuccess(true);
            toast.success("PAYMENT SECURED. EVENT CONFIRMED.");
            
            try {
              await clearCart();
            } catch (clearError) {
              console.warn("Cart clear failed (non-critical):", clearError);
            }
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
        theme: { color: "#000000" },
        modal: {
          ondismiss: async () => {
            await api.post("/cart/unlock").catch(() => {});
            setIsProcessing(false);
            toast.info("Payment cancelled");
          },
        },
      });

      rzp1.on("payment.failed", async (response: any) => {
        await api.post("/cart/unlock").catch(() => {});
        setPaymentSuccess(false);
        setIsProcessing(false);
        toast.error(`PAYMENT FAILED: ${response.error.description || "Please try again"}`);
      });

       rzp1.open();
     } catch (error: any) {
       console.error("Payment initiation error:", error);
       await api.post("/cart/unlock").catch(() => {});
       toast.error(error.message || "Failed to initiate payment");
       setIsProcessing(false);
     }
   };

  const subtotal = parseFloat(checkoutPayload?.subtotal || "0");
  const platformFee = parseFloat(checkoutPayload?.platformFee || "0");
  const tax = parseFloat(checkoutPayload?.tax || "0");
  const total = parseFloat(checkoutPayload?.totalAmount || "0");
  const expressFee = checkoutPayload?.isExpress ? parseFloat(checkoutPayload.expressFee || "0") : 0;

  const isDetails = currentStep === "details";
  const isConfirm = currentStep === "confirm";
  const isPayment = currentStep === "payment";

  const stepTextClass = (isActive: boolean) => isActive ? "text-white" : "text-zinc-500";
  const stepCircleClass = (isActive: boolean) => isActive ? "bg-white text-black border-white" : "border-zinc-700";

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center gap-4">
        <div className={stepTextClass(true)}>
          <div className={`w-8 h-8 flex items-center justify-center border ${stepCircleClass(true)}`}>1</div>
          <span className="uppercase text-xs font-medium tracking-wider mt-1 block">DETAILS</span>
        </div>
        <div className="w-8 h-px bg-zinc-800" />
        <div className={stepTextClass(isConfirm || isPayment)}>
          <div className={`w-8 h-8 flex items-center justify-center border ${stepCircleClass(isConfirm || isPayment)}`}>2</div>
          <span className="uppercase text-xs font-medium tracking-wider mt-1 block">REVIEW</span>
        </div>
        <div className="w-8 h-px bg-zinc-800" />
        <div className={stepTextClass(isPayment)}>
          <div className={`w-8 h-8 flex items-center justify-center border ${stepCircleClass(isPayment)}`}>3</div>
          <span className="uppercase text-xs font-medium tracking-wider mt-1 block">PAY</span>
        </div>
      </div>
    </div>
  );

   const renderOrderSummary = () => (
     <div className="bg-gradient-to-b from-zinc-900/80 to-zinc-950 border border-zinc-800 rounded-2xl p-6 sm:p-8 sticky top-8">
       <h2 className="text-xl font-bold text-white tracking-tight mb-6">ORDER SUMMARY</h2>

       <div className="space-y-4 mb-6">
         {cartItems.map((item: any, index: number) => (
            <div key={item.id || index} className="flex items-center gap-4 p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl">
              {/* SINGLE IMAGE CONTAINER */}
              <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-white/10 bg-zinc-800 flex items-center justify-center">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <ShoppingBag className="w-6 h-6 text-zinc-500" />
                )}
              </div>
              
              {/* ITEM DETAILS */}
              <div className="flex-1 min-w-0">
                <h4 className="text-white text-sm font-semibold truncate">{item.name}</h4>
                <p className="text-zinc-400 text-xs mt-0.5">• {item.type || item.itemType || 'EVENT'}
                  {item.timeSlot ? ` | ${item.timeSlot}` : ''}
                </p>
              </div>
              
              {/* PRICE */}
              <div className="text-right">
                <p className="text-white font-medium">₹{Number(item.totalPrice || item.price || 0).toFixed(2)}</p>
              </div>
            </div>
         ))}
       </div>

      <div className="space-y-3 border-t border-zinc-800 pt-4">
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">Subtotal</span>
          <span className="text-white font-medium">{formatCurrency(subtotal)}</span>
        </div>
         {checkoutPayload?.isExpress && (
           <div className="flex justify-between text-sm">
             <span className="text-zinc-400 flex items-center gap-1">
               <Zap className="h-3 w-3 text-yellow-500 animate-pulse" /> Express Fee
             </span>
             <span className="text-white font-medium">{formatCurrency(expressFee)}</span>
           </div>
         )}
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">Platform Fee ({(settings.platformFee * 100).toFixed(0)}%)</span>
          <span className="text-white font-medium">{formatCurrency(platformFee)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">GST ({(settings.taxRate * 100).toFixed(0)}%)</span>
          <span className="text-white font-medium">{formatCurrency(tax)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold pt-3 border-t border-zinc-800">
          <span className="text-white">Total</span>
          <span className="text-white">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );

  if (isLoadingCheckout) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-white mx-auto mb-4" />
          <p className="text-zinc-400 font-medium">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (checkoutError) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          <ShoppingBag className="h-16 w-16 text-zinc-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white tracking-tight mb-2">{checkoutError}</h2>
          <Button
            onClick={() => router.push("/cart")}
            className="bg-white text-black font-bold uppercase tracking-wider rounded-none py-4 px-8 mt-4"
          >
            RETURN TO CART
          </Button>
        </div>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center max-w-lg px-4">
          <div className="w-20 h-20 bg-white text-black rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 className="h-12 w-12" />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight mb-4">PAYMENT SECURED</h1>
          <p className="text-xl text-zinc-400 mb-8">EVENT CONFIRMED</p>
          <p className="text-zinc-500 mb-8">Redirecting to your dashboard...</p>
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500 mx-auto" />
        </div>
      </div>
    );
  }

   return (
     <div className="min-h-screen bg-zinc-950">
       <style jsx>{`
         @keyframes shimmer {
           0% { transform: translateX(-100%); }
           100% { transform: translateX(100%); }
         }
         .animate-shimmer {
           animation: shimmer 2s infinite;
         }
       `}</style>
       <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
       <motion.div
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ duration: 0.6, ease: "easeOut" }}
         className="max-w-7xl mx-auto px-4 py-8"
       >
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">CHECKOUT</h1>
        </div>

        {renderStepIndicator()}

        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8">
            {currentStep === "details" && (
              <div className="space-y-6">
                 <div className="bg-gradient-to-b from-zinc-900/80 to-zinc-950 border border-zinc-800 rounded-2xl p-6">
                   <h2 className="text-xl font-bold text-white tracking-tight mb-6">CONTACT DETAILS</h2>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                       <Label className="text-zinc-400 text-sm uppercase tracking-wider">First Name</Label>
                       <Input
                         name="firstName"
                         value={formData.firstName}
                         onChange={handleInputChange}
                         className="bg-zinc-900/50 border-white/10 text-white focus:border-white/50 focus:ring-1 focus:ring-white/20 transition-all duration-500 rounded-xl px-4 py-3 mt-1"
                         placeholder="First Name"
                       />
                       {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                     </div>
                     <div>
                       <Label className="text-zinc-400 text-sm uppercase tracking-wider">Last Name</Label>
                       <Input
                         name="lastName"
                         value={formData.lastName}
                         onChange={handleInputChange}
                         className="bg-zinc-900/50 border-white/10 text-white focus:border-white/50 focus:ring-1 focus:ring-white/20 transition-all duration-500 rounded-xl px-4 py-3 mt-1"
                         placeholder="Last Name"
                       />
                       {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
                     </div>
                     <div>
                       <Label className="text-zinc-400 text-sm uppercase tracking-wider">Email</Label>
                       <Input
                         name="email"
                         type="email"
                         value={formData.email}
                         onChange={handleInputChange}
                         className="bg-zinc-900/50 border-white/10 text-white focus:border-white/50 focus:ring-1 focus:ring-white/20 transition-all duration-500 rounded-xl px-4 py-3 mt-1"
                         placeholder="Email Address"
                       />
                       {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                     </div>
                     <div>
                       <Label className="text-zinc-400 text-sm uppercase tracking-wider">Phone</Label>
                       <Input
                         name="phone"
                         value={formData.phone}
                         onChange={handleInputChange}
                         className="bg-zinc-900/50 border-white/10 text-white focus:border-white/50 focus:ring-1 focus:ring-white/20 transition-all duration-500 rounded-xl px-4 py-3 mt-1"
                         placeholder="Phone Number"
                       />
                       {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                     </div>
                   </div>
                 </div>

                 <div className="bg-gradient-to-b from-zinc-900/80 to-zinc-950 border border-zinc-800 rounded-2xl p-6">
                   <h2 className="text-xl font-bold text-white tracking-tight mb-6">EVENT DETAILS</h2>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                       <Label className="text-zinc-400 text-sm uppercase tracking-wider">Event Type</Label>
                         <Input
                         value={eventDetails.eventType}
                         onChange={(e) => setEventDetails(prev => ({ ...prev, eventType: e.target.value }))}
                         className="bg-zinc-900/50 border-white/10 text-white focus:border-white/50 focus:ring-1 focus:ring-white/20 transition-all duration-500 rounded-xl px-4 py-3 mt-1"
                         placeholder="Wedding, Birthday, Corporate..."
                       />
                     </div>
                     <div>
                       <Label className="text-zinc-400 text-sm uppercase tracking-wider">Event Date</Label>
                       <Input
                         type="date"
                         value={eventDetails.eventDate}
                         onChange={(e) => setEventDetails(prev => ({ ...prev, eventDate: e.target.value }))}
                         className="bg-zinc-900/50 border-white/10 text-white focus:border-white/50 focus:ring-1 focus:ring-white/20 transition-all duration-500 rounded-xl px-4 py-3 mt-1"
                       />
                     </div>
                     <div className="md:col-span-2">
                       <Label className="text-zinc-400 text-sm uppercase tracking-wider">Special Notes</Label>
                       <Input
                         value={eventDetails.specialNotes}
                         onChange={(e) => setEventDetails(prev => ({ ...prev, specialNotes: e.target.value }))}
                         className="bg-zinc-900/50 border-white/10 text-white focus:border-white/50 focus:ring-1 focus:ring-white/20 transition-all duration-500 rounded-xl px-4 py-3 mt-1"
                         placeholder="Any special requirements..."
                       />
                     </div>
                   </div>
                 </div>

                <Button
                  onClick={handleContinueToConfirm}
                  disabled={!isStep1Valid}
                  className={`relative overflow-hidden group bg-white text-black font-bold uppercase tracking-wider py-5 flex items-center justify-center gap-2 transition-all ${
                    !isStep1Valid ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'
                  }`}
                >
                  <span className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                  CONTINUE TO REVIEW
                  <ArrowRight className="h-5 w-5 relative z-10" />
                </Button>
              </div>
            )}

            {currentStep === "confirm" && (
              <div className="space-y-6">
                <div className="bg-gradient-to-b from-zinc-900/80 to-zinc-950 border border-zinc-800 rounded-2xl p-6">
                  <h2 className="text-xl font-bold text-white tracking-tight mb-6">ORDER REVIEW</h2>
                  <div className="space-y-4">
                    {cartItems.map((item: any, index: number) => (
                      <div key={item.id || index} className="flex items-center gap-4 p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                        {/* SINGLE IMAGE CONTAINER */}
                        <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-white/10 bg-zinc-800 flex items-center justify-center">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <ShoppingBag className="w-6 h-6 text-zinc-500" />
                          )}
                        </div>
                        
                        {/* ITEM DETAILS */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white text-sm font-semibold truncate">{item.name}</h4>
                          <p className="text-zinc-400 text-xs mt-0.5">• {item.type || item.itemType || 'EVENT'}
                            {item.timeSlot ? ` | ${item.timeSlot}` : ''}
                          </p>
                        </div>
                        
                        {/* PRICE */}
                        <div className="text-right">
                          <p className="text-white font-medium">₹{Number(item.totalPrice || item.price || 0).toFixed(2)}</p>
                          <p className="text-zinc-500 text-xs">Qty: {item.quantity || 1}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-1 accent-white rounded"
                  />
                  <p className="text-zinc-400 text-sm">
                    I accept the terms and conditions and privacy policy
                  </p>
                </div>

                 <div className="flex gap-4">
                   <Button
                     onClick={() => setCurrentStep("details")}
                     variant="outline"
                     className="flex-1 border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white py-5"
                   >
                     <ArrowLeft className="h-5 w-5 mr-2" />
                     BACK
                   </Button>
                    <Button
                      onClick={handleContinueToPayment}
                      disabled={!acceptTerms}
                      className={`relative overflow-hidden group flex-1 bg-white text-black font-bold uppercase tracking-wider py-5 flex items-center justify-center gap-2 transition-all ${
                        !acceptTerms ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'
                      }`}
                    >
                      <span className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                      PROCEED TO PAY
                      <ArrowRight className="h-5 w-5 relative z-10" />
                    </Button>
                 </div>
              </div>
            )}

            {currentStep === "payment" && (
              <div className="space-y-6">
                <div className="bg-gradient-to-b from-zinc-900/80 to-zinc-950 border border-zinc-800 rounded-2xl p-8 text-center">
                  <p className="text-zinc-400 text-sm uppercase tracking-wider mb-2">Ready to Pay</p>
                  <p className="text-5xl font-bold text-white tracking-tight">{formatCurrency(total)}</p>
                  <p className="text-zinc-500 mt-4">Complete your payment securely via Razorpay</p>
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={() => setCurrentStep("confirm")}
                    variant="outline"
                    className="flex-1 border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white py-5"
                  >
                    <ArrowLeft className="h-5 w-5 mr-2" />
                    BACK
                  </Button>
                   <Button
                     onClick={initiateRazorpayPayment}
                     disabled={isProcessing}
                     className="relative overflow-hidden group flex-1 bg-white text-black font-bold uppercase tracking-wider py-5 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     <span className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                     {isProcessing ? (
                       <>
                         <Loader2 className="h-5 w-5 animate-spin relative z-10" />
                         PROCESSING...
                       </>
                     ) : (
                       <>
                         PAY SECURELY WITH RAZORPAY
                       </>
                     )}
                   </Button>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-4">
            {renderOrderSummary()}
           </div>
         </div>
       </motion.div>
     </div>
   );
 }