import bundleAnalyzer from "@next/bundle-analyzer"
import nextPWA from "next-pwa"

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true"
})

const withPWA = nextPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
})

const baseConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost"
      },
      {
        protocol: "http",
        hostname: "127.0.0.1"
      },
      {
        protocol: "https",
        hostname: "**"
      }
    ],
    unoptimized: true
  },
  experimental: {
    serverComponentsExternalPackages: ["sharp", "onnxruntime-node"]
  },
  // Security headers configuration
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'none'"
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ]
  }
}

// Apply the configurations in order
export default withBundleAnalyzer(withPWA(baseConfig))
