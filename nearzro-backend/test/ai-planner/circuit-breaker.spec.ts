import { CircuitBreaker, CircuitBreakerState } from '../../src/ai-planner/utils/circuit-breaker';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    // Create circuit breaker with low threshold for testing
    breaker = new CircuitBreaker('test', {
      failureThreshold: 3,
      resetTimeoutSeconds: 1,
      successThreshold: 1,
    });
  });

  describe('Initial State', () => {
    it('should start in closed state', () => {
      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
    });

    it('should be available initially', () => {
      expect(breaker.isAvailable()).toBe(true);
    });
  });

  describe('Success Handling', () => {
    it('should remain closed after successful calls', async () => {
      await breaker.execute(() => Promise.resolve('success'));
      await breaker.execute(() => Promise.resolve('success'));
      
      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
    });

    it('should reset failure count on success', async () => {
      // Trigger some failures first (by not using execute)
      breaker['failureCount'] = 2;
      
      // Now succeed
      await breaker.execute(() => Promise.resolve('success'));
      
      // Failure count should be reset
      expect(breaker.getStats().failureCount).toBe(0);
    });
  });

  describe('Failure Handling', () => {
    it('should track failures', async () => {
      try {
        await breaker.execute(() => Promise.reject(new Error('fail')));
      } catch (e) {
        // Expected
      }
      
      expect(breaker.getStats().failureCount).toBe(1);
    });

    it('should open circuit after threshold failures', async () => {
      // Trigger failures to open circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch (e) {
          // Expected
        }
      }
      
      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);
      expect(breaker.isAvailable()).toBe(false);
    });

    it('should reject calls when circuit is open', async () => {
      // Open the circuit
      breaker['state'] = CircuitBreakerState.OPEN;
      breaker['lastFailureTime'] = Date.now(); // Recent failure - don't reset yet
      
      await expect(
        breaker.execute(() => Promise.resolve('success'))
      ).rejects.toThrow('is OPEN');
    });
  });

  describe('Half-Open State', () => {
    it('should transition to half-open after reset timeout', async () => {
      // Open the circuit
      breaker['state'] = CircuitBreakerState.OPEN;
      breaker['lastFailureTime'] = Date.now() - 2000; // More than reset timeout
      
      // Call execute to trigger the transition check - this succeeds because timeout passed
      const result = await breaker.execute(() => Promise.resolve('success'));
      
      // Should allow the call through (half-open allows one test request)
      expect(result).toBe('success');
    });

    it('should close circuit on success in half-open', async () => {
      // Set to half-open
      breaker['state'] = CircuitBreakerState.HALF_OPEN;
      
      // Success should close the circuit
      await breaker.execute(() => Promise.resolve('success'));
      
      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
    });

    it('should reopen circuit on failure in half-open', async () => {
      // Set to half-open
      breaker['state'] = CircuitBreakerState.HALF_OPEN;
      
      // Failure should reopen
      try {
        await breaker.execute(() => Promise.reject(new Error('fail')));
      } catch (e) {
        // Expected
      }
      
      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);
    });
  });

  describe('Manual Reset', () => {
    it('should reset circuit breaker manually', () => {
      // Open the circuit
      breaker['state'] = CircuitBreakerState.OPEN;
      breaker['failureCount'] = 5;
      
      // Manual reset
      breaker.reset();
      
      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
      expect(breaker.getStats().failureCount).toBe(0);
    });
  });

  describe('Stats', () => {
    it('should return correct stats', () => {
      const stats = breaker.getStats();
      
      expect(stats).toHaveProperty('state');
      expect(stats).toHaveProperty('failureCount');
      expect(stats).toHaveProperty('successCount');
      expect(stats).toHaveProperty('isAvailable');
    });
  });
});
