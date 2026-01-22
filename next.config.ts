import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Enable strict mode for better development experience
  reactStrictMode: true,

  // Enable standalone output for Docker deployment
  output: 'standalone',

  // Allow cross-origin requests from local network (for testing on other devices)
  allowedDevOrigins: ['172.20.10.8', '10.2.0.2'],

  // Image optimization configuration
  images: {
    remotePatterns: [],
    // Next.js 16 defaults (explicit for clarity):
    // - minimumCacheTTL: 14400 (4 hours, improved from 60s)
    // - imageSizes: [16, 32, 48, 64, 96, 128, 256, 384] → [32, 48, 64, 96, 128, 256, 384]
    // - qualities: [75] (quality prop coerced to closest value)
    // - maximumRedirects: 3 (was unlimited)
    // - dangerouslyAllowLocalIP: false (security improvement)
  },

  // Turbopack configuration (moved from experimental in Next.js 16)
  turbopack: {
    root: process.cwd(),
  },

  // Experimental features for better performance
  experimental: {
    // Enable optimizePackageImports for better bundle size
    optimizePackageImports:
      process.env.NODE_ENV === 'production'
        ? [
          'lucide-react',
          '@radix-ui/react-accordion',
          '@radix-ui/react-alert-dialog',
          '@radix-ui/react-avatar',
          '@radix-ui/react-checkbox',
          '@radix-ui/react-collapsible',
          '@radix-ui/react-context-menu',
          '@radix-ui/react-dialog',
          '@radix-ui/react-dropdown-menu',
          '@radix-ui/react-hover-card',
          '@radix-ui/react-label',
          '@radix-ui/react-menubar',
          '@radix-ui/react-navigation-menu',
          '@radix-ui/react-popover',
          '@radix-ui/react-progress',
          '@radix-ui/react-radio-group',
          '@radix-ui/react-scroll-area',
          '@radix-ui/react-select',
          '@radix-ui/react-separator',
          '@radix-ui/react-slider',
          '@radix-ui/react-slot',
          '@radix-ui/react-switch',
          '@radix-ui/react-tabs',
          '@radix-ui/react-toast',
          '@radix-ui/react-toggle',
          '@radix-ui/react-toggle-group',
          '@radix-ui/react-tooltip',
        ]
        : [],
  },

  // TypeScript configuration
  typescript: {
    // Recommended: keep type checking enabled
    ignoreBuildErrors: false,
  },

  // Webpack configuration
  webpack: (config) => {
    // Exclude backend directory from webpack compilation
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        '**/node_modules/**',
        '**/backend/**',
        '**/.next/**',
        '**/.git/**',
      ],
    };

    return config;
  },

  // Enable compression
  compress: true,

  // Disable x-powered-by header for security
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // CSP is handled by middleware.ts for nonce support
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          {
            key: 'Permissions-Policy',
            value: [
              'camera=()',
              'microphone=()',
              'geolocation=()',
              'fullscreen=(self)',
              'payment=()',
            ].join(', '),
          },
          ...(process.env.NODE_ENV === 'production'
            ? [
              {
                key: 'Strict-Transport-Security',
                value: 'max-age=63072000; includeSubDomains; preload',
              },
            ]
            : []),
        ],
      },
    ];
  },
}

export default nextConfig
