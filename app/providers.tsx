'use client'

import { useEffect } from 'react'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ThemeProvider } from '@/lib/providers/theme-provider'
import { QueryProvider } from '@/lib/providers/query-provider'
import { BackendAuthProvider } from '@/lib/providers/backend-auth-provider'
import { initializeApiClient } from '@/lib/api/init'

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize API client with interceptors
    initializeApiClient()
  }, [])

  return (
    <ThemeProvider>
      <QueryProvider>
        <BackendAuthProvider>
          <TooltipProvider>
            {children}
            <Toaster />
            <Sonner />
          </TooltipProvider>
        </BackendAuthProvider>
      </QueryProvider>
    </ThemeProvider>
  )
}
