import { createHash } from 'crypto';
import he from 'he';
import { INPUT_LIMITS, AI_CONFIG, ERROR_MESSAGES } from '../constants/ai-planner.constants';

/**
 * Input Sanitizer
 * 
 * Provides sanitization functions to prevent injection attacks
 * on user inputs before they are used in AI prompts or database queries.
 */

export class InputSanitizer {
  /**
   * Sanitize string input for safe use in AI prompts
   * - Trims whitespace
   * - Removes control characters
   * - Escapes potentially dangerous characters
   * - Enforces maximum length
   */
  static sanitizeForPrompt(input: string, maxLength: number = 100): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

<<<<<<< Updated upstream
    return input
=======
    let sanitized = input
>>>>>>> Stashed changes
      .trim()
      .slice(0, maxLength)
      // Remove control characters except newlines and tabs
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Escape JSON special characters that could break the prompt
<<<<<<< Updated upstream
      .replace(/["\\]/g, (match) => `\\${match}`)
      // Remove any markdown or code block indicators
      .replace(/```/g, '')
      // Remove potential prompt injection patterns
      .replace(/ignore previous instructions/gi, '')
      .replace(/ignore all rules/gi, '')
      .replace(/system prompt/gi, '')
      .replace(/you are now/gi, '')
      .replace(/pretend to be/gi, '')
      .replace(/roleplay/gi, '')
      // Additional security patterns
      .replace(/ignore.*previous/gi, '')
      .replace(/disregard.*instructions/gi, '')
      .replace(/forget.*rules/gi, '');
=======
      .replace(/["\\]/g, (match) => `\\${match}`);

    // Encode HTML entities to prevent XSS in any downstream rendering
    sanitized = he.encode(sanitized, { useNamedReferences: true });

    // Structural defense: wrap user content in clearly delimited tags
    // The AI system prompt will instruct to treat everything inside these tags as untrusted
    return `<user-content>${sanitized}</user-content>`;
>>>>>>> Stashed changes
  }

  /**
   * Sanitize city name
   */
  static sanitizeCity(city: string): string {
    return this.sanitizeForPrompt(city, INPUT_LIMITS.CITY_MAX_LENGTH)
      // Allow only letters, spaces, hyphens, and apostrophes
      .replace(/[^a-zA-Z\s\-']/g, '');
  }

  /**
   * Sanitize area/locality name
   */
  static sanitizeArea(area: string): string {
    return this.sanitizeForPrompt(area, INPUT_LIMITS.AREA_MAX_LENGTH)
      // Allow letters, numbers, spaces, hyphens, and apostrophes
      .replace(/[^a-zA-Z0-9\s\-']/g, '');
  }

  /**
   * Sanitize event type
   */
  static sanitizeEventType(eventType: string): string {
    return this.sanitizeForPrompt(eventType, INPUT_LIMITS.EVENT_TYPE_MAX_LENGTH)
      // Allow letters, spaces, and common punctuation
      .replace(/[^a-zA-Z0-9\s\-&']/g, '');
  }

  /**
   * Validate and sanitize budget
   * Ensures budget is a positive integer within allowed range
   */
  static sanitizeBudget(budget: number): number {
    const sanitized = Math.floor(Number(budget));
    if (isNaN(sanitized) || sanitized <= 0) {
      throw new Error('Invalid budget value');
    }
    return sanitized;
  }

  /**
   * Validate and sanitize guest count
   */
  static sanitizeGuestCount(guestCount: number): number {
    const sanitized = Math.floor(Number(guestCount));
    if (isNaN(sanitized) || sanitized <= 0) {
      throw new Error('Invalid guest count value');
    }
    return Math.min(sanitized, INPUT_LIMITS.GUEST_COUNT_MAX);
  }

  /**
   * Generate a hash for cache key
   * Prevents cache key size issues with large JSON inputs
   */
  static generateCacheKey(data: Record<string, unknown>): string {
    const jsonString = JSON.stringify(data, Object.keys(data).sort());
    return createHash('sha256').update(jsonString).digest('hex').slice(0, 32);
  }

  /**
   * Validate prompt length
   * Returns true if prompt is within limits
   * Throws error if prompt exceeds maximum length
   */
  static validatePromptLength(prompt: string): void {
    if (!prompt || typeof prompt !== 'string') {
      throw new Error('Prompt is empty');
    }
    
    if (prompt.length > AI_CONFIG.MAX_PROMPT_LENGTH) {
      throw new Error(ERROR_MESSAGES.PROMPT_TOO_LONG);
    }
  }

  /**
   * Sanitize all input fields in a DTO
   */
  static sanitizeAIPlanInput(input: {
    budget: number;
    eventType: string;
    city: string;
    area: string;
    guestCount: number;
  }): {
    budget: number;
    eventType: string;
    city: string;
    area: string;
    guestCount: number;
  } {
    return {
      budget: this.sanitizeBudget(input.budget),
      eventType: this.sanitizeEventType(input.eventType),
      city: this.sanitizeCity(input.city),
      area: this.sanitizeArea(input.area),
      guestCount: this.sanitizeGuestCount(input.guestCount),
    };
  }
}
