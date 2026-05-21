/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  /**
   * Dev-only: allow loading `/_next/*` when the site is opened via 127.0.0.1
   * instead of localhost (browser automation, bookmarks, copy-paste URLs).
   * Without this, hydration scripts can fail and the page looks fine but is inert.
   */
  allowedDevOrigins: ["127.0.0.1"],
}

export default nextConfig
