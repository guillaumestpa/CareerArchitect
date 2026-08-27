import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace package ships raw .ts source (no build step) — must be transpiled
  // by Next's own pipeline rather than treated as pre-built node_modules code.
  transpilePackages: ["@career-architect/shared"],
};

export default nextConfig;
