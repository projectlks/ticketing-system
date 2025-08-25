// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   /* config options here */
// };

// export default nextConfig;


import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // TypeScript
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === "production", // Production မှာသာ ignore
  },

  // ESLint
  eslint: {
    ignoreDuringBuilds: process.env.NODE_ENV === "production", // Production မှာသာ ignore
  },
};

export default nextConfig;

