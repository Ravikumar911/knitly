import { Metadata } from "next"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@workspace/ui/components/carousel"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Progress } from "@workspace/ui/components/progress"
import Head from "next/head"

export const metadata: Metadata = {
  title: "Slash - Slash Your Spendings Effortlessly",
  description: "Take control of your expenses with Slash. Track Food & Grocery, Travel, and Subscriptions. Slash your spendings, not your lifestyle.",
  keywords: [
    "spending tracker",
    "budget app",
    "expense management",
    "food and grocery tracking",
    "travel expenses",
    "subscription management",
    "personal finance",
    "slash app"
  ],
  openGraph: {
    title: "Slash - Slash Your Spendings Effortlessly",
    description: "Take control of your expenses with Slash.",
    type: "website",
    locale: "en_US",
    siteName: "Slash"
  },
  twitter: {
    card: "summary_large_image",
    title: "Slash - Slash Your Spendings Effortlessly",
    description: "Take control of your expenses with Slash."
  }
}

export default function HomePage() {
  return (
    <>
      <Head>
        <title>Slash - Slash Your Spendings Effortlessly</title>
        <meta name="description" content="Take control of your expenses with Slash. Track Food & Grocery, Travel, and Subscriptions. Slash your spendings, not your lifestyle." />
        <meta name="keywords" content="spending tracker, budget app, expense management, food and grocery tracking, travel expenses, subscription management, personal finance, slash app, automatic expense tracker, financial insights, save money, track subscriptions, track groceries, track travel, money management, expense analytics, financial dashboard" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://slashapp.com/" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:site_name" content="Slash" />
        <meta property="og:title" content="Slash - Slash Your Spendings Effortlessly" />
        <meta property="og:description" content="Take control of your expenses with Slash. Track Food & Grocery, Travel, and Subscriptions. Slash your spendings, not your lifestyle." />
        <meta property="og:url" content="https://slashapp.com/" />
        <meta property="og:image" content="https://slashapp.com/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Slash - Slash Your Spendings Effortlessly" />
        <meta name="twitter:description" content="Take control of your expenses with Slash. Track Food & Grocery, Travel, and Subscriptions. Slash your spendings, not your lifestyle." />
        <meta name="twitter:image" content="https://slashapp.com/og-image.png" />
        <meta name="twitter:site" content="@slashapp" />
        <meta name="twitter:creator" content="@slashapp" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: `{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "Slash",
          "url": "https://slashapp.com/",
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
            "url": "https://slashapp.com/"
          }
        }`}} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: `{
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
        }`}} />
        <html lang="en" />
      </Head>
      <div className="flex flex-col min-h-screen bg-background">
        {/* Hero Section */}
        <section className="flex-1 flex flex-col items-center justify-center px-4 py-20 md:py-32 relative overflow-hidden">
          <div className="absolute inset-0 hero-gradient opacity-40" />
          <div className="relative z-10 max-w-[900px] mx-auto text-center">
            <Badge variant="secondary" className="mb-6 text-sm px-4 py-1">
              Your AI Finance Assistant
            </Badge>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-b from-primary to-foreground/80">
              Slash Your Spendings. Save Smarter.
            </h1>
            <h2 className="text-2xl md:text-3xl font-semibold text-primary mb-6">
              Your AI-powered finance assistant that reads your emails, tracks your credit card transactions, flags hidden subscriptions, and shows you where your money is leaking—so you can spend smarter and live better.
            </h2>
            <div className="flex items-center justify-center gap-4 mb-4">
              <Button size="lg" className="h-12 px-8">Get Early Access for Free →</Button>
              <Button size="lg" variant="outline" className="h-12 px-8">Watch Demo →</Button>
            </div>
            <div className="text-sm text-muted-foreground font-medium mb-8">No credit card required</div>
            {/* Hero Imagery Placeholder */}
            <div className="flex justify-center mt-8">
              <img
                src="/hero-illustration.png"
                alt="Person cutting a credit card bill in half or dashboard screenshot"
                className="w-full max-w-xl rounded-xl shadow-lg object-cover"
                loading="lazy"
                style={{ aspectRatio: '16/9' }}
              />
            </div>
          </div>
        </section>

        {/* How Slash Works */}
        <section className="py-16 bg-muted/30">
          <div className="max-w-[1100px] mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">How Slash Works</h2>
            <div className="grid md:grid-cols-4 gap-8">
              <Card className="bg-background/60">
                <CardHeader>
                  <CardTitle className="text-xl">1. Connect Your Gmail (Securely)</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  Slash uses OAuth 2.0 to request read-only access to financial emails.<br />
                  Only scans transactional data (banks, UPI, wallets, credit cards, subscriptions).<br />
                  No personal or non-financial emails are accessed.
                </CardContent>
              </Card>
              <Card className="bg-background/60">
                <CardHeader>
                  <CardTitle className="text-xl">2. AI Parses and Categorizes Everything</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  Merchant and category classification (e.g. Zomato → Food & Dining).<br />
                  Supports multiple banks, wallets, and credit cards.<br />
                  Smart deduplication prevents double-counting.
                </CardContent>
              </Card>
              <Card className="bg-background/60">
                <CardHeader>
                  <CardTitle className="text-xl">3. Real-Time Finance Dashboard</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  Visualize monthly burn, top spend categories, and category-wise split.<br />
                  EMI, interest payments, and credit card due dates highlighted.<br />
                  Trends, warnings, and comparisons.
                </CardContent>
              </Card>
              <Card className="bg-background/60">
                <CardHeader>
                  <CardTitle className="text-xl">4. Ask Slash Anything</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  Chat interface for questions like:<br />
                  "How much did I spend on food last month?"<br />
                  "Which subscriptions are active?"<br />
                  "How much interest am I paying in total?"<br />
                  Slash replies with accurate, data-backed answers.
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Key Features */}
        <section className="py-16 bg-background">
          <div className="max-w-[1100px] mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Key Features</h2>
            <div className="grid md:grid-cols-4 gap-8 text-center">
              <div>
                <span className="text-4xl">🔄</span>
                <h3 className="font-semibold mt-2 mb-1">Email-Based Spend Tracking</h3>
                <p className="text-muted-foreground text-sm">No need to enter expenses manually. Slash reads your financial emails for you.</p>
              </div>
              <div>
                <span className="text-4xl">🧠</span>
                <h3 className="font-semibold mt-2 mb-1">Smart Spend Insights</h3>
                <p className="text-muted-foreground text-sm">Detects hidden fees, late charges, and flags savings opportunities.</p>
              </div>
              <div>
                <span className="text-4xl">🔍</span>
                <h3 className="font-semibold mt-2 mb-1">Duplicate Charge Detector</h3>
                <p className="text-muted-foreground text-sm">Fuzzy matching and merchant normalization to avoid over-reporting spends.</p>
              </div>
              <div>
                <span className="text-4xl">💬</span>
                <h3 className="font-semibold mt-2 mb-1">AI Chat for Finance</h3>
                <p className="text-muted-foreground text-sm">Ask your data anything. Slash responds in natural language with real insights.</p>
              </div>
              <div>
                <span className="text-4xl">📅</span>
                <h3 className="font-semibold mt-2 mb-1">Subscription Tracker</h3>
                <p className="text-muted-foreground text-sm">Detects active subscriptions, shows renewal dates, and notifies before charges.</p>
              </div>
              <div>
                <span className="text-4xl">⚠️</span>
                <h3 className="font-semibold mt-2 mb-1">Overspend Alerts</h3>
                <p className="text-muted-foreground text-sm">Set monthly limits and get alerted when you breach a threshold.</p>
              </div>
              <div>
                <span className="text-4xl">📈</span>
                <h3 className="font-semibold mt-2 mb-1">Timeline View</h3>
                <p className="text-muted-foreground text-sm">Visual trend of spending across 3, 6, or 12 months. See if you're improving.</p>
              </div>
              <div>
                <span className="text-4xl">🔐</span>
                <h3 className="font-semibold mt-2 mb-1">Private and Secure</h3>
                <p className="text-muted-foreground text-sm">No third-party tracking, no ads, no reselling data. Bank-level encryption.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Who Is Slash For? */}
        <section className="py-16 bg-muted/30">
          <div className="max-w-[900px] mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">Who Is Slash For?</h2>
            <div className="grid md:grid-cols-4 gap-8 text-center">
              <div>
                <span className="text-4xl">📱</span>
                <h3 className="font-semibold mt-2 mb-1">Young professionals</h3>
                <p className="text-muted-foreground text-sm">Who want to save smarter</p>
              </div>
              <div>
                <span className="text-4xl">💳</span>
                <h3 className="font-semibold mt-2 mb-1">Credit card users</h3>
                <p className="text-muted-foreground text-sm">With high monthly spends</p>
              </div>
              <div>
                <span className="text-4xl">📦</span>
                <h3 className="font-semibold mt-2 mb-1">Subscription-heavy users</h3>
                <p className="text-muted-foreground text-sm">Netflix, Spotify, etc.</p>
              </div>
              <div>
                <span className="text-4xl">💼</span>
                <h3 className="font-semibold mt-2 mb-1">Founders & freelancers</h3>
                <p className="text-muted-foreground text-sm">Juggling multiple payments</p>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-16 bg-background">
          <div className="max-w-[900px] mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">Testimonials</h2>
            <Carousel>
              <CarouselContent>
                <CarouselItem>
                  <Card className="bg-background/60">
                    <CardContent className="flex flex-col items-center py-8">
                      <Avatar className="mb-4 w-16 h-16">
                        <AvatarImage src="/avatars/aarav.png" alt="Aarav" />
                        <AvatarFallback>AR</AvatarFallback>
                      </Avatar>
                      <div className="text-lg font-medium mb-2">"I had 12 subscriptions I didn't even realize were active. Slash saved me ₹9,000+ in two months."</div>
                      <div className="text-muted-foreground text-sm">— Aarav, Hyderabad</div>
                    </CardContent>
                  </Card>
                </CarouselItem>
                <CarouselItem>
                  <Card className="bg-background/60">
                    <CardContent className="flex flex-col items-center py-8">
                      <Avatar className="mb-4 w-16 h-16">
                        <AvatarImage src="/avatars/meena.png" alt="Meena" />
                        <AvatarFallback>MN</AvatarFallback>
                      </Avatar>
                      <div className="text-lg font-medium mb-2">"Slash helped me understand my true credit card interest cost. I immediately switched to EMI conversion."</div>
                      <div className="text-muted-foreground text-sm">— Meena, Mumbai</div>
                    </CardContent>
                  </Card>
                </CarouselItem>
                <CarouselItem>
                  <Card className="bg-background/60">
                    <CardContent className="flex flex-col items-center py-8">
                      <Avatar className="mb-4 w-16 h-16">
                        <AvatarImage src="/avatars/rahul.png" alt="Rahul" />
                        <AvatarFallback>RH</AvatarFallback>
                      </Avatar>
                      <div className="text-lg font-medium mb-2">"Now I ask Slash every week—'where did my money go?' and it tells me with brutal honesty."</div>
                      <div className="text-muted-foreground text-sm">— Rahul, Bengaluru</div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-16 bg-muted/30">
          <div className="max-w-[1100px] mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">Pricing (Launch Phase)</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="bg-background/60">
                <CardHeader>
                  <CardTitle className="text-xl">Free Plan</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  Track last 90 days of email-based transactions<br />
                  Access to all insights & chatbot
                </CardContent>
              </Card>
              <Card className="bg-background/60">
                <CardHeader>
                  <CardTitle className="text-xl">Pro Plan (Coming Soon)</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  ₹99/month<br />
                  Full 1-year spend history<br />
                  Multi-email account support<br />
                  Export reports
                </CardContent>
              </Card>
              <Card className="bg-background/60">
                <CardHeader>
                  <CardTitle className="text-xl">Lifetime (One-time Offer)</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  ₹999 — Pay once, own forever<br />
                  All Pro features included
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Final Call to Action */}
        <section className="py-16 bg-background">
          <div className="max-w-[700px] mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Take control of your money. Slash unnecessary spend.</h2>
            <Button size="lg" className="h-12 px-8 text-lg">👉 Join the Waitlist → slash.cash</Button>
          </div>
        </section>

        {/* SEO Footer Content */}
        <footer className="py-8 bg-muted/40 mt-auto">
          <div className="max-w-[1100px] mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <nav className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-2 md:mb-0">
              <a href="/" className="hover:underline">Home</a>
              <a href="#features" className="hover:underline">Features</a>
              <a href="#blog" className="hover:underline">Blog</a>
              <a href="#contact" className="hover:underline">Contact</a>
              <a href="#privacy" className="hover:underline">Privacy Policy</a>
              <a href="#terms" className="hover:underline">Terms of Service</a>
              <a href="/spending-psychology" className="hover:underline">Spending Psychology</a>
            </nav>
            <div className="text-xs text-muted-foreground">© 2025 Slash. Built with 💰 in India.</div>
          </div>
        </footer>
      </div>
    </>
  )
}
