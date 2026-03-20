"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  ReactNode,
} from "react";
import type {
  AIPlan,
  AIPlanJSON,
  PlannerUIState,
  PlannerFormData,
  PlannerError,
  AIConversation,
  ChatMessage,
} from "@/types/ai-planner";

// ==================== STATE TYPES ====================

interface AIPlannerState {
  // Current active plan
  activePlan: AIPlan | null;
  activePlanJson: AIPlanJSON | null;
  
  // UI State
  uiState: PlannerUIState;
  formData: PlannerFormData;
  error: PlannerError | null;
  
  // Job tracking
  currentJobId: string | null;
  
  // Conversation (for chatbot)
  conversation: AIConversation | null;
  messages: ChatMessage[];
  
  // History
  planHistory: AIPlan[];
  
  // Loading states
  isSubmitting: boolean;
  isPolling: boolean;
}

type AIPlannerAction =
  | { type: "SET_FORM_DATA"; payload: Partial<PlannerFormData> }
  | { type: "SET_UI_STATE"; payload: PlannerUIState }
  | { type: "SET_ACTIVE_PLAN"; payload: AIPlan | null }
  | { type: "SET_JOB_ID"; payload: string | null }
  | { type: "SET_ERROR"; payload: PlannerError | null }
  | { type: "SET_CONVERSATION"; payload: AIConversation | null }
  | { type: "ADD_MESSAGE"; payload: ChatMessage }
  | { type: "UPDATE_MESSAGE"; payload: { id: string; content: string } }
  | { type: "SET_MESSAGES"; payload: ChatMessage[] }
  | { type: "SET_PLAN_HISTORY"; payload: AIPlan[] }
  | { type: "ADD_TO_HISTORY"; payload: AIPlan }
  | { type: "SET_SUBMITTING"; payload: boolean }
  | { type: "SET_POLLING"; payload: boolean }
  | { type: "RESET" };

// ==================== INITIAL STATE ====================

const initialFormData: PlannerFormData = {
  budget: 0,
  eventType: "",
  city: "",
  area: "",
  guestCount: 0,
};

const initialState: AIPlannerState = {
  activePlan: null,
  activePlanJson: null,
  uiState: "COLLECTING",
  formData: initialFormData,
  error: null,
  currentJobId: null,
  conversation: null,
  messages: [],
  planHistory: [],
  isSubmitting: false,
  isPolling: false,
};

// ==================== REDUCER ====================

function aiPlannerReducer(
  state: AIPlannerState,
  action: AIPlannerAction
): AIPlannerState {
  switch (action.type) {
    case "SET_FORM_DATA":
      return {
        ...state,
        formData: { ...state.formData, ...action.payload },
      };

    case "SET_UI_STATE":
      return {
        ...state,
        uiState: action.payload,
      };

    case "SET_ACTIVE_PLAN":
      return {
        ...state,
        activePlan: action.payload,
        activePlanJson: action.payload?.planJson ?? null,
      };

    case "SET_JOB_ID":
      return {
        ...state,
        currentJobId: action.payload,
      };

    case "SET_ERROR":
      return {
        ...state,
        error: action.payload,
      };

    case "SET_CONVERSATION":
      return {
        ...state,
        conversation: action.payload,
      };

    case "ADD_MESSAGE":
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };

    case "UPDATE_MESSAGE":
      return {
        ...state,
        messages: state.messages.map((msg) =>
          msg.id === action.payload.id
            ? { ...msg, content: action.payload.content, isLoading: false }
            : msg
        ),
      };

    case "SET_MESSAGES":
      return {
        ...state,
        messages: action.payload,
      };

    case "SET_PLAN_HISTORY":
      return {
        ...state,
        planHistory: action.payload,
      };

    case "ADD_TO_HISTORY":
      return {
        ...state,
        planHistory: [action.payload, ...state.planHistory],
      };

    case "SET_SUBMITTING":
      return {
        ...state,
        isSubmitting: action.payload,
      };

    case "SET_POLLING":
      return {
        ...state,
        isPolling: action.payload,
      };

    case "RESET":
      return {
        ...initialState,
        planHistory: state.planHistory,
      };

    default:
      return state;
  }
}

// ==================== CONTEXT ====================

interface AIPlannerContextValue {
  state: AIPlannerState;
  
  // Form actions
  setFormData: (data: Partial<PlannerFormData>) => void;
  resetForm: () => void;
  
  // Plan actions
  setActivePlan: (plan: AIPlan | null) => void;
  setJobId: (jobId: string | null) => void;
  
  // UI actions
  setUIState: (state: PlannerUIState) => void;
  setError: (error: PlannerError | null) => void;
  
  // Conversation actions
  setConversation: (conversation: AIConversation | null) => void;
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, content: string) => void;
  setMessages: (messages: ChatMessage[]) => void;
  
  // History actions
  setPlanHistory: (plans: AIPlan[]) => void;
  addToHistory: (plan: AIPlan) => void;
  
  // Loading states
  setSubmitting: (isSubmitting: boolean) => void;
  setPolling: (isPolling: boolean) => void;
  
  // Reset
  reset: () => void;
}

const AIPlannerContext = createContext<AIPlannerContextValue | undefined>(
  undefined
);

// ==================== PROVIDER ====================

interface AIPlannerProviderProps {
  children: ReactNode;
}

export function AIPlannerProvider({ children }: AIPlannerProviderProps) {
  const [state, dispatch] = useReducer(aiPlannerReducer, initialState);

  // Form actions
  const setFormData = useCallback((data: Partial<PlannerFormData>) => {
    dispatch({ type: "SET_FORM_DATA", payload: data });
  }, []);

  const resetForm = useCallback(() => {
    dispatch({ type: "SET_FORM_DATA", payload: initialFormData });
  }, []);

  // Plan actions
  const setActivePlan = useCallback((plan: AIPlan | null) => {
    dispatch({ type: "SET_ACTIVE_PLAN", payload: plan });
  }, []);

  const setJobId = useCallback((jobId: string | null) => {
    dispatch({ type: "SET_JOB_ID", payload: jobId });
  }, []);

  // UI actions
  const setUIState = useCallback((uiState: PlannerUIState) => {
    dispatch({ type: "SET_UI_STATE", payload: uiState });
  }, []);

  const setError = useCallback((error: PlannerError | null) => {
    dispatch({ type: "SET_ERROR", payload: error });
  }, []);

  // Conversation actions
  const setConversation = useCallback((conversation: AIConversation | null) => {
    dispatch({ type: "SET_CONVERSATION", payload: conversation });
  }, []);

  const addMessage = useCallback((message: ChatMessage) => {
    dispatch({ type: "ADD_MESSAGE", payload: message });
  }, []);

  const updateMessage = useCallback((id: string, content: string) => {
    dispatch({ type: "UPDATE_MESSAGE", payload: { id, content } });
  }, []);

  const setMessages = useCallback((messages: ChatMessage[]) => {
    dispatch({ type: "SET_MESSAGES", payload: messages });
  }, []);

  // History actions
  const setPlanHistory = useCallback((plans: AIPlan[]) => {
    dispatch({ type: "SET_PLAN_HISTORY", payload: plans });
  }, []);

  const addToHistory = useCallback((plan: AIPlan) => {
    dispatch({ type: "ADD_TO_HISTORY", payload: plan });
  }, []);

  // Loading states
  const setSubmitting = useCallback((isSubmitting: boolean) => {
    dispatch({ type: "SET_SUBMITTING", payload: isSubmitting });
  }, []);

  const setPolling = useCallback((isPolling: boolean) => {
    dispatch({ type: "SET_POLLING", payload: isPolling });
  }, []);

  // Reset
  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  const value: AIPlannerContextValue = {
    state,
    setFormData,
    resetForm,
    setActivePlan,
    setJobId,
    setUIState,
    setError,
    setConversation,
    addMessage,
    updateMessage,
    setMessages,
    setPlanHistory,
    addToHistory,
    setSubmitting,
    setPolling,
    reset,
  };

  return (
    <AIPlannerContext.Provider value={value}>
      {children}
    </AIPlannerContext.Provider>
  );
}

// ==================== HOOK ====================

export function useAIPlannerContext() {
  const context = useContext(AIPlannerContext);
  if (!context) {
    throw new Error(
      "useAIPlannerContext must be used within an AIPlannerProvider"
    );
  }
  return context;
}
