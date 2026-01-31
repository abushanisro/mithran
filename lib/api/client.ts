/**
 * API Client for mithran Microservices
 *
 * Enterprise-grade API client with:
 * - Automatic retry with exponential backoff (including timeout errors)
 * - Circuit breaker pattern for cascade failure prevention
 * - Request metrics collection and monitoring
 * - Adaptive timeout configuration
 * - Request cancellation support
 * - Token refresh mechanism
 * - Request deduplication
 * - Comprehensive error handling and diagnostics
 * - Supabase authentication integration
 */

import { config as appConfig } from '../config';
import { supabase } from '../supabase/client';
import { authTokenManager } from '../auth/token-manager';
import { CircuitBreaker, CircuitBreakerError } from './circuit-breaker';
import { requestMetrics } from './request-metrics';
import { traceManager, getTraceHeaders, Span } from './distributed-tracing';
import { idempotencyManager, createIdempotencyMiddleware, IdempotencyOptions } from './idempotency';
import { createRateLimitMiddleware } from './rate-limit';
import { healthCheckManager, ServiceStatus } from './health-check';
import { envValidator } from '../config/env-validator';
import { logger } from '../utils/logger';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
  params?: Record<string, any>;
  headers?: Record<string, string>;
  cache?: RequestCache;
  retry?: boolean;
  timeout?: number;
  silent?: boolean; // When true, returns null on error instead of throwing
  signal?: AbortSignal; // Custom abort signal for request cancellation
  priority?: 'low' | 'normal' | 'high'; // Request priority (affects retry behavior)
  bypassCircuitBreaker?: boolean; // Skip circuit breaker (for health checks, etc.)
  idempotency?: IdempotencyOptions; // Idempotency configuration for safe mutations
  tracing?: boolean; // Enable distributed tracing (default: true)
  rateLimitAware?: boolean; // Enable rate limit awareness (default: true)
};

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    timestamp: string;
    requestId?: string;
  };
};

export type RequestInterceptor = (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
export type ResponseInterceptor = (response: any) => any | Promise<any>;

export type RequestConfig = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: any;
  endpoint?: string; // Added to match usage in middleware
};

class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private pendingRequests = new Map<string, Promise<any>>();
  private circuitBreaker: CircuitBreaker;
  private idempotencyMiddleware = createIdempotencyMiddleware();
  private rateLimitMiddleware = createRateLimitMiddleware();

  constructor() {
    this.baseUrl = appConfig.api.baseUrl;
    this.loadTokens();

    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: appConfig.api.circuitBreaker.failureThreshold,
      successThreshold: appConfig.api.circuitBreaker.successThreshold,
      timeout: appConfig.api.circuitBreaker.timeout,
      rollingWindowSize: appConfig.api.circuitBreaker.rollingWindowSize,
    });

    // Initialize health monitoring (client-side only)
    if (typeof window !== 'undefined') {
      // Perform initial health check
      this.initializeHealthCheck();

      // Start periodic monitoring
      healthCheckManager.startMonitoring(this.baseUrl);

      // Update environment validator when health status changes
      healthCheckManager.addListener((health) => {
        envValidator.setApiReachable(health.status !== ServiceStatus.UNHEALTHY);
      });
    }

    // Initialize distributed tracing
    traceManager.addSpanListener((span) => {
      logger.debug(span.name, {
        duration: `${span.duration}ms`,
        traceId: span.traceId,
        spanId: span.spanId,
        status: span.status,
      }, 'Trace');
    });
  }

  /**
   * Initialize health check and update environment validator
   */
  private async initializeHealthCheck(): Promise<void> {
    try {
      const result = await healthCheckManager.performHealthCheck(this.baseUrl);
      envValidator.setApiReachable(result.status !== ServiceStatus.UNHEALTHY);
    } catch (error) {
      // Health check failed - service is unavailable
      envValidator.setApiReachable(false);
    }
  }

  private loadTokens() {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('accessToken');
    }
  }

  setAccessToken(token: string | null) {
    this.accessToken = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('accessToken', token);
      } else {
        localStorage.removeItem('accessToken');
      }
    }
  }

  setRefreshToken(token: string | null) {
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('refreshToken', token);
      } else {
        localStorage.removeItem('refreshToken');
      }
    }
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Get auth token from token manager (NO async calls, NO getSession())
   * @returns Current access token or null
   */
  getAuthToken(): string | null {
    return authTokenManager.getCurrentToken();
  }

  addRequestInterceptor(interceptor: RequestInterceptor) {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: ResponseInterceptor) {
    this.responseInterceptors.push(interceptor);
  }


  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getCacheKey(endpoint: string, options: RequestOptions): string {
    return `${options.method || 'GET'}:${endpoint}:${JSON.stringify(options.body || {})}:${JSON.stringify(options.params || {})}`;
  }

  /**
   * Determine the appropriate timeout for a request
   * Uses endpoint-specific timeouts, adaptive timeouts based on metrics, or default
   */
  private getTimeout(endpoint: string, method: string, customTimeout?: number): number {
    // Custom timeout takes precedence
    if (customTimeout !== undefined) {
      return customTimeout;
    }

    // Check for endpoint-specific timeout
    const endpointTimeout = appConfig.api.endpointTimeouts[endpoint];
    if (endpointTimeout) {
      return endpointTimeout;
    }

    // Use adaptive timeout based on historical metrics
    if (appConfig.api.adaptiveTimeouts.enabled && appConfig.api.adaptiveTimeouts.useHistoricalData) {
      const recommendedTimeout = requestMetrics.getRecommendedTimeout(
        endpoint,
        method,
        appConfig.api.timeout,
      );
      return Math.min(
        Math.max(recommendedTimeout, appConfig.api.adaptiveTimeouts.minTimeout),
        appConfig.api.adaptiveTimeouts.maxTimeout,
      );
    }

    return appConfig.api.timeout;
  }

  /**
   * Determine if a request should be retried based on error type and priority
   */
  private shouldRetry(
    error: any,
    attemptNumber: number,
    retry: boolean,
    priority: RequestOptions['priority'] = 'normal',
  ): boolean {
    if (!retry) return false;

    // Adjust retry attempts based on priority
    let maxAttempts = appConfig.api.retryAttempts;
    if (priority === 'high') {
      maxAttempts = Math.min(appConfig.api.retryAttempts + 2, 5); // High priority gets extra retries
    } else if (priority === 'low') {
      maxAttempts = Math.max(appConfig.api.retryAttempts - 1, 1); // Low priority gets fewer retries
    }

    if (attemptNumber >= maxAttempts) return false;

    if (error instanceof ApiError) {
      // Retry 5xx errors, network errors, and timeout errors
      return (
        error.statusCode >= 500 ||
        error.statusCode === 0 ||
        (error.statusCode === 408 && appConfig.api.retryTimeoutErrors)
      );
    }

    // Retry on timeout and network errors
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      return appConfig.api.retryTimeoutErrors;
    }

    if (error instanceof TypeError) {
      return true; // Network errors
    }

    return false;
  }

  /**
   * Calculate backoff delay for retry with jitter
   */
  private getBackoffDelay(attemptNumber: number, priority: RequestOptions['priority'] = 'normal'): number {
    let baseDelay = appConfig.api.retryDelay;

    // Adjust base delay based on priority
    if (priority === 'high') {
      baseDelay = Math.max(baseDelay / 2, 250); // High priority retries faster
    } else if (priority === 'low') {
      baseDelay = baseDelay * 1.5; // Low priority retries slower
    }

    // Exponential backoff with jitter
    const exponentialDelay = baseDelay * Math.pow(2, attemptNumber - 1);
    const jitter = Math.random() * 0.3 * exponentialDelay; // Add up to 30% jitter
    const delay = exponentialDelay + jitter;

    return Math.min(delay, appConfig.api.maxRetryDelay);
  }

  /**
   * Get circuit breaker metrics for monitoring
   */
  getCircuitBreakerMetrics() {
    return this.circuitBreaker.getMetrics();
  }

  /**
   * Get request metrics for monitoring
   */
  getRequestMetrics() {
    return requestMetrics.getGlobalMetrics();
  }

  /**
   * Reset circuit breaker (useful for testing or manual intervention)
   */
  resetCircuitBreaker() {
    this.circuitBreaker.forceReset();
  }

  /**
   * Get current service health status
   */
  getServiceHealth() {
    return healthCheckManager.getHealth();
  }

  /**
   * Check if service is available
   */
  isServiceAvailable(): boolean {
    return healthCheckManager.isAvailable();
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<T | null> {
    const {
      method = 'GET',
      body,
      params,
      headers = {},
      cache,
      retry = true,
      timeout: customTimeout,
      silent = false,
      signal: customSignal,
      priority = 'normal',
      bypassCircuitBreaker = false,
      idempotency,
      tracing = true,
      rateLimitAware = true,
    } = options;

    // Check rate limits before proceeding
    if (rateLimitAware) {
      const rateLimitCheck = await this.rateLimitMiddleware.beforeRequest(endpoint);
      if (!rateLimitCheck.allowed && rateLimitCheck.waitTime) {
        if (silent) return null;

        throw new ApiError(
          `Rate limit exceeded. Please retry after ${Math.ceil(rateLimitCheck.waitTime / 1000)}s`,
          429,
          'RATE_LIMIT_EXCEEDED',
          { waitTime: rateLimitCheck.waitTime, endpoint },
        );
      }
    }

    // Check idempotency for mutations
    let idempotencyHeaders: Record<string, string> = {};
    if (idempotencyManager.shouldUseIdempotency(method, idempotency)) {
      const { headers: idemHeaders, shouldProceed, cachedResponse } =
        await this.idempotencyMiddleware.beforeRequest(endpoint, method, body, idempotency);

      idempotencyHeaders = idemHeaders;

      // If we have a cached response for this idempotency key, return it
      if (!shouldProceed && cachedResponse) {
        logger.debug('Returning cached idempotent response', { method, endpoint }, 'API');
        return cachedResponse as T;
      }
    }

    // Determine timeout for this request
    const timeout = this.getTimeout(endpoint, method, customTimeout);

    // Build URL with query parameters
    let url = `${this.baseUrl}${endpoint}`;

    // Debug: Log URL construction in development
    if (process.env.NODE_ENV === 'development') {
      console.debug('[API Client] URL Construction:', {
        baseUrl: this.baseUrl,
        endpoint,
        fullUrl: url
      });
    }

    if (params) {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
      const queryString = queryParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    // Request deduplication for GET requests
    if (method === 'GET') {
      const cacheKey = this.getCacheKey(endpoint, options);
      const pendingRequest = this.pendingRequests.get(cacheKey);
      if (pendingRequest) {
        return pendingRequest;
      }
    }

    const executeRequest = async (attemptNumber = 1): Promise<T | null> => {
      // Initialize metrics tracker
      const tracker = requestMetrics.startRequest(endpoint, method);

      // Start distributed trace span
      let traceSpan: Span | null = null;
      if (tracing) {
        traceSpan = traceManager.startSpan(`${method} ${endpoint}`, {
          'http.method': method,
          'http.url': url,
          'http.target': endpoint,
          'http.retry_count': attemptNumber - 1,
        });
      }

      // Try to get token from old auth or Supabase
      let token = this.getAccessToken() || this.getAuthToken();

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      if (body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }

      // Add distributed tracing headers
      if (tracing) {
        const traceHeaders = getTraceHeaders();
        Object.assign(headers, traceHeaders);
      }

      // Add idempotency headers
      Object.assign(headers, idempotencyHeaders);

      // Run request interceptors
      let requestConfig: RequestConfig = { url, method, headers, body, endpoint };
      for (const interceptor of this.requestInterceptors) {
        requestConfig = await interceptor(requestConfig);
      }

      // Create abort controller for timeout and cancellation
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => {
        abortController.abort(new Error(`Request timeout after ${timeout}ms`))
      }, timeout);

      // Combine custom signal with timeout signal
      if (customSignal) {
        customSignal.addEventListener('abort', () => abortController.abort());
      }

      const requestInit: RequestInit = {
        method: requestConfig.method,
        headers: requestConfig.headers,
        cache: cache || (method === 'GET' ? 'default' : 'no-store'),
        signal: abortController.signal,
      };

      if (requestConfig.body) {
        requestInit.body = JSON.stringify(requestConfig.body);
      }

      try {
        const startTime = Date.now();
        const response = await fetch(requestConfig.url, requestInit);
        const responseTime = Date.now() - startTime;
        clearTimeout(timeoutId);

        let data: ApiResponse<T>;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          data = {
            success: response.ok,
            data: (await response.text()) as any,
            metadata: { timestamp: new Date().toISOString() },
          };
        }

        // Run response interceptors
        let responseData = data;
        for (const interceptor of this.responseInterceptors) {
          responseData = await interceptor(responseData);
        }

        // Log successful request
        logger.debug(`${method} ${endpoint}`, {
          status: response.status,
          responseTime: `${responseTime}ms`,
          attempt: attemptNumber,
          timeout: `${timeout}ms`,
        }, 'API');

        // Handle 401 Unauthorized - try to refresh Supabase session ONCE
        if (response.status === 401 && attemptNumber === 1) {
          if (supabase) {
            try {
              const { data: { session }, error } = await supabase.auth.refreshSession();
              if (!error && session?.access_token) {
                tracker.incrementRetry();
                return executeRequest(attemptNumber + 1);
              }
            } catch (error) {
              // Refresh failed - user needs to log in
            }
          }

          // Clear tokens - user needs to authenticate
          this.setAccessToken(null);
          this.setRefreshToken(null);

          // Don't retry 401 - fail immediately with clear message
          tracker.recordError(401, 'UNAUTHORIZED');
          if (silent) return null;

          throw new ApiError(
            'Authentication required. Please log in.',
            401,
            'UNAUTHORIZED',
            { needsAuth: true }
          );
        }

        if (!response.ok) {
          // Record error metric
          tracker.recordError(response.status, data.error?.code || 'HTTP_ERROR');

          // Silent mode: return null instead of throwing (prevents console errors)
          if (silent) {
            return null;
          }

          // Normal mode: throw error for calling code to handle
          throw new ApiError(
            data.error?.message || `Request failed with status ${response.status}`,
            response.status,
            data.error?.code,
            data.error?.details,
          );
        }

        if (!data.success) {
          // Record error metric
          tracker.recordError(response.status, 'API_ERROR');

          // Silent mode: return null instead of throwing
          if (silent) {
            return null;
          }

          throw new ApiError(
            data.error?.message || 'Request failed',
            response.status,
            data.error?.code,
          );
        }

        // Update rate limit state from response headers
        if (rateLimitAware) {
          this.rateLimitMiddleware.afterResponse(endpoint, response.headers);
        }

        // Check for server-side circuit breaker hints
        const serverStatus = response.headers.get('X-Server-Status');
        if (serverStatus === 'degraded' || serverStatus === 'overloaded') {
          // Server is hinting that it's under stress
          if (traceSpan) {
            traceManager.addSpanAttributes(traceSpan.spanId, {
              'server.status': serverStatus,
              'server.hint': 'degraded_performance',
            });
          }
        }

        // Check for backend SLA hints
        const backendSLA = response.headers.get('X-Expected-Response-Time');
        if (backendSLA) {
          const expectedMs = parseInt(backendSLA, 10);
          if (!isNaN(expectedMs) && traceSpan) {
            traceManager.addSpanAttributes(traceSpan.spanId, {
              'backend.sla.expected_ms': expectedMs,
              'backend.sla.actual_ms': responseTime,
              'backend.sla.met': responseTime <= expectedMs,
            });
          }
        }

        // Record success metric
        tracker.recordSuccess(response.status);

        // Complete trace span
        if (traceSpan) {
          traceManager.addSpanAttributes(traceSpan.spanId, {
            'http.status_code': response.status,
            'http.response_time_ms': responseTime,
          });
          traceManager.endSpan(traceSpan.spanId, 'success');
        }

        // Store idempotency response
        if (idempotencyHeaders['Idempotency-Key']) {
          this.idempotencyMiddleware.afterRequest(
            idempotencyHeaders['Idempotency-Key'],
            responseData.data,
          );
        }

        return responseData.data as T;
      } catch (error) {
        clearTimeout(timeoutId);

        // Record error in idempotency
        if (idempotencyHeaders['Idempotency-Key']) {
          this.idempotencyMiddleware.onError(idempotencyHeaders['Idempotency-Key']);
        }

        // Handle AbortError (timeout or cancellation)
        if (error instanceof DOMException && error.name === 'AbortError') {
          // Check if it was a manual cancellation vs timeout
          if (customSignal?.aborted) {
            tracker.recordCancellation();
            if (traceSpan) {
              traceManager.endSpan(traceSpan.spanId, 'error', 'Request cancelled');
            }
            if (silent) return null;
            throw new ApiError('Request was cancelled', 499, 'REQUEST_CANCELLED');
          }

          // It was a timeout
          tracker.recordTimeout();

          if (process.env.NODE_ENV === 'development') {
            console.warn('[API] Request timeout:', {
              endpoint,
              timeout: `${timeout}ms`,
              method: requestConfig.method,
              reason: error.message || 'Request timeout'
            });
          }

          if (traceSpan) {
            traceManager.addSpanAttributes(traceSpan.spanId, {
              'error.type': 'timeout',
              'http.timeout_ms': timeout,
            });
            traceManager.endSpan(traceSpan.spanId, 'error', 'Request timeout');
          }

          // Check if we should retry
          if (this.shouldRetry(error, attemptNumber, retry, priority)) {
            const backoffMs = this.getBackoffDelay(attemptNumber, priority);
            logger.warn('Request timeout, retrying', {
              method,
              endpoint,
              backoffMs,
              attempt: attemptNumber,
              maxAttempts: appConfig.api.retryAttempts,
              timeout: `${timeout}ms`,
            }, 'API');
            tracker.incrementRetry();
            await this.sleep(backoffMs);
            return executeRequest(attemptNumber + 1);
          }

          if (silent) return null;

          // Enhanced timeout error with diagnostics
          const metrics = requestMetrics.getEndpointMetrics(endpoint, method);
          const errorDetails = {
            timeout,
            attemptNumber,
            endpoint,
            method,
            avgResponseTime: metrics?.averageResponseTime,
            p95ResponseTime: metrics?.p95ResponseTime,
            timeoutRate: metrics ? metrics.timeoutCount / metrics.totalRequests : 0,
          };

          throw new ApiError(
            `Request timeout after ${timeout}ms - the server did not respond in time`,
            408,
            'TIMEOUT_ERROR',
            errorDetails,
          );
        }

        if (error instanceof ApiError) {
          // Add error to trace span
          if (traceSpan) {
            traceManager.addSpanAttributes(traceSpan.spanId, {
              'error.type': error.code || 'api_error',
              'error.message': error.message,
              'http.status_code': error.statusCode,
            });
            traceManager.endSpan(traceSpan.spanId, 'error', error.message);
          }

          // Special handling for 429 (rate limit)
          if (error.statusCode === 429 && rateLimitAware) {
            // Let rate limit manager handle the backoff
            const backoffMs = this.rateLimitMiddleware.handle429(endpoint, new Headers(), attemptNumber);
            if (this.shouldRetry(error, attemptNumber, retry, priority)) {
              logger.warn('Rate limited, retrying', {
                endpoint,
                backoffMs,
                attempt: attemptNumber,
              }, 'API');
              tracker.incrementRetry();
              await this.sleep(backoffMs);
              return executeRequest(attemptNumber + 1);
            }
          }

          // Check if we should retry
          if (this.shouldRetry(error, attemptNumber, retry, priority)) {
            const backoffMs = this.getBackoffDelay(attemptNumber, priority);
            logger.warn('Request failed, retrying', {
              statusCode: error.statusCode,
              backoffMs,
              attempt: attemptNumber,
              maxAttempts: appConfig.api.retryAttempts,
            }, 'API');
            tracker.incrementRetry();
            await this.sleep(backoffMs);
            return executeRequest(attemptNumber + 1);
          }

          // Silent mode: return null instead of throwing
          if (silent) {
            return null;
          }
          throw error;
        }

        // Handle network errors
        if (error instanceof TypeError) {
          tracker.recordError(0, 'NETWORK_ERROR');

          if (traceSpan) {
            traceManager.addSpanAttributes(traceSpan.spanId, {
              'error.type': 'network_error',
              'error.message': error.message,
            });
            traceManager.endSpan(traceSpan.spanId, 'error', 'Network error');
          }

          // Check if we should retry
          if (this.shouldRetry(error, attemptNumber, retry, priority)) {
            const backoffMs = this.getBackoffDelay(attemptNumber, priority);
            logger.warn('Network error, retrying', {
              backoffMs,
              attempt: attemptNumber,
              maxAttempts: appConfig.api.retryAttempts,
            }, 'API');
            tracker.incrementRetry();
            await this.sleep(backoffMs);
            return executeRequest(attemptNumber + 1);
          }

          if (silent) return null;
          const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1');
          const errorMessage = isLocalhost 
            ? 'Backend server is not running. Please start the backend server with "npm run start:dev" in the backend directory.'
            : `Network error - please check your connection to ${url}`;
          throw new ApiError(errorMessage, 0, 'NETWORK_ERROR');
        }

        // Silent mode: return null for all other error types
        if (silent) {
          return null;
        }

        // Unexpected error
        tracker.recordError(500, 'UNEXPECTED_ERROR');

        if (traceSpan) {
          traceManager.addSpanAttributes(traceSpan.spanId, {
            'error.type': 'unexpected_error',
            'error.message': error instanceof Error ? error.message : String(error),
          });
          traceManager.endSpan(traceSpan.spanId, 'error', 'Unexpected error');
        }

        throw new ApiError('An unexpected error occurred', 500, 'UNEXPECTED_ERROR', {
          originalError: error instanceof Error ? error.message : String(error),
        });
      }
    };

    // Wrap executeRequest with circuit breaker
    const requestPromise = bypassCircuitBreaker || !appConfig.api.circuitBreaker.enabled
      ? executeRequest()
      : this.circuitBreaker.execute(() => executeRequest());

    // Cache the promise for GET requests
    if (method === 'GET') {
      const cacheKey = this.getCacheKey(endpoint, options);
      this.pendingRequests.set(cacheKey, requestPromise);
      requestPromise.finally(() => {
        this.pendingRequests.delete(cacheKey);
      });
    }

    return requestPromise.catch((error) => {
      // Enhance circuit breaker errors with helpful information
      if (error instanceof CircuitBreakerError) {
        const cbMetrics = error.metrics;
        throw new ApiError(
          `Service temporarily unavailable - circuit breaker is ${cbMetrics.state}. The service will be retried ${cbMetrics.nextAttemptTime ? `in ${Math.round((cbMetrics.nextAttemptTime - Date.now()) / 1000)}s` : 'soon'}.`,
          503,
          'CIRCUIT_BREAKER_OPEN',
          {
            circuitBreakerState: cbMetrics.state,
            failureCount: cbMetrics.failures,
            rejectedRequests: cbMetrics.rejectedRequests,
            nextAttemptTime: cbMetrics.nextAttemptTime,
          },
        );
      }
      throw error;
    });
  }

  // Public API with precise overloads to avoid null types leaking into common usage
  // GET
  get<T>(endpoint: string): Promise<T>;
  get<T>(endpoint: string, options: Omit<RequestOptions, 'method' | 'body'> & { silent: true }): Promise<T | null>;
  get<T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'> & { silent?: false }): Promise<T>;
  get<T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, { ...(options || {}), method: 'GET' }) as Promise<T>;
  }

  // POST
  post<T>(endpoint: string, body?: any): Promise<T>;
  post<T>(endpoint: string, body: any, options: Omit<RequestOptions, 'method'> & { silent: true }): Promise<T | null>;
  post<T>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method'> & { silent?: false }): Promise<T>;
  post<T>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(endpoint, { ...(options || {}), method: 'POST', body }) as Promise<T>;
  }

  // PUT
  put<T>(endpoint: string, body?: any): Promise<T>;
  put<T>(endpoint: string, body: any, options: Omit<RequestOptions, 'method'> & { silent: true }): Promise<T | null>;
  put<T>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method'> & { silent?: false }): Promise<T>;
  put<T>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(endpoint, { ...(options || {}), method: 'PUT', body }) as Promise<T>;
  }

  // PATCH
  patch<T>(endpoint: string, body?: any): Promise<T>;
  patch<T>(endpoint: string, body: any, options: Omit<RequestOptions, 'method'> & { silent: true }): Promise<T | null>;
  patch<T>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method'> & { silent?: false }): Promise<T>;
  patch<T>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(endpoint, { ...(options || {}), method: 'PATCH', body }) as Promise<T>;
  }

  // DELETE
  delete<T>(endpoint: string): Promise<T>;
  delete<T>(endpoint: string, options: Omit<RequestOptions, 'method' | 'body'> & { silent: true }): Promise<T | null>;
  delete<T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'> & { silent?: false }): Promise<T>;
  delete<T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, { ...(options || {}), method: 'DELETE' }) as Promise<T>;
  }

  /**
   * Upload files using FormData
   * This bypasses the JSON serialization and handles multipart/form-data
   */
  async uploadFiles<T>(
    endpoint: string,
    formData: FormData,
    options: { timeout?: number; signal?: AbortSignal; priority?: RequestOptions['priority'] } = {},
  ): Promise<T> {
    const { timeout: customTimeout, signal: customSignal, priority = 'normal' } = options;
    const method = 'POST';
    const timeout = this.getTimeout(endpoint, method, customTimeout);
    const url = `${this.baseUrl}${endpoint}`;

    // Initialize metrics tracker
    const tracker = requestMetrics.startRequest(endpoint, method);

    // Try to get token from old auth or Supabase (same as request method)
    const token = this.getAccessToken() || this.getAuthToken();

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Create abort controller for timeout and cancellation
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort(new Error(`Upload timeout after ${timeout}ms`))
    }, timeout);

    // Combine custom signal with timeout signal
    if (customSignal) {
      customSignal.addEventListener('abort', () => abortController.abort());
    }

    const executeUpload = async (attemptNumber = 1): Promise<T> => {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: formData,
          signal: abortController.signal,
        });

        clearTimeout(timeoutId);

        logger.debug(`POST ${endpoint} (FormData)`, {
          status: response.status,
          attempt: attemptNumber,
          timeout: `${timeout}ms`,
        }, 'API');

        let data: any;

        const responseText = await response.text();
        try {
          data = JSON.parse(responseText);
        } catch (e) {
          data = { message: responseText };
        }

        if (!response.ok) {
          tracker.recordError(response.status, data?.error?.code || 'UPLOAD_ERROR');
          throw new ApiError(
            data?.error?.message || data?.message || 'Upload failed',
            response.status,
            data?.error?.code,
            data?.error?.details,
          );
        }

        // Record success
        tracker.recordSuccess(response.status);

        // Handle wrapped response format from backend
        if (data.success && data.data !== undefined) {
          return data.data as T;
        }

        return data as T;
      } catch (error) {
        clearTimeout(timeoutId);

        // Handle AbortError (timeout or cancellation)
        if (error instanceof DOMException && error.name === 'AbortError') {
          if (customSignal?.aborted) {
            tracker.recordCancellation();
            throw new ApiError('Upload was cancelled', 499, 'UPLOAD_CANCELLED');
          }

          // It was a timeout
          tracker.recordTimeout();

          if (process.env.NODE_ENV === 'development') {
            console.warn('[API] Upload timeout:', {
              timeout: `${timeout}ms`,
              attempt: attemptNumber,
              reason: error.message || 'Upload timeout'
            });
          }

          // Check if we should retry
          if (this.shouldRetry(error, attemptNumber, true, priority)) {
            const backoffMs = this.getBackoffDelay(attemptNumber, priority);
            logger.warn('Upload timeout, retrying', {
              backoffMs,
              attempt: attemptNumber,
            }, 'API');
            tracker.incrementRetry();
            await this.sleep(backoffMs);
            return executeUpload(attemptNumber + 1);
          }

          throw new ApiError(
            `Upload timeout after ${timeout}ms - please try again or check your connection`,
            408,
            'UPLOAD_TIMEOUT',
            { timeout, attemptNumber },
          );
        }

        if (error instanceof ApiError) {
          // Check if we should retry
          if (this.shouldRetry(error, attemptNumber, true, priority)) {
            const backoffMs = this.getBackoffDelay(attemptNumber, priority);
            logger.warn('Upload failed, retrying', {
              backoffMs,
              attempt: attemptNumber,
              statusCode: error.statusCode,
            }, 'API');
            tracker.incrementRetry();
            await this.sleep(backoffMs);
            return executeUpload(attemptNumber + 1);
          }
          throw error;
        }

        if (error instanceof TypeError) {
          tracker.recordError(0, 'NETWORK_ERROR');
          throw new ApiError('Network error - please check your connection', 0, 'NETWORK_ERROR');
        }

        tracker.recordError(500, 'UNEXPECTED_ERROR');
        throw new ApiError('An unexpected error occurred during upload', 500, 'UNEXPECTED_ERROR', {
          originalError: error instanceof Error ? error.message : String(error),
        });
      }
    };

    return executeUpload();
  }
}

export class ApiError extends Error {
  public readonly timestamp: string;
  public readonly isRetryable: boolean;

  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
    public details?: any,
  ) {
    super(message);
    this.name = 'ApiError';
    this.timestamp = new Date().toISOString();

    // Determine if error is retryable
    this.isRetryable =
      statusCode >= 500 ||
      statusCode === 0 ||
      statusCode === 408 ||
      statusCode === 429 ||
      statusCode === 503;

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  /**
   * Check if error is authentication related (401)
   */
  isUnauthorized() {
    return this.statusCode === 401;
  }

  /**
   * Check if error is permission related (403)
   */
  isForbidden() {
    return this.statusCode === 403;
  }

  /**
   * Check if resource was not found (404)
   */
  isNotFound() {
    return this.statusCode === 404;
  }

  /**
   * Check if error is validation related (400)
   */
  isValidationError() {
    return this.statusCode === 400;
  }

  /**
   * Check if error is timeout related (408)
   */
  isTimeout() {
    return this.statusCode === 408 || this.code === 'TIMEOUT_ERROR';
  }

  /**
   * Check if error is network related
   */
  isNetworkError() {
    return this.statusCode === 0 || this.code === 'NETWORK_ERROR';
  }

  /**
   * Check if error is server error (5xx)
   */
  isServerError() {
    return this.statusCode >= 500 && this.statusCode < 600;
  }

  /**
   * Check if error is client error (4xx)
   */
  isClientError() {
    return this.statusCode >= 400 && this.statusCode < 500;
  }

  /**
   * Check if error is rate limit (429)
   */
  isRateLimitError() {
    return this.statusCode === 429;
  }

  /**
   * Check if error is circuit breaker related
   */
  isCircuitBreakerError() {
    return this.code === 'CIRCUIT_BREAKER_OPEN';
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    if (this.isTimeout()) {
      return 'The request took too long to complete. Please try again.';
    }
    if (this.isNetworkError()) {
      return 'Unable to connect to the server. Please check your internet connection.';
    }
    if (this.isServerError()) {
      return 'A server error occurred. Our team has been notified. Please try again later.';
    }
    if (this.isRateLimitError()) {
      return 'Too many requests. Please wait a moment and try again.';
    }
    if (this.isCircuitBreakerError()) {
      return 'The service is temporarily unavailable. Please try again in a few moments.';
    }
    if (this.isUnauthorized()) {
      return 'Your session has expired. Please log in again.';
    }
    if (this.isForbidden()) {
      return "You don't have permission to perform this action.";
    }
    if (this.isNotFound()) {
      return 'The requested resource was not found.';
    }
    if (this.isValidationError()) {
      return this.message || 'The submitted data is invalid. Please check your input.';
    }
    return this.message || 'An unexpected error occurred. Please try again.';
  }

  /**
   * Get diagnostic information for debugging
   */
  getDiagnostics(): Record<string, any> {
    return {
      message: this.message,
      statusCode: this.statusCode,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
      isRetryable: this.isRetryable,
      userMessage: this.getUserMessage(),
    };
  }

  /**
   * Convert error to JSON for logging/monitoring
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
      isRetryable: this.isRetryable,
      stack: this.stack,
    };
  }

  /**
   * Format error for console output
   */
  toString(): string {
    return `${this.name} [${this.statusCode}${this.code ? ` - ${this.code}` : ''}]: ${this.message}`;
  }
}

export const apiClient = new ApiClient();

/**
 * Helper function to create an AbortController with timeout
 * Usage: const { signal, cleanup } = createAbortSignal(5000);
 */
export function createAbortSignal(timeoutMs?: number): {
  controller: AbortController;
  signal: AbortSignal;
  cleanup: () => void;
} {
  const controller = new AbortController();
  let timeoutId: NodeJS.Timeout | null = null;

  if (timeoutMs) {
    timeoutId = setTimeout(() => {
      controller.abort(new Error(`Operation timeout after ${timeoutMs}ms`))
    }, timeoutMs);
  }

  return {
    controller,
    signal: controller.signal,
    cleanup: () => {
      if (timeoutId) clearTimeout(timeoutId);
    },
  };
}

/**
 * Check if the API is healthy by making a lightweight request
 */
export async function checkApiHealth(): Promise<{
  healthy: boolean;
  responseTime: number;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    // Use a lightweight endpoint (adjust based on your API)
    await apiClient.get('/health', {
      timeout: 5000,
      bypassCircuitBreaker: true,
      retry: false,
    });

    return {
      healthy: true,
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      healthy: false,
      responseTime: Date.now() - startTime,
      error: error instanceof ApiError ? error.getUserMessage() : String(error),
    };
  }
}

/**
 * Export metrics for monitoring dashboards
 */
export function getApiMetrics() {
  return {
    request: apiClient.getRequestMetrics(),
    circuitBreaker: apiClient.getCircuitBreakerMetrics(),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Export detailed metrics with recommendations
 */
export function getApiDiagnostics() {
  const metrics = apiClient.getRequestMetrics();
  const cbMetrics = apiClient.getCircuitBreakerMetrics();

  // Generate recommendations based on metrics
  const recommendations: string[] = [];

  if (metrics.failureRate > 0.1) {
    recommendations.push('High failure rate detected. Consider investigating backend health.');
  }

  if (metrics.totalTimeouts > metrics.totalRequests * 0.05) {
    recommendations.push(
      'Elevated timeout rate. Consider increasing timeout values or optimizing backend performance.',
    );
  }

  if (cbMetrics.state !== 'CLOSED') {
    recommendations.push(
      `Circuit breaker is ${cbMetrics.state}. Service reliability is degraded.`,
    );
  }

  // Identify slow endpoints
  const slowEndpoints: Array<{ endpoint: string; p95: number }> = [];
  metrics.endpointMetrics.forEach((endpointMetric, key) => {
    if (endpointMetric.p95ResponseTime > 3000) {
      slowEndpoints.push({
        endpoint: key,
        p95: endpointMetric.p95ResponseTime,
      });
    }
  });

  if (slowEndpoints.length > 0) {
    recommendations.push(
      `Slow endpoints detected: ${slowEndpoints.map((e) => `${e.endpoint} (${e.p95}ms)`).join(', ')}`,
    );
  }

  return {
    metrics,
    circuitBreaker: cbMetrics,
    recommendations,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Reset all monitoring state (useful for testing)
 */
export function resetApiMetrics() {
  requestMetrics.clear();
  apiClient.resetCircuitBreaker();
}

// Export utilities
export { requestMetrics } from './request-metrics';
export { CircuitBreaker, CircuitBreakerError, CircuitBreakerState } from './circuit-breaker';
export { traceManager, generateTraceId, generateRequestId, getTraceHeaders, traced } from './distributed-tracing';
export { idempotencyManager, IdempotencyBestPractices } from './idempotency';
export { rateLimitManager } from './rate-limit';
export { healthCheckManager, ServiceStatus } from './health-check';
export { envValidator } from '../config/env-validator';
export type { IdempotencyOptions } from './idempotency';
export type { TraceContext, Span } from './distributed-tracing';
export type { ServiceHealth, HealthCheckResult } from './health-check';
export type { ValidationResult, EnvironmentConfig } from '../config/env-validator';
