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
              The Smarter Way to Save
            </Badge>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-b from-primary to-foreground/80">
              Slash Your Spendings
            </h1>
            <h2 className="text-2xl md:text-3xl font-semibold text-primary mb-6">
              Track. Slash. Celebrate. Repeat.
            </h2>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-[600px] mx-auto mb-8">
              Tired of money leaks? Slash automatically tracks your Food, Groceries, Travel, and Subscriptions—so you can cut the waste and keep more cash in your pocket.
            </p>
            <div className="flex items-center justify-center gap-4 mb-4">
              <Button size="lg" className="h-12 px-8">Start Slashing Free</Button>
              <Button size="lg" variant="outline" className="h-12 px-8">See Slash in Action</Button>
            </div>
            <div className="text-sm text-muted-foreground font-medium">No credit card required. Get started in under 60 seconds.</div>
          </div>
        </section>

        {/* Why Slash Section */}
        <section className="py-12 bg-background">
          <div className="max-w-[1100px] mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">Why Slash?</h2>
            <div className="grid md:grid-cols-4 gap-6 text-center">
              <div>
                <span className="text-4xl">⚡️</span>
                <h3 className="font-semibold mt-2 mb-1">Instant Insights</h3>
                <p className="text-muted-foreground text-sm">See where your money goes—no spreadsheets, no stress.</p>
              </div>
              <div>
                <span className="text-4xl">🧠</span>
                <h3 className="font-semibold mt-2 mb-1">Smart Categorization</h3>
                <p className="text-muted-foreground text-sm">Slash sorts your spendings for you. Food, travel, subscriptions—done!</p>
              </div>
              <div>
                <span className="text-4xl">🔔</span>
                <h3 className="font-semibold mt-2 mb-1">Subscription Alerts</h3>
                <p className="text-muted-foreground text-sm">Never get surprised by a forgotten subscription again.</p>
              </div>
              <div>
                <span className="text-4xl">🎉</span>
                <h3 className="font-semibold mt-2 mb-1">Celebrate Savings</h3>
                <p className="text-muted-foreground text-sm">Watch your savings grow and treat yourself—guilt free!</p>
              </div>
            </div>
          </div>
        </section>

        {/* Category Highlights */}
        <section className="py-16 bg-muted/30">
          <div className="max-w-[1100px] mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Track What Matters Most</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="bg-background/60">
                <CardHeader>
                  <CardTitle className="text-xl">Food & Groceries</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                  Slash auto-detects your food delivery and grocery spend. No more guessing where your money went.
                </CardContent>
              </Card>
              <Card className="bg-background/60">
                <CardHeader>
                  <CardTitle className="text-xl">Travel & Transport</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                  From cabs to flights, Slash keeps your travel and commute costs crystal clear.
                </CardContent>
              </Card>
              <Card className="bg-background/60">
                <CardHeader>
                  <CardTitle className="text-xl">Subscriptions</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                  See every recurring charge in one place. Cancel, keep, or renegotiate—your call!
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 md:py-32">
          <div className="max-w-[1100px] mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
              How Slash Works
            </h2>
            <div className="grid md:grid-cols-3 gap-12">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-6">1</div>
                <h3 className="text-xl font-semibold mb-4">Connect & Relax</h3>
                <p className="text-muted-foreground">Link your accounts or import statements. Slash does the rest—automatically.</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-6">2</div>
                <h3 className="text-xl font-semibold mb-4">See the Leaks</h3>
                <p className="text-muted-foreground">Instantly spot where your money is slipping away—by category, merchant, or time.</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-6">3</div>
                <h3 className="text-xl font-semibold mb-4">Slash & Celebrate</h3>
                <p className="text-muted-foreground">Cut the waste, keep the joy. Watch your savings grow and celebrate every win!</p>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-20 md:py-32 bg-muted/30">
          <div className="max-w-[1100px] mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
              Real People, Real Savings
            </h2>
            <Carousel className="w-full max-w-xl mx-auto">
              <CarouselContent>
                <CarouselItem>
                  <div className="text-center p-6">
                    <Avatar className="w-20 h-20 mx-auto mb-4">
                      <AvatarImage src="https://i.pravatar.cc/150?img=11" alt="Alex Morgan avatar" />
                      <AvatarFallback>AM</AvatarFallback>
                    </Avatar>
                    <p className="text-lg mb-4">“Slash showed me I was spending ₹2,000 a month on subscriptions I never used. Now I'm saving for a weekend getaway!”</p>
                    <p className="font-semibold">Alex Morgan</p>
                    <p className="text-sm text-muted-foreground">Designer & Serial Saver</p>
                  </div>
                </CarouselItem>
                <CarouselItem>
                  <div className="text-center p-6">
                    <Avatar className="w-20 h-20 mx-auto mb-4">
                      <AvatarImage src="https://i.pravatar.cc/150?img=12" alt="Riya Shah avatar" />
                      <AvatarFallback>RS</AvatarFallback>
                    </Avatar>
                    <p className="text-lg mb-4">“I never realized how much my daily coffee runs added up. Slash made it obvious—and now I treat myself, guilt-free!”</p>
                    <p className="font-semibold">Riya Shah</p>
                    <p className="text-sm text-muted-foreground">Product Manager</p>
                  </div>
                </CarouselItem>
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </div>
        </section>

        {/* Micro-CTA Section */}
        <section className="py-8 bg-primary/10">
          <div className="max-w-[700px] mx-auto px-4 text-center">
            <h3 className="text-2xl font-bold mb-2">Start Saving in Seconds</h3>
            <p className="text-lg text-muted-foreground mb-4">Sign up, connect, and watch your savings grow. It's that easy.</p>
            <Button size="lg" className="h-12 px-8">
              Start Slashing Now
            </Button>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 md:py-32 bg-muted/40">
          <div className="max-w-[700px] mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Slash Your Spendings?</h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join thousands who are saving more and spending smarter with Slash.
            </p>
            <Button size="lg" className="h-12 px-8">
              Get Started Free
            </Button>
          </div>
        </section>
      </div>
    </>
  )
}
