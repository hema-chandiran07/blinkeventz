"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AIPlannerProvider, useAIPlannerContext } from "@/context/ai-planner-context";
import { useAIPlanner, usePublicPlan } from "@/hooks/useAIPlanner";
import { AIPlannerForm } from "./ai-planner-form";
import { AIPlannerDisplay } from "./ai-planner-display";
import { AIPlannerLoading, AIPlannerFullSkeleton } from "./ai-planner-loading";
import { AIPlannerError } from "./ai-planner-error";
import { AIChatbot } from "./ai-chatbot";
import { aiPlannerApi } from "@/lib/ai-planner";
import { cn } from "@/lib/utils";
import type { AIPlan } from "@/types/ai-planner";

interface AIPlannerWrapperProps {
  className?: string;
  initialPlan?: AIPlan;
  onAccept?: (plan: AIPlan) => void;
  onRegenerate?: (_plan: AIPlan) => void;
  onShare?: (_plan: AIPlan) => void;
  enableChatbot?: boolean;
  onPlanAccepted?: (planId: number, cartId: number) => void;
}

/**
 * AIPlannerWrapper - Main container component
 * 
 * Manages the UI state machine:
 * - COLLECTING: Form input or Chatbot
 * - GENERATING: Loading/progress
 * - SUCCESS: Plan display with optional chatbot
 * - FAILED: Error with retry
 */
function AIPlannerWrapperContent({
  className,
  initialPlan,
  onAccept,
  onRegenerate: _onRegenerate,
  onShare: _onShare,
  enableChatbot = false,
  onPlanAccepted,
}: AIPlannerWrapperProps) {
  const { state } = useAIPlannerContext();
  const {
    retryPlan,
    resetPlanner,
    setUISuccess,
    submitPlan,
    messages,
    sendMessage,
    startConversation,
    acceptPlan,
    isChatLoading,
    progress,
    activePlan,
    formatINR,
  } = useAIPlanner({
    onSuccess: (plan) => {
      onAccept?.(plan);
    },
    onPlanAccepted: (planId, cartId) => {
      onPlanAccepted?.(planId, cartId);
    },
  });

  const [isInitializing, setIsInitializing] = useState(!!initialPlan);
  const [showChatbot, setShowChatbot] = useState(enableChatbot);

  // Handle initial plan loading
  useEffect(() => {
    if (initialPlan && isInitializing) {
      setIsInitializing(false);
      setUISuccess();
    }
  }, [initialPlan, isInitializing, setUISuccess]);

  // Initialize chatbot when enabled
  useEffect(() => {
    if (enableChatbot && !state.conversation?.id) {
      startConversation();
    }
  }, [enableChatbot, state.conversation?.id, startConversation]);

  // Handle plan acceptance from display
  const handleAccept = useCallback(async () => {
    if (activePlan) {
      await acceptPlan();
    }
  }, [activePlan, acceptPlan]);

  // Handle plan acceptance from chatbot - currently handled by handleAccept
  const _handleAcceptFromChat = useCallback(async () => {
    await acceptPlan();
  }, [acceptPlan]);

  // Handle regenerate
  const handleRegenerate = useCallback(async () => {
    if (activePlan) {
      try {
        await aiPlannerApi.regeneratePlan(activePlan.id);
        // The polling will be handled by the hook's internal state
      } catch (err) {
        console.error("Regenerate error:", err);
      }
    } else {
      // Reset and start fresh
      retryPlan();
    }
  }, [activePlan, retryPlan]);

  // Handle share
  const handleShare = useCallback(() => {
    if (activePlan) {
      _onShare?.(activePlan);
    }
  }, [activePlan, _onShare]);

  // Render the appropriate view based on UI state and chatbot mode
  const renderContent = () => {
    // If chatbot is enabled and we're in collecting state, show chatbot
    if (enableChatbot) {
      return renderChatbotView();
    }

    // Otherwise, render the form-based view
    return renderFormView();
  };

  // Render the chatbot-integrated view
  const renderChatbotView = () => {
    switch (state.uiState) {
      case "COLLECTING":
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chatbot Panel */}
            <div className="order-2 lg:order-1">
              <AIChatbot
                messages={messages}
                onSendMessage={handleSendChatMessage}
                isLoading={isChatLoading}
                conversationStatus="COLLECTING"
                className="h-[500px]"
              />
            </div>
            
            {/* Summary Panel - Shows form data as it's collected */}
            <div className="order-1 lg:order-2 space-y-4">
              <div className="bg-zinc-950/80 backdrop-blur-xl rounded-2xl border border-zinc-800 shadow-2xl p-6 relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-zinc-500/10 rounded-full blur-2xl pointer-events-none" />
                <h3 className="font-semibold text-zinc-100 mb-4 tracking-wide">Your Event Details</h3>
                <div className="space-y-3 relative z-10">
                  <div className="flex justify-between">
                    <span className="text-zinc-500 tracking-wide text-sm font-medium">Event Type</span>
                    <span className="font-medium text-zinc-200">
                      {state.formData.eventType || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 tracking-wide text-sm font-medium">City</span>
                    <span className="font-medium text-zinc-200">
                      {state.formData.city || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 tracking-wide text-sm font-medium">Guests</span>
                    <span className="font-medium text-zinc-200">
                      {state.formData.guestCount || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 tracking-wide text-sm font-medium">Budget</span>
                    <span className="font-medium text-transparent bg-clip-text bg-gradient-to-br from-zinc-100 to-zinc-400">
                      {state.formData.budget ? formatINR(state.formData.budget) : "—"}
                    </span>
                  </div>
                </div>
                
                {state.formData.budget > 0 && state.formData.city && state.formData.guestCount > 0 && (
                  <button
                    onClick={async () => {
                      await submitPlan();
                    }}
                    disabled={state.isSubmitting}
                    className="w-full mt-8 py-3.5 bg-zinc-100 text-zinc-950 border border-zinc-200 rounded-xl font-bold hover:bg-white hover:scale-[1.02] transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(255,255,255,0.1)] relative z-10 tracking-wide"
                  >
                    {state.isSubmitting ? "Generating..." : "Generate Plan"}
                  </button>
                )}
              </div>
            </div>
          </div>
        );

      case "GENERATING":
        return (
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chatbot Panel - shows the generating state */}
              <div className="order-2 lg:order-1">
                <AIChatbot
                  messages={messages}
                  onSendMessage={handleSendChatMessage}
                  isLoading={true}
                  conversationStatus="GENERATING"
                  className="h-[600px] border-zinc-700/50"
                />
              </div>
              
              {/* Loading Panel */}
              <div className="order-1 lg:order-2">
                <AIPlannerLoading
                  progress={progress}
                  message="Generating your personalized event plan..."
                  className="mt-12"
                />
              </div>
            </div>
          </div>
        );

      case "SUCCESS":
        return (
          <div className="max-w-5xl mx-auto space-y-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6"
            >
              <AIChatbot
                messages={messages}
                onSendMessage={handleSendChatMessage}
                onAcceptPlan={handleAccept}
                onError={(err) => console.error("Chat error:", err)}
                isLoading={isChatLoading}
                conversationStatus="GENERATED"
                className="h-[700px] shadow-[0_0_50px_rgba(255,255,255,0.05)] border-zinc-700/50"
              />

              {/* In-flow sidebar */}
              <div className="hidden lg:flex flex-col gap-4">
                <div className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-800 rounded-2xl p-5 shadow-2xl">
                  <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Event Summary</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Total Budget</span>
                      <span className="text-zinc-200 font-bold">{formatINR(state.activePlan?.budget || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Location</span>
                      <span className="text-zinc-200">{state.activePlan?.city}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Guests</span>
                      <span className="text-zinc-200">{state.activePlan?.guestCount}</span>
                    </div>
                  </div>
                  <button
                    onClick={handleShare}
                    className="w-full mt-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-xl border border-zinc-800 transition-all"
                  >
                    Share Plan
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        );

      case "FAILED":
        return (
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Error Panel */}
              <div className="order-1 lg:order-2">
                <AIPlannerError
                  error={state.error!}
                  onRetry={retryPlan}
                  onReset={resetPlanner}
                  className="mt-12"
                />
              </div>
              
              {/* Chatbot still available for retry */}
              <div className="order-2 lg:order-1">
                <AIChatbot
                  messages={messages}
                  onSendMessage={handleSendChatMessage}
                  isLoading={isChatLoading}
                  conversationStatus="FAILED"
                  className="h-[600px] border-zinc-700/50"
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Render the form-based view (without chatbot)
  const renderFormView = () => {
    switch (state.uiState) {
      case "COLLECTING":
        return (
          <AIPlannerForm
            onComplete={() => {
              // Form submitted, will transition to GENERATING
            }}
          />
        );

      case "GENERATING":
        return (
          <AIPlannerLoading
            progress={progress}
            message="Generating your personalized event plan..."
          />
        );

      case "SUCCESS":
        return (
          <AIPlannerDisplay
            onAccept={handleAccept}
            onRegenerate={handleRegenerate}
            onShare={handleShare}
          />
        );

      case "FAILED":
        return (
          <AIPlannerError
            error={state.error!}
            onRetry={retryPlan}
            onReset={resetPlanner}
          />
        );

      default:
        return null;
    }
  };

  // Handle sending message from chatbot
  const handleSendChatMessage = useCallback(async (message: string) => {
    await sendMessage(message);
  }, [sendMessage]);

  return (
    <div className={cn("min-h-[400px]", className)}>
      <AnimatePresence mode="wait">
        {renderContent()}
      </AnimatePresence>
    </div>
  );
}

/**
 * AIPlannerWrapper - The main exported component
 * 
 * Usage:
 * ```tsx
 * <AIPlannerWrapper
 *   enableChatbot={true}
 *   onAccept={(plan) => console.log('Accepted:', plan)}
 *   onRegenerate={(plan) => console.log('Regenerating:', plan)}
 * />
 * ```
 * 
 * With chatbot:
 * ```tsx
 * <AIPlannerWrapper
 *   enableChatbot={true}
 *   onPlanAccepted={(planId, cartId) => router.push(`/cart?planId=${planId}`)}
 * />
 * ```
 */
export function AIPlannerWrapper(props: AIPlannerWrapperProps) {
  return (
    <AIPlannerProvider>
      <AIPlannerWrapperContent {...props} />
    </AIPlannerProvider>
  );
}

// ==================== PRE-LOADED PLAN VIEW ====================

interface AIPlannerViewProps {
  planId: number;
  className?: string;
}

export function AIPlannerView({ planId, className }: AIPlannerViewProps) {
  return (
    <AIPlannerProvider>
      <AIPlannerWrapperContentWithPlan planId={planId} className={className} />
    </AIPlannerProvider>
  );
}

function AIPlannerWrapperContentWithPlan({
  planId: _planId,
  className,
}: {
  planId: number;
  className?: string;
}) {
  const { state } = useAIPlannerContext();

  // For now, show loading while fetching
  if (!state.activePlan) {
    return <AIPlannerFullSkeleton className={className} />;
  }

  return (
    <AIPlannerDisplay
      className={className}
      onAccept={() => {}}
      onRegenerate={() => {}}
      onShare={() => {}}
    />
  );
}

// ==================== PUBLIC PLAN VIEW ====================

interface AIPublicPlanViewProps {
  shareId: string;
  className?: string;
}

// INR Currency formatter
const INR_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function formatCurrency(amount: number): string {
  return INR_FORMATTER.format(amount);
}

export function AIPublicPlanView({ shareId, className }: AIPublicPlanViewProps) {
  const { isLoading, error, plan } = usePublicPlan(shareId, { enabled: !!shareId });

  if (isLoading) {
    return <AIPlannerFullSkeleton className={className} />;
  }

  if (error || !plan) {
    return (
      <AIPlannerError
        error={{ code: "NOT_FOUND", message: "Plan not found or not available for public sharing", canRetry: false }}
        onReset={() => window.location.href = "/ai-planner"}
      />
    );
  }

  // Render public plan (simplified display without auth actions)
  return (
    <div className={cn("w-full max-w-2xl mx-auto", className)}>
      {/* Simplified display for public view */}
      <div className="bg-gradient-to-br from-zinc-800 to-zinc-950 border border-zinc-700/50 shadow-2xl relative overflow-hidden rounded-2xl p-6 text-zinc-100 mb-6">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-zinc-400 to-transparent opacity-50" />
        <h2 className="text-2xl font-bold mb-1 tracking-tight">{plan.planJson?.summary?.eventType}</h2>
        <p className="text-zinc-400 font-medium tracking-wide text-sm">
          {plan.planJson?.summary?.city} • {plan.planJson?.summary?.guestCount} guests
        </p>
        <p className="text-3xl font-bold mt-4 text-transparent bg-clip-text bg-gradient-to-br from-zinc-100 to-zinc-400">
          {formatCurrency(plan.planJson?.summary?.totalBudget || 0)}
        </p>
      </div>

      {/* Budget breakdown */}
      <div className="bg-zinc-950/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-zinc-800 overflow-hidden">
        <div className="p-5 border-b border-zinc-800/80 bg-zinc-900/40">
          <h3 className="font-semibold text-zinc-100 tracking-wide text-lg">Budget Allocation</h3>
        </div>
        <div className="divide-y divide-zinc-800/60">
          {plan.planJson?.allocations?.map((item: any, index: number) => (
            <div key={index} className="p-5 flex justify-between items-center hover:bg-zinc-900/50 transition-colors">
              <span className="font-medium text-zinc-200 tracking-wide">{item.category}</span>
              <span className="text-zinc-400 font-semibold">{formatCurrency(item.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==================== CHAT-ONLY MODE ====================

interface AIChatPlannerProps {
  className?: string;
  onPlanAccepted?: (planId: number, cartId: number) => void;
}

/**
 * AIChatPlanner - Chat-only mode for conversational planning
 * 
 * Usage:
 * ```tsx
 * <AIChatPlanner onPlanAccepted={(planId, cartId) => router.push(`/cart?planId=${planId}`)} />
 * ```
 */
export function AIChatPlanner({ className, onPlanAccepted }: AIChatPlannerProps) {
  return (
    <AIPlannerProvider>
      <AIPlannerWrapperContent
        enableChatbot={true}
        onPlanAccepted={(planId, cartId) => {
          onPlanAccepted?.(planId, cartId);
        }}
        className={className}
      />
    </AIPlannerProvider>
  );
}
