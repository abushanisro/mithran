/**
 * Production-Grade UUID Validation Middleware for API Client
 * 
 * Automatically validates and sanitizes UUID parameters in API requests
 * to prevent UUID validation errors at the backend level.
 * 
 * Features:
 * - Automatic UUID detection in request paths and body
 * - Pre-flight validation with descriptive error messages  
 * - Automatic sanitization and normalization
 * - Request/response interception for debugging
 * - Production-safe error handling
 * 
 * @author Principal Engineer
 * @since 2026-01-21
 */

import { RequestInterceptor, ResponseInterceptor, RequestConfig } from './client';
import { uuidValidator, type UUIDValidationResult } from '@/lib/utils/uuid-validator';

interface UUIDValidationError extends Error {
  code: 'UUID_VALIDATION_ERROR';
  field: string;
  originalValue: any;
  validationDetails: UUIDValidationResult;
}



/**
 * Common UUID field names in request bodies
 */
const UUID_FIELD_NAMES = [
  'id', 'userId', 'projectId', 'bomId', 'bomItemId', 'vendorId',
  'processId', 'processRouteId', 'materialId', 'parentId', 'parentItemId',
  'evaluationId', 'supplierId', 'itemId', 'processCalculatorId', 'mhrId', 'lsrId',
  'facilityId', 'facilityRateId', 'facilityCategoryId', 'facilityTypeId',
  'supplierLocationId', 'shiftPatternId'
];

/**
 * UUID array field names in request bodies
 */
const UUID_ARRAY_FIELD_NAMES = [
  'bomItemIds', 'vendorIds', 'itemIds', 'supplierIds', 'processIds'
];

/**
 * Extract potential UUID values from a request path
 */
function extractUUIDsFromPath(path: string): Array<{ value: string; position: number }> {
  const uuids: Array<{ value: string; position: number }> = [];
  const pathSegments = path.split('/');

  pathSegments.forEach((segment, index) => {
    if (segment && uuidValidator.looksLike(segment)) {
      uuids.push({
        value: segment,
        position: index
      });
    }
  });

  return uuids;
}

/**
 * Extract UUID fields from query parameters
 */
function extractUUIDsFromQuery(url: string): Array<{ field: string; value: any }> {
  const uuids: Array<{ field: string; value: any }> = [];

  try {
    const urlObj = new URL(url.startsWith('http') ? url : `http://example.com${url}`);
    const params = urlObj.searchParams;

    // Check each query parameter
    for (const [key, value] of params.entries()) {
      if (key.toLowerCase().includes('id') && value && uuidValidator.looksLike(value)) {
        uuids.push({
          field: `query.${key}`,
          value: value
        });
      }
    }
  } catch (error) {
    // Ignore URL parsing errors for non-standard URLs
  }

  return uuids;
}

/**
 * Extract UUID fields from request body
 */
function extractUUIDsFromBody(body: any): Array<{ field: string; value: any }> {
  const uuids: Array<{ field: string; value: any }> = [];

  if (!body || typeof body !== 'object') {
    return uuids;
  }

  // Check direct UUID fields
  UUID_FIELD_NAMES.forEach(fieldName => {
    if (fieldName in body && body[fieldName] != null && body[fieldName] !== '' && body[fieldName] !== undefined) {
      uuids.push({
        field: fieldName,
        value: body[fieldName]
      });
    }
  });

  // Check UUID array fields
  UUID_ARRAY_FIELD_NAMES.forEach(fieldName => {
    if (fieldName in body && Array.isArray(body[fieldName])) {
      const arrayValues = body[fieldName] as any[];
      arrayValues.forEach((value, index) => {
        if (value != null && value !== '' && value !== undefined) {
          uuids.push({
            field: `${fieldName}[${index}]`,
            value: value
          });
        }
      });
    }
  });

  // Recursively check nested objects
  Object.entries(body).forEach(([key, value]) => {
    if (key.toLowerCase().includes('id') && value != null && value !== '' && value !== undefined) {
      // Skip array fields as they are handled separately above
      if (!UUID_ARRAY_FIELD_NAMES.includes(key) && !Array.isArray(value)) {
        uuids.push({
          field: key,
          value: value
        });
      }
    }

    // Check arrays for UUID values
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === 'string' && item.trim() !== '' && uuidValidator.looksLike(item)) {
          uuids.push({
            field: `${key}[${index}]`,
            value: item
          });
        }
      });
    }
  });

  return uuids;
}

/**
 * Create a descriptive UUID validation error
 */
function createUUIDError(field: string, originalValue: any, validation: UUIDValidationResult): UUIDValidationError {
  const error = new Error(`UUID validation failed for ${field}: ${validation.errors.join(', ')}`) as UUIDValidationError;
  error.name = 'UUIDValidationError';
  error.code = 'UUID_VALIDATION_ERROR';
  error.field = field;
  error.originalValue = originalValue;
  error.validationDetails = validation;

  return error;
}

/**
 * Request interceptor that validates and sanitizes UUIDs
 */
export const uuidRequestInterceptor: RequestInterceptor = async (config: RequestConfig) => {
  try {
    const endpoint = config.endpoint || '';

    // Extract and validate UUIDs from path
    const pathUUIDs = extractUUIDsFromPath(endpoint);
    for (const { value, position } of pathUUIDs) {
      const validation = uuidValidator.validate(value, `Path parameter at position ${position}`);

      if (!validation.isValid) {
        throw createUUIDError(`path[${position}]`, value, validation);
      }

      // Replace with sanitized UUID if normalization occurred
      if (validation.sanitized && validation.sanitized !== value && config.endpoint) {
        config.endpoint = config.endpoint.replace(value, validation.sanitized);
        // Also update the full URL
        config.url = config.url.replace(value, validation.sanitized);

        if (process.env.NODE_ENV === 'development') {
          console.warn(`[UUID Middleware] Normalized path UUID: ${value} → ${validation.sanitized}`);
        }
      }
    }

    // Extract and validate UUIDs from query parameters
    const queryUUIDs = extractUUIDsFromQuery(config.url);
    let modifiedUrl = config.url;

    for (const { field, value } of queryUUIDs) {
      const validation = uuidValidator.validate(value, field);

      if (!validation.isValid) {
        throw createUUIDError(field, value, validation);
      }

      // Replace with sanitized UUID if normalization occurred
      if (validation.sanitized && validation.sanitized !== value) {
        modifiedUrl = modifiedUrl.replace(
          `${field.replace('query.', '')}=${encodeURIComponent(value)}`,
          `${field.replace('query.', '')}=${encodeURIComponent(validation.sanitized)}`
        );

        if (process.env.NODE_ENV === 'development') {
          console.warn(`[UUID Middleware] Normalized query UUID: ${field} ${value} → ${validation.sanitized}`);
        }
      }
    }

    // Update config with modified URL if changes were made
    if (modifiedUrl !== config.url) {
      config.url = modifiedUrl;
    }

    // Extract and validate UUIDs from body
    const bodyUUIDs = extractUUIDsFromBody(config.body);
    let modifiedBody = config.body;

    for (const { field, value } of bodyUUIDs) {
      // Handle array fields
      if (field.includes('[') && field.includes(']')) {
        const parts = field.split('[');
        if (parts.length >= 2) {
          const arrayField = parts[0];
          const indexStr = parts[1]?.replace(']', '');
          const index = indexStr ? parseInt(indexStr) : -1;

          const bodyObj = modifiedBody as Record<string, any>;
          if (arrayField && index >= 0 && Array.isArray(bodyObj[arrayField])) {
            // Skip validation for empty/null values in arrays
            if (value === '' || value === null || value === undefined) {
              continue; // Skip empty optional fields in arrays
            }
            
            const validation = uuidValidator.validate(value, field);

            if (!validation.isValid) {
              throw createUUIDError(field, value, validation);
            }

            if (validation.sanitized && validation.sanitized !== value) {
              if (!modifiedBody || typeof modifiedBody !== 'object') {
                modifiedBody = {};
              }
              const currentBody = modifiedBody as Record<string, any>;
              if (!currentBody[arrayField]) {
                currentBody[arrayField] = [...(config.body as Record<string, any>)[arrayField]];
              }
              currentBody[arrayField][index] = validation.sanitized;

              if (process.env.NODE_ENV === 'development') {
                console.warn(`[UUID Middleware] Normalized body UUID: ${field} ${value} → ${validation.sanitized}`);
              }
            }
          }
        }
      } else {
        // Handle direct fields - skip validation for empty/null values
        if (value === '' || value === null || value === undefined) {
          continue; // Skip empty optional fields
        }
        
        // Skip array fields as they should be handled by array logic above
        if (UUID_ARRAY_FIELD_NAMES.includes(field) && Array.isArray(value)) {
          continue;
        }
        
        const validation = uuidValidator.validate(value, field);

        if (!validation.isValid) {
          throw createUUIDError(field, value, validation);
        }

        if (validation.sanitized && validation.sanitized !== value) {
          if (!modifiedBody || typeof modifiedBody !== 'object') {
            modifiedBody = {};
          }
          modifiedBody = { ...modifiedBody, [field]: validation.sanitized };

          if (process.env.NODE_ENV === 'development') {
            console.warn(`[UUID Middleware] Normalized body UUID: ${field} ${value} → ${validation.sanitized}`);
          }
        }
      }
    }

    // Update config with modified body if changes were made
    if (modifiedBody !== config.body) {
      config.body = modifiedBody;
    }

    return config;
  } catch (error) {
    // Re-throw UUID validation errors as-is for proper handling
    if (error instanceof Error && 'code' in error && error.code === 'UUID_VALIDATION_ERROR') {
      throw error;
    }

    // Log unexpected errors but don't block the request
    if (process.env.NODE_ENV === 'development') {
      console.error('[UUID Middleware] Unexpected error:', error);
    }

    return config;
  }
};

/**
 * Response interceptor that provides better UUID error messages
 */
export const uuidResponseInterceptor: ResponseInterceptor = (response: any) => {
  // Check if the response contains an error related to UUID validation from backend
  if (response && !response.success && response.error && response.error.message) {
    const error = response.error;
    const message = error.message.toLowerCase();

    // Common UUID validation error patterns from backend
    const uuidErrorPatterns = [
      /must be.*uuid/,
      /invalid.*uuid/,
      /uuid.*format/,
      /guid.*format/,
      /id.*must be.*valid/
    ];

    const isUUIDError = uuidErrorPatterns.some(pattern => pattern.test(message));

    if (isUUIDError) {
      // Enhance the error message with helpful information
      const enhancedMessage = `UUID Validation Error: ${error.message}. Please ensure all ID fields are valid UUIDs in the format: 12345678-1234-5678-9012-123456789012`;

      return {
        ...response,
        error: {
          ...error,
          message: enhancedMessage,
          code: 'UUID_VALIDATION_ERROR',
          originalMessage: error.message
        }
      };
    }
  }

  return response;
};

/**
 * Development-mode UUID validation diagnostics
 */
export function logUUIDValidationDetails(config: any): void {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  console.group('🔍 UUID Validation Details');

  const pathUUIDs = extractUUIDsFromPath(config.endpoint);
  if (pathUUIDs.length > 0) {
    console.log('Path UUIDs:', pathUUIDs);
  }

  const queryUUIDs = extractUUIDsFromQuery(config.url);
  if (queryUUIDs.length > 0) {
    console.log('Query UUIDs:', queryUUIDs);
  }

  const bodyUUIDs = extractUUIDsFromBody(config.body);
  if (bodyUUIDs.length > 0) {
    console.log('Body UUIDs:', bodyUUIDs);
  }

  console.groupEnd();
}