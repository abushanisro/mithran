/**
 * API Client Initialization
 */

import { apiClient } from './client';
import { setupInterceptors } from './interceptors';

export function initializeApiClient() {
  // Setup request/response interceptors for token management, logging, etc.
  setupInterceptors(apiClient);
}
