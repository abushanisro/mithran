/**
 * Request Metrics Collection and Monitoring
 *
 * Tracks API performance metrics for observability, monitoring, and alerting.
 * Provides insights into request patterns, failure rates, and performance characteristics.
 */

export interface RequestMetric {
  endpoint: string;
  method: string;
  startTime: number;
  endTime: number;
  duration: number;
  status: 'success' | 'error' | 'timeout' | 'cancelled';
  statusCode?: number;
  errorType?: string;
  retryCount: number;
  fromCache: boolean;
}

export interface EndpointMetrics {
  totalRequests: number;
  successCount: number;
  errorCount: number;
  timeoutCount: number;
  cancelledCount: number;
  averageResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  failureRate: number;
  lastRequestTime: number;
  responseTimes: number[];
}

export interface GlobalMetrics {
  totalRequests: number;
  totalErrors: number;
  totalTimeouts: number;
  totalCancellations: number;
  averageResponseTime: number;
  failureRate: number;
  endpointMetrics: Map<string, EndpointMetrics>;
}

/**
 * Metrics collector for API requests
 */
export class RequestMetricsCollector {
  private metrics: RequestMetric[] = [];
  private maxMetricsSize: number = 1000;
  private endpointMetrics = new Map<string, EndpointMetrics>();
  private listeners: Array<(metric: RequestMetric) => void> = [];

  /**
   * Record a new request metric
   */
  record(metric: RequestMetric): void {
    this.metrics.push(metric);

    // Keep metrics size manageable
    if (this.metrics.length > this.maxMetricsSize) {
      this.metrics.shift();
    }

    // Update endpoint-specific metrics
    this.updateEndpointMetrics(metric);

    // Notify listeners
    this.notifyListeners(metric);
  }

  /**
   * Start tracking a request
   */
  startRequest(endpoint: string, method: string): RequestTracker {
    return new RequestTracker(endpoint, method, this);
  }

  private updateEndpointMetrics(metric: RequestMetric): void {
    const key = `${metric.method}:${metric.endpoint}`;
    let endpointMetric = this.endpointMetrics.get(key);

    if (!endpointMetric) {
      endpointMetric = {
        totalRequests: 0,
        successCount: 0,
        errorCount: 0,
        timeoutCount: 0,
        cancelledCount: 0,
        averageResponseTime: 0,
        p50ResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        failureRate: 0,
        lastRequestTime: Date.now(),
        responseTimes: [],
      };
      this.endpointMetrics.set(key, endpointMetric);
    }

    endpointMetric.totalRequests++;
    endpointMetric.lastRequestTime = metric.endTime;
    endpointMetric.responseTimes.push(metric.duration);

    // Keep response times array manageable
    if (endpointMetric.responseTimes.length > 100) {
      endpointMetric.responseTimes.shift();
    }

    switch (metric.status) {
      case 'success':
        endpointMetric.successCount++;
        break;
      case 'error':
        endpointMetric.errorCount++;
        break;
      case 'timeout':
        endpointMetric.timeoutCount++;
        endpointMetric.errorCount++;
        break;
      case 'cancelled':
        endpointMetric.cancelledCount++;
        break;
    }

    // Calculate percentiles
    const sortedTimes = [...endpointMetric.responseTimes].sort((a, b) => a - b);
    endpointMetric.averageResponseTime =
      endpointMetric.responseTimes.reduce((a, b) => a + b, 0) / endpointMetric.responseTimes.length;
    endpointMetric.p50ResponseTime = this.getPercentile(sortedTimes, 0.5);
    endpointMetric.p95ResponseTime = this.getPercentile(sortedTimes, 0.95);
    endpointMetric.p99ResponseTime = this.getPercentile(sortedTimes, 0.99);
    endpointMetric.failureRate = endpointMetric.errorCount / endpointMetric.totalRequests;
  }

  private getPercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil(sortedArray.length * percentile) - 1;
    return sortedArray[index] ?? 0;
  }

  /**
   * Get metrics for a specific endpoint
   */
  getEndpointMetrics(endpoint: string, method: string): EndpointMetrics | undefined {
    const key = `${method}:${endpoint}`;
    return this.endpointMetrics.get(key);
  }

  /**
   * Get global metrics across all endpoints
   */
  getGlobalMetrics(): GlobalMetrics {
    const totalRequests = this.metrics.length;
    const totalErrors = this.metrics.filter((m) => m.status === 'error' || m.status === 'timeout').length;
    const totalTimeouts = this.metrics.filter((m) => m.status === 'timeout').length;
    const totalCancellations = this.metrics.filter((m) => m.status === 'cancelled').length;
    const averageResponseTime =
      this.metrics.reduce((sum, m) => sum + m.duration, 0) / (totalRequests || 1);

    return {
      totalRequests,
      totalErrors,
      totalTimeouts,
      totalCancellations,
      averageResponseTime,
      failureRate: totalErrors / (totalRequests || 1),
      endpointMetrics: new Map(this.endpointMetrics),
    };
  }

  /**
   * Get recent metrics for analysis
   */
  getRecentMetrics(count: number = 50): RequestMetric[] {
    return this.metrics.slice(-count);
  }

  /**
   * Get metrics filtered by status
   */
  getMetricsByStatus(status: RequestMetric['status'], count: number = 50): RequestMetric[] {
    return this.metrics.filter((m) => m.status === status).slice(-count);
  }

  /**
   * Check if an endpoint is experiencing high timeout rate
   */
  isEndpointUnhealthy(endpoint: string, method: string): boolean {
    const metrics = this.getEndpointMetrics(endpoint, method);
    if (!metrics || metrics.totalRequests < 5) return false;

    // Consider unhealthy if:
    // 1. Failure rate > 50%
    // 2. Timeout rate > 30%
    const timeoutRate = metrics.timeoutCount / metrics.totalRequests;
    return metrics.failureRate > 0.5 || timeoutRate > 0.3;
  }

  /**
   * Get recommended timeout for an endpoint based on historical data
   */
  getRecommendedTimeout(endpoint: string, method: string, defaultTimeout: number): number {
    const metrics = this.getEndpointMetrics(endpoint, method);
    if (!metrics || metrics.totalRequests < 10) return defaultTimeout;

    // Use P95 response time + 50% buffer, but cap at 2x default
    const recommendedTimeout = Math.min(metrics.p95ResponseTime * 1.5, defaultTimeout * 2);
    return Math.max(recommendedTimeout, defaultTimeout);
  }

  /**
   * Add a listener for new metrics
   */
  addListener(listener: (metric: RequestMetric) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(metric: RequestMetric): void {
    this.listeners.forEach((listener) => {
      try {
        listener(metric);
      } catch (error) {
        // Ignore listener errors
        console.error('Error in metrics listener:', error);
      }
    });
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.endpointMetrics.clear();
  }

  /**
   * Export metrics for external monitoring systems
   */
  exportMetrics(): {
    metrics: RequestMetric[];
    globalMetrics: GlobalMetrics;
    timestamp: string;
  } {
    return {
      metrics: this.metrics,
      globalMetrics: this.getGlobalMetrics(),
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Helper class for tracking individual requests
 */
export class RequestTracker {
  private startTime: number;
  private retryCount: number = 0;
  private fromCache: boolean = false;

  constructor(
    private endpoint: string,
    private method: string,
    private collector: RequestMetricsCollector,
  ) {
    this.startTime = Date.now();
  }

  /**
   * Mark request as successful
   */
  recordSuccess(statusCode: number): void {
    this.collector.record({
      endpoint: this.endpoint,
      method: this.method,
      startTime: this.startTime,
      endTime: Date.now(),
      duration: Date.now() - this.startTime,
      status: 'success',
      statusCode,
      retryCount: this.retryCount,
      fromCache: this.fromCache,
    });
  }

  /**
   * Mark request as failed
   */
  recordError(statusCode: number, errorType: string): void {
    this.collector.record({
      endpoint: this.endpoint,
      method: this.method,
      startTime: this.startTime,
      endTime: Date.now(),
      duration: Date.now() - this.startTime,
      status: 'error',
      statusCode,
      errorType,
      retryCount: this.retryCount,
      fromCache: this.fromCache,
    });
  }

  /**
   * Mark request as timed out
   */
  recordTimeout(): void {
    this.collector.record({
      endpoint: this.endpoint,
      method: this.method,
      startTime: this.startTime,
      endTime: Date.now(),
      duration: Date.now() - this.startTime,
      status: 'timeout',
      statusCode: 408,
      errorType: 'TimeoutError',
      retryCount: this.retryCount,
      fromCache: this.fromCache,
    });
  }

  /**
   * Mark request as cancelled
   */
  recordCancellation(): void {
    this.collector.record({
      endpoint: this.endpoint,
      method: this.method,
      startTime: this.startTime,
      endTime: Date.now(),
      duration: Date.now() - this.startTime,
      status: 'cancelled',
      statusCode: 499,
      errorType: 'AbortError',
      retryCount: this.retryCount,
      fromCache: this.fromCache,
    });
  }

  /**
   * Increment retry count
   */
  incrementRetry(): void {
    this.retryCount++;
  }

  /**
   * Mark request as served from cache
   */
  setFromCache(fromCache: boolean): void {
    this.fromCache = fromCache;
  }
}

// Global instance
export const requestMetrics = new RequestMetricsCollector();
