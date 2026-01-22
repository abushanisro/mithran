/**
 * Rate Limit Awareness and Management
 * - Respects Retry-After headers from server
 * - Implements client-side token bucket algorithm
 * - Provides backpressure signals
 * - Integrates with backend throttling hints
 */

export interface RateLimitInfo {
  limit?: number; // X-RateLimit-Limit
  remaining?: number; // X-RateLimit-Remaining
  reset?: number; // X-RateLimit-Reset (unix timestamp)
  retryAfter?: number; // Retry-After (seconds)
  retryAfterDate?: Date; // Parsed Retry-After date
}

export interface RateLimitState {
  endpoint: string;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter: number | null;
  throttled: boolean;
  lastUpdate: number;
}

export interface TokenBucketConfig {
  capacity: number; // Maximum tokens
  refillRate: number; // Tokens per second
  refillInterval: number; // Interval to refill (ms)
}

/**
 * Token Bucket implementation for client-side rate limiting
 */
export class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(private config: TokenBucketConfig) {
    this.tokens = config.capacity;
    this.lastRefill = Date.now();
  }

  /**
   * Try to consume tokens
   * @returns true if tokens available, false if rate limited
   */
  tryConsume(tokens: number = 1): boolean {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }

    return false;
  }

  /**
   * Check if tokens are available without consuming
   */
  hasTokens(tokens: number = 1): boolean {
    this.refill();
    return this.tokens >= tokens;
  }

  /**
   * Get current token count
   */
  getTokens(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * Refill tokens based on time elapsed
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;

    if (elapsed > this.config.refillInterval) {
      const tokensToAdd =
        (elapsed / this.config.refillInterval) * (this.config.refillRate * this.config.refillInterval / 1000);
      this.tokens = Math.min(this.config.capacity, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  /**
   * Force refill to capacity
   */
  reset(): void {
    this.tokens = this.config.capacity;
    this.lastRefill = Date.now();
  }

  /**
   * Get time until next token available (ms)
   */
  getTimeUntilToken(): number {
    if (this.hasTokens()) return 0;

    const tokensNeeded = 1 - this.tokens;
    const timePerToken = 1000 / this.config.refillRate;
    return Math.ceil(tokensNeeded * timePerToken);
  }
}

/**
 * Rate Limit Manager
 */
export class RateLimitManager {
  private rateLimits = new Map<string, RateLimitState>();
  private tokenBuckets = new Map<string, TokenBucket>();
  private globalBucket: TokenBucket;

  constructor(
    private defaultBucketConfig: TokenBucketConfig = {
      capacity: 100,
      refillRate: 10, // 10 requests per second
      refillInterval: 1000, // 1 second
    },
  ) {
    // Global token bucket for all requests
    this.globalBucket = new TokenBucket({
      capacity: 1000,
      refillRate: 100, // 100 requests per second globally
      refillInterval: 1000,
    });
  }

  /**
   * Parse rate limit headers from response
   */
  parseRateLimitHeaders(headers: Headers): RateLimitInfo {
    const info: RateLimitInfo = {};

    // Standard rate limit headers
    const limit = headers.get('X-RateLimit-Limit');
    if (limit) info.limit = parseInt(limit, 10);

    const remaining = headers.get('X-RateLimit-Remaining');
    if (remaining) info.remaining = parseInt(remaining, 10);

    const reset = headers.get('X-RateLimit-Reset');
    if (reset) info.reset = parseInt(reset, 10);

    // Retry-After header (seconds or HTTP date)
    const retryAfter = headers.get('Retry-After');
    if (retryAfter) {
      const retryAfterNum = parseInt(retryAfter, 10);
      if (!isNaN(retryAfterNum)) {
        info.retryAfter = retryAfterNum;
      } else {
        // Try parsing as date
        const date = new Date(retryAfter);
        if (!isNaN(date.getTime())) {
          info.retryAfterDate = date;
          info.retryAfter = Math.ceil((date.getTime() - Date.now()) / 1000);
        }
      }
    }

    return info;
  }

  /**
   * Update rate limit state from response headers
   */
  updateFromHeaders(endpoint: string, headers: Headers): void {
    const info = this.parseRateLimitHeaders(headers);
    if (!info.limit && !info.remaining && !info.retryAfter) {
      return; // No rate limit info
    }

    const state: RateLimitState = {
      endpoint,
      limit: info.limit || 100,
      remaining: info.remaining ?? 100,
      resetTime: info.reset ? info.reset * 1000 : Date.now() + 60000,
      retryAfter: info.retryAfter ?? null,
      throttled: info.retryAfter ? true : false,
      lastUpdate: Date.now(),
    };

    this.rateLimits.set(endpoint, state);

    // If we're being throttled, pause the token bucket
    if (state.throttled && state.retryAfter) {
      const bucket = this.getOrCreateBucket(endpoint);
      // Drain the bucket
      bucket.tryConsume(this.defaultBucketConfig.capacity);
    }
  }

  /**
   * Check if endpoint is currently rate limited
   */
  isRateLimited(endpoint: string): boolean {
    const state = this.rateLimits.get(endpoint);
    if (!state) return false;

    // Check if we're in throttle period
    if (state.throttled && state.retryAfter) {
      const retryTime = state.lastUpdate + state.retryAfter * 1000;
      if (Date.now() < retryTime) {
        return true;
      } else {
        // Throttle period ended
        state.throttled = false;
        state.retryAfter = null;
      }
    }

    // Check if we've exhausted our limit
    if (state.remaining <= 0 && Date.now() < state.resetTime) {
      return true;
    }

    // Check token bucket
    const bucket = this.getOrCreateBucket(endpoint);
    if (!bucket.hasTokens()) {
      return true;
    }

    return false;
  }

  /**
   * Try to acquire a token for making a request
   * @returns true if allowed, false if rate limited
   */
  tryAcquire(endpoint: string): boolean {
    // Check global bucket first
    if (!this.globalBucket.tryConsume()) {
      return false;
    }

    // Check endpoint-specific state
    const state = this.rateLimits.get(endpoint);
    if (state) {
      // Check throttle
      if (state.throttled && state.retryAfter) {
        const retryTime = state.lastUpdate + state.retryAfter * 1000;
        if (Date.now() < retryTime) {
          return false;
        }
      }

      // Check remaining quota
      if (state.remaining <= 0 && Date.now() < state.resetTime) {
        return false;
      }
    }

    // Check endpoint-specific token bucket
    const bucket = this.getOrCreateBucket(endpoint);
    return bucket.tryConsume();
  }

  /**
   * Get time to wait before next request (ms)
   */
  getWaitTime(endpoint: string): number {
    const state = this.rateLimits.get(endpoint);

    // If throttled with Retry-After
    if (state?.throttled && state.retryAfter) {
      const retryTime = state.lastUpdate + state.retryAfter * 1000;
      const wait = retryTime - Date.now();
      if (wait > 0) return wait;
    }

    // If quota exhausted
    if (state && state.remaining <= 0) {
      const wait = state.resetTime - Date.now();
      if (wait > 0) return wait;
    }

    // Check token bucket
    const bucket = this.getOrCreateBucket(endpoint);
    const tokenWait = bucket.getTimeUntilToken();
    if (tokenWait > 0) return tokenWait;

    // Check global bucket
    const globalWait = this.globalBucket.getTimeUntilToken();
    return globalWait;
  }

  /**
   * Get current rate limit state for endpoint
   */
  getState(endpoint: string): RateLimitState | null {
    return this.rateLimits.get(endpoint) || null;
  }

  /**
   * Get or create token bucket for endpoint
   */
  private getOrCreateBucket(endpoint: string): TokenBucket {
    let bucket = this.tokenBuckets.get(endpoint);
    if (!bucket) {
      bucket = new TokenBucket(this.defaultBucketConfig);
      this.tokenBuckets.set(endpoint, bucket);
    }
    return bucket;
  }

  /**
   * Set custom token bucket config for endpoint
   */
  setBucketConfig(endpoint: string, config: Partial<TokenBucketConfig>): void {
    const fullConfig = { ...this.defaultBucketConfig, ...config };
    this.tokenBuckets.set(endpoint, new TokenBucket(fullConfig));
  }

  /**
   * Reset rate limit state for endpoint
   */
  reset(endpoint: string): void {
    this.rateLimits.delete(endpoint);
    const bucket = this.tokenBuckets.get(endpoint);
    if (bucket) {
      bucket.reset();
    }
  }

  /**
   * Reset all rate limit state
   */
  resetAll(): void {
    this.rateLimits.clear();
    this.tokenBuckets.clear();
    this.globalBucket.reset();
  }

  /**
   * Get statistics
   */
  getStats(): {
    endpoints: number;
    throttledEndpoints: number;
    globalTokens: number;
    rateLimits: Array<{
      endpoint: string;
      remaining: number;
      limit: number;
      throttled: boolean;
    }>;
  } {
    const throttledEndpoints = Array.from(this.rateLimits.values()).filter(
      (state) => state.throttled || state.remaining <= 0,
    );

    return {
      endpoints: this.rateLimits.size,
      throttledEndpoints: throttledEndpoints.length,
      globalTokens: this.globalBucket.getTokens(),
      rateLimits: Array.from(this.rateLimits.values()).map((state) => ({
        endpoint: state.endpoint,
        remaining: state.remaining,
        limit: state.limit,
        throttled: state.throttled,
      })),
    };
  }

  /**
   * Handle 429 response with exponential backoff
   */
  handle429(endpoint: string, headers: Headers, attemptNumber: number): number {
    this.updateFromHeaders(endpoint, headers);

    const state = this.rateLimits.get(endpoint);
    if (state?.retryAfter) {
      // Use server's Retry-After
      return state.retryAfter * 1000;
    }

    // Fallback to exponential backoff
    const baseDelay = 1000;
    const maxDelay = 60000; // 60 seconds
    const delay = Math.min(baseDelay * Math.pow(2, attemptNumber - 1), maxDelay);

    // Add jitter
    const jitter = Math.random() * 0.3 * delay;
    return delay + jitter;
  }
}

// Global instance
export const rateLimitManager = new RateLimitManager();

/**
 * Rate limit middleware for API client
 */
export interface RateLimitMiddleware {
  /**
   * Before request: Check if rate limited and wait if necessary
   */
  beforeRequest: (endpoint: string) => Promise<{ allowed: boolean; waitTime?: number }>;

  /**
   * After response: Update rate limit state from headers
   */
  afterResponse: (endpoint: string, headers: Headers) => void;

  /**
   * Handle 429 response
   */
  handle429: (endpoint: string, headers: Headers, attemptNumber: number) => number;
}

/**
 * Create rate limit middleware
 */
export function createRateLimitMiddleware(
  manager: RateLimitManager = rateLimitManager,
): RateLimitMiddleware {
  return {
    async beforeRequest(endpoint) {
      const isLimited = manager.isRateLimited(endpoint);
      if (!isLimited && manager.tryAcquire(endpoint)) {
        return { allowed: true };
      }

      const waitTime = manager.getWaitTime(endpoint);
      return { allowed: false, waitTime };
    },

    afterResponse(endpoint, headers) {
      manager.updateFromHeaders(endpoint, headers);
    },

    handle429(endpoint, headers, attemptNumber) {
      return manager.handle429(endpoint, headers, attemptNumber);
    },
  };
}

/**
 * Advanced rate limiting strategies
 */
export class AdaptiveRateLimiter {
  private successRate = new Map<string, number[]>();
  private windowSize = 100; // Track last 100 requests

  /**
   * Adjust rate limit based on success rate
   * If success rate drops, reduce request rate
   */
  getAdaptiveDelay(endpoint: string): number {
    const rates = this.successRate.get(endpoint) || [];
    if (rates.length < 10) return 0; // Not enough data

    const recentSuccessRate = rates.slice(-20).filter((r) => r === 1).length / 20;

    // If success rate < 80%, add delay
    if (recentSuccessRate < 0.8) {
      const delayMs = (1 - recentSuccessRate) * 1000; // Up to 1 second delay
      return delayMs;
    }

    return 0;
  }

  /**
   * Record request outcome
   */
  recordOutcome(endpoint: string, success: boolean): void {
    const rates = this.successRate.get(endpoint) || [];
    rates.push(success ? 1 : 0);

    if (rates.length > this.windowSize) {
      rates.shift();
    }

    this.successRate.set(endpoint, rates);
  }

  /**
   * Get success rate for endpoint
   */
  getSuccessRate(endpoint: string): number {
    const rates = this.successRate.get(endpoint) || [];
    if (rates.length === 0) return 1;

    const successes = rates.filter((r) => r === 1).length;
    return successes / rates.length;
  }
}

export const adaptiveRateLimiter = new AdaptiveRateLimiter();
