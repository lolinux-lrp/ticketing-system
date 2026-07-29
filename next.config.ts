import type { NextConfig } from "next";

// Development-only hosts for Next.js dev server cross-origin access
const devOrigins = [
  'localhost:3000',
  '192.168.17.127:3000',
  '192.168.19.98:3000',
  'bazooka-botch-judge.ngrok-free.dev'
];

// Server Action origin validation list (production + dev if needed)
const serverActionOrigins: string[] = [];

// Add production base URL if configured
if (process.env.APP_BASE_URL) {
  try {
    const url = new URL(process.env.APP_BASE_URL);

    // Validate protocol and host
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error(`Invalid APP_BASE_URL protocol: ${url.protocol}. Must be http: or https:`);
    }
    if (!url.host) {
      throw new Error('APP_BASE_URL must have a non-empty host');
    }

    serverActionOrigins.push(url.host);
  } catch (error) {
    // Throw configuration error instead of silently continuing
    throw new Error(
      `Failed to parse APP_BASE_URL: ${error instanceof Error ? error.message : 'Invalid URL format'}`
    );
  }
}

// In development, also allow Server Actions from dev origins
if (process.env.NODE_ENV === 'development') {
  serverActionOrigins.push(...devOrigins);
}

const nextConfig: NextConfig = {
  /* config options here */

  // Development server cross-origin access (dev only)
  ...(process.env.NODE_ENV === 'development' ? { allowedDevOrigins: devOrigins } : {}),

  // Server Action origin validation (production + dev)
  experimental: {
    serverActions: {
      allowedOrigins: serverActionOrigins,
    }
  }
};

export default nextConfig;
