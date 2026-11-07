import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static site: `npm run build` writes plain HTML/JS/CSS to out/, which
  // Cloudflare serves as static assets (see wrangler.jsonc). No server needed.
  output: "export",
};

export default nextConfig;
