/**
 * API Response Validation Utilities
 *
 * Production-grade type guards and validators for API responses
 * Following 2026 best practices for runtime type safety
 *
 * @module apiValidation
 * @version 1.0.0
 */

/**
 * Type guard for checking if a value is a valid object
 */
export function isObject(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Type guard for checking if a value is a valid array
 */
export function isArray(value: unknown): value is Array<any> {
  return Array.isArray(value);
}

/**
 * Validates paginated list response structure
 */
export function isPaginatedResponse<T = any>(
  value: unknown
): value is { items: T[]; total: number; page: number; limit: number } {
  if (!isObject(value)) return false;

  const obj = value as any;

  return (
    isArray(obj.items) &&
    typeof obj.total === 'number' &&
    typeof obj.page === 'number' &&
    typeof obj.limit === 'number'
  );
}

/**
 * Validates and normalizes a paginated response
 * Returns a safe default if validation fails
 */
export function normalizePaginatedResponse<T = any>(
  value: unknown,
  defaultPage = 1,
  defaultLimit = 100
): { items: T[]; total: number; page: number; limit: number } {
  if (isPaginatedResponse<T>(value)) {
    return value;
  }

  // Return safe default
  return {
    items: [],
    total: 0,
    page: defaultPage,
    limit: defaultLimit,
  };
}

/**
 * Validates API success response wrapper
 */
export function isSuccessResponse<T = any>(
  value: unknown
): value is { success: true; data: T; metadata: { timestamp: string } } {
  if (!isObject(value)) return false;

  const obj = value as any;

  return (
    obj.success === true &&
    obj.data !== undefined &&
    isObject(obj.metadata) &&
    typeof obj.metadata.timestamp === 'string'
  );
}

/**
 * Validates API error response wrapper
 */
export function isErrorResponse(
  value: unknown
): value is {
  success: false;
  error: { code: string; message: string; details?: any };
  metadata: { timestamp: string };
} {
  if (!isObject(value)) return false;

  const obj = value as any;

  return (
    obj.success === false &&
    isObject(obj.error) &&
    typeof obj.error.code === 'string' &&
    typeof obj.error.message === 'string' &&
    isObject(obj.metadata) &&
    typeof obj.metadata.timestamp === 'string'
  );
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T = any>(json: string, fallback: T): T {
  try {
    const parsed = JSON.parse(json);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Validates that a number is within a valid range
 */
export function isNumberInRange(
  value: unknown,
  min: number,
  max: number
): value is number {
  return typeof value === 'number' && value >= min && value <= max;
}

/**
 * Validates that a string is not empty
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Creates a type-safe validator for specific object shapes
 */
export function createValidator<T>(
  validator: (value: unknown) => boolean
): (value: unknown) => value is T {
  return validator as (value: unknown) => value is T;
}

/**
 * Validates cost record structure
 */
export function isCostRecord(value: unknown): value is {
  id: string;
  bomItemId: string;
  userId: string;
  totalCost: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
} {
  if (!isObject(value)) return false;

  const obj = value as any;

  return (
    isNonEmptyString(obj.id) &&
    isNonEmptyString(obj.bomItemId) &&
    isNonEmptyString(obj.userId) &&
    typeof obj.totalCost === 'number' &&
    typeof obj.isActive === 'boolean' &&
    isNonEmptyString(obj.createdAt) &&
    isNonEmptyString(obj.updatedAt)
  );
}
