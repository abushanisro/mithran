'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { type AuthUser } from '@/lib/api'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { authTokenManager } from '@/lib/auth/token-manager'

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>
  signInWithGoogle: () => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * Check if a user's email exists in the authorized_users table
 */
async function checkUserAuthorization(email: string): Promise<boolean> {
  if (!supabase) {
    return false
  }

  try {
    // Try to use the RPC function first (more secure/robust)
    const { data: isAuthorized, error: rpcError } = await supabase.rpc('is_user_authorized')
    
    if (!rpcError && typeof isAuthorized === 'boolean') {
      return isAuthorized
    }

    // Fallback to direct query if RPC fails or returns null
    // (This is kept for backward compatibility or if RPC is missing)
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Auth] RPC check failed, falling back to direct query:', rpcError)
    }

    const { data, error } = await supabase
      .from('authorized_users')
      .select('is_active')
      .eq('email', email)
      .limit(1)

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Auth] Authorization check failed:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          fullError: error
        })
      }
      return false
    }

    // User is authorized if a record is found and it's active
    return data?.length > 0 && data[0].is_active === true
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Auth] Unexpected error during authorization check:', {
        message: e instanceof Error ? e.message : 'Unknown error',
        stack: e instanceof Error ? e.stack : undefined,
        fullError: e
      })
    }
    return false
  }
}

// Singleton pattern to prevent multiple initializations
let authInitialized = false
let authInitializationPromise: Promise<void> | null = null

export function BackendAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const refreshInProgressRef = useRef(false)

  // Load user on mount - singleton pattern
  const loadUser = useCallback(async () => {
    // Prevent multiple simultaneous initialization calls
    if (authInitialized) {
      setLoading(false)
      return
    }

    if (authInitializationPromise) {
      await authInitializationPromise
      setLoading(false)
      return
    }

    if (!supabase) {
      console.warn('[Auth] Supabase client not available')
      setLoading(false)
      authInitialized = true
      return
    }

    authInitializationPromise = (async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('[Auth] Error getting session:', error)
          setUser(null)
          return
        }

        if (session?.user) {
          // Single auth log per session
          if (process.env.NODE_ENV === 'development' && !authInitialized) {
            console.log('[Auth] Session initialized for:', session.user.email)
          }
          
          // Check if user is authorized
          const isAuthorized = await checkUserAuthorization(session.user.email || '')

          if (!isAuthorized) {
            console.warn('[Auth] User not authorized, signing out')
            // Clear token immediately at decision point
            authTokenManager.clearToken()
            // User is not authorized - sign them out silently
            await supabase.auth.signOut()
            setUser(null)
            return
          }

          const authUser = {
            id: session.user.id,
            email: session.user.email || '',
            fullName: session.user.user_metadata?.full_name || session.user.user_metadata?.name || '',
            createdAt: session.user.created_at,
          } as AuthUser
          
          setUser(authUser)
          
          // Update token manager with current token
          // Supabase tokens expire in 1 hour by default
          const expiresInSeconds = session.expires_in || 3600; // fallback to 1 hour
          const expiresAt = Date.now() + (expiresInSeconds * 1000);
          
          if (process.env.NODE_ENV === 'development') {
            console.log('[Auth] Token set, expires in:', expiresInSeconds, 'seconds', new Date(expiresAt).toLocaleTimeString());
          }
          
          authTokenManager.setToken({
            token: session.access_token,
            expiresAt
          })
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error('[Auth] Error in loadUser:', error)
        setUser(null)
      } finally {
        authInitialized = true
        authInitializationPromise = null
      }
    })()

    await authInitializationPromise
    setLoading(false)
  }, [])

  // Token refresh handler with guard to prevent spam
  const handleTokenRefresh = useCallback(async () => {
    // Refresh guard - prevent multiple simultaneous refresh attempts
    if (refreshInProgressRef.current || !supabase) {
      return
    }
    
    refreshInProgressRef.current = true
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession()
      
      if (!error && session) {
        // Update token manager with new token
        const expiresInSeconds = session.expires_in || 3600; // fallback to 1 hour
        authTokenManager.setToken({
          token: session.access_token,
          expiresAt: Date.now() + (expiresInSeconds * 1000)
        })
        
        // Reset refresh signal so next expiry cycle can signal again
        authTokenManager.resetRefreshSignal()
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[Auth] Token refreshed, expires in:', expiresInSeconds, 'seconds');
        }
      } else {
        console.error('[Auth] Token refresh failed:', error)
      }
    } catch (error) {
      console.error('[Auth] Token refresh error:', error)
    } finally {
      refreshInProgressRef.current = false
    }
  }, [])

  useEffect(() => {
    loadUser()

    // Register refresh callback with token manager (NO circular dependency)
    authTokenManager.setRefreshCallback(handleTokenRefresh)

    // Subscribe to auth state changes for automatic token refresh
    if (!supabase) {
      return
    }

    let lastEventTime = 0
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Debounce rapid state changes
      const now = Date.now()
      if (now - lastEventTime < 100) {
        return
      }
      lastEventTime = now

      // Minimal logging - only for significant events
      if (process.env.NODE_ENV === 'development' && event === 'SIGNED_IN') {
        console.log('[Auth] User signed in')
      }

      if (event === 'SIGNED_IN') {
        // Only process sign-in if not already initialized
        if (session?.user && !authInitialized) {
          const isAuthorized = await checkUserAuthorization(session.user.email || '')

          if (isAuthorized) {
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              fullName: session.user.user_metadata?.full_name || session.user.user_metadata?.name || '',
              createdAt: session.user.created_at,
            } as AuthUser)
            
            // Update token manager
            const expiresInSeconds = session.expires_in || 3600; // fallback to 1 hour
            authTokenManager.setToken({
              token: session.access_token,
              expiresAt: Date.now() + (expiresInSeconds * 1000)
            })
          } else {
            // User lost authorization - clear token at decision point
            authTokenManager.clearToken()
            await supabase.auth.signOut()
            setUser(null)
          }
        }
      } else if (event === 'TOKEN_REFRESHED') {
        // Silent token refresh - no state changes needed
        // User state already established
      } else if (event === 'SIGNED_OUT') {
        // Clear token immediately at signout decision point
        authTokenManager.clearToken()
        setUser(null)
        // Reset initialization flag on signout
        authInitialized = false
      } else if (event === 'USER_UPDATED') {
        // Handle user profile updates
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            fullName: session.user.user_metadata?.full_name || session.user.user_metadata?.name || '',
            createdAt: session.user.created_at,
          } as AuthUser)
        }
      }
    })

    // Set up proactive token refresh (every 45 minutes)
    // Supabase tokens expire after 60 minutes by default
    const refreshInterval = setInterval(async () => {
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          // Trigger refresh if session exists
          const { error } = await supabase.auth.refreshSession()
          if (error && process.env.NODE_ENV === 'development') {
            console.warn('[Auth] Failed to refresh session:', error.message)
          }
        }
      }
    }, 45 * 60 * 1000) // 45 minutes

    // Cleanup subscription and interval on unmount
    return () => {
      subscription.unsubscribe()
      clearInterval(refreshInterval)
    }
  }, [loadUser])

  const signIn = async (email: string, password: string) => {
    try {
      if (!supabase) {
        toast.error('Authentication is not configured.')
        return { error: new Error('Supabase not configured') }
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // Provide user-friendly error messages
        if (error.message.includes('Email not confirmed')) {
          toast.error('Please confirm your email address first. Check your inbox for the confirmation link.', { duration: 8000 })
        } else if (error.message.includes('Invalid login credentials')) {
          toast.error('Invalid email or password. Please try again.')
        } else {
          toast.error(error.message || 'Login failed. Please try again.')
        }
        return { error: error as Error }
      }

      if (data.user) {
        // Check if user is authorized by querying the authorized_users table
        const isAuthorized = await checkUserAuthorization(data.user.email || '')

        if (!isAuthorized) {
          // User is not authorized - sign them out
          await supabase.auth.signOut()
          toast.error('Access denied. Please use your company email or request a demo.', { duration: 6000 })
          return { error: new Error('User not authorized') }
        }

        setUser({
          id: data.user.id,
          email: data.user.email || '',
          fullName: data.user.user_metadata?.full_name || data.user.user_metadata?.name || '',
          createdAt: data.user.created_at,
        } as AuthUser)
        
        // Update token manager after successful sign in
        if (data.session) {
          const expiresInSeconds = data.session.expires_in || 3600;
          authTokenManager.setToken({
            token: data.session.access_token,
            expiresAt: Date.now() + (expiresInSeconds * 1000)
          })
        }
        
        toast.success('Welcome back!')
      }

      return { error: null }
    } catch (error: any) {
      toast.error(error?.message || 'Login failed. Please try again.')
      return { error: error as Error }
    }
  }

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      if (!supabase) {
        toast.error('Authentication is not configured.')
        return { error: new Error('Supabase not configured') }
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (error) {
        // Provide user-friendly error messages
        if (error.message.includes('User already registered')) {
          toast.error('An account with this email already exists. Please login instead.')
        } else if (error.message.includes('Password')) {
          toast.error(error.message)
        } else {
          toast.error(error.message || 'Registration failed. Please try again.')
        }
        return { error: error as Error }
      }

      // Check if email confirmation is required
      if (data.user && !data.session) {
        toast.success('Account created! Please check your email to confirm your account before logging in.', { duration: 8000 })
        return { error: null }
      }

      // Immediate login (email confirmation disabled)
      if (data.user && data.session) {
        // Check if user is authorized
        const isAuthorized = await checkUserAuthorization(data.user.email || '')

        if (!isAuthorized) {
          // User is not authorized - sign them out
          await supabase.auth.signOut()
          toast.error('Access denied. Your account has been created but is not authorized yet. Please request a demo or contact your administrator.', { duration: 8000 })
          return { error: new Error('User not authorized') }
        }

        setUser({
          id: data.user.id,
          email: data.user.email || '',
          fullName: data.user.user_metadata?.full_name || '',
          createdAt: data.user.created_at,
        } as AuthUser)
        
        // Update token manager after successful signup
        const expiresInSeconds = data.session.expires_in || 3600;
        authTokenManager.setToken({
          token: data.session.access_token,
          expiresAt: Date.now() + (expiresInSeconds * 1000)
        })
        
        toast.success('Account created successfully! You are now logged in.')
      }

      return { error: null }
    } catch (error: any) {
      toast.error(error?.message || 'Registration failed. Please try again.')
      return { error: error as Error }
    }
  }

  const signOut = async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut()
      }
    } finally {
      // Clear all auth state at logout decision point
      authTokenManager.clearToken()
      setUser(null)
      authInitialized = false
      
      // Clear all storage (will be handled by AuthQuerySync)
      if (typeof window !== 'undefined') {
        // Let other components handle their own cleanup
        // Query cache will be cleared by AuthQuerySync
        
        // Hard redirect (prevents back button to authenticated pages)
        window.location.replace('/auth')
      }
    }
  }

  const signInWithGoogle = async () => {
    try {
      if (!supabase) {
        toast.error('Google Sign-In is not configured. Please add your Supabase credentials.')
        return { error: new Error('Supabase not configured') }
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        toast.error('Failed to sign in with Google')
        return { error: error as Error }
      }

      return { error: null }
    } catch (error: any) {
      toast.error('Failed to sign in with Google')
      return { error: error as Error }
    }
  }

  const refreshUser = async () => {
    if (!supabase) {
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          fullName: session.user.user_metadata?.full_name || session.user.user_metadata?.name || '',
          createdAt: session.user.created_at,
        } as AuthUser)
      } else {
        setUser(null)
      }
    } catch (error) {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within a BackendAuthProvider')
  }
  return context
}

/**
 * Helper hook to check if auth is ready for queries
 * Use this in React Query enabled conditions
 *
 * @returns true when auth is initialized and user is authenticated
 *
 * @example
 * ```typescript
 * useQuery({
 *   queryKey: ['projects'],
 *   queryFn: fetchProjects,
 *   enabled: useAuthReady()
 * })
 * ```
 */
export function useAuthReady(): boolean {
  const { user, loading } = useAuth()
  return !loading && !!user
}

/**
 * Optimized auth state for React Query hooks
 * Memoized to prevent unnecessary re-renders
 */
export function useAuthState() {
  const { user, loading } = useAuth()
  
  // Return memoized object to prevent re-renders
  return {
    isAuthenticated: !loading && !!user,
    isLoading: loading,
    user
  }
}
