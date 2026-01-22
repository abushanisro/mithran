'use client'

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from './auth'
import { apiClient } from '../api/client'
import { idempotencyManager } from '../api/idempotency'

/**
 * Component to sync React Query with auth state changes
 * Must be rendered inside both QueryProvider and AuthProvider
 */
export function AuthQuerySync() {
  const { user, loading: authLoading } = useAuth()
  const queryClient = useQueryClient()
  const previousUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!authLoading) {
      const currentUserId = user?.id || null
      const previousUserId = previousUserIdRef.current

      // Only invalidate queries when user actually changes (not on initial load)
      if (currentUserId !== previousUserId) {
        if (currentUserId) {
          // User signed in or switched - only invalidate auth-dependent queries
          queryClient.invalidateQueries({
            predicate: (query) => {
              // Only invalidate queries that depend on auth
              const key = query.queryKey[0] as string
              return ['projects', 'bom', 'processes', 'vendors', 'raw-materials', 
                     'calculators', 'supplier-evaluations', 'mhr', 'lsr'].some(
                authKey => key.includes(authKey)
              )
            }
          })
        } else {
          // User signed out - clear all query cache and storage
          queryClient.clear()
          
          // Clear API client tokens
          apiClient.setAccessToken(null)
          apiClient.setRefreshToken(null)
          
          // Clear idempotency records
          idempotencyManager.clear()
          
          // Clear local storage (keeping only UI preferences)
          if (typeof window !== 'undefined') {
            const keysToKeep = ['theme', 'sidebar-state'] // Keep UI preferences
            const allKeys = Object.keys(localStorage)
            allKeys.forEach(key => {
              if (!keysToKeep.includes(key)) {
                localStorage.removeItem(key)
              }
            })
            
            // Clear session storage
            sessionStorage.clear()
          }
        }
        
        previousUserIdRef.current = currentUserId
      }
    }
  }, [authLoading, user?.id, queryClient])

  return null
}