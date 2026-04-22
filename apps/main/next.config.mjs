/** @type {import('next').NextConfig} */
const config = {
  output: "standalone",
  transpilePackages: ["@workspace/ui", "@workspace/tasks"],
}

export default config
