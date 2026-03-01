import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  reactCompiler: true,
  typedRoutes: true,
  // how to configure @svgr/webpack: https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack#configuring-webpack-loaders
  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
  async redirects() {
    return [
      {
        source: "/subject/:ico",
        destination: "/company/:ico",
        permanent: true,
      },
      {
        source: "/justice/:ico",
        destination: "/company/:ico",
        permanent: true,
      },
      {
        source: "/justice",
        destination: "/",
        permanent: true,
      },
      {
        source: "/companies/search",
        destination: "/",
        permanent: true,
      },
      {
        source: "/companies/:ico",
        destination: "/company/:ico",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
