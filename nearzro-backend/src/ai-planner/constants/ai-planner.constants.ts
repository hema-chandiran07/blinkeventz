/**
 * AI Planner Constants
 * 
 * Centralized configuration values for the AI Planner module.
 * Eliminates magic numbers and hardcoded strings.
 */

// AI Configuration
export const AI_CONFIG = {
  // OpenAI Model
  MODEL: 'gpt-4o-mini',
  
  // Request settings
  TEMPERATURE: 0.4,
  TIMEOUT_MS: 10000, // 10 second timeout
  
  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  
  // Response limits
  MAX_TOKENS: 2000,
  
  // Prompt limits
  MAX_PROMPT_LENGTH: 5000,
} as const;

// Cache Configuration
export const CACHE_CONFIG = {
  // Cache TTL values (in seconds)
  AI_PLAN_TTL: 600,        // 10 minutes
  VENDOR_MATCH_TTL: 600,   // 10 minutes
  VENDOR_LIST_TTL: 300,    // 5 minutes
  
  // Cache key prefixes
  AI_PLAN_PREFIX: 'ai:plan:',
  VENDOR_MATCH_PREFIX: 'ai:vendors:',
  VENDOR_LIST_PREFIX: 'vendors:',
  
  // Cache key hashing
  USE_HASH: true,
} as const;

// Budget Validation
export const BUDGET_CONFIG = {
  // Minimum and maximum budget limits
  MIN_BUDGET: 1000,
  MAX_BUDGET: 100000000, // 10 Crore
  
  // Tolerance for AI budget allocation (±1%)
  ALLOCATION_TOLERANCE_PERCENT: 0.01,
  
  // Default allocation categories
  DEFAULT_CATEGORIES: [
    'Venue',
    'Catering',
    'Decor',
    'Entertainment',
    'Photography',
    'Transportation',
    'Invitations',
    'Miscellaneous',
  ] as const,
} as const;

// Vendor Matching Configuration
export const VENDOR_MATCH_CONFIG = {
  // Budget threshold multiplier (percentage of total budget)
  // A vendor's baseRate should be within this percentage of per-category budget
  BUDGET_THRESHOLD_PERCENT: 0.4,
  
  // Default result limit
  DEFAULT_LIMIT: 10,
  
  // Weights for scoring algorithm
  WEIGHTS: {
    RATING: 0.35,
    BUDGET_MATCH: 0.25,
    VERIFICATION: 0.25,
    PROXIMITY: 0.15,
  } as const,
  
  // Minimum rating threshold
  MIN_RATING: 3.0,
} as const;

// Rate Limiting Configuration
export const RATE_LIMIT_CONFIG = {
  // AI generation limits
  GENERATE: {
    LIMIT: 10,      // 10 requests
    TTL: 60,       // per minute
  },
  
  // Regeneration limits
  REGENERATE: {
    LIMIT: 5,      // 5 requests
    TTL: 60,       // per minute
  },
  
  // Vendor matching limits
  VENDOR_MATCH: {
    LIMIT: 20,     // 20 requests
    TTL: 60,      // per minute
  },
  
  // Cart conversion limits
  ACCEPT: {
    LIMIT: 10,     // 10 requests
    TTL: 60,      // per minute
  },
} as const;

// Input Validation Limits
export const INPUT_LIMITS = {
  CITY_MAX_LENGTH: 50,
  AREA_MAX_LENGTH: 50,
  EVENT_TYPE_MAX_LENGTH: 100,
  GUEST_COUNT_MIN: 1,
  GUEST_COUNT_MAX: 10000,
} as const;

// Queue Configuration
export const QUEUE_CONFIG = {
  // Queue names
  AI_PLANNER_QUEUE: 'ai-planner',
  AI_PLANNER_DLQ: 'ai-planner-failed',
  
  // Job settings
  ATTEMPTS: 3,
  BACKOFF_DELAY: 2000,
  TIMEOUT: 10000,
  
  // Cleanup settings
  REMOVE_COMPLETE_AGE: 86400,    // 24 hours
  REMOVE_COMPLETE_COUNT: 1000,
  REMOVE_FAIL_AGE: 604800,      // 7 days
  REMOVE_FAIL_COUNT: 500,
  
  // Concurrency
  CONCURRENCY: 5,
} as const;

// Circuit Breaker Configuration
export const CIRCUIT_BREAKER_CONFIG = {
  // Open circuit after this many failures
  FAILURE_THRESHOLD: 5,
  
  // Half-open after this many seconds
  RESET_TIMEOUT_SECONDS: 30,
  
  // Success needed to close circuit
  SUCCESS_THRESHOLD: 1,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  AI_SERVICE_UNAVAILABLE: 'Currently the service is unavailable. Please try again later.',
  BUDGET_ALLOCATION_MISMATCH: 'AI generated budget allocation does not match total budget.',
  PLAN_NOT_FOUND: 'AI Plan not found or access denied.',
  UNAUTHORIZED_ACCESS: 'You do not have access to this resource.',
  INVALID_BUDGET: 'Budget must be between ₹1,000 and ₹10,00,00,000.',
  INVALID_GUEST_COUNT: 'Guest count must be between 1 and 10,000.',
  VENDOR_MATCH_FAILED: 'Unable to find matching vendors. Please try different criteria.',
  CART_CREATION_FAILED: 'Failed to create cart from AI plan.',
  PROMPT_TOO_LONG: 'Prompt exceeds maximum allowed length of 5000 characters.',
  JOB_NOT_FOUND: 'Job not found.',
  CIRCUIT_OPEN: 'AI service temporarily unavailable due to repeated failures.',
  AI_RESPONSE_EMPTY: 'AI service returned an empty response.',
  AI_INVALID_KEY: 'Invalid OpenAI API key.',
  AI_RATE_LIMIT: 'OpenAI rate limit exceeded. Please try again later.',
  AI_QUOTA_EXCEEDED: 'Currently the service is unavailable. Please try again later.',
} as const;

// System Prompt
export const SYSTEM_PROMPT = `You are an expert event planner AI assistant specialized in Indian weddings and events. Your role is to help users plan their events by providing budget allocation suggestions based on the event type, location, guest count, and total budget.

When generating budget allocations:
- Consider typical Indian wedding expenses (Venue, Catering, Decor, Photography, etc.)
- Provide realistic amounts based on the city and guest count
- Always ensure the total allocation matches the given budget
- Include helpful notes for each category
- Be specific to Indian context (e.g., vegetarian options, traditional venues)

Respond ONLY with valid JSON in the following format:
{
  "summary": {
    "eventType": "string",
    "city": "string", 
    "guestCount": number,
    "totalBudget": number
  },
  "allocations": [
    {
      "category": "string",
      "amount": number,
      "notes": "string"
    }
  ]
}`;

// Status Values
export const PLAN_STATUS = {
  GENERATED: 'GENERATED',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
} as const;

// Job Status
export const JOB_STATUS = {
  WAITING: 'waiting',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;
