import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "next-themes"

import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "@workspace/ui/components/navigation-menu"
import { Button } from "@workspace/ui/components/button"

import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: {
    default: "Knitly",
    template: "%s | Knitly"
  },
  description: "Connect with like-minded locals and make real-world friendships — powered by AI",
  keywords: ["Knitly", "community", "local events", "AI", "social platform"],
  authors: [
    {
      name: "Knitly",
      url: "https://knitly.com",
    },
  ],
  creator: "Knitly",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
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
                  <span className="font-bold text-xl">Knitly</span>
                </a>
                <NavigationMenu>
                  <NavigationMenuList>
                    <NavigationMenuItem>
                      <NavigationMenuTrigger className="h-9">Features</NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <div className="grid gap-3 p-6 w-[400px]">
                          <NavigationMenuLink asChild>
                            <a href="#features" className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                              <div className="text-sm font-medium leading-none">AI-Powered Matching</div>
                              <p className="line-clamp-2 text-sm leading-snug text-muted-foreground mt-1">
                                Find the perfect local events and communities
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
                                Learn how to join and create communities
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
                <Button variant="ghost" size="sm" className="h-9">Sign In</Button>
                <Button size="sm" className="h-9">Join Beta</Button>
              </div>
            </nav>
          </header>
          <main className="mt-16">{children}</main>
          <footer className="border-t">
            <div className="container flex h-16 items-center justify-between mx-auto">
              <p className="text-sm text-muted-foreground">
                Built with ❤️ by the Knitly team
              </p>
              <div className="flex gap-6">
                <a href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms</a>
                <a href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy</a>
              </div>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  )
}
