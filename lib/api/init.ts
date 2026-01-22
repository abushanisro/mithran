/**
 * API Client Initialization
 */

import { apiClient } from './client';
import { setupInterceptors } from './interceptors';
import { initializeAuthInterceptor } from './auth-interceptor';
import { uuidRequestInterceptor, uuidResponseInterceptor } from './uuid-middleware';

export function initializeApiClient() {
  // Setup UUID validation middleware (first to catch UUID issues early)
  apiClient.addRequestInterceptor(uuidRequestInterceptor);
  apiClient.addResponseInterceptor(uuidResponseInterceptor);

  // Setup request/response interceptors for token management, logging, etc.
  setupInterceptors(apiClient);

  // Setup authentication error handling (production-grade global auth handler)
  initializeAuthInterceptor();

  if (process.env.NODE_ENV === 'development') {
    console.log('✅ API Client initialized with UUID validation middleware');
  }
}
