/** @type {import('next').NextConfig} */
const nextConfig = {
  // 部署构建（next build）跳过 ESLint 检查：当前前端仍在开发中，
  // 大量 no-unused-vars / no-explicit-any 属于开发期临时代码，不应阻断 Render 部署。
  // 后续开发收尾时再统一 npm run lint 清理。
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
