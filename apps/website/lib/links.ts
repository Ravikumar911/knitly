/** Shared outbound links for marketing pages */
export const GITHUB_URL = "https://github.com/Ravikumar911/knitly";
export const RELEASES_LATEST_URL = `${GITHUB_URL}/releases/latest`;
export const CONTACT_EMAIL = "hi@slash.cash";

/**
 * Stable website endpoint that resolves the current macOS .dmg at click time.
 * This avoids baking a GitHub releases fallback into static marketing pages.
 */
export const MAC_DMG_URL = "/download/mac";
export const SOFTWARE_DOWNLOAD_URL = `https://slash.cash${MAC_DMG_URL}`;
