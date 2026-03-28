"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { aiPlannerApi, aiChatbotApi, publicChatApi } from "@/lib/ai-planner";
import type {
  ChatMessage,
  AIPlan,
  AIPlanJSON,
  AIConversationStatus,
  AIConversationState,
  JobStatusResponse,
  SendMessageResponse,
} from "@/types/ai-planner";

// ==================== CONSTANTS ====================

const POLLING_INTERVAL_MS = 2000;
const MAX_POLLING_ATTEMPTS = 60;
const TERMINAL_JOB_STATUSES = ["completed", "failed"];

const GUEST_INTENT_KEY = "nearzro_guest_intent";

// ==================== TYPES ====================

export type EventBrainState =
  | "INITIALIZING"
  | "GUEST_DEMO"
  | "GUEST_MESSAGE"
  | "REDIRECTING_TO_LOGIN"
  | "HYDRATING_SESSION"
  | "AUTHENTICATED"
  | "GENERATING_PLAN"
  | "PLAN_READY"
  | "ACCEPTING_PLAN"
  | "ERROR";

export interface EventBrainError {
  code: string;
  message: string;
  canRetry: boolean;
}

export interface UseEventBrainOptions {
  onPlanAccepted?: (cartId: number) => void;
  onError?: (error: EventBrainError) => void;
}

export interface UseEventBrainReturn {
  // State
  state: EventBrainState;
  messages: ChatMessage[];
  currentPlan: AIPlan | null;
  currentPlanJson: AIPlanJSON | null;
  conversationId: string | null;
  isLoading: boolean;
  isPolling: boolean;
  error: EventBrainError | null;
  progress: number;

  // Actions
  sendMessage: (text: string) => Promise<void>;
  acceptPlan: () => Promise<void>;
  retryPlan: () => Promise<void>;
  clearConversation: () => void;
}

// ==================== HOOK ====================

export function useEventBrain(
  options?: UseEventBrainOptions
): UseEventBrainReturn {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();

  // Core state
  const [state, setState] = useState<EventBrainState>("INITIALIZING");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentPlan, setCurrentPlan] = useState<AIPlan | null>(null);
  const [currentPlanJson, setCurrentPlanJson] = useState<AIPlanJSON | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<EventBrainError | null>(null);
  const [progress, setProgress] = useState(0);

  // Refs for polling
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const attemptCountRef = useRef(0);
  const currentJobIdRef = useRef<string | null>(null);
  const guestStateRef = useRef<AIConversationState | null>(null);

  // ==================== HELPERS ====================

  const addMessage = useCallback(
    (message: Partial<ChatMessage>) => {
      const newMessage: ChatMessage = {
        id: message.id || `${message.role}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        role: message.role || 'assistant',
        content: message.content || '',
        timestamp: message.timestamp || new Date(),
        isLoading: message.isLoading,
        planData: message.planData,
      };
      setMessages((prev) => [...prev, newMessage]);
      return newMessage.id;
    },
    []
  );

  const updateMessage = useCallback((id: string, content: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === id ? { ...msg, content, isLoading: false } : msg
      )
    );
  }, []);

  const clearPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setIsPolling(false);
    attemptCountRef.current = 0;
  }, []);

  const redirectToLogin = useCallback(
    (tempState?: AIConversationState, showFriendlyMessage: boolean = false) => {
      // Save guest intent to localStorage
      if (tempState) {
        try {
          localStorage.setItem(GUEST_INTENT_KEY, JSON.stringify(tempState));
        } catch (e) {
          console.error("Failed to save guest intent:", e);
        }
      }

      if (showFriendlyMessage) {
        // Show friendly redirect message first
        addMessage({
          role: "assistant",
          content: "To continue planning your perfect event and save your progress, please log in. Redirecting you now... 🚀",
        });
        setState("REDIRECTING_TO_LOGIN");
        // Delay redirect by 2500ms to let user see the message
        setTimeout(() => {
          router.push("/login");
        }, 2500);
      } else {
        setState("REDIRECTING_TO_LOGIN");
        // Use setTimeout to allow state to update before navigation
        setTimeout(() => {
          router.push("/login");
        }, 100);
      }
    },
    [router, addMessage]
  );

  // ==================== STEP 1: INITIALIZATION & DEMO ====================

  const initializeDemo = useCallback(async () => {
    setIsLoading(true);
    try {
      const demoResponse = await publicChatApi.getDemo();

      setMessages([
        {
          id: "demo-welcome",
          role: "assistant",
          content: demoResponse.message,
          timestamp: new Date(),
        },
      ]);

      setState("GUEST_DEMO");
    } catch (err) {
      console.error("Failed to fetch demo:", err);
      setError({
        code: "DEMO_LOAD_FAILED",
        message: "Failed to load demo. Please try again.",
        canRetry: true,
      });
      setState("ERROR");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ==================== STEP 2: GUEST MESSAGE & INTERCEPT ====================

  const handleGuestMessage = useCallback(
    async (text: string) => {
      setIsLoading(true);

      // Add user message
      const userMsgId = addMessage({ role: "user", content: text });

      // PRE-FLIGHT INTERCEPT: Immediately check auth state before making any API calls
      // This prevents any API failures from showing generic error messages to guests
      if (!isAuthenticated) {
        // Save guest's input to localStorage for post-login hydration
        try {
          localStorage.setItem(GUEST_INTENT_KEY, JSON.stringify({ message: text, ...guestStateRef.current }));
        } catch (e) {
          console.error("Failed to save guest intent:", e);
        }
        
        // Display the friendly assistant message
        addMessage({
          role: "assistant",
          content: "To continue planning your perfect event and save your progress, please log in. Redirecting you now... 🚀",
        });
        
        setState("REDIRECTING_TO_LOGIN");
        
        // Delay redirect by 2500ms to let user see the message
        setTimeout(() => {
          router.push("/login");
        }, 2500);
        
        setIsLoading(false);
        return; // Exit - do NOT proceed to API call
      }

      // Add loading message
      const aiMsgId = addMessage({
        role: "assistant",
        content: "",
        isLoading: true,
      });

      try {
        const response = await publicChatApi.sendGuestMessage({
          message: text,
          tempState: guestStateRef.current ?? undefined,
        });

        // Update AI message
        updateMessage(aiMsgId, response.reply);

        // If auth required, intercept and redirect with friendly message
        if (response.requiresAuth) {
          // Store the temp state for hydration
          if (response.tempState) {
            guestStateRef.current = response.tempState;
          }
          // Show friendly message and delay redirect
          redirectToLogin(response.tempState, true);
        } else {
          // Update guest state if returned
          if (response.tempState) {
            guestStateRef.current = response.tempState;
          }
          setState("GUEST_MESSAGE");
        }
      } catch (err: any) {
        console.error("Guest message failed:", err);
        
        // Catch-All: If user is not authenticated, assume they need to log in
        if (!isAuthenticated) {
          // Save their raw input to localStorage for post-login hydration
          try {
            localStorage.setItem(GUEST_INTENT_KEY, JSON.stringify({ message: text, ...guestStateRef.current }));
          } catch (e) {
            console.error("Failed to save guest intent:", e);
          }
          
          // Display the friendly assistant message
          addMessage({
            role: "assistant",
            content: "To continue planning your perfect event and save your progress, please log in. Redirecting you now... 🚀",
          });
          
          setState("REDIRECTING_TO_LOGIN");
          
          // Delay redirect by 2500ms to let user see the message
          setTimeout(() => {
            router.push("/login");
          }, 2500);
          
          setIsLoading(false);
          return;
        }
        
        // User IS authenticated - show generic error message
        updateMessage(aiMsgId, "Sorry, I encountered an error. Please try again.");
        setError({
          code: "MESSAGE_FAILED",
          message: err.message || "Failed to send message",
          canRetry: true,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [addMessage, updateMessage, redirectToLogin, router]
  );

  // ==================== STEP 3: HYDRATION (POST-LOGIN) ====================

  const hydrateSession = useCallback(async () => {
    setState("HYDRATING_SESSION");
    setIsLoading(true);

    try {
      // Check for stored guest intent
      let guestIntent: AIConversationState | null = null;
      if (typeof window !== "undefined") {
        try {
          const stored = localStorage.getItem(GUEST_INTENT_KEY);
          if (stored) {
            guestIntent = JSON.parse(stored);
            localStorage.removeItem(GUEST_INTENT_KEY);
          }
        } catch (e) {
          console.error("Failed to parse guest intent:", e);
        }
      }

      // Start authenticated conversation
      const convResponse = await aiChatbotApi.startConversation();
      setConversationId(convResponse.conversationId);

      // Set initial message
      const welcomeMsgId = addMessage({
        role: "assistant",
        content: "Welcome back! I'm your Event Brain assistant. How can I help you plan your event?",
        timestamp: new Date(),
      });

      // If we have guest intent, inject it silently
      if (guestIntent) {
        // Build a prompt from the guest state to resume conversation
        const promptParts: string[] = [];
        if (guestIntent.eventType) promptParts.push(`event type: ${guestIntent.eventType}`);
        if (guestIntent.city) promptParts.push(`in ${guestIntent.city}`);
        if (guestIntent.guestCount) promptParts.push(`for ${guestIntent.guestCount} guests`);
        if (guestIntent.budget) promptParts.push(`with budget: ${guestIntent.budget}`);

        if (promptParts.length > 0) {
          // Send the stored context as a message
          const contextMessage = `I'm planning ${promptParts.join(", ")}. Please continue with my event planning.`;

          const response = await aiChatbotApi.sendMessage({
            conversationId: convResponse.conversationId,
            message: contextMessage,
          });

          // Update UI with response
          addMessage({ role: "assistant", content: response.reply });

          // Update state if returned
          if (response.state) {
            guestStateRef.current = response.state;
          }

          // Check if plan generation was triggered
          if (response.status === "GENERATING" && response.jobId) {
            currentJobIdRef.current = response.jobId;
            setState("GENERATING_PLAN");
            startPolling(response.jobId);
          } else if (response.status === "GENERATED" && response.planId) {
            // Fetch and display plan
            const plan = await aiPlannerApi.getPlan(response.planId);
            setCurrentPlan(plan);
            setCurrentPlanJson(plan.planJson);
            addMessage({
              role: "assistant",
              content: "I've retrieved your event plan!",
              planData: plan.planJson,
            });
            setState("PLAN_READY");
          }
        }
      }

      setState("AUTHENTICATED");
    } catch (err: any) {
      console.error("Hydration failed:", err);
      setError({
        code: "HYDRATION_FAILED",
        message: "Failed to restore your session. Please try again.",
        canRetry: true,
      });
      setState("ERROR");
    } finally {
      setIsLoading(false);
    }
  }, [addMessage]);

  // ==================== STEP 4: AUTHENTICATED CHAT ====================

  const sendAuthenticatedMessage = useCallback(
    async (text: string) => {
      if (!conversationId) {
        console.error("No conversation ID");
        return;
      }

      setIsLoading(true);

      // Add user message
      const userMsgId = addMessage({ role: "user", content: text });

      // Add loading message
      const aiMsgId = addMessage({
        role: "assistant",
        content: "",
        isLoading: true,
      });

      try {
        const response: SendMessageResponse = await aiChatbotApi.sendMessage({
          conversationId,
          message: text,
        });

        // Update AI message
        updateMessage(aiMsgId, response.reply);

        // Update conversation state if returned
        if (response.state) {
          guestStateRef.current = response.state;
        }

        // Check status and handle plan generation
        if (response.status === "GENERATING" && response.jobId) {
          currentJobIdRef.current = response.jobId;
          setState("GENERATING_PLAN");
          startPolling(response.jobId);
        } else if (response.status === "GENERATED" && response.planId) {
          // Plan already generated, fetch it
          const plan = await aiPlannerApi.getPlan(response.planId);
          setCurrentPlan(plan);
          setCurrentPlanJson(plan.planJson);
          addMessage({
            role: "assistant",
            content: "Here's your event plan!",
            planData: plan.planJson,
          });
          setState("PLAN_READY");
        } else if (response.status) {
          // Update UI state based on conversation status
          if (response.status === "ACCEPTED") {
            setState("PLAN_READY"); // Plan already accepted
          }
        }
      } catch (err: any) {
        console.error("Send message failed:", err);

        // Handle 401 specifically
        if (err.response?.status === 401) {
          setError({
            code: "UNAUTHORIZED",
            message: "Your session has expired. Please log in again.",
            canRetry: false,
          });
          redirectToLogin();
          return;
        }

        updateMessage(aiMsgId, "Sorry, I encountered an error. Please try again.");
        setError({
          code: "MESSAGE_FAILED",
          message: err.message || "Failed to send message",
          canRetry: true,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [conversationId, addMessage, updateMessage, redirectToLogin]
  );

  // ==================== POLLING ====================

  const startPolling = useCallback(
    (jobId: string) => {
      clearPolling();
      setIsPolling(true);
      attemptCountRef.current = 0;

      const checkJobStatus = async () => {
        attemptCountRef.current++;

        try {
          const jobStatus: JobStatusResponse = await aiPlannerApi.getJobStatus(jobId);

          // Update progress (approximate)
          setProgress(
            Math.min((attemptCountRef.current / MAX_POLLING_ATTEMPTS) * 100, 95)
          );

          // Check for terminal state
          if (TERMINAL_JOB_STATUSES.includes(jobStatus.status)) {
            clearPolling();
            setProgress(100);

            if (jobStatus.status === "completed" && jobStatus.result?.planId) {
              // Fetch the complete plan
              const plan = await aiPlannerApi.getPlan(jobStatus.result.planId);
              setCurrentPlan(plan);
              setCurrentPlanJson(plan.planJson);

              // Add system message with plan
              addMessage({
                role: "assistant",
                content: `Your event plan for ${plan.planJson.summary.eventType} in ${plan.planJson.summary.city} has been generated!`,
                planData: plan.planJson,
              });

              setState("PLAN_READY");
              options?.onPlanAccepted?.(plan.id);
            } else {
              // Job failed
              setError({
                code: "JOB_FAILED",
                message: jobStatus.error || "Plan generation failed",
                canRetry: true,
              });
              setState("ERROR");
            }
          }
        } catch (err: any) {
          console.error("Polling error:", err);

          // Handle specific errors
          if (err.response?.status === 404) {
            clearPolling();
            setError({
              code: "JOB_NOT_FOUND",
              message: "Job not found. It may have expired.",
              canRetry: true,
            });
            setState("ERROR");
            return;
          }

          // Stop after max attempts
          if (attemptCountRef.current >= MAX_POLLING_ATTEMPTS) {
            clearPolling();
            setError({
              code: "POLLING_TIMEOUT",
              message: "Request timed out. Please try again.",
              canRetry: true,
            });
            setState("ERROR");
          }
        }
      };

      // Start polling
      pollingRef.current = setInterval(checkJobStatus, POLLING_INTERVAL_MS);

      // Immediate first check
      checkJobStatus();
    },
    [clearPolling, addMessage, options]
  );

  // ==================== ACCEPT PLAN ====================

  const acceptPlan = useCallback(async () => {
    if (!currentPlan) {
      setError({
        code: "NO_PLAN",
        message: "No plan to accept",
        canRetry: false,
      });
      return;
    }

    setState("ACCEPTING_PLAN");
    setIsLoading(true);

    try {
      const result = await aiPlannerApi.acceptPlan(currentPlan.id);

      setState("PLAN_READY");
      options?.onPlanAccepted?.(result.cartId);
    } catch (err: any) {
      console.error("Accept plan failed:", err);

      if (err.response?.status === 401) {
        setError({
          code: "UNAUTHORIZED",
          message: "Your session has expired. Please log in again.",
          canRetry: false,
        });
        redirectToLogin();
        return;
      }

      setError({
        code: "ACCEPT_FAILED",
        message: err.message || "Failed to convert plan to cart",
        canRetry: true,
      });
      setState("ERROR");
    } finally {
      setIsLoading(false);
    }
  }, [currentPlan, redirectToLogin, options]);

  // ==================== RETRY ====================

  const retryPlan = useCallback(async () => {
    setError(null);
    setCurrentPlan(null);
    setCurrentPlanJson(null);
    setProgress(0);
    guestStateRef.current = null;

    if (isAuthenticated) {
      setState("AUTHENTICATED");
    } else {
      setMessages([]);
      initializeDemo();
    }
  }, [isAuthenticated, initializeDemo]);

  // ==================== CLEAR CONVERSATION ====================

  const clearConversation = useCallback(() => {
    clearPolling();
    setMessages([]);
    setCurrentPlan(null);
    setCurrentPlanJson(null);
    setConversationId(null);
    setError(null);
    setProgress(0);
    guestStateRef.current = null;
    currentJobIdRef.current = null;

    if (isAuthenticated) {
      hydrateSession();
    } else {
      initializeDemo();
    }
  }, [isAuthenticated, hydrateSession, initializeDemo, clearPolling]);

  // ==================== INITIALIZATION EFFECT ====================

  useEffect(() => {
    if (isAuthenticated) {
      hydrateSession();
    } else {
      initializeDemo();
    }
  }, [isAuthenticated]); // Only run on auth state change

  // ==================== CLEANUP ====================

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  // ==================== COMBINED SEND MESSAGE ====================

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      if (!isAuthenticated) {
        await handleGuestMessage(text);
      } else {
        await sendAuthenticatedMessage(text);
      }
    },
    [isAuthenticated, handleGuestMessage, sendAuthenticatedMessage]
  );

  // ==================== RETURN ====================

  return {
    state,
    messages,
    currentPlan,
    currentPlanJson,
    conversationId,
    isLoading,
    isPolling,
    error,
    progress,
    sendMessage,
    acceptPlan,
    retryPlan,
    clearConversation,
  };
}
