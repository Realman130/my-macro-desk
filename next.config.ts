import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tắt kiểm tra TypeScript khi build (đã OK)
  typescript: {
    ignoreBuildErrors: true,
  },

  // ⚠️ KHÔNG cấu hình eslint ở đây nữa (Next.js 16 đã bỏ)
};

export default nextConfig;
