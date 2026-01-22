/**
 * Production-Grade UUID Validation and Sanitization
 * 
 * Provides comprehensive UUID validation, sanitization, and transformation
 * utilities for enterprise applications requiring strict data integrity.
 * 
 * Features:
 * - RFC 4122 compliant UUID validation
 * - Automatic format detection and correction
 * - Type-safe validation with detailed error reporting
 * - Batch validation for arrays of UUIDs
 * - Sanitization and normalization
 * 
 * @author Principal Engineer
 * @since 2026-01-21
 */

import { isValidUUID } from './crypto-polyfill';

export interface UUIDValidationResult {
  isValid: boolean;
  sanitized?: string;
  errors: string[];
  warnings: string[];
  originalValue: any;
}

export interface UUIDArrayValidationResult {
  validUUIDs: string[];
  invalidValues: any[];
  errors: string[];
  warnings: string[];
  totalCount: number;
  validCount: number;
}

/**
 * UUID Format Patterns for detection and validation
 */
const UUID_PATTERNS = {
  // Standard UUID format: 8-4-4-4-12
  standard: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  
  // Compact UUID format (no hyphens): 32 hex characters
  compact: /^[0-9a-f]{32}$/i,
  
  // Microsoft GUID format: {8-4-4-4-12}
  guid: /^\\{[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\}$/i,
  
  // URN format: urn:uuid:8-4-4-4-12
  urn: /^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
};

/**
 * Sanitize and normalize a UUID string
 * @param value Raw UUID value
 * @returns Normalized UUID string or null if invalid
 */
function sanitizeUUID(value: any): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  // Remove whitespace and convert to lowercase
  const cleaned = value.trim().toLowerCase();
  
  if (!cleaned) {
    return null;
  }

  // Check standard format first
  if (UUID_PATTERNS.standard.test(cleaned)) {
    return cleaned;
  }

  // Try to convert compact format to standard
  if (UUID_PATTERNS.compact.test(cleaned)) {
    return [
      cleaned.slice(0, 8),
      cleaned.slice(8, 12),
      cleaned.slice(12, 16),
      cleaned.slice(16, 20),
      cleaned.slice(20, 32)
    ].join('-');
  }

  // Try to extract from GUID format
  if (UUID_PATTERNS.guid.test(cleaned)) {
    return cleaned.slice(1, -1); // Remove { and }
  }

  // Try to extract from URN format
  if (UUID_PATTERNS.urn.test(cleaned)) {
    return cleaned.slice(9); // Remove 'urn:uuid:'
  }

  return null;
}

/**
 * Validate a single UUID value with detailed error reporting
 * @param value Value to validate
 * @param fieldName Optional field name for error messages
 * @returns Detailed validation result
 */
export function validateUUID(value: any, fieldName = 'UUID'): UUIDValidationResult {
  const result: UUIDValidationResult = {
    isValid: false,
    errors: [],
    warnings: [],
    originalValue: value,
  };

  // Check for null/undefined
  if (value === null || value === undefined) {
    result.errors.push(`${fieldName} is required`);
    return result;
  }

  // Check for non-string types
  if (typeof value !== 'string') {
    result.errors.push(`${fieldName} must be a string, got ${typeof value}`);
    return result;
  }

  // Check for empty string - treat as optional field for most UUID fields
  if (!value.trim()) {
    result.isValid = true; // Empty string is valid for optional UUID fields
    result.warnings.push(`${fieldName} is empty (optional)`);
    return result;
  }

  // Attempt sanitization
  const sanitized = sanitizeUUID(value);
  
  if (!sanitized) {
    result.errors.push(`${fieldName} is not a valid UUID format`);
    return result;
  }

  // Validate sanitized UUID
  if (!isValidUUID(sanitized)) {
    result.errors.push(`${fieldName} failed RFC 4122 validation`);
    return result;
  }

  // Success case
  result.isValid = true;
  result.sanitized = sanitized;

  // Add warning if sanitization was needed
  if (value.trim().toLowerCase() !== sanitized) {
    result.warnings.push(`${fieldName} was automatically normalized`);
  }

  return result;
}

/**
 * Validate an array of UUIDs with batch processing
 * @param values Array of values to validate
 * @param fieldName Optional field name for error messages
 * @returns Batch validation result
 */
export function validateUUIDArray(values: any[], fieldName = 'UUID array'): UUIDArrayValidationResult {
  const result: UUIDArrayValidationResult = {
    validUUIDs: [],
    invalidValues: [],
    errors: [],
    warnings: [],
    totalCount: values.length,
    validCount: 0,
  };

  if (!Array.isArray(values)) {
    result.errors.push(`${fieldName} must be an array`);
    return result;
  }

  if (values.length === 0) {
    result.warnings.push(`${fieldName} is empty`);
    return result;
  }

  // Process each value
  values.forEach((value, index) => {
    const validation = validateUUID(value, `${fieldName}[${index}]`);
    
    if (validation.isValid && validation.sanitized) {
      result.validUUIDs.push(validation.sanitized);
      result.validCount++;
      
      // Add normalization warnings
      if (validation.warnings.length > 0) {
        result.warnings.push(...validation.warnings);
      }
    } else {
      result.invalidValues.push({ index, value, errors: validation.errors });
      result.errors.push(...validation.errors);
    }
  });

  return result;
}

/**
 * Ensure a value is a valid UUID, throwing descriptive error if not
 * @param value Value to validate
 * @param fieldName Field name for error messages
 * @returns Valid, sanitized UUID
 * @throws Error with descriptive message if invalid
 */
export function assertValidUUID(value: any, fieldName = 'UUID'): string {
  const validation = validateUUID(value, fieldName);
  
  if (!validation.isValid) {
    const errorMessage = `Invalid ${fieldName}: ${validation.errors.join(', ')}`;
    throw new Error(errorMessage);
  }
  
  return validation.sanitized!;
}

/**
 * Ensure an array contains only valid UUIDs, throwing error if not
 * @param values Array to validate
 * @param fieldName Field name for error messages
 * @returns Array of valid, sanitized UUIDs
 * @throws Error with descriptive message if any invalid
 */
export function assertValidUUIDArray(values: any[], fieldName = 'UUID array'): string[] {
  const validation = validateUUIDArray(values, fieldName);
  
  if (validation.errors.length > 0) {
    const errorMessage = `Invalid ${fieldName}: ${validation.errors.join(', ')}`;
    throw new Error(errorMessage);
  }
  
  return validation.validUUIDs;
}

/**
 * Safe UUID validation that returns the original value if valid, null if not
 * @param value Value to validate
 * @returns Valid UUID or null
 */
export function safeValidateUUID(value: any): string | null {
  try {
    const validation = validateUUID(value);
    return validation.isValid ? validation.sanitized! : null;
  } catch {
    return null;
  }
}

/**
 * Check if a value could potentially be a UUID (relaxed validation)
 * @param value Value to check
 * @returns True if value looks like it could be a UUID
 */
export function looksLikeUUID(value: any): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  const cleaned = value.trim().toLowerCase();
  
  // Check common UUID patterns
  return Object.values(UUID_PATTERNS).some(pattern => pattern.test(cleaned));
}

/**
 * Production-ready UUID validation utilities
 */
export const uuidValidator = {
  validate: validateUUID,
  validateArray: validateUUIDArray,
  assert: assertValidUUID,
  assertArray: assertValidUUIDArray,
  safe: safeValidateUUID,
  looksLike: looksLikeUUID,
  sanitize: sanitizeUUID,
  isValid: isValidUUID,
} as const;