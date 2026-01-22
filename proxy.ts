import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { cryptoUtils } from '@/lib/utils/crypto-polyfill'

/**
 * Next.js Middleware for CSP Nonce Generation
 *
 * This middleware generates a unique nonce for each request to allow
 * inline scripts while maintaining Content Security Policy protection.
 */

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(cryptoUtils.generateUUID()).toString('base64')
  const cspHeader = generateCSP(nonce)

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  response.headers.set('Content-Security-Policy', cspHeader)

  return response
}

function generateCSP(nonce: string): string {
  const apiGateway = process.env.NEXT_PUBLIC_API_GATEWAY_URL
  const cadEngine = process.env.NEXT_PUBLIC_CAD_ENGINE_URL
  const isDev = process.env.NODE_ENV !== 'production'

  const connectSrc = [
    "'self'",
    'https://*.supabase.co',
    'wss://*.supabase.co',
    'https://vercel.live',
    'wss://vercel.live',
    'https://*.pusher.com',
    'wss://*.pusher.com',
    'https://va.vercel-scripts.com',
  ]

  if (isDev) {
    connectSrc.push(
      'http://localhost:4000',
      'http://127.0.0.1:4000',
      'ws://localhost:4000',
      'http://localhost:5000',
      'ws://localhost:3000',
      'ws://localhost:3001',
      'webpack://*'
    )
  }

  if (apiGateway) connectSrc.push(apiGateway)
  if (cadEngine) connectSrc.push(cadEngine)

  // Use nonce for inline scripts in production
  const scriptSrc = isDev
    ? "'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com"
    : `'self' 'nonce-${nonce}' 'unsafe-inline' https://va.vercel-scripts.com`

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'self' https://*.supabase.co",
    "img-src 'self' data: https: blob:",
    "style-src 'self' 'unsafe-inline'",
    `script-src ${scriptSrc}`,
    `connect-src ${connectSrc.join(' ')}`,
    "worker-src 'self' blob:",
    "font-src 'self' data:",
    "object-src 'none'",
    "media-src 'self' data: blob:",
  ]

  if (!isDev) {
    directives.push('upgrade-insecure-requests')
  }

  return directives.join('; ')
}

// Configure which routes to apply middleware to
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon files
     * - public assets
     */
    {
      source: '/((?!_next/static|_next/image|favicon.ico|favicon.svg|.*\\.(?:jpg|jpeg|gif|png|svg|ico|webp|woff2|woff)$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
