/**
 * API Interceptors
 *
 * Request and response interceptors for logging, monitoring, and analytics
 */

import { isDevelopment } from '../config';

export interface RequestConfig {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: any;
}

/**
 * Request logger interceptor
 * Logs all outgoing requests in development mode
 */
export const requestLoggerInterceptor = (config: RequestConfig): RequestConfig => {
  if (isDevelopment) {
    console.log(`[API Request] ${config.method} ${config.url}`, {
      body: config.body,
      headers: config.headers,
    });
  }
  return config;
};

/**
 * Response logger interceptor
 * Logs all incoming responses in development mode
 */
export const responseLoggerInterceptor = (response: any): any => {
  if (isDevelopment) {
    console.log('[API Response]', response);
  }
  return response;
};


/**
 * Add correlation ID for request tracing
 */
export const correlationIdInterceptor = (config: RequestConfig): RequestConfig => {
  const correlationId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  config.headers['X-Correlation-ID'] = correlationId;

  return config;
};

/**
 * Add custom headers
 */
export const customHeadersInterceptor = (config: RequestConfig): RequestConfig => {
  config.headers['X-Client-Version'] = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';
  config.headers['X-Client-Platform'] = 'web';

  return config;
};

/**
 * Setup all interceptors on the API client
 */
export const setupInterceptors = (apiClient: any) => {
  apiClient.addRequestInterceptor(requestLoggerInterceptor);
  apiClient.addRequestInterceptor(correlationIdInterceptor);
  apiClient.addRequestInterceptor(customHeadersInterceptor);
  apiClient.addResponseInterceptor(responseLoggerInterceptor);
};
