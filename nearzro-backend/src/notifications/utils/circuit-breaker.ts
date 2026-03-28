import { Logger } from '@nestjs/common';

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  threshold?: number;
  timeout?: number;
  name?: string;
}

export class CircuitBreaker {
  private readonly logger: Logger;
  private failures = 0;
  private lastFailureTime = 0;
  private state: CircuitBreakerState = 'CLOSED';
  private readonly threshold: number;
  private readonly timeout: number;
  private readonly name: string;

  constructor(options: CircuitBreakerOptions = {}) {
    this.threshold = options.threshold || 5;
    this.timeout = options.timeout || 60000; // 1 minute
    this.name = options.name || 'CircuitBreaker';
    this.logger = new Logger(`CircuitBreaker:${this.name}`);
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
        this.logger.warn(`Circuit breaker transitioning to HALF_OPEN`);
      } else {
        const remainingTime = Math.ceil((this.timeout - (Date.now() - this.lastFailureTime)) / 1000);
        this.logger.error(`Circuit breaker is OPEN. Retry in ${remainingTime}s`);
        throw new Error(`Circuit breaker is OPEN. Service unavailable. Retry in ${remainingTime}s`);
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

  private onSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.logger.log(`Circuit breaker transitioning to CLOSED after successful call`);
    }
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      this.logger.error(`Circuit breaker OPENED after ${this.failures} failures`);
    } else {
      this.logger.warn(`Circuit breaker failure ${this.failures}/${this.threshold}`);
    }
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  getFailures(): number {
    return this.failures;
  }

  reset(): void {
    this.failures = 0;
    this.state = 'CLOSED';
    this.logger.log(`Circuit breaker manually reset`);
  }
}
