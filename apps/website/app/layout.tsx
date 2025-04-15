import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "next-themes"
import { Analytics } from "@vercel/analytics/react"
import Script from "next/script"

import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "@workspace/ui/components/navigation-menu"
import { Button } from "@workspace/ui/components/button"

import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  metadataBase: new URL('https://slash.cash'),
  title: {
    default: "Slash - Slash Your Spendings Effortlessly",
    template: "%s | Slash"
  },
  description: "Take control of your expenses with Slash. Track Food & Grocery, Travel, and Subscriptions. Slash your spendings, not your lifestyle.",
  keywords: ["spending tracker", "budget app", "expense management", "food and grocery tracking", "travel expenses", "subscription management", "personal finance", "slash app"],
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
    title: "Slash - Slash Your Spendings Effortlessly",
    description: "Take control of your expenses with Slash. Track Food & Grocery, Travel, and Subscriptions. Slash your spendings, not your lifestyle.",
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
    title: "Slash - Slash Your Spendings Effortlessly",
    description: "Take control of your expenses with Slash. Track Food & Grocery, Travel, and Subscriptions. Slash your spendings, not your lifestyle.",
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
    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
      <div>
        <h3 className="font-medium mb-3">Platform</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li><a href="/" className="hover:underline">Home</a></li>
          <li><a href="/#features" className="hover:underline">Features</a></li>
          <li><a href="/#pricing" className="hover:underline">Pricing</a></li>
        </ul>
      </div>
      
      <div>
        <h3 className="font-medium mb-3">Blog</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li><a href="/spending-psychology" className="hover:underline">Spending Psychology</a></li>
          <li><a href="/#blog" className="hover:underline">All Articles</a></li>
        </ul>
      </div>
      
      <div>
        <h3 className="font-medium mb-3">Support</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li><a href="/#contact" className="hover:underline">Contact</a></li>
          <li><a href="/#faq" className="hover:underline">FAQ</a></li>
        </ul>
      </div>
      
      <div>
        <h3 className="font-medium mb-3">Legal</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li><a href="/#privacy" className="hover:underline">Privacy Policy</a></li>
          <li><a href="/#terms" className="hover:underline">Terms of Service</a></li>
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
              "description": "Slash helps you automatically track and categorize your spendings across Food & Grocery, Travel, and Subscriptions. Get instant insights and start saving.",
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
        <Script
          id="structured-data-faq"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": [
                {
                  "@type": "Question",
                  "name": "How does Slash track my expenses?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Slash automatically imports and categorizes your transactions from connected accounts or imported statements. No manual entry required."
                  }
                },
                {
                  "@type": "Question",
                  "name": "What categories does Slash support?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Slash supports Food Delivery, Groceries, Travel & Transport, Subscriptions, and more."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Is Slash free to use?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Yes, Slash offers a free plan for all users."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Can I track subscriptions with Slash?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Yes, Slash automatically finds and tracks all your recurring subscriptions."
                  }
                }
              ]
            })
          }}
        />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <header className="fixed top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <nav className="container flex h-16 items-center justify-between mx-auto">
              <div className="flex items-center gap-6">
                <a href="/" className="flex items-center space-x-2">
                  <span className="font-bold text-xl">slash.cash</span>
                </a>
                <NavigationMenu>
                  <NavigationMenuList>
                    <NavigationMenuItem>
                      <NavigationMenuTrigger className="h-9">Features</NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <div className="grid gap-3 p-6 w-[400px]">
                          <NavigationMenuLink asChild>
                            <a href="#features" className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                              <div className="text-sm font-medium leading-none">AI Finance Assistant</div>
                              <p className="line-clamp-2 text-sm leading-snug text-muted-foreground mt-1">
                                Track spending and save money automatically
                              </p>
                            </a>
                          </NavigationMenuLink>
                        </div>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                    <NavigationMenuItem>
                      <NavigationMenuTrigger className="h-9">How It Works</NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <div className="grid gap-3 p-6 w-[400px]">
                          <NavigationMenuLink asChild>
                            <a href="#how-it-works" className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                              <div className="text-sm font-medium leading-none">Get Started</div>
                              <p className="line-clamp-2 text-sm leading-snug text-muted-foreground mt-1">
                                Connect Gmail and start tracking your expenses
                              </p>
                            </a>
                          </NavigationMenuLink>
                        </div>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  </NavigationMenuList>
                </NavigationMenu>
              </div>
              <div className="flex items-center gap-4">
                <a href="https://app.slash.cash" target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="sm" className="h-9">Sign In</Button>
                </a>
                <Button size="sm" className="h-9">Join Beta</Button>
              </div>
            </nav>
          </header>
          <main className="mt-16">{children}</main>
          <footer className="py-12 bg-muted/40 mt-auto border-t">
            <div className="max-w-[1100px] mx-auto px-4">
              <FooterNav />
              
              <div className="border-t border-muted-foreground/10 pt-6 flex flex-col md:flex-row items-center justify-between">
                <div className="text-xs text-muted-foreground">© 2025 Slash. Built with 💰 in India.</div>
                <div className="flex space-x-4 mt-4 md:mt-0">
                  <a href="#" className="text-muted-foreground hover:text-primary">
                    <span className="sr-only">Twitter</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-twitter"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
                  </a>
                  <a href="#" className="text-muted-foreground hover:text-primary">
                    <span className="sr-only">Instagram</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-instagram"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                  </a>
                </div>
              </div>
            </div>
          </footer>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
