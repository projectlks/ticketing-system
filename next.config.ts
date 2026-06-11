// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   // typedRoutes: true,
//   allowedDevOrigins: ["10.2.11.2"],
//   poweredByHeader: false,
// };

// export default nextConfig;


import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["10.2.11.2"],
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "no-referrer",
          },
          // ⚠️ Content-Security-Policy ကို ဤနေရာမှ ဖယ်ရှားလိုက်ပါပြီ (Middleware က အလုပ်လုပ်ပေးမည်)
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          }
        ],
      },
    ];
  },
};

export default nextConfig;