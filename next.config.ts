import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server rendering for Railway — API routes (MercadoPago, ARCA) now work natively
  output: "standalone",
};

export default nextConfig;
