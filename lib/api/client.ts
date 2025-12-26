/**
 * API Client for Mithran Microservices
 *
 * Production-grade API client with:
 * - Automatic retry with exponential backoff
 * - Request/response logging and monitoring
 * - Token refresh mechanism
 * - Request deduplication
 * - Proper error handling
 */

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
  cache?: RequestCache;
  retry?: boolean;
  timeout?: number;
};

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    timestamp: string;
    requestId?: string;
  };
};

type RequestInterceptor = (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
type ResponseInterceptor = (response: any) => any | Promise<any>;

type RequestConfig = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: any;
};

class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private pendingRequests = new Map<string, Promise<any>>();

  constructor() {
    this.baseUrl =
      process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:4000/api/v1';
    this.loadTokens();
  }

  private loadTokens() {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('accessToken');
      this.refreshToken = localStorage.getItem('refreshToken');
    }
  }

  setAccessToken(token: string | null) {
    this.accessToken = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('accessToken', token);
      } else {
        localStorage.removeItem('accessToken');
      }
    }
  }

  setRefreshToken(token: string | null) {
    this.refreshToken = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('refreshToken', token);
      } else {
        localStorage.removeItem('refreshToken');
      }
    }
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  addRequestInterceptor(interceptor: RequestInterceptor) {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: ResponseInterceptor) {
    this.responseInterceptors.push(interceptor);
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        this.setAccessToken(data.data.accessToken);
        if (data.data.refreshToken) {
          this.setRefreshToken(data.data.refreshToken);
        }
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getCacheKey(endpoint: string, options: RequestOptions): string {
    return `${options.method || 'GET'}:${endpoint}:${JSON.stringify(options.body || {})}`;
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const {
      method = 'GET',
      body,
      headers = {},
      cache,
      retry = true,
      timeout = 30000,
    } = options;

    const url = `${this.baseUrl}${endpoint}`;

    // Request deduplication for GET requests
    if (method === 'GET') {
      const cacheKey = this.getCacheKey(endpoint, options);
      const pendingRequest = this.pendingRequests.get(cacheKey);
      if (pendingRequest) {
        return pendingRequest;
      }
    }

    const executeRequest = async (attemptNumber = 1): Promise<T> => {
      const token = this.getAccessToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      if (body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }

      // Run request interceptors
      let requestConfig: RequestConfig = { url, method, headers, body };
      for (const interceptor of this.requestInterceptors) {
        requestConfig = await interceptor(requestConfig);
      }

      const config: RequestInit = {
        method: requestConfig.method,
        headers: requestConfig.headers,
        cache: cache || (method === 'GET' ? 'default' : 'no-store'),
        signal: AbortSignal.timeout(timeout),
      };

      if (requestConfig.body) {
        config.body = JSON.stringify(requestConfig.body);
      }

      try {
        const startTime = Date.now();
        const response = await fetch(requestConfig.url, config);
        const responseTime = Date.now() - startTime;

        let data: ApiResponse<T>;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          data = {
            success: response.ok,
            data: (await response.text()) as any,
            metadata: { timestamp: new Date().toISOString() },
          };
        }

        // Run response interceptors
        let responseData = data;
        for (const interceptor of this.responseInterceptors) {
          responseData = await interceptor(responseData);
        }

        // Log request
        if (process.env.NODE_ENV === 'development') {
          console.log(`[API] ${method} ${endpoint}`, {
            status: response.status,
            responseTime: `${responseTime}ms`,
            attempt: attemptNumber,
          });
        }

        // Handle 401 Unauthorized - try to refresh token
        if (response.status === 401 && retry && attemptNumber === 1) {
          const refreshed = await this.refreshAccessToken();
          if (refreshed) {
            return executeRequest(attemptNumber + 1);
          }
          // Token refresh failed - clear tokens and let auth provider handle redirect
          this.setAccessToken(null);
          this.setRefreshToken(null);
        }

        if (!response.ok) {
          throw new ApiError(
            data.error?.message || 'Request failed',
            response.status,
            data.error?.code,
            data.error?.details,
          );
        }

        if (!data.success) {
          throw new ApiError(
            data.error?.message || 'Request failed',
            response.status,
            data.error?.code,
          );
        }

        return responseData.data as T;
      } catch (error) {
        if (error instanceof ApiError) {
          // Retry logic with exponential backoff for 5xx errors
          if (
            retry &&
            error.statusCode >= 500 &&
            attemptNumber < 3
          ) {
            const backoffMs = Math.min(1000 * Math.pow(2, attemptNumber - 1), 10000);
            console.warn(
              `[API] Request failed with ${error.statusCode}, retrying in ${backoffMs}ms... (attempt ${attemptNumber}/3)`,
            );
            await this.sleep(backoffMs);
            return executeRequest(attemptNumber + 1);
          }
          throw error;
        }

        if (error instanceof TypeError) {
          throw new ApiError('Network error - please check your connection', 0);
        }

        if (error instanceof DOMException && error.name === 'TimeoutError') {
          throw new ApiError('Request timeout', 408);
        }

        throw new ApiError('An unexpected error occurred', 500);
      }
    };

    const requestPromise = executeRequest();

    // Cache the promise for GET requests
    if (method === 'GET') {
      const cacheKey = this.getCacheKey(endpoint, options);
      this.pendingRequests.set(cacheKey, requestPromise);
      requestPromise.finally(() => {
        this.pendingRequests.delete(cacheKey);
      });
    }

    return requestPromise;
  }

  get<T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method'>) {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  put<T>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method'>) {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  patch<T>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method'>) {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body });
  }

  delete<T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
    public details?: any,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  isUnauthorized() {
    return this.statusCode === 401;
  }

  isForbidden() {
    return this.statusCode === 403;
  }

  isNotFound() {
    return this.statusCode === 404;
  }

  isValidationError() {
    return this.statusCode === 400;
  }
}

export const apiClient = new ApiClient();
