/**
 * Application Configuration
 *
 * Centralized configuration management for environment-specific settings
 */

export const config = {
  // API Configuration
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:4000/api/v1',
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
  },

  // Authentication Configuration
  auth: {
    tokenKey: 'accessToken',
    refreshTokenKey: 'refreshToken',
    tokenRefreshThreshold: 5 * 60 * 1000, // 5 minutes before expiry
  },

  // Feature Flags
  features: {
    enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
    enableDebugMode: process.env.NODE_ENV === 'development',
  },

  // React Query Configuration
  reactQuery: {
    defaultStaleTime: 5 * 60 * 1000, // 5 minutes
    defaultCacheTime: 10 * 60 * 1000, // 10 minutes
    retryCount: 3,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  },

  // App Configuration
  app: {
    name: 'Mithran',
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  },
};

export const isProduction = config.app.environment === 'production';
export const isDevelopment = config.app.environment === 'development';
export const isTest = config.app.environment === 'test';
