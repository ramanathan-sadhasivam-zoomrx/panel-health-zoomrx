/** @type {import('next').NextConfig} */
const nextConfig = {
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
};

module.exports = nextConfig; 