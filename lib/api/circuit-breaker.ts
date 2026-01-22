/**
 * Circuit Breaker Pattern Implementation
 *
 * Prevents cascade failures by tracking error rates and temporarily
 * blocking requests to failing services, allowing them time to recover.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service is failing, requests are blocked
 * - HALF_OPEN: Testing if service has recovered
 */

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  failureThreshold: number; // Number of failures before opening circuit
  successThreshold: number; // Number of successes in HALF_OPEN to close circuit
  timeout: number; // Time to wait before attempting HALF_OPEN (ms)
  rollingWindowSize: number; // Number of recent requests to consider
}

export interface CircuitBreakerMetrics {
  state: CircuitBreakerState;
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  nextAttemptTime: number | null;
  totalRequests: number;
  rejectedRequests: number;
}

/**
 * Circuit Breaker for protecting against cascade failures
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime: number | null = null;
  private nextAttemptTime: number | null = null;
  private recentResults: boolean[] = []; // true = success, false = failure
  private totalRequests: number = 0;
  private rejectedRequests: number = 0;

  constructor(private options: CircuitBreakerOptions) {}

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      // Check if enough time has passed to try HALF_OPEN
      if (Date.now() >= (this.nextAttemptTime || 0)) {
        this.state = CircuitBreakerState.HALF_OPEN;
        this.successes = 0;
      } else {
        this.rejectedRequests++;
        throw new CircuitBreakerError(
          'Circuit breaker is OPEN - service is temporarily unavailable',
          this.getMetrics(),
        );
      }
    }

    this.totalRequests++;

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.addResult(true);

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successes++;
      if (this.successes >= this.options.successThreshold) {
        this.reset();
      }
    }
  }

  private onFailure(): void {
    this.lastFailureTime = Date.now();
    this.addResult(false);

    this.failures++;
    this.successes = 0;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // If a single request fails in HALF_OPEN, go back to OPEN
      this.open();
    } else if (this.failures >= this.options.failureThreshold) {
      this.open();
    }
  }

  private open(): void {
    this.state = CircuitBreakerState.OPEN;
    this.nextAttemptTime = Date.now() + this.options.timeout;
  }

  private reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
  }

  private addResult(success: boolean): void {
    this.recentResults.push(success);
    if (this.recentResults.length > this.options.rollingWindowSize) {
      this.recentResults.shift();
    }
  }

  /**
   * Get current circuit breaker metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
      totalRequests: this.totalRequests,
      rejectedRequests: this.rejectedRequests,
    };
  }

  /**
   * Get current failure rate from rolling window
   */
  getFailureRate(): number {
    if (this.recentResults.length === 0) return 0;
    const failures = this.recentResults.filter((r) => !r).length;
    return failures / this.recentResults.length;
  }

  /**
   * Manually reset the circuit breaker
   */
  forceReset(): void {
    this.reset();
    this.recentResults = [];
    this.totalRequests = 0;
    this.rejectedRequests = 0;
  }

  /**
   * Get current state
   */
  getState(): CircuitBreakerState {
    return this.state;
  }
}

/**
 * Error thrown when circuit breaker blocks a request
 */
export class CircuitBreakerError extends Error {
  constructor(
    message: string,
    public metrics: CircuitBreakerMetrics,
  ) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}
