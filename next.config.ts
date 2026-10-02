import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== 'production';

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['192.168.0.137', 'localhost'],
  async headers() {
    const scriptSrcDirectives = [
      "'self'",
      "'unsafe-inline'",
      ...(isDev ? ["'unsafe-eval'"] : []),
      "https://js.stripe.com",
    ].join(' ');

    const headersList: Array<{ key: string; value: string }> = [
      // Prevent MIME sniffing
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      // Prevent clickjacking — only allow same-origin iframes
      {
        key: 'X-Frame-Options',
        value: 'SAMEORIGIN',
      },
      // Referrer policy — send origin only for cross-origin requests
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
      // Restrict permissions: allow mic + display-capture only from self
      {
        key: 'Permissions-Policy',
        value: 'microphone=(self), display-capture=(self), camera=(), geolocation=(), payment=(self "https://js.stripe.com")',
      },
      // Block DNS prefetching to prevent data leakage
      {
        key: 'X-DNS-Prefetch-Control',
        value: 'off',
      },
      // Prevent Flash/PDF cross-domain access
      {
        key: 'X-Permitted-Cross-Domain-Policies',
        value: 'none',
      },
      // Content Security Policy
      // Allows: self, Stripe (payments), Gemini/Google APIs, Deepgram, Google Fonts
      // Includes 'unsafe-eval' only in development for React 19 debugging & hot reload
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          // Scripts: self + Stripe.js + (unsafe-eval in dev mode)
          `script-src ${scriptSrcDirectives}`,
          // Styles: self + inline (required for Next.js / Tailwind) + Google Fonts
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          // Fonts: self + Google Fonts CDN
          "font-src 'self' https://fonts.gstatic.com data:",
          // Images: self + data URIs (screenshots) + blob (audio visualization) + remote avatars
          "img-src 'self' data: blob: https:",
          // Media: self + blob (audio/video streams)
          "media-src 'self' blob:",
          // Workers: self + blob (AudioWorklet for Deepgram)
          "worker-src 'self' blob:",
          // Connections: self + WebSockets (HMR / Deepgram) + APIs
          "connect-src 'self' ws: wss: https://api.stripe.com https://generativelanguage.googleapis.com https://api.deepgram.com wss://api.deepgram.com https://translate.google.com https://accounts.google.com",
          // Frames: Stripe requires iframe for payment elements
          "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
          // Objects: block all plugin-based content
          "object-src 'none'",
          // Base URI restriction
          "base-uri 'self'",
          // Form submissions only to self
          "form-action 'self'",
        ].join('; '),
      },
    ];

    // Force HTTPS only in production (avoid breaking local HTTP / LAN dev)
    if (!isDev) {
      headersList.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains; preload',
      });
    }

    return [
      {
        source: '/(.*)',
        headers: headersList,
      },
    ];
  },
};

export default nextConfig;

