/**
 * Performance and Security Configuration for Openroad DMS
 * Optimizations for faster, efficient, and secure application
 */

// Security Headers Configuration for Next.js
const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' blob: data: https:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "media-src 'self'",
      "worker-src 'self'",
    ].join("; "),
  },
];

// Performance optimizations
const performanceConfig = {
  // Enable static optimization
  trailingSlash: false,

  // Optimize images
  images: {
    domains: ["localhost", "supabase.co"],
    formats: ["image/webp", "image/avif"],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Enable compression
  compress: true,

  // Optimize build
  swcMinify: true,

  // Bundle analyzer (enable when needed)
  // bundleAnalyzer: {
  //   enabled: process.env.ANALYZE === 'true',
  // },

  // Experimental features for performance
  experimental: {
    optimizeCss: true,
    serverComponentsExternalPackages: ["canvas", "jsdom"],
  },

  // Headers for security and caching
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        source: "/api/(.*)",
        headers: [
          ...securityHeaders,
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
      {
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/uploads/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400",
          },
        ],
      },
    ];
  },

  // Rewrites for better SEO and security
  async rewrites() {
    return [
      {
        source: "/health",
        destination: "/api/health",
      },
    ];
  },
};

export { performanceConfig, securityHeaders };
