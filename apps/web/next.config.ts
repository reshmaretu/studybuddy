import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  transpilePackages: ['@studybuddy/api', '@studybuddy/ui', '@studybuddy/canvas-engine'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self';",
              // 🔥 Added Stripe JS
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: https://js.stripe.com;",
              "style-src 'self' 'unsafe-inline';",
              "img-src 'self' blob: data: https://*.supabase.co https://*.tldraw.com https://cdn.tldraw.com https://grainy-gradients.vercel.app;",
              "font-src 'self' data: https://*.tldraw.com;",
              "worker-src 'self' blob:;",
              // 🔥 Added Stripe API
              "connect-src 'self' data: https://*.supabase.co wss://*.supabase.co https://*.tldraw.com https://cdn.tldraw.com https://cdn.jsdelivr.net http://localhost:11434 http://127.0.0.1:11434 https://openrouter.ai https://api.groq.com https://generativelanguage.googleapis.com https://api.stripe.com https://api.emailjs.com;",
              // 🔥 Added Frame source for the Embedded iframe
              "frame-src 'self' https://js.stripe.com;",
              "object-src 'none';"
            ].join(' ')
          },
        ],
      },
    ];
  },
};

export default nextConfig;