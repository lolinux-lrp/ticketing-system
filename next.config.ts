import type { NextConfig } from "next";

const allowedOrigins = [
  'localhost:3000',
  '192.168.17.127:3000',
  '192.168.19.98:3000',
  'bazooka-botch-judge.ngrok-free.dev'
];

if (process.env.APP_BASE_URL) {
  try {
    allowedOrigins.push(new URL(process.env.APP_BASE_URL).host);
  } catch {}
}

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      allowedOrigins,
    }
  }
};

export default nextConfig;
