/**
 * RFQ Tracking Feature Detection
 * Production-ready feature flag system for RFQ tracking
 */

// Feature states
export enum TrackingFeatureState {
  AVAILABLE = 'available',
  MIGRATION_REQUIRED = 'migration_required',
  UNAVAILABLE = 'unavailable',
  ERROR = 'error'
}

export interface TrackingFeatureStatus {
  state: TrackingFeatureState;
  message: string;
  isEnabled: boolean;
  canRetry: boolean;
}

/**
 * Analyze tracking feature availability based on error
 */
export function analyzeTrackingFeature(
  trackingError: Error | null,
  statsError: Error | null,
  hasData: boolean
): TrackingFeatureStatus {
  // Both queries successful and has data
  if (!trackingError && !statsError && hasData) {
    return {
      state: TrackingFeatureState.AVAILABLE,
      message: 'RFQ tracking is fully operational',
      isEnabled: true,
      canRetry: false
    };
  }

  // Both queries successful but no data yet
  if (!trackingError && !statsError && !hasData) {
    return {
      state: TrackingFeatureState.AVAILABLE,
      message: 'RFQ tracking is ready - send your first RFQ to see data',
      isEnabled: true,
      canRetry: false
    };
  }

  // Database/migration errors
  if (isDatabaseSchemaError(trackingError) || isDatabaseSchemaError(statsError)) {
    return {
      state: TrackingFeatureState.MIGRATION_REQUIRED,
      message: 'Database migration required for RFQ tracking features',
      isEnabled: false,
      canRetry: true
    };
  }

  // Other errors
  if (trackingError || statsError) {
    return {
      state: TrackingFeatureState.ERROR,
      message: 'RFQ tracking temporarily unavailable',
      isEnabled: false,
      canRetry: true
    };
  }

  // Default unavailable
  return {
    state: TrackingFeatureState.UNAVAILABLE,
    message: 'RFQ tracking feature is not available',
    isEnabled: false,
    canRetry: false
  };
}

/**
 * Check if error is related to database schema/migration
 */
function isDatabaseSchemaError(error: Error | null): boolean {
  if (!error) return false;
  
  const errorMessage = error.message?.toLowerCase() || '';
  const errorPatterns = [
    'not found',
    'does not exist',
    'relation does not exist',
    'table does not exist',
    'view does not exist',
    'permission denied',
    'pgrst116'
  ];

  return errorPatterns.some(pattern => errorMessage.includes(pattern));
}

/**
 * Get user-friendly feature status message
 */
export function getFeatureStatusMessage(status: TrackingFeatureStatus): {
  title: string;
  description: string;
  actionText?: string;
} {
  switch (status.state) {
    case TrackingFeatureState.AVAILABLE:
      return {
        title: 'RFQ Tracking Active',
        description: status.message
      };
      
    case TrackingFeatureState.MIGRATION_REQUIRED:
      return {
        title: 'Database Setup Required',
        description: 'RFQ tracking requires database migration. Your RFQs are sending successfully!',
        actionText: 'Run Migration'
      };
      
    case TrackingFeatureState.ERROR:
      return {
        title: 'Tracking Temporarily Unavailable',
        description: 'RFQ tracking service is experiencing issues. RFQ sending continues to work normally.',
        actionText: 'Retry'
      };
      
    default:
      return {
        title: 'Tracking Unavailable',
        description: 'RFQ tracking feature is not available in this environment.'
      };
  }
}