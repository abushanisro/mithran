/**
 * Authentication interceptor for API client
 * Handles 401 errors globally and redirects to login when needed
 * Production-grade solution following ENGINEERING_PRINCIPLES.md
 */

import { apiClient, ApiError } from './client';
import { supabase } from '../supabase/client';
import { toast } from 'sonner';

let isRefreshing = false;
let hasShownAuthError = false;

/**
 * Initialize authentication interceptor
 * This should be called once when the app starts
 */
export function initializeAuthInterceptor() {
  // Add response interceptor to handle auth errors globally
  apiClient.addResponseInterceptor(async (response) => {
    // Check if response indicates an error
    if (response && !response.success && response.error) {
      const error = response.error;

      // Handle 401 Unauthorized errors
      if (error.code === 'UNAUTHORIZED' || error.message?.includes('Invalid or expired access token')) {
        await handleAuthenticationError();
      }
    }

    return response;
  });
}

/**
 * Handle authentication errors
 * Attempts to refresh the session, or redirects to login if refresh fails
 */
async function handleAuthenticationError(): Promise<void> {
  // Prevent multiple refresh attempts
  if (isRefreshing) {
    return;
  }

  // Prevent multiple toast notifications
  if (hasShownAuthError) {
    return;
  }

  isRefreshing = true;

  try {
    if (!supabase) {
      redirectToLogin('Your session has expired. Please log in again.');
      return;
    }

    // Try to refresh the session
    const { data: { session }, error } = await supabase.auth.refreshSession();

    if (error || !session) {
      // Refresh failed - user needs to log in again
      redirectToLogin('Your session has expired. Please log in again.');
      return;
    }

    // Refresh succeeded - the auth state listener will update the user
    if (process.env.NODE_ENV === 'development') {
      console.log('[Auth] Session refreshed successfully');
    }
  } catch (error) {
    redirectToLogin('Your session has expired. Please log in again.');
  } finally {
    isRefreshing = false;
  }
}

/**
 * Redirect to login page and clear auth state
 */
function redirectToLogin(message: string): void {
  hasShownAuthError = true;

  // Show toast notification
  toast.error(message, {
    duration: 5000,
    id: 'auth-error', // Prevent duplicate toasts
  });

  // Clear auth state
  if (supabase) {
    supabase.auth.signOut().catch(() => {
      // Ignore errors during sign out
    });
  }

  // Hard redirect to login (prevents back button to authenticated pages)
  if (typeof window !== 'undefined') {
    // Save the current path to redirect back after login
    const currentPath = window.location.pathname + window.location.search;
    if (currentPath !== '/auth' && currentPath !== '/') {
      sessionStorage.setItem('redirectAfterLogin', currentPath);
    }

    window.location.replace('/auth');
  }
}

/**
 * Reset the auth error state (useful for testing)
 */
export function resetAuthErrorState(): void {
  hasShownAuthError = false;
  isRefreshing = false;
}
