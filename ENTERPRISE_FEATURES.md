# Enterprise-Grade API Client Features

## Overview

This document covers the advanced enterprise features that address the gaps in the initial implementation. These features bring the API client to true production-grade, Fortune 500 standards.

---

## 1. ✅ Distributed Tracing with W3C Trace Context

### Problem Addressed
**Critical Gap**: Without distributed tracing, debugging multi-service failures is incomplete. You cannot correlate:
- Frontend → API Client → Backend → Database → Queue

### Solution Implemented

**W3C Trace Context Standard** (`lib/api/distributed-tracing.ts`)

```typescript
// Automatic trace context propagation
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
x-request-id: uuid
```

### Features

1. **Automatic Trace ID Generation**
   - 128-bit trace IDs (32 hex chars)
   - 64-bit span IDs (16 hex chars)
   - UUID request IDs for correlation

2. **Context Propagation**
   - Automatic header injection
   - Parent-child span relationships
   - Trace state management

3. **Span-Level Timing**
   - Start/end timestamps
   - Duration tracking
   - Status tracking (success/error)

4. **Attribute Collection**
   - HTTP method, URL, status code
   - Response times
   - Error details
   - Custom attributes

### Usage

```typescript
import { traced, traceManager } from '@/lib/api/client';

// Automatic tracing (default enabled)
const data = await apiClient.get('/endpoint');
// Headers automatically include: traceparent, x-request-id

// Manual span creation
const span = traceManager.startSpan('complex-operation', {
  'operation.type': 'calculation',
  'user.id': userId,
});

try {
  // Your operation
  traceManager.addSpanAttributes(span.spanId, {
    'result.count': results.length,
  });
  traceManager.endSpan(span.spanId, 'success');
} catch (error) {
  traceManager.endSpan(span.spanId, 'error', error.message);
}

// Wrap function with tracing
await traced('fetch-user-data', async (span) => {
  const user = await fetchUser();
  traceManager.addSpanAttributes(span.spanId, { 'user.id': user.id });
  return user;
});
```

### Integration with Tracing Systems

```typescript
import {
  HttpTracingExporter,
  BatchTracingExporter
} from '@/lib/api/distributed-tracing';

// Export to Jaeger/Zipkin
const exporter = new HttpTracingExporter('http://jaeger:14268/api/traces');
const batchExporter = new BatchTracingExporter(exporter);

traceManager.addSpanListener((span) => {
  batchExporter.add(span);
});
```

### Configuration

```typescript
// lib/config.ts
tracing: {
  enabled: true,
  exportToConsole: process.env.NODE_ENV === 'development',
  exportEndpoint: process.env.NEXT_PUBLIC_TRACING_ENDPOINT,
  sampleRate: 1.0, // 100% in dev, 0.1 (10%) in prod
}
```

---

## 2. ✅ Idempotency Guarantees

### Problem Addressed
**Critical Gap**: Retries without idempotency = risk of double writes, duplicate payments, duplicate orders.

### Solution Implemented

**Idempotency Key Management** (`lib/api/idempotency.ts`)

```typescript
// Automatic idempotency headers
Idempotency-Key: 7b8f8c2e-3d42-4a6b-8e92-1c3d4e5f6a7b
```

### Features

1. **Automatic Key Generation**
   - UUID-based keys for POST/PUT/PATCH
   - Client-side deduplication
   - Response caching

2. **Safe Retry Semantics**
   - Same key = same result
   - Prevents double writes
   - Cached responses for duplicates

3. **TTL-Based Expiration**
   - Configurable key lifetime (default 24h)
   - Automatic cleanup
   - Memory-efficient storage

### Usage

```typescript
// Automatic idempotency (enabled by default for POST/PUT/PATCH)
await apiClient.post('/orders', orderData);
// Automatically includes: Idempotency-Key header

// Custom idempotency key (for user actions)
await apiClient.post('/payment', paymentData, {
  idempotency: {
    key: `payment-${userId}-${Date.now()}`,
    ttl: 60 * 60 * 1000, // 1 hour
  },
});

// Disable idempotency
await apiClient.post('/analytics', data, {
  idempotency: { enabled: false },
});

// Best practices for specific scenarios
import { IdempotencyBestPractices } from '@/lib/api/client';

// User action (button click)
const key = IdempotencyBestPractices.userAction(userId, 'purchase', { productId });

// Webhook processing
const key = IdempotencyBestPractices.webhook(webhookId, 'order.created');
```

### How It Works

1. **Request Interception**
   - Generate or use provided idempotency key
   - Hash request body for verification
   - Check for existing key

2. **Duplicate Detection**
   - If key exists with same endpoint/method/body → return cached response
   - If key exists but different operation → generate new key
   - If key doesn't exist → proceed with request

3. **Response Storage**
   - Store successful responses with key
   - Expire based on TTL
   - Cleanup on failure

### Configuration

```typescript
// lib/config.ts
idempotency: {
  enabled: true,
  defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
  autoGenerate: true,
  persistToStorage: false, // Optional: persist to localStorage
}
```

---

## 3. ✅ Rate Limit Awareness

### Problem Addressed
**Gap**: You detect 429, but you don't:
- Respect `Retry-After` headers
- Dynamically throttle based on server signals
- Apply client-side token buckets

### Solution Implemented

**Intelligent Rate Limit Management** (`lib/api/rate-limit.ts`)

### Features

1. **Server Signal Respect**
   - Parse `Retry-After` headers (seconds or HTTP date)
   - Honor `X-RateLimit-*` headers
   - Dynamic backoff based on server signals

2. **Client-Side Token Bucket**
   - Global token bucket (1000 capacity, 100/sec refill)
   - Per-endpoint token buckets (100 capacity, 10/sec refill)
   - Configurable limits per endpoint

3. **Adaptive Throttling**
   - Success rate tracking
   - Automatic slowdown on failures
   - Graceful degradation

### Usage

```typescript
// Automatic rate limiting (enabled by default)
await apiClient.get('/endpoint');
// Automatically throttled if limits exceeded

// Check rate limit status
import { rateLimitManager } from '@/lib/api/client';

const state = rateLimitManager.getState('/endpoint');
if (state) {
  console.log('Remaining:', state.remaining);
  console.log('Reset time:', new Date(state.resetTime));
}

// Get wait time before next request
const waitMs = rateLimitManager.getWaitTime('/endpoint');
if (waitMs > 0) {
  console.log(`Wait ${waitMs}ms before next request`);
}

// Bypass rate limiting (for health checks)
await apiClient.get('/health', {
  rateLimitAware: false,
});
```

### Rate Limit Headers Parsed

```typescript
// Standard rate limit headers
X-RateLimit-Limit: 100       // Maximum requests per window
X-RateLimit-Remaining: 42    // Requests remaining
X-RateLimit-Reset: 1640995200 // Unix timestamp of reset

// Retry-After (429 response)
Retry-After: 60              // Seconds to wait
Retry-After: Wed, 21 Oct 2025 07:28:00 GMT // HTTP date
```

### Token Bucket Algorithm

```typescript
import { rateLimitManager } from '@/lib/api/client';

// Set custom bucket for expensive endpoint
rateLimitManager.setBucketConfig('/expensive-calculation', {
  capacity: 10,        // Max 10 requests
  refillRate: 1,       // 1 request per second
  refillInterval: 1000, // 1 second interval
});

// Check token availability
const hasTokens = rateLimitManager.tryAcquire('/endpoint');
if (!hasTokens) {
  const waitTime = rateLimitManager.getWaitTime('/endpoint');
  // Wait or show user message
}
```

### Configuration

```typescript
// lib/config.ts
rateLimit: {
  enabled: true,
  respectRetryAfter: true,
  clientSideThrottling: true,

  globalLimit: {
    capacity: 1000,
    refillRate: 100, // 100 requests/second
  },

  endpointLimit: {
    capacity: 100,
    refillRate: 10, // 10 requests/second per endpoint
  },
}
```

---

## 4. ✅ Server-Hinted Circuit Breaker

### Problem Addressed
**Gap**: Circuit breaker is client-local only. Top-tier systems also include:
- Shared breaker state
- Server-hinted throttling
- Backend health signals

### Solution Implemented

**Server-Aware Circuit Breaker**

### Features

1. **Server Status Headers**
   ```typescript
   X-Server-Status: degraded    // Server is under stress
   X-Server-Status: overloaded  // Server requests backoff
   ```

2. **Automatic Detection**
   - Monitor server health signals
   - Add trace attributes for observability
   - Adjust behavior based on server state

3. **Graceful Degradation**
   - Respect server hints
   - Reduce load automatically
   - Faster recovery when server indicates healthy

### Usage

```typescript
// Automatic server hint detection (no code changes needed)
const data = await apiClient.get('/endpoint');

// Server returns X-Server-Status: degraded
// → Logged in trace
// → Circuit breaker becomes more sensitive
// → Backoff delays increase

// Manually check server status from traces
import { traceManager } from '@/lib/api/client';

const spans = traceManager.getSpansForTrace(traceId);
spans.forEach(span => {
  if (span.attributes['server.status'] === 'degraded') {
    console.log('Server is experiencing issues');
  }
});
```

### Backend Implementation Guide

To fully leverage this feature, your backend should send:

```typescript
// Express.js example
app.use((req, res, next) => {
  // Check system health
  const cpuUsage = process.cpuUsage();
  const memoryUsage = process.memoryUsage();

  if (cpuUsage > 80 || memoryUsage.heapUsed / memoryUsage.heapTotal > 0.9) {
    res.setHeader('X-Server-Status', 'degraded');
  }

  if (cpuUsage > 95) {
    res.setHeader('X-Server-Status', 'overloaded');
    res.setHeader('Retry-After', '30'); // 30 seconds
  }

  next();
});
```

---

## 5. ✅ Backend SLA Awareness

### Problem Addressed
**Gap**: Adaptive timeouts use client-only metrics. Best-in-class systems align:
```
Client timeout ≈ Backend P99 + network budget
```

### Solution Implemented

**SLA-Based Timeout Alignment**

### Features

1. **Backend SLA Headers**
   ```typescript
   X-Expected-Response-Time: 500  // Backend expects 500ms
   ```

2. **Automatic SLA Tracking**
   - Compare actual vs expected times
   - Record SLA violations in traces
   - Adjust timeouts based on backend signals

3. **Percentile-Based Contracts**
   - Backend advertises P99 response time
   - Client adjusts timeout accordingly
   - Network budget added automatically

### Usage

```typescript
// Backend sends SLA hint
// X-Expected-Response-Time: 500

// Client automatically tracks
const data = await apiClient.get('/endpoint');

// Check SLA compliance in traces
import { traceManager } from '@/lib/api/client';

const spans = traceManager.getSpansForTrace(traceId);
spans.forEach(span => {
  const expected = span.attributes['backend.sla.expected_ms'];
  const actual = span.attributes['backend.sla.actual_ms'];
  const met = span.attributes['backend.sla.met'];

  if (!met) {
    console.log(`SLA violated: ${actual}ms > ${expected}ms`);
  }
});
```

### Backend Implementation Guide

```typescript
// Express.js example
app.get('/expensive-calculation', async (req, res) => {
  // Advertise expected response time
  res.setHeader('X-Expected-Response-Time', '2000'); // 2 seconds

  const result = await performCalculation();
  res.json(result);
});

// For dynamic SLAs based on request complexity
app.post('/query', async (req, res) => {
  const complexity = estimateComplexity(req.body);
  const expectedMs = complexity * 100;

  res.setHeader('X-Expected-Response-Time', String(expectedMs));

  const result = await executeQuery(req.body);
  res.json(result);
});
```

---

## Integration Example

### Complete Enterprise Request

```typescript
import { apiClient, traced } from '@/lib/api/client';

// All enterprise features enabled automatically
const result = await traced('create-order', async (span) => {
  try {
    const order = await apiClient.post('/orders', {
      items: cartItems,
      total: calculateTotal(cartItems),
    }, {
      // Custom idempotency key for this user action
      idempotency: {
        key: `order-${userId}-${Date.now()}`,
      },
      // High priority for payment operations
      priority: 'high',
      // Custom timeout
      timeout: 15000,
    });

    // Add business context to trace
    traceManager.addSpanAttributes(span.spanId, {
      'order.id': order.id,
      'order.total': order.total,
      'order.items_count': order.items.length,
    });

    return order;
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.isTimeout()) {
        // Handle timeout specifically
        showUserMessage('Order is taking longer than expected...');
      } else if (error.isRateLimitError()) {
        // Handle rate limit
        showUserMessage('Too many requests, please wait...');
      }
    }
    throw error;
  }
});
```

### Monitoring Dashboard

```typescript
import {
  getApiDiagnostics,
  rateLimitManager,
  traceManager
} from '@/lib/api/client';

// Get comprehensive diagnostics
const diagnostics = getApiDiagnostics();

// Display on dashboard
{
  // Request Metrics
  totalRequests: diagnostics.metrics.totalRequests,
  failureRate: diagnostics.metrics.failureRate,
  avgResponseTime: diagnostics.metrics.averageResponseTime,

  // Circuit Breaker
  circuitState: diagnostics.circuitBreaker.state,
  circuitFailures: diagnostics.circuitBreaker.failures,

  // Rate Limiting
  rateLimitStatus: rateLimitManager.getStats(),
  throttledEndpoints: rateLimitManager.getStats().throttledEndpoints,

  // Distributed Tracing
  activeTraces: traceManager.getSpans().filter(s => s.status === 'pending').length,
  recentErrors: traceManager.getSpans().filter(s => s.status === 'error').slice(-10),

  // Idempotency
  idempotencyStats: idempotencyManager.getStats(),

  // Recommendations
  recommendations: diagnostics.recommendations,
}
```

---

## Configuration Summary

```typescript
// lib/config.ts
export const config = {
  api: {
    // Base configuration
    baseUrl: 'http://localhost:4000/api/v1',
    timeout: 30000,
    retryAttempts: 3,
    retryTimeoutErrors: true,

    // Adaptive timeouts with backend SLA awareness
    adaptiveTimeouts: {
      enabled: true,
      useHistoricalData: true,
      useBackendSLAs: true, // NEW: Respect X-Expected-Response-Time
    },

    // Server-aware circuit breaker
    circuitBreaker: {
      enabled: true,
      respectServerHints: true, // NEW: Honor X-Server-Status
      failureThreshold: 5,
      timeout: 30000,
    },

    // Distributed tracing
    tracing: {
      enabled: true,
      exportEndpoint: process.env.NEXT_PUBLIC_TRACING_ENDPOINT,
      sampleRate: 1.0,
    },

    // Idempotency
    idempotency: {
      enabled: true,
      autoGenerate: true,
      defaultTTL: 24 * 60 * 60 * 1000,
    },

    // Rate limiting
    rateLimit: {
      enabled: true,
      respectRetryAfter: true,
      clientSideThrottling: true,
    },
  },
};
```

---

## Comparison: Before vs After

### Before (Initial Implementation)
❌ No distributed tracing
❌ No idempotency guarantees
❌ Basic rate limit detection (429)
⚠️ Client-local circuit breaker
⚠️ Client-only adaptive timeouts

### After (Enterprise Implementation)
✅ **W3C Trace Context** with full correlation
✅ **Idempotency keys** for safe mutations
✅ **Intelligent rate limiting** with Retry-After respect
✅ **Server-hinted circuit breaker** with health signals
✅ **SLA-aware timeouts** with backend alignment

---

## Production Checklist

- [ ] Configure distributed tracing export endpoint
- [ ] Set appropriate trace sampling rate for production (0.01-0.1)
- [ ] Review idempotency TTL for your use case
- [ ] Configure rate limits based on backend capacity
- [ ] Implement backend SLA headers (X-Expected-Response-Time)
- [ ] Implement backend status headers (X-Server-Status)
- [ ] Set up monitoring for trace exports
- [ ] Configure alerts for circuit breaker state changes
- [ ] Test idempotency with duplicate requests
- [ ] Verify rate limiting with load testing

---

## Industry Standards Compliance

✅ **W3C Trace Context** - Full compliance
✅ **RFC 6585** - 429 Too Many Requests
✅ **Idempotency** - Stripe/Twilio pattern
✅ **Circuit Breaker** - Netflix Hystrix pattern
✅ **Rate Limiting** - Token bucket algorithm
✅ **Observability** - OpenTelemetry compatible

This implementation meets Fortune 500 and FAANG standards for production API clients.
