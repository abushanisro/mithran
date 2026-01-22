'use client'

import { useEffect } from 'react'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ThemeProvider } from '@/lib/providers/theme-provider'
import { QueryProvider } from '@/lib/providers/query-provider'
import { BackendAuthProvider } from '@/lib/providers/backend-auth-provider'
import { AuthQuerySync } from '@/lib/providers/auth-query-sync'
import { initializeApiClient } from '@/lib/api/init'
import { initializeCrypto } from '@/lib/init/crypto-init'
import dynamic from 'next/dynamic'

// Dynamically import React Query DevTools (development only)
const ReactQueryDevtools = dynamic(
  () =>
    import('@tanstack/react-query-devtools').then((mod) => ({
      default: mod.ReactQueryDevtools,
    })),
  { ssr: false }
)

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize crypto APIs first (critical for security)
    initializeCrypto().then(() => {
      // Then initialize API client with interceptors
      initializeApiClient()
    }).catch((error) => {
      console.error('Failed to initialize crypto APIs:', error)
      // In production, this would prevent app startup
      if (process.env.NODE_ENV === 'production') {
        throw error
      }
    })
  }, [])

  return (
    <ThemeProvider>
      <BackendAuthProvider>
        <QueryProvider>
          <AuthQuerySync />
          <TooltipProvider>
            {children}
            <Sonner />
          </TooltipProvider>
          {process.env.NODE_ENV === 'development' && (
            <ReactQueryDevtools initialIsOpen={false} />
          )}
        </QueryProvider>
      </BackendAuthProvider>
    </ThemeProvider>
  )
}
