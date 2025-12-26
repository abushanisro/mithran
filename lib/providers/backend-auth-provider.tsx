'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { authApi, type AuthUser, apiClient } from '@/lib/api'
import { toast } from 'sonner'

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function BackendAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Load user on mount
  const loadUser = useCallback(async () => {
    const token = apiClient.getAccessToken()

    if (!token) {
      setLoading(false)
      return
    }

    try {
      const currentUser = await authApi.getCurrentUser()
      setUser(currentUser)
    } catch (error) {
      // Token is invalid or expired - clear everything
      apiClient.setAccessToken(null)
      apiClient.setRefreshToken(null)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  const signIn = async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password })
      setUser(response.user)
      toast.success('Welcome back!')
      return { error: null }
    } catch (error: any) {

      // Provide user-friendly error messages
      if (error?.message?.includes('confirm your email')) {
        toast.error(
          'Please confirm your email address first. Check your inbox for the confirmation link.',
          { duration: 8000 }
        )
      } else if (error?.message?.includes('Invalid email or password')) {
        toast.error('Invalid email or password. Please try again.')
      } else if (error?.statusCode === 429) {
        toast.error('Too many login attempts. Please try again in a minute.')
      } else {
        toast.error(error?.message || 'Login failed. Please try again.')
      }

      return { error: error as Error }
    }
  }

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const response = await authApi.register({ email, password, fullName })

      // Check if email confirmation is required
      if (response.requiresEmailConfirmation) {
        toast.success(
          'Account created! Please check your email to confirm your account before logging in.',
          { duration: 8000 }
        )
        // Don't set user - they need to confirm email first
        return { error: null }
      }

      // Immediate login (email confirmation disabled)
      setUser(response.user)
      toast.success('Account created successfully! You are now logged in.')
      return { error: null }
    } catch (error: any) {

      // Provide user-friendly error messages
      if (error?.message?.includes('Password must be')) {
        toast.error(error.message)
      } else if (error?.message?.includes('already exists')) {
        toast.error('An account with this email already exists. Please login instead.')
      } else if (error?.message?.includes('Invalid email')) {
        toast.error('Please enter a valid email address.')
      } else if (error?.statusCode === 429) {
        toast.error('Too many registration attempts. Please try again in a minute.')
      } else {
        toast.error(error?.message || 'Registration failed. Please try again.')
      }

      return { error: error as Error }
    }
  }

  const signOut = async () => {
    try {
      await authApi.logout()
    } finally {
      setUser(null)
      apiClient.setAccessToken(null)
      apiClient.setRefreshToken(null)
    }
  }

  const refreshUser = async () => {
    try {
      const currentUser = await authApi.getCurrentUser()
      setUser(currentUser)
    } catch (error) {
      // If refresh fails, clear user state
      setUser(null)
      apiClient.setAccessToken(null)
      apiClient.setRefreshToken(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
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
