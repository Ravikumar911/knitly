const GITHUB_REPO = "Ravikumar911/knitly";
const RELEASES_LATEST_URL = `https://github.com/${GITHUB_REPO}/releases/latest`;
const MAC_DMG_ASSET_RE = /^slash\.cash-.+-mac-arm64\.dmg$/;

/**
 * Resolve the latest Apple Silicon .dmg from GitHub Releases at build time.
 * Falls back to the releases page when no matching asset exists yet.
 */
async function resolveMacDmgUrl() {
  if (process.env.NEXT_PUBLIC_MAC_DMG_URL) {
    return process.env.NEXT_PUBLIC_MAC_DMG_URL;
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "slash-cash-website-build",
        },
      },
    );

    if (!response.ok) {
      return RELEASES_LATEST_URL;
    }

    const release = await response.json();
    const asset = (release.assets ?? []).find((item) =>
      MAC_DMG_ASSET_RE.test(item.name),
    );

    return asset?.browser_download_url ?? RELEASES_LATEST_URL;
  } catch {
    return RELEASES_LATEST_URL;
  }
}

/** @type {() => Promise<import('next').NextConfig>} */
const nextConfig = async () => {
  const macDmgUrl = await resolveMacDmgUrl();

  return {
    transpilePackages: ["@workspace/ui"],
    env: {
      NEXT_PUBLIC_MAC_DMG_URL: macDmgUrl,
    },
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
};

export default nextConfig;
