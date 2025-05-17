/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { 
    unoptimized: true,
    domains: ['res.cloudinary.com']
  },
  experimental: {
    serverActions: true
  },
  webpack: (config) => {
    config.cache = false;
    return config;
  },
  output: 'standalone'
};

module.exports = nextConfig;