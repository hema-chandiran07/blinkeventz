"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { aiPlannerApi, aiChatbotApi } from "@/lib/ai-planner";
import { useAIPlannerContext } from "@/context/ai-planner-context";
import type {
  CreateAIPlanRequest,
  JobStatusResponse,
  PlannerUIState,
  PlannerError,
  AIPlan,
  PlannerFormData,
  ChatMessage,
  SendMessageRequest,
  AIConversation,
  AIConversationStatus,
} from "@/types/ai-planner";

// Polling configuration
const POLLING_INTERVAL_MS = 2000; // 2 seconds
const MAX_POLLING_ATTEMPTS = 60; // 2 minutes max wait
const TERMINAL_JOB_STATUSES = ["completed", "failed"];

// INR Currency formatter
const INR_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

interface UseAIPlannerOptions {
  onSuccess?: (plan: AIPlan) => void;
  onError?: (error: PlannerError) => void;
  onPlanAccepted?: (planId: number, cartId: number) => void;
}

interface UseAIPlannerReturn {
  // State
  uiState: PlannerUIState;
  formData: PlannerFormData;
  error: PlannerError | null;
  activePlan: AIPlan | null;
  isSubmitting: boolean;
  isPolling: boolean;
  progress: number;
  
  // Conversation state
  conversationId: string | null;
  messages: ChatMessage[];
  isChatLoading: boolean;
  
  // Form actions
  setFormData: (data: Partial<PlannerFormData>) => void;
  submitPlan: () => Promise<void>;
  retryPlan: () => Promise<void>;
  
  // Chat actions
  sendMessage: (text: string) => Promise<void>;
  startConversation: () => Promise<string>;
  acceptPlan: () => Promise<void>;
  
  // UI actions
  resetPlanner: () => void;
  setUISuccess: () => void;
  
  // Job actions
  pollJobStatus: (jobId: string) => Promise<void>;
  
  // Utilities
  formatCurrency: (amount: number) => string;
}

// Map backend conversation status to frontend UI state
function mapConversationStatusToUI(status: AIConversationStatus): PlannerUIState {
  switch (status) {
    case "COLLECTING":
      return "COLLECTING";
    case "READY":
    case "GENERATING":
      return "GENERATING";
    case "GENERATED":
    case "MODIFYING":
      return "SUCCESS";
    case "ACCEPTED":
      return "SUCCESS";
    case "FAILED":
      return "FAILED";
    default:
      return "COLLECTING";
  }
}

/**
 * useAIPlanner - Custom hook for AI Plan generation with job polling and chat
 * 
 * Handles the full lifecycle:
 * 1. COLLECTING - User fills form or chats
 * 2. GENERATING - Job polling (async)
 * 3. SUCCESS - Plan ready
 * 4. FAILED - Error with retry
 */
export function useAIPlanner(options?: UseAIPlannerOptions): UseAIPlannerReturn {
  const router = useRouter();
  const {
    state,
    setFormData,
    setUIState,
    setError,
    setActivePlan,
    setJobId,
    setSubmitting,
    setPolling,
    setConversation,
    addMessage,
    updateMessage,
    setMessages,
    reset,
  } = useAIPlannerContext();

  const [progress, setProgress] = useState(0);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const attemptCountRef = useRef(0);
  const generationKeyRef = useRef<string | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  /**
   * Format amount as Indian Rupees
   */
  const formatCurrency = useCallback((amount: number): string => {
    return INR_FORMATTER.format(amount);
  }, []);

  /**
   * Start polling job status
   */
  const pollJobStatus = useCallback(async (jobId: string) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    setPolling(true);
    attemptCountRef.current = 0;

    const checkJobStatus = async () => {
      attemptCountRef.current++;

      try {
        const jobStatus: JobStatusResponse = await aiPlannerApi.getJobStatus(jobId);
        
        // Update progress (approximate based on attempts)
        setProgress(Math.min((attemptCountRef.current / MAX_POLLING_ATTEMPTS) * 100, 95));

        // Check if job reached terminal state
        if (TERMINAL_JOB_STATUSES.includes(jobStatus.status)) {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          setPolling(false);

          if (jobStatus.status === "completed" && jobStatus.result?.planId) {
            // Fetch the complete plan
            const plan = await aiPlannerApi.getPlan(jobStatus.result.planId);
            setActivePlan(plan);
            setUIState("SUCCESS");
            setProgress(100);
            
            // Add system message about plan generation
            addMessage({
              id: `system-${Date.now()}`,
              role: "assistant",
              content: `Your event plan for ${plan.planJson.summary.eventType} in ${plan.planJson.summary.city} has been generated! Total budget: ${formatCurrency(plan.planJson.summary.totalBudget)}`,
              timestamp: new Date(),
            });
            
            options?.onSuccess?.(plan);
          } else {
            // Job failed
            const error: PlannerError = {
              code: "JOB_FAILED",
              message: jobStatus.error || "Plan generation failed",
              canRetry: true,
            };
            setError(error);
            setUIState("FAILED");
            options?.onError?.(error);
          }
        }
      } catch (err: any) {
        // Handle specific error cases
        const statusCode = err.response?.status;
        
        // Handle 404 - Job not found (could be expired or invalid)
        if (statusCode === 404) {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          setPolling(false);
          
          const error: PlannerError = {
            code: "JOB_NOT_FOUND",
            message: "Job not found. It may have expired. Please try again.",
            canRetry: true,
          };
          setError(error);
          setUIState("FAILED");
          options?.onError?.(error);
          return;
        }
        
        // Handle circuit breaker / service unavailable
        if (statusCode === 503 || err.code === "ECONNREFUSED") {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          setPolling(false);
          
          const error: PlannerError = {
            code: "SERVICE_UNAVAILABLE",
            message: "Service temporarily unavailable. Please try again later.",
            canRetry: true,
          };
          setError(error);
          setUIState("FAILED");
          options?.onError?.(error);
          return;
        }
        
        // Polling error - could be network issue
        console.error("Polling error:", err);
        
        // Stop polling after max attempts
        if (attemptCountRef.current >= MAX_POLLING_ATTEMPTS) {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          setPolling(false);
          
          const error: PlannerError = {
            code: "POLLING_TIMEOUT",
            message: "Request timed out. Please try again.",
            canRetry: true,
          };
          setError(error);
          setUIState("FAILED");
          options?.onError?.(error);
        }
      }
    };

    // Start polling
    pollingRef.current = setInterval(checkJobStatus, POLLING_INTERVAL_MS);
    
    // Immediate first check
    checkJobStatus();
  }, [setPolling, setActivePlan, setUIState, setError, setProgress, options, addMessage, formatCurrency]);

  /**
   * Submit plan generation request
   */
  const submitPlan = useCallback(async () => {
    if (!state.formData.budget || !state.formData.city || !state.formData.guestCount) {
      const error: PlannerError = {
        code: "VALIDATION_ERROR",
        message: "Please fill in all required fields",
        canRetry: false,
      };
      setError(error);
      setUIState("FAILED");
      return;
    }

    setSubmitting(true);
    setError(null);
    setUIState("GENERATING");
    setProgress(0);

    try {
      const request: CreateAIPlanRequest = {
        budget: state.formData.budget,
        eventType: state.formData.eventType,
        city: state.formData.city,
        area: state.formData.area,
        guestCount: state.formData.guestCount,
        conversationId: state.conversation?.id,
      };

      const response = await aiPlannerApi.generatePlan(request);
      
      setJobId(response.jobId);
      await pollJobStatus(response.jobId);
    } catch (err: any) {
      setSubmitting(false);
      
      const error: PlannerError = {
        code: err.response?.data?.code || "API_ERROR",
        message: err.response?.data?.message || "Failed to start plan generation",
        canRetry: true,
      };
      
      setError(error);
      setUIState("FAILED");
      options?.onError?.(error);
    }
  }, [state.formData, state.conversation, setSubmitting, setError, setUIState, setJobId, pollJobStatus, options]);

  /**
   * Retry failed plan generation
   */
  const retryPlan = useCallback(async () => {
    setError(null);
    setUIState("COLLECTING");
    setProgress(0);
    setActivePlan(null);
  }, [setError, setUIState, setProgress, setActivePlan]);

  /**
   * Start a new conversation
   */
  const startConversation = useCallback(async () => {
    try {
      const response = await aiChatbotApi.startConversation();
      
      // Update conversation in context
      const conversation: AIConversation = {
        id: response.conversationId,
        userId: 0, // Will be set by backend
        state: { collectedFields: [] },
        status: "COLLECTING",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      setConversation(conversation);
      
      // Set initial message
      setMessages([
        {
          id: `system-${Date.now()}`,
          role: "assistant",
          content: "Hi! I'm your Event Brain assistant. I can help you plan your perfect event. What type of event are you planning?",
          timestamp: new Date(),
        },
      ]);
      
      return response.conversationId;
    } catch (err) {
      console.error("Failed to start conversation:", err);
      // Still set a local conversation for demo mode
      const demoConversationId = `demo-${Date.now()}`;
      setConversation({
        id: demoConversationId,
        userId: 0,
        state: { collectedFields: [] },
        status: "COLLECTING",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      setMessages([
        {
          id: `system-${Date.now()}`,
          role: "assistant",
          content: "Hi! I'm your Event Brain assistant. I can help you plan your perfect event. What type of event are you planning?",
          timestamp: new Date(),
        },
      ]);
      
      return demoConversationId;
    }
  }, [setConversation, setMessages]);

  /**
   * Send a message in the chat
   * Includes idempotency using generationKey
   */
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;
    
    const conversationId = state.conversation?.id;
    if (!conversationId) {
      console.error("No conversation ID available");
      return;
    }

    // Generate idempotency key if not exists
    if (!generationKeyRef.current) {
      generationKeyRef.current = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Add user message to local state immediately
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };
    addMessage(userMessage);

    // Create placeholder for AI response
    const aiMessageId = `ai-${Date.now()}`;
    const aiMessage: ChatMessage = {
      id: aiMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isLoading: true,
    };
    addMessage(aiMessage);

    setIsChatLoading(true);

    try {
      const request: SendMessageRequest = {
        conversationId,
        message: text.trim(),
        generationKey: generationKeyRef.current,
      };

      const response = await aiChatbotApi.sendMessage(request);
      
      // Update AI message with response
      updateMessage(aiMessageId, response.message);

      // Handle plan ID if returned
      if (response.planId) {
        try {
          const plan = await aiPlannerApi.getPlan(response.planId);
          setActivePlan(plan);
          
          // Add system message about plan
          addMessage({
            id: `system-plan-${Date.now()}`,
            role: "assistant",
            content: `Your plan is ready! Total budget: ${formatCurrency(plan.planJson.summary.totalBudget)}`,
            timestamp: new Date(),
          });
          
          setUIState(mapConversationStatusToUI(response.updatedState as unknown as AIConversationStatus));
        } catch (planErr) {
          console.error("Failed to fetch plan:", planErr);
        }
      }

      // Update conversation status
      // Use response.status for the conversation status, and updatedState for form data
      if (response.status) {
        // Update the conversation in context with new state
        const updatedConversation: AIConversation = {
          ...state.conversation!,
          state: response.updatedState,
          status: response.status,
          planId: response.planId,
        };
        setConversation(updatedConversation);
        
        // Update form data from conversation state
        if (response.updatedState.budget) {
          setFormData({ budget: response.updatedState.budget });
        }
        if (response.updatedState.city) {
          setFormData({ city: response.updatedState.city });
        }
        if (response.updatedState.guestCount) {
          setFormData({ guestCount: response.updatedState.guestCount });
        }
        if (response.updatedState.eventType) {
          setFormData({ eventType: response.updatedState.eventType });
        }
        if (response.updatedState.area) {
          setFormData({ area: response.updatedState.area });
        }
        
        // Transition UI state based on conversation status
        const uiState = mapConversationStatusToUI(response.status);
        setUIState(uiState);
        
        // If status is GENERATING and we have a jobId, start polling
        if (response.status === "GENERATING" && response.jobId) {
          setJobId(response.jobId);
          await pollJobStatus(response.jobId);
        }
      }

      // Reset generation key for next message
      generationKeyRef.current = null;
    } catch (err: any) {
      // Update message with error
      updateMessage(aiMessageId, "Sorry, I encountered an error. Please try again.");
      
      // Handle specific errors
      if (err.response?.status === 409) {
        // Duplicate message - idempotency caught
        console.log("Duplicate message detected");
      } else if (err.response?.status === 429) {
        // Rate limited
        updateMessage(aiMessageId, "Too many requests. Please wait a moment and try again.");
      }
      
      console.error("Send message error:", err);
    } finally {
      setIsChatLoading(false);
    }
  }, [state.conversation, addMessage, updateMessage, setActivePlan, setConversation, setFormData, setUIState, setJobId, pollJobStatus, formatCurrency]);

  /**
   * Accept the current plan and create a cart
   */
  const acceptPlan = useCallback(async () => {
    if (!state.activePlan) {
      console.error("No active plan to accept");
      return;
    }

    setIsChatLoading(true);

    try {
      const response = await aiPlannerApi.acceptPlan(state.activePlan.id);
      
      // Add success message
      addMessage({
        id: `system-accepted-${Date.now()}`,
        role: "assistant",
        content: "Great! Your plan has been converted to a cart. Redirecting you to checkout...",
        timestamp: new Date(),
      });

      // Notify callback
      options?.onPlanAccepted?.(state.activePlan.id, response.cartId);
      
      // Redirect to cart
      router.push(`/cart?planId=${state.activePlan.id}`);
    } catch (err: any) {
      console.error("Accept plan error:", err);
      
      addMessage({
        id: `system-error-${Date.now()}`,
        role: "assistant",
        content: "Sorry, there was an issue creating your cart. Please try again.",
        timestamp: new Date(),
      });
      
      const error: PlannerError = {
        code: err.response?.data?.code || "ACCEPT_ERROR",
        message: err.response?.data?.message || "Failed to accept plan",
        canRetry: true,
      };
      setError(error);
    } finally {
      setIsChatLoading(false);
    }
  }, [state.activePlan, addMessage, options, router, setError]);

  /**
   * Reset the entire planner
   */
  const resetPlanner = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    generationKeyRef.current = null;
    reset();
  }, [reset]);

  /**
   * Set UI to success state (e.g., when loading existing plan)
   */
  const setUISuccess = useCallback(() => {
    setUIState("SUCCESS");
  }, [setUIState]);

  return {
    // State
    uiState: state.uiState,
    formData: state.formData,
    error: state.error,
    activePlan: state.activePlan,
    isSubmitting: state.isSubmitting,
    isPolling: state.isPolling,
    progress,
    
    // Conversation state
    conversationId: state.conversation?.id || null,
    messages: state.messages,
    isChatLoading,
    
    // Form actions
    setFormData,
    submitPlan,
    retryPlan,
    
    // Chat actions
    sendMessage,
    startConversation,
    acceptPlan,
    
    // UI actions
    resetPlanner,
    setUISuccess,
    
    // Job actions
    pollJobStatus,
    
    // Utilities
    formatCurrency,
  };
}

// ==================== USE AI PLAN BY ID ====================

interface UseAIPlanByIdOptions {
  enabled?: boolean;
}

export function useAIPlanById(planId: number | null, options?: UseAIPlanByIdOptions) {
  const { setActivePlan, setUIState } = useAIPlannerContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlan = useCallback(async () => {
    if (!planId || !options?.enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const plan = await aiPlannerApi.getPlan(planId);
      setActivePlan(plan);
      setUIState("SUCCESS");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load plan");
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  const isEnabled = options?.enabled ?? true;

  useEffect(() => {
    if (planId && isEnabled) {
      fetchPlan();
    }
  }, [fetchPlan, planId, isEnabled]);

  return { isLoading, error, refetch: fetchPlan };
}

// ==================== USE PUBLIC PLAN ====================

interface UsePublicPlanOptions {
  enabled?: boolean;
}

export function usePublicPlan(shareId: string | null, options?: UsePublicPlanOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<any>(null);

  const fetchPublicPlan = useCallback(async () => {
    if (!shareId || !options?.enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const publicPlan = await aiPlannerApi.getPublicPlan(shareId);
      setPlan(publicPlan);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load public plan");
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareId]);

  const isEnabled = options?.enabled ?? true;

  useEffect(() => {
    if (shareId && isEnabled) {
      fetchPublicPlan();
    }
  }, [fetchPublicPlan, shareId, isEnabled]);

  return { isLoading, error, plan, refetch: fetchPublicPlan };
}

// ==================== UTILITY EXPORTS ====================

/**
 * Format a number as Indian Rupees (INR)
 */
export function formatINR(amount: number): string {
  return INR_FORMATTER.format(amount);
}

/**
 * Parse a string to number, handling Indian number format
 */
export function parseIndianNumber(value: string): number {
  // Remove commas and convert to number
  return parseInt(value.replace(/,/g, ""), 10) || 0;
}
