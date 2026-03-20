"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
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
    formatCurrency,
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
                initialMessages={messages}
                onSendMessage={handleSendChatMessage}
                isLoading={isChatLoading}
                className="h-[500px]"
              />
            </div>
            
            {/* Summary Panel - Shows form data as it's collected */}
            <div className="order-1 lg:order-2 space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Your Event Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Event Type</span>
                    <span className="font-medium text-gray-900">
                      {state.formData.eventType || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">City</span>
                    <span className="font-medium text-gray-900">
                      {state.formData.city || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Guests</span>
                    <span className="font-medium text-gray-900">
                      {state.formData.guestCount || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Budget</span>
                    <span className="font-medium text-gray-900">
                      {state.formData.budget ? formatCurrency(state.formData.budget) : "—"}
                    </span>
                  </div>
                </div>
                
                {state.formData.budget > 0 && state.formData.city && state.formData.guestCount > 0 && (
                  <button
                    onClick={async () => {
                      await submitPlan();
                    }}
                    disabled={state.isSubmitting}
                    className="w-full mt-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:from-violet-700 hover:to-purple-700 transition-all disabled:opacity-50"
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chatbot Panel - shows the generating state */}
            <div className="order-2 lg:order-1">
              <AIChatbot
                initialMessages={messages}
                onSendMessage={handleSendChatMessage}
                isLoading={true}
                className="h-[500px]"
              />
            </div>
            
            {/* Loading Panel */}
            <div className="order-1 lg:order-2">
              <AIPlannerLoading
                progress={progress}
                message="Generating your personalized event plan..."
              />
            </div>
          </div>
        );

      case "SUCCESS":
        return (
          <div className="space-y-6">
            {/* Plan Display */}
            <AIPlannerDisplay
              onAccept={handleAccept}
              onRegenerate={handleRegenerate}
              onShare={handleShare}
            />
            
            {/* Chatbot for modifications - collapsible */}
            <div className="mt-8">
              <button
                onClick={() => setShowChatbot(!showChatbot)}
                className="w-full py-3 px-4 bg-gray-50 rounded-xl text-gray-700 font-medium hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
              >
                {showChatbot ? "Hide Chat Assistant" : "Chat with Event Brain"}
              </button>
              
              <AnimatePresence>
                {showChatbot && (
                  <div className="mt-4">
                    <AIChatbot
                      initialMessages={messages}
                      onSendMessage={handleSendChatMessage}
                      onError={(err) => console.error("Chat error:", err)}
                      isLoading={isChatLoading}
                      className="h-[400px]"
                    />
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        );

      case "FAILED":
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Error Panel */}
            <div>
              <AIPlannerError
                error={state.error!}
                onRetry={retryPlan}
                onReset={resetPlanner}
              />
            </div>
            
            {/* Chatbot still available for retry */}
            <div>
              <AIChatbot
                initialMessages={messages}
                onSendMessage={handleSendChatMessage}
                isLoading={isChatLoading}
                className="h-[400px]"
              />
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
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl p-6 text-white mb-6">
        <h2 className="text-2xl font-bold mb-1">{plan.planJson?.summary?.eventType}</h2>
        <p className="text-violet-100">
          {plan.planJson?.summary?.city} • {plan.planJson?.summary?.guestCount} guests
        </p>
        <p className="text-3xl font-bold mt-4">
          {formatCurrency(plan.planJson?.summary?.totalBudget || 0)}
        </p>
      </div>

      {/* Budget breakdown */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Budget Allocation</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {plan.planJson?.allocations?.map((item: any, index: number) => (
            <div key={index} className="p-4 flex justify-between items-center">
              <span className="font-medium text-gray-900">{item.category}</span>
              <span className="text-gray-700">{formatCurrency(item.amount)}</span>
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
