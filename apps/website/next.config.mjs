/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  async redirects() {
    return [
      {
        source: "/swiggy",
        destination: "/connectors",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
