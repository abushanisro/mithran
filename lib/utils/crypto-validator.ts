/**
 * Production-Grade Crypto API Validation
 * 
 * Validates crypto implementation and provides runtime compatibility checks.
 * Essential for enterprise applications that require cryptographic security
 * across diverse deployment environments.
 * 
 * @author Principal Engineer
 * @since 2026-01-21
 */

import { cryptoUtils, isSecureCryptoAvailable, isValidUUID } from './crypto-polyfill';

export interface CryptoValidationResult {
  isValid: boolean;
  secureRandom: boolean;
  environment: 'browser' | 'node' | 'webworker' | 'unknown';
  features: {
    randomUUID: boolean;
    getRandomValues: boolean;
    subtle: boolean;
    nodeRandom: boolean;
  };
  performance: {
    uuidGeneration: number; // ms per 1000 UUIDs
    randomBytes: number; // ms per 1000 random byte arrays
  };
  errors: string[];
  warnings: string[];
}

/**
 * Detect the current runtime environment
 */
function detectEnvironment(): CryptoValidationResult['environment'] {
  if (typeof window !== 'undefined') return 'browser';
  if (typeof self !== 'undefined' && typeof importScripts === 'function') return 'webworker';
  if (typeof global !== 'undefined' || typeof process !== 'undefined') return 'node';
  return 'unknown';
}

/**
 * Test crypto feature availability
 */
function testCryptoFeatures(): CryptoValidationResult['features'] {
  const features = {
    randomUUID: false,
    getRandomValues: false,
    subtle: false,
    nodeRandom: false,
  };

  // Test native crypto.randomUUID
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      crypto.randomUUID();
      features.randomUUID = true;
    }
  } catch {
    // randomUUID not available or failed
  }

  // Test crypto.getRandomValues
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const buffer = new Uint8Array(1);
      crypto.getRandomValues(buffer);
      features.getRandomValues = true;
    }
  } catch {
    // getRandomValues not available or failed
  }

  // Test crypto.subtle
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      features.subtle = true;
    }
  } catch {
    // subtle crypto not available
  }

  // Test Node.js crypto
  try {
    const nodeCrypto = require('crypto');
    if (nodeCrypto && typeof nodeCrypto.randomBytes === 'function') {
      nodeCrypto.randomBytes(1);
      features.nodeRandom = true;
    }
  } catch {
    // Node.js crypto not available
  }

  return features;
}

/**
 * Performance benchmark for crypto operations
 */
async function benchmarkPerformance(): Promise<CryptoValidationResult['performance']> {
  const iterations = 1000;
  
  // Benchmark UUID generation
  const uuidStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    cryptoUtils.generateUUID();
  }
  const uuidTime = performance.now() - uuidStart;

  // Benchmark random bytes generation
  const bytesStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    cryptoUtils.getSecureRandomBytes(16);
  }
  const bytesTime = performance.now() - bytesStart;

  return {
    uuidGeneration: uuidTime,
    randomBytes: bytesTime,
  };
}

/**
 * Validate UUID format and uniqueness
 */
function validateUUIDs(): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const uuidSet = new Set<string>();
  const testCount = 1000;

  // Generate test UUIDs
  for (let i = 0; i < testCount; i++) {
    try {
      const uuid = cryptoUtils.generateUUID();
      
      // Validate format
      if (!isValidUUID(uuid)) {
        errors.push(`Generated UUID has invalid format: ${uuid}`);
        break;
      }

      // Check for duplicates (extremely unlikely with proper UUID v4)
      if (uuidSet.has(uuid)) {
        errors.push(`Duplicate UUID generated: ${uuid}`);
        break;
      }
      
      uuidSet.add(uuid);
    } catch (error) {
      errors.push(`UUID generation failed: ${error}`);
      break;
    }
  }

  // Check if we're using secure random generation
  if (!isSecureCryptoAvailable()) {
    warnings.push('Cryptographically secure random generation not available - using Math.random() fallback');
  }

  return { errors, warnings };
}

/**
 * Validate trace ID and span ID generation
 */
function validateTracing(): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Test trace ID generation (32 hex chars)
    const traceId = cryptoUtils.generateTraceId();
    if (!/^[0-9a-f]{32}$/i.test(traceId)) {
      errors.push(`Invalid trace ID format: ${traceId}`);
    }

    // Test span ID generation (16 hex chars)
    const spanId = cryptoUtils.generateSpanId();
    if (!/^[0-9a-f]{16}$/i.test(spanId)) {
      errors.push(`Invalid span ID format: ${spanId}`);
    }

    // Test uniqueness
    const traceIds = new Set();
    const spanIds = new Set();
    
    for (let i = 0; i < 100; i++) {
      const tid = cryptoUtils.generateTraceId();
      const sid = cryptoUtils.generateSpanId();
      
      if (traceIds.has(tid)) {
        warnings.push(`Duplicate trace ID detected: ${tid}`);
      }
      if (spanIds.has(sid)) {
        warnings.push(`Duplicate span ID detected: ${sid}`);
      }
      
      traceIds.add(tid);
      spanIds.add(sid);
    }
  } catch (error) {
    errors.push(`Tracing ID generation failed: ${error}`);
  }

  return { errors, warnings };
}

/**
 * Comprehensive crypto validation for production environments
 */
export async function validateCryptoImplementation(): Promise<CryptoValidationResult> {
  const environment = detectEnvironment();
  const features = testCryptoFeatures();
  const secureRandom = isSecureCryptoAvailable();
  
  // Collect all validation results
  const uuidValidation = validateUUIDs();
  const tracingValidation = validateTracing();
  
  const errors = [...uuidValidation.errors, ...tracingValidation.errors];
  const warnings = [...uuidValidation.warnings, ...tracingValidation.warnings];

  // Performance benchmarks (only if no critical errors)
  let performance = { uuidGeneration: 0, randomBytes: 0 };
  if (errors.length === 0) {
    try {
      performance = await benchmarkPerformance();
    } catch (error) {
      warnings.push(`Performance benchmark failed: ${error}`);
    }
  }

  // Add environment-specific warnings
  if (environment === 'unknown') {
    warnings.push('Unknown runtime environment detected');
  }

  if (!secureRandom) {
    warnings.push('Using non-cryptographic random number generation');
  }

  const isValid = errors.length === 0 && secureRandom;

  return {
    isValid,
    secureRandom,
    environment,
    features,
    performance,
    errors,
    warnings,
  };
}

/**
 * Quick crypto health check for startup validation
 */
export async function quickCryptoHealthCheck(): Promise<boolean> {
  try {
    // Test basic UUID generation
    const uuid = cryptoUtils.generateUUID();
    if (!isValidUUID(uuid)) {
      return false;
    }

    // Test basic random bytes
    const bytes = cryptoUtils.getSecureRandomBytes(16);
    if (bytes.length !== 16) {
      return false;
    }

    // Test tracing IDs
    const traceId = cryptoUtils.generateTraceId();
    const spanId = cryptoUtils.generateSpanId();
    
    if (!/^[0-9a-f]{32}$/i.test(traceId) || !/^[0-9a-f]{16}$/i.test(spanId)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Development-mode crypto validation with detailed logging
 */
export async function devModeCryptoValidation(): Promise<void> {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  console.group('🔒 Crypto API Validation');
  
  const result = await validateCryptoImplementation();
  
  console.log('Environment:', result.environment);
  console.log('Secure Random Available:', result.secureRandom);
  console.log('Features:', result.features);
  
  if (result.errors.length > 0) {
    console.error('❌ Crypto Validation Errors:');
    result.errors.forEach(error => console.error(`  - ${error}`));
  }
  
  if (result.warnings.length > 0) {
    console.warn('⚠️ Crypto Validation Warnings:');
    result.warnings.forEach(warning => console.warn(`  - ${warning}`));
  }
  
  if (result.isValid) {
    console.log('✅ Crypto implementation is production-ready');
    console.log(`📊 Performance: UUID=${result.performance.uuidGeneration.toFixed(2)}ms/1k, Bytes=${result.performance.randomBytes.toFixed(2)}ms/1k`);
  } else {
    console.error('❌ Crypto implementation has issues');
  }
  
  console.groupEnd();
}