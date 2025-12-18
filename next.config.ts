import type { NextConfig } from "next";

const nextConfig = (phase: string): NextConfig => {
  const isProd = (
    process.env.NODE_ENV === 'production'
    || phase === 'phase-production-build'
    || phase === 'phase-production-server'
  );

  return {
    reactStrictMode: false,
    distDir: isProd ? '.next.prod' : '.next.dev',
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
