/**
 * Production-Grade Crypto Polyfill
 * 
 * Provides secure, cross-platform UUID and random value generation
 * with proper fallbacks for environments where crypto APIs are limited.
 * 
 * Follows RFC 4122 for UUID v4 generation and uses cryptographically
 * secure random number generation where available.
 * 
 * @author Principal Engineer
 * @since 2026-01-21
 */

/**
 * Browser/Node.js compatibility interface for crypto APIs
 */
interface CryptoCompat {
  randomUUID?: () => string;
  getRandomValues?: (array: Uint8Array) => Uint8Array;
  randomBytes?: (size: number) => Buffer;
}

/**
 * Get the appropriate crypto implementation based on environment
 */
function getCryptoImplementation(): CryptoCompat {
  // Node.js environment
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    return globalThis.crypto as CryptoCompat;
  }
  
  // Browser environment
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto as CryptoCompat;
  }
  
  // Web Worker environment
  if (typeof self !== 'undefined' && self.crypto) {
    return self.crypto as CryptoCompat;
  }
  
  // Node.js crypto module fallback
  try {
    const nodeCrypto = require('crypto');
    return {
      randomUUID: nodeCrypto.randomUUID?.bind(nodeCrypto),
      randomBytes: nodeCrypto.randomBytes?.bind(nodeCrypto),
    };
  } catch {
    // No crypto available
    return {};
  }
}

/**
 * Generate cryptographically secure random bytes
 * @param size Number of bytes to generate
 * @returns Uint8Array with random bytes
 */
export function getSecureRandomBytes(size: number): Uint8Array {
  const crypto = getCryptoImplementation();
  
  // Try crypto.getRandomValues (Browser standard)
  if (crypto.getRandomValues) {
    const buffer = new Uint8Array(size);
    crypto.getRandomValues(buffer);
    return buffer;
  }
  
  // Try Node.js crypto.randomBytes
  if (crypto.randomBytes) {
    const buffer = crypto.randomBytes(size);
    return new Uint8Array(buffer);
  }
  
  // Fallback: Use Math.random (NOT cryptographically secure)
  // This should only happen in very limited environments
  if (process.env.NODE_ENV === 'development') {
    console.warn('[Crypto] Using Math.random fallback - not cryptographically secure');
  }
  
  const buffer = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    buffer[i] = Math.floor(Math.random() * 256);
  }
  return buffer;
}

/**
 * Generate UUID v4 following RFC 4122 specification
 * @returns RFC 4122 compliant UUID v4 string
 */
export function generateUUID(): string {
  const crypto = getCryptoImplementation();
  
  // Try native crypto.randomUUID (Modern browsers and Node.js 16+)
  if (crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Crypto] crypto.randomUUID failed, using fallback:', error);
      }
    }
  }
  
  // RFC 4122 compliant UUID v4 implementation
  const bytes = getSecureRandomBytes(16);
  
  // Set version (4) and variant bits
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10
  
  // Convert to hex string with proper formatting
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32)
  ].join('-');
}

/**
 * Generate random hex string of specified length
 * @param length Number of hex characters (must be even)
 * @returns Hex string
 */
export function generateRandomHex(length: number): string {
  if (length % 2 !== 0) {
    throw new Error('Hex length must be even number');
  }
  
  const bytes = getSecureRandomBytes(length / 2);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate trace ID (32 hex chars) for distributed tracing
 * @returns 128-bit trace ID as hex string
 */
export function generateTraceId(): string {
  return generateRandomHex(32);
}

/**
 * Generate span ID (16 hex chars) for distributed tracing  
 * @returns 64-bit span ID as hex string
 */
export function generateSpanId(): string {
  return generateRandomHex(16);
}

/**
 * Check if secure crypto is available
 * @returns True if cryptographically secure random generation is available
 */
export function isSecureCryptoAvailable(): boolean {
  const crypto = getCryptoImplementation();
  return !!(crypto.getRandomValues || crypto.randomBytes);
}

/**
 * Validate UUID format
 * @param uuid UUID string to validate
 * @returns True if valid UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Production-ready crypto utilities for enterprise applications
 */
export const cryptoUtils = {
  generateUUID,
  generateRandomHex,
  generateTraceId, 
  generateSpanId,
  getSecureRandomBytes,
  isSecureCryptoAvailable,
  isValidUUID,
} as const;