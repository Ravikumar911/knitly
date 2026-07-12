/** @type {import('next').NextConfig} */
const config = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3", "keytar", "imapflow"],
  transpilePackages: ["@workspace/ui", "@workspace/tasks"],
  webpack(nextConfig, { isServer }) {
    nextConfig.resolve = nextConfig.resolve ?? {};
    nextConfig.resolve.extensionAlias = {
      ...(nextConfig.resolve.extensionAlias ?? {}),
      ".js": [".ts", ".tsx", ".js"],
    };

    if (isServer) {
      nextConfig.externals.push({
        "better-sqlite3": "commonjs better-sqlite3",
      });
    }

    return nextConfig;
  },
};

export default config;
