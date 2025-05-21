
/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      // This pattern is for the default localhost:3000 setup for serve.js
      // If your NEXT_PUBLIC_COMMUNITY_API_URL (for serve.js) is different,
      // (e.g., a public URL for Cloud Workstation: https://3000-your-id.cloudworkstations.dev)
      // you MUST update the following pattern to match its protocol, hostname, and port.
      {
        protocol: 'http', // Adjust to 'https' if your public URL for serve.js uses https
        hostname: 'localhost', // Adjust to your serve.js public hostname if not localhost
        port: '3000', // Adjust to your serve.js public port if not 3000
        pathname: '/uploads/**', // Path for uploaded images served by serve.js
      },
    ],
  },
};

module.exports = nextConfig;
