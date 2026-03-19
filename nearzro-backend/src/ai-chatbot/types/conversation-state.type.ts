/**
 * Conversation State Types
 * 
 * Defines the structure of the conversation state stored in DB
 */

/**
 * User preferences extracted from conversation
 */
export interface ConversationPreferences {
  exclude?: string[];
  priority?: string[];
}

/**
 * Complete conversation state
 */
export interface ConversationState {
  budget?: number;
  guestCount?: number;
  city?: string;
  area?: string;
  eventType?: string;
  preferences?: ConversationPreferences;
}

/**
 * Required fields for AI plan generation
 */
export const REQUIRED_FIELDS: (keyof ConversationState)[] = [
  'budget',
  'guestCount',
  'city',
  'eventType',
];

/**
 * Check if conversation state has all required fields
 */
export function isStateComplete(state: ConversationState): boolean {
  return REQUIRED_FIELDS.every((field) => {
    const value = state[field];
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    return value !== undefined && value !== null;
  });
}

/**
 * Get missing fields from conversation state
 */
export function getMissingFields(state: ConversationState): (keyof ConversationState)[] {
  return REQUIRED_FIELDS.filter((field) => {
    const value = state[field];
    if (typeof value === 'string') {
      return value.trim().length === 0;
    }
    return value === undefined || value === null;
  });
}

/**
 * Intent types for conversation flow
 */
export enum ConversationIntent {
  COLLECT_INFO = 'COLLECT_INFO',
  MODIFY_PLAN = 'MODIFY_PLAN',
  ACCEPT_PLAN = 'ACCEPT_PLAN',
  REJECT_PLAN = 'REJECT_PLAN',
  GET_STATUS = 'GET_STATUS',
  GENERAL = 'GENERAL',
}

/**
 * Conversation status for frontend
 */
export type ConversationStatus = 
  | 'COLLECTING' 
  | 'READY' 
  | 'GENERATING' 
  | 'GENERATED' 
  | 'MODIFYING' 
  | 'ACCEPTED' 
  | 'FAILED';

/**
 * Map internal status to frontend status
 */
export function toFrontendStatus(status: string): ConversationStatus {
  const statusMap: Record<string, ConversationStatus> = {
    COLLECTING: 'COLLECTING',
    READY: 'READY',
    GENERATING: 'GENERATING',
    GENERATED: 'GENERATED',
    MODIFYING: 'MODIFYING',
    ACCEPTED: 'ACCEPTED',
    FAILED: 'FAILED',
  };
  return statusMap[status] || 'COLLECTING';
}
