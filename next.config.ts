import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // The dashboard reads test-results.json at runtime; make sure it is bundled into the serverless function.
  outputFileTracingIncludes: {
    "/api/evaluation": ["./test-results.json"],
  },
};

export default nextConfig;
