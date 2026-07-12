/** Shared outbound links for marketing pages */
export const GITHUB_URL = "https://github.com/Ravikumar911/knitly";
export const RELEASES_LATEST_URL = `${GITHUB_URL}/releases/latest`;
export const CONTACT_EMAIL = "hi@slash.cash";

/**
 * Absolute browser_download_url for slash.cash-*-mac-arm64.dmg when resolved
 * at website build time; otherwise the GitHub releases/latest page.
 */
export const MAC_DMG_URL =
  process.env.NEXT_PUBLIC_MAC_DMG_URL ?? RELEASES_LATEST_URL;
