/** @type {import('next').NextConfig} */
const config = {
  output: "standalone",
  serverExternalPackages: ["keytar"],
  transpilePackages: ["@workspace/ui", "@workspace/tasks"],
};

export default config;
