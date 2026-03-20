/**
 * NearZro - AI Planner Types
 * 
 * Type definitions for the AI Planner and AI Chatbot modules.
 * Based on backend Prisma schema and API responses.
 */

// ==================== AI PLAN TYPES ====================

export type AIPlanStatus = 'GENERATED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

export interface AIPlanSummary {
  eventType: string;
  city: string;
  guestCount: number;
  totalBudget: number;
}

export interface AIPlanAllocation {
  category: string;
  amount: number;
  notes?: string;
}

export interface AIPlanJSON {
  summary: AIPlanSummary;
  allocations: AIPlanAllocation[];
}

export interface AIPlan {
  id: number;
  userId: number;
  eventId?: number;
  budget: number;
  city: string;
  area: string;
  guestCount: number;
  planJson: AIPlanJSON;
  status: AIPlanStatus;
  shareId: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIPlanPublic {
  id: number;
  budget: number;
  city: string;
  area: string;
  guestCount: number;
  planJson: AIPlanJSON;
  status: string;
  createdAt: Date;
}

// ==================== AI CONVERSATION TYPES ====================

export type AIConversationStatus = 
  | 'COLLECTING' 
  | 'READY' 
  | 'GENERATING' 
  | 'GENERATED' 
  | 'MODIFYING'
  | 'ACCEPTED'
  | 'FAILED';

export interface AIConversationState {
  budget?: number;
  eventType?: string;
  city?: string;
  area?: string;
  guestCount?: number;
  currentStep?: string;
  collectedFields: string[];
  // Status can be returned in response for convenience
  status?: AIConversationStatus;
}

export interface AIConversation {
  id: string;
  userId: number;
  state: AIConversationState;
  status: AIConversationStatus;
  planId?: number;
  generationKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== JOB TYPES ====================

export type JobStatus = 'waiting' | 'active' | 'completed' | 'failed' | 'stalled';

export interface JobStatusResponse {
  jobId: string;
  status: JobStatus;
  progress: number;
  attempts: number;
  result?: GeneratePlanJobResult;
  error?: string;
  createdAt?: Date;
  processedAt?: Date;
  finishedAt?: Date;
}

export interface GeneratePlanJobResult {
  planId: number;
  status: 'success' | 'failed';
  error?: string;
}

export interface GeneratePlanResponse {
  jobId: string;
  message: string;
  status: 'waiting';
}

// ==================== DTOs ====================

export interface CreateAIPlanRequest {
  budget: number;
  eventType: string;
  city: string;
  area?: string;
  guestCount: number;
  conversationId?: string;
  eventId?: number;
}

// ==================== UI STATE TYPES ====================

export type PlannerUIState = 
  | 'COLLECTING'    // Form input state
  | 'GENERATING'    // Polling/loading state
  | 'SUCCESS'       // Plan displayed
  | 'FAILED';       // Error state with retry

export interface PlannerFormData {
  budget: number;
  eventType: string;
  city: string;
  area: string;
  guestCount: number;
}

export interface PlannerError {
  code: string;
  message: string;
  canRetry: boolean;
}

// ==================== CHAT TYPES ====================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

export interface SendMessageRequest {
  conversationId: string;
  message: string;
  generationKey?: string;
}

export interface SendMessageResponse {
  message: string;
  conversationId: string;
  updatedState: AIConversationState;
  planId?: number;
  status?: AIConversationStatus;
  jobId?: string;
}

// ==================== VENDOR MATCHING ====================

export interface VendorMatchResult {
  id: number;
  name: string;
  city: string;
  rating: number;
  baseRate: number;
  serviceType: string;
  description?: string;
}

// ==================== HEALTH CHECK ====================

export interface AIPlannerHealth {
  redis: string;
  queue: string;
  worker: string;
  aiProvider: string;
  queueStats?: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  };
}
