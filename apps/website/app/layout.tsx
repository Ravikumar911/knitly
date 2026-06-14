import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import Script from "next/script";
import Link from "next/link";
import { Github } from "lucide-react";

import { MobileNav } from "@/components/marketing/mobile-nav";
import { GITHUB_URL, NPM_URL } from "@/lib/links";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://slash.cash"),
  applicationName: "Slash Cash",
  title: {
    default: "Slash Cash — Private spending dashboard for your receipts",
    template: "%s · Slash Cash",
  },
  description:
    "A private spending dashboard that reads receipts from your inbox and runs on your laptop. Start with Swiggy receipts today. No bank login or cloud finance account.",
  keywords: [
    "private spending tracker",
    "expense tracker",
    "receipt tracker",
    "Swiggy expense tracker",
    "Gmail receipt tracker",
    "local personal finance",
    "open-source finance",
    "personal finance dashboard",
    "slash.cash",
  ],
  category: "Finance",
  classification: "Personal finance software",
  authors: [{ name: "Slash Cash", url: "https://slash.cash" }],
  creator: "Slash Cash",
  publisher: "Slash Cash",
  manifest: "/site.webmanifest",
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Slash Cash",
    title: "Slash Cash — Private spending dashboard for your receipts",
    description:
      "Read receipts from your inbox, understand food-delivery spending, and keep the dashboard on your laptop.",
    url: "https://slash.cash",
    images: [
      {
        url: "/images/hero-illustration.jpg",
        width: 1200,
        height: 630,
        alt: "Slash Cash private spending dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Slash Cash — Private spending dashboard for your receipts",
    description:
      "A private spending dashboard that reads receipts from your inbox and runs on your laptop.",
    site: "@slashcash",
    creator: "@slashcash",
    images: ["/images/hero-illustration.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#fafafa" },
  ],
  width: "device-width",
  initialScale: 1,
};

function Header() {
  return (
    <header className="absolute top-0 left-0 right-0 z-50">
      <div className="mx-auto flex h-16 w-full max-w-[1180px] items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center gap-2"
          aria-label="Slash Cash"
        >
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
          <Link href="/#why" className="transition hover:text-neutral-900">
            Why us
          </Link>
          <Link href="/#features" className="transition hover:text-neutral-900">
            Features
          </Link>
          <Link href="/#demo" className="transition hover:text-neutral-900">
            Demo
          </Link>
          <Link href="/#how" className="transition hover:text-neutral-900">
            How it works
          </Link>
          <Link href="/#faq" className="transition hover:text-neutral-900">
            FAQ
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <MobileNav />
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className="hidden sm:inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[0.8rem] font-medium text-neutral-700 transition hover:bg-black/5"
          >
            <Github className="h-3.5 w-3.5" aria-hidden="true" />
            <span>GitHub</span>
          </a>
          <a
            href={NPM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex h-9 items-center rounded-full border border-black/10 bg-white/90 px-3.5 text-[0.82rem] font-semibold text-neutral-800 shadow-sm transition hover:bg-white"
          >
            Install free
          </a>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="relative mt-24 border-t border-black/5">
      <div className="mx-auto max-w-[1180px] px-6 py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link
              href="/"
              className="flex items-center gap-2"
              aria-label="Slash Cash home"
            >
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
              A private spending dashboard that reads receipts from your inbox
              and runs on your laptop. Start with Swiggy receipts today.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs text-neutral-500">
              <span className="rounded-full bg-black/5 px-2.5 py-1">
                Local-first
              </span>
              <span className="rounded-full bg-black/5 px-2.5 py-1">
                Open-source
              </span>
              <span className="rounded-full bg-black/5 px-2.5 py-1">
                Private by default
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-neutral-400">
              Product
            </h3>
            <ul className="mt-4 flex flex-col gap-2.5 text-sm text-neutral-600">
              <li>
                <Link
                  href="/#why"
                  className="transition hover:text-neutral-900"
                >
                  Why us
                </Link>
              </li>
              <li>
                <Link
                  href="/#features"
                  className="transition hover:text-neutral-900"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="/#demo"
                  className="transition hover:text-neutral-900"
                >
                  Demo
                </Link>
              </li>
              <li>
                <Link
                  href="/#how"
                  className="transition hover:text-neutral-900"
                >
                  How it works
                </Link>
              </li>
              <li>
                <Link
                  href="/#faq"
                  className="transition hover:text-neutral-900"
                >
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-neutral-400">
              Resources
            </h3>
            <ul className="mt-4 flex flex-col gap-2.5 text-sm text-neutral-600">
              <li>
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition hover:text-neutral-900"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href={NPM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition hover:text-neutral-900"
                >
                  npm package
                </a>
              </li>
              <li>
                <Link
                  href="/spending-psychology"
                  className="transition hover:text-neutral-900"
                >
                  Spending psychology
                </Link>
              </li>
              <li>
                <Link
                  href="/connectors"
                  className="transition hover:text-neutral-900"
                >
                  Email connectors
                </Link>
              </li>
              <li>
                <span className="text-neutral-400">Private dashboard</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-neutral-400">
              Legal
            </h3>
            <ul className="mt-4 flex flex-col gap-2.5 text-sm text-neutral-600">
              <li>
                <Link
                  href="/privacy"
                  className="transition hover:text-neutral-900"
                >
                  Privacy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="transition hover:text-neutral-900"
                >
                  Terms
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-black/5 pt-6 text-xs text-neutral-400 md:flex-row md:items-center">
          <div>
            © {new Date().getFullYear()} Slash Cash · Built for people, not ad
            businesses.
          </div>
          <div className="font-mono uppercase tracking-[0.18em]">
            v0.1 · open-source · 2026
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
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
              operatingSystem: "macOS",
              description:
                "Private spending dashboard for macOS that reads receipts from your inbox and runs on your laptop.",
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
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <div className="relative">
            <Header />
            <main>{children}</main>
            <Footer />
          </div>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
