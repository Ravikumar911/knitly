/** @type {import('next').NextConfig} */
const config = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3", "keytar"],
  transpilePackages: ["@workspace/ui", "@workspace/tasks"],
  webpack(nextConfig, { isServer }) {
    if (isServer) {
      nextConfig.externals.push({
        "better-sqlite3": "commonjs better-sqlite3",
      });
    }

    return nextConfig;
  },
};

export default config;
