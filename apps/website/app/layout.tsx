import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "next-themes"
import Script from "next/script"
import Link from "next/link"

import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "@workspace/ui/components/navigation-menu"
import { RainbowButton } from "@workspace/ui/components/magicui/rainbow-button"


import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  metadataBase: new URL('https://slash.cash'),
  title: {
    default: "Slash - Your Personal Finance Assistant",
    template: "%s | Slash"
  },
  description: "AI-powered personal finance that starts with Swiggy analytics and expands to track all your expenses automatically through email analysis.",
  keywords: ["AI finance", "expense tracking", "swiggy analytics", "personal finance", "automatic expense tracking", "email analysis", "budget app"],
  authors: [
    {
      name: "slash.cash",
      url: "https://slash.cash",
    },
  ],
  creator: "slash.cash",
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Slash",
    title: "Slash - Your Personal Finance Assistant",
    description: "AI-powered personal finance that starts with Swiggy analytics and expands to track all your expenses automatically through email analysis.",
    url: "https://slash.cash",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Slash App"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Slash - Your Personal Finance Assistant",
    description: "AI-powered personal finance that starts with Swiggy analytics and expands to track all your expenses automatically through email analysis.",
    site: "@slashcash",
    creator: "@slashcash",
    images: ["/og-image.png"]
  },
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
  viewport: "width=device-width, initial-scale=1",
}

// Component to handle active link highlighting based on path
function FooterNav() {
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
      <div>
        <h3 className="font-medium mb-3">Product</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li><Link href="/" className="hover:underline">Home</Link></li>
          <li><Link href="/swiggy" className="hover:underline">Swiggy Analytics</Link></li>
        </ul>
      </div>
      
      <div>
        <h3 className="font-medium mb-3">Resources</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li><Link href="/spending-psychology" className="hover:underline">Spending Psychology</Link></li>
        </ul>
      </div>
      
      <div>
        <h3 className="font-medium mb-3">Legal</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li><Link href="/privacy" className="hover:underline">Privacy Policy</Link></li>
          <li><Link href="/terms" className="hover:underline">Terms of Service</Link></li>
        </ul>
      </div>
    </div>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Favicon links */}
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
              "name": "Slash",
              "url": "https://slash.cash",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://slash.cash/search?q={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
        <Script
          id="structured-data-app"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Slash",
              "url": "https://slash.cash/",
              "applicationCategory": "FinanceApplication",
              "operatingSystem": "All",
              "description": "AI-powered personal finance assistant that automatically tracks expenses through email analysis, starting with Swiggy analytics.",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "publisher": {
                "@type": "Organization",
                "name": "Slash",
                "url": "https://slash.cash/"
              }
            })
          }}
        />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <header className="fixed top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <nav className="container flex h-16 items-center justify-between mx-auto">
              <div className="flex items-center gap-6">
                <Link href="/" className="flex items-center space-x-2">
                  <span className="font-bold text-xl">slash.cash</span>
                </Link>
                <NavigationMenu>
                  <NavigationMenuList>
                    <NavigationMenuItem>
                      <NavigationMenuLink asChild>
                        <Link href="/swiggy" className="text-sm font-medium hover:text-primary transition-colors">
                          Swiggy Analytics
                        </Link>
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                  </NavigationMenuList>
                </NavigationMenu>
              </div>
                            <div className="flex items-center gap-4">
                <a href="https://app.slash.cash" target="_blank" rel="noopener noreferrer">
                  <RainbowButton size="default">Sign In</RainbowButton>
                </a>
              </div>
            </nav>
          </header>
          <main className="mt-16">{children}</main>
          <footer className="py-12 bg-muted/40 mt-auto border-t">
            <div className="max-w-[1100px] mx-auto px-4">
              <FooterNav />
              
              <div className="border-t border-muted-foreground/10 pt-6 flex flex-col md:flex-row items-center justify-between">
                <div className="text-xs text-muted-foreground">© 2025 Slash. Your Personal Finance Assistant.</div>
              </div>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  )
}
