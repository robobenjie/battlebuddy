import type { NextConfig } from "next";

const nextConfig = (phase: string): NextConfig => {
  const isVercel = process.env.VERCEL === '1';
  const isProd = (
    process.env.NODE_ENV === 'production'
    || phase === 'phase-production-build'
    || phase === 'phase-production-server'
  );

  return {
    reactStrictMode: false,
    // Vercel expects production output in `.next`.
    distDir: isVercel ? '.next' : (isProd ? '.next.prod' : '.next.dev'),
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'cdn.discordapp.com',
          port: '',
          pathname: '**',
        },
      ]
    }
  };
};

export default nextConfig;
