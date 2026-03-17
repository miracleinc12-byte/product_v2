import path from "node:path";
import type { NextConfig } from "next";

const dbPath = path.join(process.cwd(), "prisma", "dev.db");

const nextConfig: NextConfig = {
  env: {
    ADMIN_SECRET: process.env.ADMIN_SECRET ?? "admin1234",
    DATABASE_URL: process.env.DATABASE_URL ?? `file:${dbPath}`,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
