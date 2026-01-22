/**
 * Crypto API Initialization and Validation
 * 
 * Ensures crypto APIs are working correctly before application starts.
 * Critical for production systems that depend on cryptographic security.
 * 
 * @author Principal Engineer
 * @since 2026-01-21
 */

import { devModeCryptoValidation, quickCryptoHealthCheck } from '@/lib/utils/crypto-validator';

/**
 * Initialize and validate crypto APIs
 * Should be called early in application bootstrap
 */
export async function initializeCrypto(): Promise<void> {
  // Quick health check first
  const isHealthy = await quickCryptoHealthCheck();
  
  if (!isHealthy) {
    const errorMessage = 'Crypto API initialization failed - application cannot start safely';
    console.error(`❌ ${errorMessage}`);
    
    // In production, this should be a hard failure
    if (process.env.NODE_ENV === 'production') {
      throw new Error(errorMessage);
    }
  }

  // Detailed validation in development
  await devModeCryptoValidation();

  if (process.env.NODE_ENV === 'development') {
    console.log('🔒 Crypto APIs initialized successfully');
  }
}

/**
 * Crypto readiness check for health endpoints
 */
export async function cryptoReadinessCheck(): Promise<{ 
  ready: boolean; 
  message: string; 
  timestamp: number 
}> {
  const timestamp = Date.now();
  
  try {
    const isReady = await quickCryptoHealthCheck();
    
    return {
      ready: isReady,
      message: isReady ? 'Crypto APIs operational' : 'Crypto APIs failed validation',
      timestamp,
    };
  } catch (error) {
    return {
      ready: false,
      message: `Crypto readiness check failed: ${error}`,
      timestamp,
    };
  }
}