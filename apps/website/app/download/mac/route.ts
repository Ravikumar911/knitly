import { NextResponse } from "next/server";

const GITHUB_REPO = "Ravikumar911/knitly";
const RELEASES_LATEST_URL = `https://github.com/${GITHUB_REPO}/releases/latest`;
const RELEASES_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
const MAC_DMG_ASSET_RE = /^slash\.cash-.+-mac-arm64\.dmg$/;

type GitHubReleaseAsset = {
  name?: unknown;
  browser_download_url?: unknown;
};

type GitHubRelease = {
  assets?: GitHubReleaseAsset[];
};

function findMacDmgUrl(release: GitHubRelease) {
  const asset = release.assets?.find(
    (item) =>
      typeof item.name === "string" &&
      MAC_DMG_ASSET_RE.test(item.name) &&
      typeof item.browser_download_url === "string",
  );

  return typeof asset?.browser_download_url === "string"
    ? asset.browser_download_url
    : RELEASES_LATEST_URL;
}

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const response = await fetch(RELEASES_API_URL, {
      cache: "no-store",
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "slash-cash-website-download",
      },
    });

    if (!response.ok) {
      return NextResponse.redirect(RELEASES_LATEST_URL, 302);
    }

    const release = (await response.json()) as GitHubRelease;
    return NextResponse.redirect(findMacDmgUrl(release), 302);
  } catch {
    return NextResponse.redirect(RELEASES_LATEST_URL, 302);
  }
}
