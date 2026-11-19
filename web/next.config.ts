import type { NextConfig } from "next";

import { basePath } from "./src/lib/base-path";

const bakedAddress = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "").trim();
if (bakedAddress) {
  throw new Error(
    "Refusing to build: NEXT_PUBLIC_CONTRACT_ADDRESS must stay empty. Paste a real address in the page after the owner deploys. Do not bake a specimen or guessed address into the static site.",
  );
}

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
