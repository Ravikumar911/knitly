# Research: How does the website point at the latest Mac build?

**Ticket:** [How does the website point at the latest Mac build?](https://github.com/Ravikumar911/knitly/issues/73)  
**Map:** [Desktop becomes primary distribution](https://github.com/Ravikumar911/knitly/issues/67)  
**Blocked by:** [#68 packaging](https://github.com/Ravikumar911/knitly/issues/68) (artifact pattern locked)  
**Date:** 2026-07-12

## Recommendation (decision)

1. **Do not hardcode**  
   `https://github.com/Ravikumar911/knitly/releases/latest/download/slash.cash-<ver>-mac-arm64.dmg`  
   GitHub’s `releases/latest/download/<filename>` only redirects the **tag** to latest; the **filename is literal**. With #68’s `slash.cash-${version}-mac-${arch}.${ext}`, that URL goes stale on every bump (redirect lands on `…/vX.Y.Z/slash.cash-OLD-mac-arm64.dmg` → 404).

2. **Preferred v1 for one-click CTA (keep versioned artifact names):**  
   Resolve the arm64 `.dmg` via the public GitHub Releases API and export a single constant from `apps/website/lib/links.ts` (e.g. `MAC_DMG_URL`). All primary CTAs use that URL; secondary CTA stays “Source on GitHub” → `GITHUB_URL`.

   Resolution options (pick one at implement; A is enough for v1):

   | Option | How | Pros | Cons |
   |--------|-----|------|------|
   | **A. Build-time fetch** | `GET /repos/Ravikumar911/knitly/releases/latest` during `next build` (or a tiny prebuild script); write `MAC_DMG_URL` / fail the build if no matching asset | True one-click; no client GH calls; works with locked filenames | Stale until website rebuild after a desktop release — wire redeploy into release CI (#69) |
   | **B. Request-time resolve** | Server Component / short-lived cache (`revalidate`) fetches API, or a tiny `302` route that is **not** a marketing `/download` page | Always fresh without redeploy | Extra runtime dependency on api.github.com; rate limits / outage behavior |
   | **C. Stable marketing alias (packaging)** | Release CI also uploads `slash.cash-mac-arm64.dmg` (copy of the versioned dmg) | Static URL works forever: `…/releases/latest/download/slash.cash-mac-arm64.dmg` | Needs #69 buy-in; dual asset on every release |

   **Recommend A for website implement**, and **ask #69 to add C as a cheap alias** so marketing can later drop the API/build coupling. Until the first desktop `.dmg` exists on a non-prerelease Release, CTAs should fall back to `https://github.com/Ravikumar911/knitly/releases/latest` (asset list), not npm.

3. **No `/download` marketing page in v1** (locked). Hero / header / footer / shared `InstallCta` are enough.

4. **No checksum UI on marketing v1.** Optional FAQ line on unsigned Gatekeeper (right-click → Open) is enough; leave digests on the GitHub Release page.

5. **Remove** `NPM_URL`, `INSTALL_COMMAND`, and all npm CTAs from marketing surfaces.

### Concrete link shape after resolution

```text
# After API/build resolve (example):
https://github.com/Ravikumar911/knitly/releases/download/v0.2.0/slash.cash-0.2.0-mac-arm64.dmg

# If #69 adds stable alias (optional later):
https://github.com/Ravikumar911/knitly/releases/latest/download/slash.cash-mac-arm64.dmg

# Fallback until first desktop asset ships:
https://github.com/Ravikumar911/knitly/releases/latest
```

Match assets with: name ends with `-mac-arm64.dmg` and starts with `slash.cash-` (ignore `.zip` / `latest-mac.yml` — those are updater-only).

## Why not the naive `latest/download` URL alone?

Verified against this repo:  
`GET …/releases/latest/download/<exact-name>` → `302` to  
`…/releases/download/<latest-tag>/<exact-name>`.  

Latest tag swaps; filename does not. Versioned names from #68 therefore **cannot** be a forever-stable marketing href without knowing `<ver>` or publishing a stable alias.

Linking only to `/releases/latest` (HTML) is a valid **fallback**, but it is not one-click `.dmg` (extra click on the asset). Locked product intent prefers one-click → hence API resolve (A/B) or stable alias (C).

## Current state (`apps/website`)

- `lib/links.ts`: `NPM_URL`, `INSTALL_COMMAND = "npm i -g slashcash"`, `GITHUB_URL`.
- Shared CTA: `components/marketing/install-cta.tsx` → “Install free” → npm + optional command copy.
- Home hero + final band duplicate npm buttons inline (not only via `InstallCta`).
- Header / mobile nav / footer “npm package” still point at npm.
- FAQ + demo step + bento still describe npm install.
- `pricing-tiers.tsx` still has “Install on npm” (component exists; not currently mounted on `app/page.tsx`, but must be fixed before reuse).
- JSON-LD `SoftwareApplication` already claims `operatingSystem: "macOS"` but has **no** `downloadUrl`.

Today’s latest Release assets are still npm tarballs (`slashcash-*.tgz`), not desktop dmgs — website must tolerate “no dmg yet.”

## File touch list (`apps/website`)

| File | Change |
|------|--------|
| `lib/links.ts` | Drop `NPM_URL` / `INSTALL_COMMAND`. Add `MAC_DMG_URL` (resolved) and keep `GITHUB_URL` / `CONTACT_EMAIL`. Optional: `RELEASES_LATEST_URL`, `GITHUB_REPO` constants. |
| `components/marketing/install-cta.tsx` | Primary: “Download for Mac” → `MAC_DMG_URL`. Secondary: GitHub source. Remove command/`Package` npm affordance; drop `showCommand` or repurpose. |
| `app/layout.tsx` | Header “Install free” → Download for Mac. Footer “npm package” → Download for Mac or Releases. JSON-LD: set `downloadUrl` to `MAC_DMG_URL` when known; keep `operatingSystem: "macOS"`. |
| `components/marketing/mobile-nav.tsx` | Sheet CTA → `MAC_DMG_URL`. |
| `app/page.tsx` | Hero primary + final CTA → Download for Mac; rewrite demo “Install” step (desktop-only, no npm); final subcopy (“Setup starts in your terminal” → desktop open / Gatekeeper as needed). |
| `components/marketing/faq-section.tsx` | “What can I try today?” → download Mac `.dmg`, open app, onboard — not npm. |
| `components/marketing/bento-features.tsx` | Replace `npm i -g slashcash` visual with desktop-oriented copy (or open-source / GitHub snippet). |
| `components/marketing/pricing-tiers.tsx` | Free tier CTA “Install on npm” → “Download for Mac” + `MAC_DMG_URL` (even if unused on home today). |
| `app/connectors/page.tsx` | Uses `<InstallCta showCommand />` — inherits shared CTA; drop command. |
| `app/spending-psychology/page.tsx` | Uses `<InstallCta />` — inherits shared CTA. |
| `app/terms/page.tsx` | Soft copy: “Gmail, npm, …” → desktop / GitHub / providers (no install CTA, but remove npm as distribution claim). |

**Out of scope for this ticket’s marketing pass:** root README / CLI docs (separate from `apps/website`). No new `app/download/page.tsx`.

## Implement sketch (not done here)

```ts
// lib/links.ts (conceptual)
export const GITHUB_URL = "https://github.com/Ravikumar911/knitly";
export const RELEASES_LATEST_URL = `${GITHUB_URL}/releases/latest`;
/** Absolute browser_download_url for slash.cash-*-mac-arm64.dmg, or RELEASES_LATEST_URL fallback */
export const MAC_DMG_URL = process.env.NEXT_PUBLIC_MAC_DMG_URL ?? RELEASES_LATEST_URL;
```

Build/prebuild: query `https://api.github.com/repos/Ravikumar911/knitly/releases/latest`, select asset where `name` matches `/^slash\.cash-.+-mac-arm64\.dmg$/`, set `NEXT_PUBLIC_MAC_DMG_URL`. On miss → fallback to `RELEASES_LATEST_URL`.

CTA label: **Download for Mac** (arm64 / Apple Silicon only for v1 — optional one-line FAQ note).

## Risks

- **Stale link (option A):** Mitigate by triggering website redeploy from desktop release workflow (#69), or move to B/C later.
- **Prereleases:** `/releases/latest` ignores prereleases; keep desktop ship as full releases if marketing should see them.
- **Wrong asset:** Prefer `.dmg` only; never link `.zip` / `latest-mac.yml` for humans.
- **Unsigned builds (#68):** First-open Gatekeeper friction — mention in FAQ, not on the hero CTA.
- **API rate limits:** Unauthenticated 60 req/h; build-time once per deploy is fine. Request-time needs caching.

## Answer in one line

**Resolve `slash.cash-*-mac-arm64.dmg` from GitHub’s latest Release (build-time env or cached API) into `MAC_DMG_URL` for every “Download for Mac” CTA; do not rely on `latest/download` with a versioned filename; remove all npm CTAs; optionally ask release CI for a stable `slash.cash-mac-arm64.dmg` alias later.**
