/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow streaming responses for large dumps
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

module.exports = nextConfig
