"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Send, Bot, User, Loader2, MapPin, Users, DollarSign, AlertTriangle, ShoppingCart, Star } from "lucide-react";
import { useCart } from "@/context/cart-context";
import { CartItem } from "@/types";

interface EventDetails {
  eventType: string | null;
  city: string | null;
  guestCount: number | null;
  budget: number | null;
}

interface Venue {
  id: number;
  name: string;
  image?: string;
  capacity: number;
  price: number;
  location?: string;
  rating?: number;
}

interface Vendor {
  id: number;
  name: string;
  image?: string;
  serviceType: string;
  price: number;
  location?: string;
  rating?: number;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  showQuickReplies?: boolean;
  type?: "text" | "plan_results";
  venues?: Venue[];
  vendors?: Vendor[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const QUICK_REPLIES = [
  "Wedding",
  "Birthday Party",
  "Corporate Event",
  "Anniversary",
  "Baby Shower",
  "Conference",
];

const INITIAL_GREETING = "Hi! I'm Event Brain, your AI planning assistant. Let's design your perfect occasion. What type of event are you hosting?";

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full bg-silver-400 animate-pulse"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
  );
}

export default function PlanEventPage() {
  const router = useRouter();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { addItem } = useCart();
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pollingStatus, setPollingStatus] = useState<string>("");
  const [eventDetails, setEventDetails] = useState<EventDetails>({
    eventType: null,
    city: null,
    guestCount: null,
    budget: null,
  });

  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    
    return () => {
      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'auto';
      }
    };
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem("NearZro_user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setIsAuthenticated(!!parsed.token);
      } catch {
        setIsAuthenticated(false);
      }
    }
    setIsLoadingAuth(false);
  }, []);

  useEffect(() => {
    if (!isLoadingAuth && messages.length === 0) {
      setMessages([
        {
          id: "system-greeting",
          role: "assistant",
          content: INITIAL_GREETING,
          timestamp: new Date(),
          showQuickReplies: true,
        },
      ]);
    }
  }, [isLoadingAuth]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const handleAddToCart = useCallback((item: Venue | Vendor, itemType: 'venue' | 'vendor') => {
    const cartItem: CartItem = {
      id: `${itemType}-${item.id}`,
      cartId: 0,
      itemType: itemType === 'venue' ? 'VENUE' : 'VENDOR_SERVICE',
      venueId: itemType === 'venue' ? item.id : null,
      vendorServiceId: itemType === 'vendor' ? item.id : null,
      addonId: null,
      date: null,
      timeSlot: null,
      quantity: 1,
      unitPrice: item.price,
      totalPrice: item.price,
      meta: {
        name: item.name,
        image: item.image,
        location: item.location,
        rating: item.rating,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addItem(cartItem);
    console.log("Added to cart:", item);
  }, [addItem]);

  const handleSend = useCallback(async (prefillText?: string) => {
    const text = (prefillText || input).trim();
    if (!text || isSending) return;

    setInput("");
    setIsSending(true);

    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    if (!isAuthenticated) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      const systemMessage: ChatMessage = {
        id: `system-${Date.now()}`,
        role: "system",
        content: "⚠️ Please log in to continue planning your dream event. Redirecting...",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, systemMessage]);
      setIsSending(false);
      
      setTimeout(() => {
        router.push("/login");
      }, 3000);
      return;
    }

    const aiMessageId = `ai-${Date.now()}`;
    const aiMessage: ChatMessage = {
      id: aiMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isLoading: true,
    };
    setMessages((prev) => [...prev, aiMessage]);

    try {
      const token = localStorage.getItem("NearZro_token");
      
      const response = await fetch(`${API_BASE_URL}/api/ai-chat/public/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: text,
          tempState: eventDetails.budget ? {
            budget: eventDetails.budget,
            guestCount: eventDetails.guestCount,
            city: eventDetails.city,
            eventType: eventDetails.eventType,
          } : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      
      setEventDetails({
        eventType: data.state?.eventType || eventDetails.eventType,
        city: data.state?.city || eventDetails.city,
        guestCount: data.state?.guestCount || eventDetails.guestCount,
        budget: data.state?.budget || eventDetails.budget,
      });
      
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId
            ? { 
                ...msg, 
                content: data.reply || "Response received.", 
                isLoading: false, 
              }
            : msg
        )
      );
    } catch (error) {
      console.error("Chat API error:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId
            ? { ...msg, content: "Sorry, I encountered an error. Please try again.", isLoading: false }
            : msg
        )
      );
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }, [input, isSending, isAuthenticated, router, eventDetails, messages]);

  const pollForResult = useCallback(async (jobId: string, aiMessageId: string) => {
    const maxAttempts = 15;
    let attempts = 0;

    const poll = async () => {
      attempts++;
      
      try {
        const token = localStorage.getItem("NearZro_token");
        const statusResponse = await fetch(`${API_BASE_URL}/api/ai-planner/jobs/${jobId}`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!statusResponse.ok) {
          throw new Error(`Status check failed: ${statusResponse.status}`);
        }

        const statusData = await statusResponse.json();
        
        setPollingStatus(statusData.status || "waiting");

        if (statusData.status === 'completed') {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }

          const venues = statusData.venues || [];
          const vendors = statusData.vendors || [];
          
          if (venues.length === 0 && vendors.length === 0) {
            const planId = statusData.planId;
            if (planId) {
              await fetchVenuesAndVendors(planId, aiMessageId);
              return;
            }
          }

          const resultMessage: ChatMessage = {
            id: aiMessageId,
            role: "assistant",
            content: "Here is your custom event blueprint! I've hand-picked these venues and vendors for you.",
            timestamp: new Date(),
            type: "plan_results",
            venues,
            vendors,
          };
          
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessageId ? { ...msg, ...resultMessage, isLoading: false } : msg
            )
          );
          setIsGenerating(false);
          setPollingStatus("");
        } else if (statusData.status === 'failed') {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessageId
                ? { ...msg, content: "Currently the service is unavailable. Please try again later.", isLoading: false }
                : msg
            )
          );
          setIsGenerating(false);
          setPollingStatus("");
        } else if (attempts >= maxAttempts) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessageId
                ? { ...msg, content: "Service is taking longer than expected. Please check your dashboard later.", isLoading: false }
                : msg
            )
          );
          setIsGenerating(false);
          setPollingStatus("");
        }
      } catch (error) {
        console.error("Polling error:", error);
        if (attempts >= maxAttempts) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessageId
                ? { ...msg, content: "Service is taking longer than expected. Please check your dashboard later.", isLoading: false }
                : msg
            )
          );
          setIsGenerating(false);
          setPollingStatus("");
        }
      }
    };

    pollIntervalRef.current = setInterval(poll, 2000);
  }, []);

  const fetchVenuesAndVendors = async (planId: number, aiMessageId: string) => {
    try {
      const token = localStorage.getItem("NearZro_token");
      
      const [venuesRes, vendorsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/venues?status=ACTIVE&limit=10`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        }),
        fetch(`${API_BASE_URL}/api/ai-planner/${planId}/vendors`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        }),
      ]);

      let venues: Venue[] = [];
      let vendors: Vendor[] = [];

      if (venuesRes.ok) {
        const venuesData = await venuesRes.json();
        venues = venuesData.data?.map((v: any) => ({
          id: v.id,
          name: v.name,
          image: v.images?.[0] || v.photos?.[0]?.url,
          capacity: v.capacityMax || v.capacityMin || 100,
          price: v.basePriceFullDay || v.basePriceEvening || v.basePriceMorning || 0,
          location: v.area || v.city,
          rating: v.averageRating,
        })) || [];
      }

      if (vendorsRes.ok) {
        const vendorsData = await vendorsRes.json();
        vendors = vendorsData.map((v: any) => ({
          id: v.id,
          name: v.name || v.vendor?.name,
          image: v.image || v.vendor?.photos?.[0]?.url,
          serviceType: v.serviceType || v.category,
          price: v.baseRate || v.price || 0,
          location: v.vendor?.city || v.vendor?.area,
          rating: v.vendor?.averageRating,
        })) || [];
      }

      const resultMessage: ChatMessage = {
        id: aiMessageId,
        role: "assistant",
        content: "Here is your custom event blueprint! I've hand-picked these venues and vendors for you.",
        timestamp: new Date(),
        type: "plan_results",
        venues,
        vendors,
      };
      
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId ? { ...msg, ...resultMessage, isLoading: false } : msg
        )
      );
    } catch (error) {
      console.error("Error fetching venues/vendors:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId
            ? { ...msg, content: "Plan generated but could not load venues and vendors. Please try again.", isLoading: false }
            : msg
        )
      );
    }
  };

  const handleGeneratePlan = useCallback(async () => {
    if (!eventDetails.budget || isGenerating) return;
    
    setIsGenerating(true);
    setPollingStatus("waiting");

    const aiMessageId = `ai-${Date.now()}`;
    const loadingMessage: ChatMessage = {
      id: aiMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isLoading: true,
    };
    setMessages((prev) => [...prev, loadingMessage]);

    try {
      const token = localStorage.getItem("NearZro_token");
      
      const response = await fetch(`${API_BASE_URL}/api/ai-planner/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(eventDetails),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.jobId) {
        pollForResult(data.jobId, aiMessageId);
      } else {
        const resultMessage: ChatMessage = {
          id: aiMessageId,
          role: "assistant",
          content: data.message || "Here is your custom event blueprint! I've hand-picked these venues and vendors for you.",
          timestamp: new Date(),
          type: "plan_results",
          venues: data.venues || [],
          vendors: data.vendors || [],
        };
        
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMessageId ? resultMessage : msg
          )
        );
        setIsGenerating(false);
        setPollingStatus("");
      }
    } catch (error) {
      console.error("Generate Plan API error:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId
            ? { ...msg, content: "⚠️ Failed to generate plan. Please try again.", isLoading: false }
            : msg
        )
      );
      setIsGenerating(false);
      setPollingStatus("");
    }
  }, [eventDetails, isGenerating, pollForResult]);

  const handleQuickReply = useCallback(async (text: string) => {
    await handleSend(text);
  }, [handleSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatINR = (amount: number): string => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const renderQuickReplies = () => (
    <div className="flex flex-wrap gap-2 mt-3">
      {QUICK_REPLIES.map((reply) => (
        <button
          key={reply}
          onClick={() => handleQuickReply(reply)}
          disabled={isSending}
          className="btn-outline-silver text-xs px-4 py-2 rounded-full disabled:opacity-50"
        >
          {reply}
        </button>
      ))}
    </div>
  );

  const renderVenueCard = (venue: Venue) => (
    <div key={venue.id} className="glass-dark-card min-w-[280px] p-4 flex flex-col gap-3">
      <div className="w-full h-32 rounded-xl bg-zinc-800 overflow-hidden">
        {venue.image ? (
          <img src={venue.image} alt={venue.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin className="w-8 h-8 text-zinc-600" />
          </div>
        )}
      </div>
      <div>
        <h4 className="font-semibold text-white text-sm">{venue.name}</h4>
        <p className="text-zinc-500 text-xs">{venue.location || "Location TBD"}</p>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-400 flex items-center gap-1">
          <Users className="w-3 h-3" />
          {venue.capacity} guests
        </span>
        <span className="text-chrome-gradient font-bold">{formatINR(venue.price)}</span>
      </div>
      {venue.rating && (
        <div className="flex items-center gap-1 text-xs">
          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
          <span className="text-zinc-400">{venue.rating.toFixed(1)}</span>
        </div>
      )}
      <button 
        onClick={() => handleAddToCart(venue, 'venue')}
        className="btn-premium w-full py-2 rounded-xl text-black-important text-sm font-bold flex items-center justify-center gap-2"
      >
        <ShoppingCart className="w-4 h-4" />
        Add to Cart
      </button>
    </div>
  );

  const renderVendorCard = (vendor: Vendor) => (
    <div key={vendor.id} className="glass-dark-card min-w-[280px] p-4 flex flex-col gap-3">
      <div className="w-full h-32 rounded-xl bg-zinc-800 overflow-hidden">
        {vendor.image ? (
          <img src={vendor.image} alt={vendor.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Bot className="w-8 h-8 text-zinc-600" />
          </div>
        )}
      </div>
      <div>
        <h4 className="font-semibold text-white text-sm">{vendor.name}</h4>
        <p className="text-zinc-500 text-xs">{vendor.serviceType}</p>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-400 flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {vendor.location || "Remote"}
        </span>
        <span className="text-chrome-gradient font-bold">{formatINR(vendor.price)}</span>
      </div>
      {vendor.rating && (
        <div className="flex items-center gap-1 text-xs">
          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
          <span className="text-zinc-400">{vendor.rating.toFixed(1)}</span>
        </div>
      )}
      <button 
        onClick={() => handleAddToCart(vendor, 'vendor')}
        className="btn-premium w-full py-2 rounded-xl text-black-important text-sm font-bold flex items-center justify-center gap-2"
      >
        <ShoppingCart className="w-4 h-4" />
        Add to Cart
      </button>
    </div>
  );

  const renderMessageContent = (message: ChatMessage) => {
    if (message.type === "plan_results") {
      return (
        <div className="space-y-4">
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>
          
          {message.venues && message.venues.length > 0 && (
            <div>
              <h4 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Top Venues
              </h4>
              <div className="overflow-x-auto scrollbar-hide flex gap-4 pb-4 -mx-2 px-2">
                {message.venues.map(renderVenueCard)}
              </div>
            </div>
          )}
          
          {message.vendors && message.vendors.length > 0 && (
            <div>
              <h4 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Top Vendors
              </h4>
              <div className="overflow-x-auto scrollbar-hide flex gap-4 pb-4 -mx-2 px-2">
                {message.vendors.map(renderVendorCard)}
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <>
        <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>
        {message.showQuickReplies && !message.isLoading && renderQuickReplies()}
      </>
    );
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-silver-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-120px)] min-h-[600px]">
        <div className="lg:col-span-2 glass-dark-card flex flex-col h-full overflow-hidden rounded-2xl">
          <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-t border-white/5">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-silver-200 via-silver-400 to-silver-700 p-[1.5px]">
                  <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                    <Sparkles className="w-4.5 h-4.5 text-white" />
                  </div>
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-black block" />
              </div>
              <div>
                <h3 className="font-semibold text-white tracking-wide text-sm">Event Brain</h3>
                <p className="text-[10px] text-silver-500 font-medium tracking-widest uppercase">AI Event Planner</p>
              </div>
            </div>
          </div>

          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                  message.role === "user"
                    ? "bg-silver-900 border border-silver-subtle"
                    : message.role === "system"
                    ? "bg-amber-900/50 border border-amber-500/30"
                    : "bg-gradient-to-br from-silver-200 via-silver-400 to-silver-700 border border-silver-500/30 p-[1px]"
                }`}>
                  {message.role === "user" ? (
                    <User className="w-4 h-4 text-silver-400" />
                  ) : message.role === "system" ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-silver-800 text-white border border-silver-700/50 rounded-tr-md"
                    : message.role === "system"
                    ? "bg-amber-900/20 text-amber-200 border border-amber-500/30 rounded-tl-md"
                    : "bg-silver-900/70 text-silver-200 border border-silver-800/60 rounded-tl-md"
                }`}>
                  {message.isLoading ? (
                    <TypingDots />
                  ) : (
                    renderMessageContent(message)
                  )}
                  <p className={`text-[10px] mt-2 ${message.role === "user" ? "text-silver-500 text-right" : "text-silver-600"}`}>
                    {new Date(message.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-white/5">
            <div className="flex items-end gap-3">
              <div className="flex-1 flex items-center gap-2 p-2 rounded-2xl glass-dark-subtle border border-silver-subtle focus-within:border-white focus-within:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all duration-300">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask me about your event..."
                    rows={1}
                    disabled={isSending}
                    className="w-full bg-transparent resize-none focus:outline-none text-white placeholder:text-silver-500 text-sm font-medium max-h-32"
                  />
              </div>
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isSending}
                className="w-12 h-12 flex items-center justify-center rounded-xl btn-premium text-black-important shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="glass-dark-card rounded-2xl p-6 h-full">
            <h3 className="font-semibold text-white mb-6 tracking-wide text-lg">Your Event Details</h3>
            
            <div className="space-y-5">
              <div className="flex items-center justify-between py-3 border-b border-silver-subtle">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-silver-900/50 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-silver-400" />
                  </div>
                  <span className="text-silver-400 text-sm font-medium">Event Type</span>
                </div>
                <span className="font-semibold text-white">
                  {eventDetails.eventType || "-"}
                </span>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-silver-subtle">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-silver-900/50 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-silver-400" />
                  </div>
                  <span className="text-silver-400 text-sm font-medium">City</span>
                </div>
                <span className="font-semibold text-white">
                  {eventDetails.city || "-"}
                </span>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-silver-subtle">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-silver-900/50 flex items-center justify-center">
                    <Users className="w-5 h-5 text-silver-400" />
                  </div>
                  <span className="text-silver-400 text-sm font-medium">Guests</span>
                </div>
                <span className="font-semibold text-white">
                  {eventDetails.guestCount ? eventDetails.guestCount.toLocaleString("en-IN") : "-"}
                </span>
              </div>

              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-silver-900/50 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-silver-400" />
                  </div>
                  <span className="text-silver-400 text-sm font-medium">Budget</span>
                </div>
                <span className="font-semibold text-white">
                  {eventDetails.budget ? formatINR(eventDetails.budget) : "-"}
                </span>
              </div>
            </div>

            {eventDetails.eventType && eventDetails.city && eventDetails.guestCount && eventDetails.budget && (
              <button
                onClick={handleGeneratePlan}
                disabled={isGenerating || !eventDetails.budget}
                className="w-full py-4 rounded-xl btn-premium text-black-important font-bold transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 mt-6"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {pollingStatus === "completed" ? "LOADING RESULTS..." : "BRAIN IS HAND-PICKING YOUR VENDORS..."}
                  </>
                ) : (
                  "GENERATE PLAN"
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}