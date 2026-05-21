import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "next-themes"
import Script from "next/script"
import Link from "next/link"
import { Github } from "lucide-react"

import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL("https://slash.cash"),
  title: {
    default: "Slash Cash — Your AI finance team that actually fixes things",
    template: "%s · Slash Cash",
  },
  description:
    "Local-first personal finance: open-source slashcash CLI, SQLite on your machine, read-only connectors, seven small agents for categorization and weekly review. Optional assistant; no hosted ledger.",
  keywords: [
    "ai personal finance",
    "expense tracker",
    "money management app",
    "subscription tracker",
    "credit card tracker",
    "upi tracker",
    "open-source finance",
    "private finance app",
    "slash.cash",
  ],
  authors: [{ name: "Slash Cash", url: "https://slash.cash" }],
  creator: "Slash Cash",
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Slash Cash",
    title: "Slash Cash — Your AI finance team that actually fixes things",
    description:
      "Open-source CLI and local dashboard: SQLite ledger on your device, read-only connectors, seven agents for spends and weekly review. Optional assistant.",
    url: "https://slash.cash",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Slash Cash — Your AI finance team",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Slash Cash — Your AI finance team that actually fixes things",
    description:
      "Open-source slashcash CLI: local SQLite ledger, read-only connectors, seven agents, optional assistant.",
    site: "@slashcash",
    creator: "@slashcash",
    images: ["/og-image.png"],
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#fafafa" },
  ],
  width: "device-width",
  initialScale: 1,
}

function Header() {
  return (
    <header className="absolute top-0 left-0 right-0 z-50">
      <div className="mx-auto flex h-16 w-full max-w-[1180px] items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2" aria-label="Slash Cash">
          <span
            className="grid h-6 w-6 place-items-center rounded-md text-[0.78rem] font-bold text-white"
            style={{
              background:
                "linear-gradient(135deg, var(--slash-grad-1), var(--slash-grad-3))",
            }}
            aria-hidden="true"
          >
            /
          </span>
          <span className="text-[0.95rem] font-semibold tracking-tight">
            slash<span className="text-neutral-400">.cash</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-[0.85rem] font-medium text-neutral-600">
          <Link href="/#why" className="transition hover:text-neutral-900">Why us</Link>
          <Link href="/#features" className="transition hover:text-neutral-900">Features</Link>
          <Link href="/#agents" className="transition hover:text-neutral-900">Agents</Link>
          <Link href="/#how" className="transition hover:text-neutral-900">How it works</Link>
          <Link href="/#pricing" className="transition hover:text-neutral-900">Pricing</Link>
          <Link href="/#faq" className="transition hover:text-neutral-900">FAQ</Link>
        </nav>

        <div className="flex items-center gap-2">
          <a
            href="https://github.com/slashcash"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className="hidden sm:inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[0.8rem] font-medium text-neutral-700 transition hover:bg-black/5"
          >
            <Github className="h-3.5 w-3.5" aria-hidden="true" />
            <span>GitHub</span>
          </a>
          <a
            href="https://www.npmjs.com/package/slashcash"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center rounded-full border border-black/10 bg-white/90 px-3.5 text-[0.82rem] font-semibold text-neutral-800 shadow-sm transition hover:bg-white"
          >
            Install CLI
          </a>
        </div>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="relative mt-24 border-t border-black/5">
      <div className="mx-auto max-w-[1180px] px-6 py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2" aria-label="Slash Cash home">
              <span
                className="grid h-7 w-7 place-items-center rounded-md text-[0.85rem] font-bold text-white"
                style={{
                  background:
                    "linear-gradient(135deg, var(--slash-grad-1), var(--slash-grad-3))",
                }}
                aria-hidden="true"
              >
                /
              </span>
              <span className="text-[1rem] font-semibold tracking-tight">
                slash.cash
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-neutral-500">
              A local-first finance dashboard and CLI: SQLite on your disk,
              read-only connectors, optional assistant. Open-source core; paid
              tiers later for workflows — not rent on your own transactions.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs text-neutral-500">
              <span className="rounded-full bg-black/5 px-2.5 py-1">Local-first</span>
              <span className="rounded-full bg-black/5 px-2.5 py-1">Open-source</span>
              <span className="rounded-full bg-black/5 px-2.5 py-1">Private by default</span>
            </div>
          </div>

          <div>
            <h3 className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-neutral-400">
              Product
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm text-neutral-600">
              <li><Link href="/#why" className="transition hover:text-neutral-900">Why us</Link></li>
              <li><Link href="/#features" className="transition hover:text-neutral-900">Features</Link></li>
              <li><Link href="/#agents" className="transition hover:text-neutral-900">Agents</Link></li>
              <li><Link href="/#how" className="transition hover:text-neutral-900">How it works</Link></li>
              <li><Link href="/#pricing" className="transition hover:text-neutral-900">Pricing</Link></li>
              <li><Link href="/#faq" className="transition hover:text-neutral-900">FAQ</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-neutral-400">
              Resources
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm text-neutral-600">
              <li>
                <a href="https://github.com/slashcash" target="_blank" rel="noopener noreferrer" className="transition hover:text-neutral-900">
                  GitHub
                </a>
              </li>
              <li>
                <a href="https://www.npmjs.com/package/slashcash" target="_blank" rel="noopener noreferrer" className="transition hover:text-neutral-900">
                  npm package
                </a>
              </li>
              <li><Link href="/spending-psychology" className="transition hover:text-neutral-900">Spending psychology</Link></li>
              <li><Link href="/swiggy" className="transition hover:text-neutral-900">Email connectors</Link></li>
              <li>
                <span className="text-neutral-400">Local dashboard via CLI</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-neutral-400">
              Legal
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm text-neutral-600">
              <li><Link href="/privacy" className="transition hover:text-neutral-900">Privacy</Link></li>
              <li><Link href="/terms" className="transition hover:text-neutral-900">Terms</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-black/5 pt-6 text-xs text-neutral-400 md:flex-row md:items-center">
          <div>© {new Date().getFullYear()} Slash Cash · Built for people, not ad businesses.</div>
          <div className="font-mono uppercase tracking-[0.18em]">
            v0.1 · open-source · 2026
          </div>
        </div>
      </div>
    </footer>
  )
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="shortcut icon" href="/favicon.ico" />

        <Script
          id="structured-data-website"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Slash Cash",
              url: "https://slash.cash",
            }),
          }}
        />
        <Script
          id="structured-data-app"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Slash Cash",
              url: "https://slash.cash/",
              applicationCategory: "FinanceApplication",
              operatingSystem: "macOS, Linux, Windows",
              description:
                "Open-source local-first finance: slashcash CLI, SQLite on your machine, read-only connectors, optional assistant. No hosted transaction ledger.",
              offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
              publisher: {
                "@type": "Organization",
                name: "Slash Cash",
                url: "https://slash.cash/",
              },
            }),
          }}
        />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <div className="relative">
            <Header />
            <main>{children}</main>
            <Footer />
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
