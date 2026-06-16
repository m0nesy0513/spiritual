import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  serverExternalPackages: ["sharp", "@tailwindcss/oxide"],

  // 关键：用 worker_threads 替代 child_process.fork()
  // Windows 安全策略拦截 fork() → spawn EPERM
  experimental: {
    workerThreads: true,
  },
};

export default nextConfig;
