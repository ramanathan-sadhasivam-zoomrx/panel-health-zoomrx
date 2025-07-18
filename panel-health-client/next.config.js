/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure for serving from Express.js backend
  trailingSlash: true,
  generateEtags: false,
  
  // Skip build errors during the build process
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // API calls should go to the same server
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
  
  async redirects() {
    return [
      {
        source: '/nps',
        destination: '/',
        permanent: false,
      },
      {
        source: '/survey-ux',
        destination: '/',
        permanent: false,
      },
    ];
  },
  
  // Output configuration for integration with Express
  output: 'standalone',
};

module.exports = nextConfig; 