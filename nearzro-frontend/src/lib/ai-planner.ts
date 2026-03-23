/**
 * NearZro - AI Planner API Endpoints
 * 
 * API client functions for the AI Planner and AI Chatbot modules.
 * Includes both public (no auth) and protected (JWT required) endpoints.
 */

import api from "@/lib/api";
import axios from "axios";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Separate axios instance for public endpoints (no JWT)
const publicApi = axios.create({
  baseURL: `${apiBaseUrl}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});
import type {
  AIPlan,
  AIPlanPublic,
  CreateAIPlanRequest,
  GeneratePlanResponse,
  JobStatusResponse,
  AIPlannerHealth,
  VendorMatchResult,
  SendMessageRequest,
  SendMessageResponse,
  AIConversation,
  AIConversationState,
} from "@/types/ai-planner";

// ==================== PUBLIC ENDPOINT TYPES ====================

/**
 * Response from the demo endpoint
 */
export interface DemoChatResponse {
  message: string;
  suggestions?: string[];
}

/**
 * Request for public (guest) message
 */
export interface GuestMessageRequest {
  message: string;
  tempState?: AIConversationState;
}

/**
 * Response from public (guest) message endpoint
 * Returns requiresAuth flag to trigger login redirect
 */
export interface GuestMessageResponse {
  reply: string;
  conversationId?: string;
  tempState?: AIConversationState;
  requiresAuth: boolean;
  status?: string;
}

// ==================== AI PLANNER API ====================

export const aiPlannerApi = {
  /**
   * Generate a new AI plan asynchronously
   */
  generatePlan: (data: CreateAIPlanRequest): Promise<GeneratePlanResponse> =>
    api.post("/ai-planner/generate", data).then((res) => res.data),

  /**
   * Get job status by job ID
   */
  getJobStatus: (jobId: string): Promise<JobStatusResponse> =>
    api.get(`/ai-planner/jobs/${jobId}`).then((res) => res.data),

  /**
   * Get AI plan by ID (authenticated)
   */
  getPlan: (planId: number): Promise<AIPlan> =>
    api.get(`/ai-planner/${planId}/result`).then((res) => res.data),

  /**
   * Get public plan by share ID
   */
  getPublicPlan: (shareId: string): Promise<AIPlanPublic> =>
    api.get(`/ai-planner/public/plan/${shareId}`).then((res) => res.data),

  /**
   * Regenerate an existing AI plan
   */
  regeneratePlan: (planId: number): Promise<GeneratePlanResponse> =>
    api.post(`/ai-planner/${planId}/regenerate`).then((res) => res.data),

  /**
   * Match vendors from an AI plan
   */
  matchVendors: (planId: number): Promise<VendorMatchResult[]> =>
    api.post(`/ai-planner/${planId}/vendors`).then((res) => res.data),

  /**
   * Accept AI plan and create cart
   */
  acceptPlan: (planId: number): Promise<{ cartId: number }> =>
    api.post(`/ai-planner/${planId}/accept`).then((res) => res.data),

  /**
   * Get AI planner health status
   */
  getHealth: (): Promise<AIPlannerHealth> =>
    api.get("/ai-planner/health").then((res) => res.data),
};

// ==================== AI CHATBOT API ====================

export const aiChatbotApi = {
  /**
   * Send a message in the conversation
   */
  sendMessage: (data: SendMessageRequest): Promise<SendMessageResponse> =>
    api.post("/ai-chat/message", data).then((res) => res.data),

  /**
   * Get conversation by ID
   */
  getConversation: (conversationId: string): Promise<AIConversation> =>
    api.get(`/ai-chat/conversations/${conversationId}`).then((res) => res.data),

  /**
   * Get all conversations for current user
   */
  getConversations: (): Promise<AIConversation[]> =>
    api.get("/ai-chat/conversations").then((res) => res.data),

  /**
   * Start a new conversation
   */
  startConversation: (): Promise<{ conversationId: string }> =>
    api.post("/ai-chat/conversations").then((res) => res.data),

  /**
   * Delete a conversation
   */
  deleteConversation: (conversationId: string): Promise<void> =>
    api.delete(`/ai-chat/conversations/${conversationId}`).then((res) => res.data),
};

// ==================== PUBLIC API (No Auth Required) ====================

export const publicChatApi = {
  /**
   * Get demo chatbot response for unauthenticated users
   * Returns sample introductory message
   */
  getDemo: (): Promise<DemoChatResponse> =>
    publicApi.get("/ai-chat/public/demo").then((res) => res.data),

  /**
   * Send message as guest (no auth required)
   * Returns requiresAuth=true when user needs to login
   */
  sendGuestMessage: (data: GuestMessageRequest): Promise<GuestMessageResponse> =>
    publicApi.post("/ai-chat/public/message", data).then((res) => res.data),
};
