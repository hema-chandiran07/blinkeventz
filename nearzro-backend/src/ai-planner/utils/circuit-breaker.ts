import { Logger } from '@nestjs/common';
import { CIRCUIT_BREAKER_CONFIG } from '../constants/ai-planner.constants';

/**
 * Circuit Breaker Exception thrown when circuit is OPEN
 * Allows callers to handle service unavailability distinctly
 */
export class CircuitBreakerOpenException extends Error {
  public readonly state: CircuitBreakerState;
  public readonly failureCount: number;
  public readonly resetTime: number; // timestamp (ms) when circuit will attempt reset

  constructor(name: string, failureCount: number, lastFailureTime: number, resetTimeoutSeconds: number) {
    super(`Circuit breaker [${name}] is OPEN. Service unavailable.`);
    this.state = CircuitBreakerState.OPEN;
    this.failureCount = failureCount;
    this.resetTime = lastFailureTime + resetTimeoutSeconds * 1000;
    Object.setPrototypeOf(this, CircuitBreakerOpenException.prototype);
  }
}

/**
 * Circuit Breaker States
 */
export enum CircuitBreakerState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half-open',
}

/**
 * Circuit Breaker Events
 */
export enum CircuitBreakerEvent {
  SUCCESS = 'success',
  FAILURE = 'failure',
}

/**
 * Lightweight Circuit Breaker Implementation
 * 
 * Prevents cascading failures by opening the circuit after
 * a threshold of failures, allowing the service to recover.
 */
export class CircuitBreaker {
  private readonly logger = new Logger(CircuitBreaker.name);
  
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  
  private readonly failureThreshold: number;
  private readonly resetTimeoutSeconds: number;
  private readonly successThreshold: number;
  
  constructor(
    private readonly name: string = 'default',
    options?: {
      failureThreshold?: number;
      resetTimeoutSeconds?: number;
      successThreshold?: number;
    },
  ) {
    this.failureThreshold = options?.failureThreshold ?? CIRCUIT_BREAKER_CONFIG.FAILURE_THRESHOLD;
    this.resetTimeoutSeconds = options?.resetTimeoutSeconds ?? CIRCUIT_BREAKER_CONFIG.RESET_TIMEOUT_SECONDS;
    this.successThreshold = options?.successThreshold ?? CIRCUIT_BREAKER_CONFIG.SUCCESS_THRESHOLD;
    
    this.logger.log(`Circuit Breaker [${this.name}] initialized with threshold: ${this.failureThreshold}`);
  }
  
   /**
    * Execute a function with circuit breaker protection
    */
   async execute<T>(fn: () => Promise<T>): Promise<T> {
     // Check if circuit is open
     if (this.state === CircuitBreakerState.OPEN) {
       // Check if we should transition to half-open
       if (this.shouldAttemptReset()) {
         this.logger.log(`Circuit Breaker [${this.name}] transitioning to HALF-OPEN`);
         this.state = CircuitBreakerState.HALF_OPEN;
         this.successCount = 0;
       } else {
         // Throw specialized exception with diagnostic info
         throw new CircuitBreakerOpenException(
           this.name,
           this.failureCount,
           this.lastFailureTime,
           this.resetTimeoutSeconds,
         );
       }
     }
     
     try {
       const result = await fn();
       this.onSuccess();
       return result;
     } catch (error) {
       this.onFailure();
       throw error;
     }
   }
  
  /**
   * Handle success event
   */
  private onSuccess(): void {
    this.failureCount = 0;
    this.successCount++;
    
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      if (this.successCount >= this.successThreshold) {
        this.logger.log(`Circuit Breaker [${this.name}] CLOSED after ${this.successCount} successes`);
        this.state = CircuitBreakerState.CLOSED;
        this.successCount = 0;
      }
    }
  }
  
  /**
   * Handle failure event
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // Any failure in half-open state immediately opens the circuit
      this.logger.warn(`Circuit Breaker [${this.name}] re-OPENED after failure in HALF-OPEN state`);
      this.state = CircuitBreakerState.OPEN;
    } else if (this.state === CircuitBreakerState.CLOSED) {
      if (this.failureCount >= this.failureThreshold) {
        this.logger.error(`Circuit Breaker [${this.name}] OPENED after ${this.failureCount} failures`);
        this.state = CircuitBreakerState.OPEN;
      }
    }
  }
  
  /**
   * Check if enough time has passed to attempt reset
   */
  private shouldAttemptReset(): boolean {
    const timeSinceLastFailure = Date.now() - this.lastFailureTime;
    return timeSinceLastFailure >= (this.resetTimeoutSeconds * 1000);
  }
  
   /**
    * Get current circuit state
    */
   getState(): CircuitBreakerState {
     return this.state;
   }
   
   /**
    * Get current failure count
    */
   getFailures(): number {
     return this.failureCount;
   }
  
  /**
   * Check if circuit is closed (allowing requests)
   */
  isAvailable(): boolean {
    if (this.state === CircuitBreakerState.CLOSED) {
      return true;
    }
    
    if (this.state === CircuitBreakerState.OPEN) {
      // Allow reset attempt if enough time has passed
      return this.shouldAttemptReset();
    }
    
    // Half-open allows one attempt
    return true;
  }
  
  /**
   * Get circuit breaker stats
   */
  getStats(): {
    state: string;
    failureCount: number;
    successCount: number;
    isAvailable: boolean;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      isAvailable: this.isAvailable(),
    };
  }
  
  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.logger.log(`Circuit Breaker [${this.name}] manually reset`);
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
  }
}

/**
 * Circuit Breaker Registry
 * Manages multiple circuit breakers for different services
 */
export class CircuitBreakerRegistry {
  private readonly breakers = new Map<string, CircuitBreaker>();
  private readonly logger = new Logger(CircuitBreakerRegistry.name);
  
  /**
   * Get or create a circuit breaker for a given name
   */
  getBreaker(name: string, options?: {
    failureThreshold?: number;
    resetTimeoutSeconds?: number;
    successThreshold?: number;
  }): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, options));
      this.logger.log(`Created new circuit breaker: ${name}`);
    }
    return this.breakers.get(name)!;
  }
  
  /**
   * Get stats for all registered circuit breakers
   */
  getAllStats(): Record<string, ReturnType<CircuitBreaker['getStats']>> {
    const stats: Record<string, any> = {};
    for (const [name, breaker] of this.breakers) {
      stats[name] = breaker.getStats();
    }
    return stats;
  }
  
  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
    this.logger.log('All circuit breakers reset');
  }
}
