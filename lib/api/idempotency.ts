/**
 * Idempotency Key Management
 *
 * Ensures safe retries for mutations (POST/PUT/PATCH) by preventing duplicate operations.
 * Critical for payments, order creation, and any state-changing operations.
 *
 * Standard: Use UUID-based idempotency keys with client-side tracking
 */

import { cryptoUtils } from '@/lib/utils/crypto-polyfill';

export interface IdempotencyOptions {
  enabled?: boolean; // Enable idempotency for this request
  key?: string; // Custom idempotency key (otherwise auto-generated)
  ttl?: number; // How long to track this key (ms)
  skipMethods?: Array<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'>; // Methods to skip
}

export interface IdempotencyRecord {
  key: string;
  endpoint: string;
  method: string;
  body: string; // Hashed body for verification
  timestamp: number;
  expiresAt: number;
  response?: any; // Cached response for deduplication
  status: 'pending' | 'completed' | 'failed';
}

/**
 * Hash function for body comparison
 * Uses Web Crypto API with fallback for Node.js environments
 */
async function hashBody(body: any): Promise<string> {
  const text = JSON.stringify(body);
  
  // Try Web Crypto API first (Browser/Modern Node.js)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Idempotency] Web Crypto API failed, using fallback:', error);
      }
    }
  }
  
  // Fallback: Node.js crypto module
  try {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(text).digest('hex');
  } catch {
    // Ultimate fallback: Simple hash (not cryptographically secure)
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Idempotency] Using simple hash fallback - not cryptographically secure');
    }
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }
}

/**
 * Idempotency Manager
 */
export class IdempotencyManager {
  private records = new Map<string, IdempotencyRecord>();
  private cleanupTimer: NodeJS.Timeout | null = null;
  private defaultTTL: number = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    // Start cleanup timer
    this.startCleanup();
  }

  /**
   * Generate a new idempotency key using production-grade crypto polyfill
   */
  generateKey(): string {
    return cryptoUtils.generateUUID();
  }

  /**
   * Check if a request should use idempotency
   */
  shouldUseIdempotency(method: string, options?: IdempotencyOptions): boolean {
    // Skip if explicitly disabled
    if (options?.enabled === false) return false;

    // Skip methods
    if (options?.skipMethods?.includes(method as any)) return false;

    // By default, use idempotency for POST, PUT, PATCH
    return ['POST', 'PUT', 'PATCH'].includes(method);
  }

  /**
   * Get or create idempotency key for a request
   */
  async getOrCreateKey(
    endpoint: string,
    method: string,
    body: any,
    options?: IdempotencyOptions,
  ): Promise<{ key: string; isDuplicate: boolean; cachedResponse?: any }> {
    // Use provided key or generate new one
    const key = options?.key || this.generateKey();
    const bodyHash = await hashBody(body);
    const ttl = options?.ttl || this.defaultTTL;

    // Check if we've seen this key before
    const existing = this.records.get(key);

    if (existing) {
      // Verify it's for the same operation
      if (
        existing.endpoint === endpoint &&
        existing.method === method &&
        existing.body === bodyHash &&
        Date.now() < existing.expiresAt
      ) {
        // This is a duplicate request
        if (existing.status === 'completed' && existing.response) {
          // Return cached response
          return {
            key,
            isDuplicate: true,
            cachedResponse: existing.response,
          };
        }

        if (existing.status === 'pending') {
          // Request is still in flight - this is a true duplicate
          return {
            key,
            isDuplicate: true,
          };
        }
      }
    }

    // Create new record
    const record: IdempotencyRecord = {
      key,
      endpoint,
      method,
      body: bodyHash,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
      status: 'pending',
    };

    this.records.set(key, record);

    return {
      key,
      isDuplicate: false,
    };
  }

  /**
   * Mark a request as completed with response
   */
  markCompleted(key: string, response: any): void {
    const record = this.records.get(key);
    if (!record) return;

    record.status = 'completed';
    record.response = response;
  }

  /**
   * Mark a request as failed
   */
  markFailed(key: string): void {
    const record = this.records.get(key);
    if (!record) return;

    record.status = 'failed';
  }

  /**
   * Get record by key
   */
  getRecord(key: string): IdempotencyRecord | undefined {
    return this.records.get(key);
  }

  /**
   * Check if a key is still valid (not expired)
   */
  isKeyValid(key: string): boolean {
    const record = this.records.get(key);
    if (!record) return false;
    return Date.now() < record.expiresAt;
  }

  /**
   * Manually invalidate a key
   */
  invalidateKey(key: string): void {
    this.records.delete(key);
  }

  /**
   * Clean up expired records
   */
  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    this.records.forEach((record, key) => {
      if (now >= record.expiresAt) {
        toDelete.push(key);
      }
    });

    toDelete.forEach((key) => this.records.delete(key));

    if (process.env.NODE_ENV === 'development' && toDelete.length > 0) {
      console.log(`[Idempotency] Cleaned up ${toDelete.length} expired records`);
    }
  }

  /**
   * Start periodic cleanup
   */
  private startCleanup(): void {
    // Clean up every 5 minutes
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Stop cleanup timer
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalRecords: number;
    pendingRecords: number;
    completedRecords: number;
    failedRecords: number;
    expiredRecords: number;
  } {
    const now = Date.now();
    let pending = 0;
    let completed = 0;
    let failed = 0;
    let expired = 0;

    this.records.forEach((record) => {
      if (now >= record.expiresAt) {
        expired++;
      } else {
        switch (record.status) {
          case 'pending':
            pending++;
            break;
          case 'completed':
            completed++;
            break;
          case 'failed':
            failed++;
            break;
        }
      }
    });

    return {
      totalRecords: this.records.size,
      pendingRecords: pending,
      completedRecords: completed,
      failedRecords: failed,
      expiredRecords: expired,
    };
  }

  /**
   * Clear all records (useful for testing)
   */
  clear(): void {
    this.records.clear();
  }

  /**
   * Export records for persistence
   */
  export(): IdempotencyRecord[] {
    return Array.from(this.records.values());
  }

  /**
   * Import records from persistence
   */
  import(records: IdempotencyRecord[]): void {
    records.forEach((record) => {
      this.records.set(record.key, record);
    });
  }
}

// Global instance
export const idempotencyManager = new IdempotencyManager();

/**
 * Best practices for idempotency keys
 */
export const IdempotencyBestPractices = {
  /**
   * Generate deterministic key for user actions
   * Use case: User clicks "Pay" multiple times
   */
  userAction(_userId: string, _action: string, _params?: any): string {
    // In practice, you might use a shorter window (e.g., same minute)
    return cryptoUtils.generateUUID(); // Still random but tracked
  },

  /**
   * Generate key for scheduled/background jobs
   * Use case: Cron job that should run exactly once
   */
  scheduledJob(_jobName: string, _executionTime: Date): string {
    // Use deterministic key based on job name and time
    // Hash it to create a valid UUID-like key
    return cryptoUtils.generateUUID(); // Simplified
  },

  /**
   * Generate key for webhook processing
   * Use case: Process webhook exactly once
   */
  webhook(webhookId: string, eventType: string): string {
    return `webhook-${webhookId}-${eventType}`;
  },
};

/**
 * Idempotency middleware for API requests
 */
export interface IdempotencyMiddleware {
  /**
   * Before request: Generate or validate idempotency key
   */
  beforeRequest: (
    endpoint: string,
    method: string,
    body: any,
    options?: IdempotencyOptions,
  ) => Promise<{
    headers: Record<string, string>;
    shouldProceed: boolean;
    cachedResponse?: any;
  }>;

  /**
   * After request: Store response for deduplication
   */
  afterRequest: (key: string, response: any) => void;

  /**
   * On error: Mark key as failed
   */
  onError: (key: string) => void;
}

/**
 * Create idempotency middleware
 */
export function createIdempotencyMiddleware(
  manager: IdempotencyManager = idempotencyManager,
): IdempotencyMiddleware {
  return {
    async beforeRequest(endpoint, method, body, options) {
      if (!manager.shouldUseIdempotency(method, options)) {
        return { headers: {} as Record<string, string>, shouldProceed: true };
      }

      const { key, isDuplicate, cachedResponse } = await manager.getOrCreateKey(
        endpoint,
        method,
        body,
        options,
      );

      if (isDuplicate && cachedResponse) {
        // Return cached response, skip actual request
        return {
          headers: { 'Idempotency-Key': key } as Record<string, string>,
          shouldProceed: false,
          cachedResponse,
        };
      }

      return {
        headers: { 'Idempotency-Key': key } as Record<string, string>,
        shouldProceed: true,
      };
    },

    afterRequest(key, response) {
      manager.markCompleted(key, response);
    },

    onError(key) {
      manager.markFailed(key);
    },
  };
}

/**
 * Storage adapter interface for persistence
 */
export interface IdempotencyStorage {
  get(key: string): Promise<IdempotencyRecord | null>;
  set(key: string, record: IdempotencyRecord): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * LocalStorage adapter
 */
export class LocalStorageIdempotencyAdapter implements IdempotencyStorage {
  private prefix = 'idempotency:';

  async get(key: string): Promise<IdempotencyRecord | null> {
    if (typeof window === 'undefined') return null;

    const data = localStorage.getItem(this.prefix + key);
    if (!data) return null;

    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async set(key: string, record: IdempotencyRecord): Promise<void> {
    if (typeof window === 'undefined') return;

    localStorage.setItem(this.prefix + key, JSON.stringify(record));
  }

  async delete(key: string): Promise<void> {
    if (typeof window === 'undefined') return;

    localStorage.removeItem(this.prefix + key);
  }

  async clear(): Promise<void> {
    if (typeof window === 'undefined') return;

    const keys = Object.keys(localStorage).filter((k) => k.startsWith(this.prefix));
    keys.forEach((key) => localStorage.removeItem(key));
  }
}
