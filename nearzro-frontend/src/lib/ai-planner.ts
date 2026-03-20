/**
 * NearZro - AI Planner API Endpoints
 * 
 * API client functions for the AI Planner and AI Chatbot modules.
 */

import api from "@/lib/api";
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
} from "@/types/ai-planner";

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
    api.get(`/ai-planner/plans/${planId}`).then((res) => res.data),

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
    api.post("/ai-chat/send", data).then((res) => res.data),

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
