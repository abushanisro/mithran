/**
 * Centralized Auth Enabler for React Query
 * 
 * Industry Standard Pattern:
 * - Remove auth logic from individual data hooks
 * - Centralized auth state management
 * - Clean separation of concerns
 */

import { useAuth } from '@/lib/providers/auth';

interface UseAuthEnabledOptions {
  enabled?: boolean;
}

/**
 * Centralized hook to determine if queries should be enabled based on auth state
 * 
 * @param options - Additional enablement options
 * @returns boolean indicating if queries should be enabled
 */
export function useAuthEnabled(options?: UseAuthEnabledOptions): boolean {
  const { user, loading: authLoading } = useAuth();
  
  const isAuthReady = !authLoading && !!user;
  const isExplicitlyEnabled = options?.enabled !== false;
  
  return isAuthReady && isExplicitlyEnabled;
}

/**
 * Hook to get auth enablement with additional custom conditions
 * 
 * @param customCondition - Additional condition that must be true
 * @param options - Additional enablement options
 * @returns boolean indicating if queries should be enabled
 */
export function useAuthEnabledWith(
  customCondition: boolean, 
  options?: UseAuthEnabledOptions
): boolean {
  const isAuthEnabled = useAuthEnabled(options);
  return isAuthEnabled && customCondition;
}