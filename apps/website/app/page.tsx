export const dynamic = 'force-static';
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@workspace/ui/components/carousel"
import Image from "next/image"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-20 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 hero-gradient opacity-40" />
        <div className="relative z-10 max-w-[900px] mx-auto text-center">
          <Badge variant="secondary" className="mb-6 text-sm px-4 py-1">
            🤖 AI-Powered Personal Finance
          </Badge>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-b from-primary to-foreground/80">
            Your AI Finance Assistant
          </h1>
          <h2 className="text-2xl md:text-3xl font-semibold text-primary mb-6">
            Slash automatically tracks your expenses by reading your emails. Starting with Swiggy analytics, expanding to track all your spending across banks, wallets, subscriptions, and more—giving you complete financial visibility.
          </h2>
          <div className="text-sm text-muted-foreground font-medium mb-8">Connect Gmail • Smart expense tracking • No manual entry</div>
          {/* Hero Imagery Placeholder */}
          <div className="flex justify-center mt-8">
            <Image
              src="/images/hero-illustration.jpg"
              alt="AI-powered personal finance dashboard with comprehensive expense tracking"
              className="w-full max-w-xl rounded-xl shadow-lg object-cover"
              width={640}
              height={360}
              priority
              style={{ aspectRatio: '16/9' }}
            />
          </div>
        </div>
      </section>

      {/* Current: Swiggy Analytics */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-[1100px] mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">
              📍 Currently Available
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Starting with Swiggy Analytics</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              See the power of AI-driven expense tracking with our Swiggy integration—a preview of what's coming for all your financial data.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-background/60">
              <CardHeader>
                <CardTitle className="text-xl">🍽️ Food & Grocery Insights</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                Complete breakdown of Food delivery vs Instamart vs Dineout spending.<br />
                Top restaurants, favorite items, and delivery patterns.
              </CardContent>
            </Card>
            <Card className="bg-background/60">
              <CardHeader>
                <CardTitle className="text-xl">⏰ Behavioral Analytics</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                Peak ordering hours, day-wise patterns, and monthly trends.<br />
                Understand your spending psychology and habits.
              </CardContent>
            </Card>
            <Card className="bg-background/60">
              <CardHeader>
                <CardTitle className="text-xl">🎯 Smart AI Insights</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                Ask questions like "Where do I order most?" or "How much do I spend on delivery fees?"<br />
                AI-powered answers with visual data.
              </CardContent>
            </Card>
          </div>
          <div className="text-center mt-12">
            <Button size="lg" className="h-12 px-8 text-lg" asChild>
              <Link href="/swiggy">🍽️ Explore Swiggy Analytics →</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* The Vision: Complete Personal Finance */}
      <section className="py-16 bg-background">
        <div className="max-w-[1100px] mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">
              🚀 Coming Soon
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">The Future: Complete AI Finance Tracking</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Slash will expand to automatically track ALL your expenses from emails—banks, credit cards, UPI, wallets, subscriptions, and more.
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <span className="text-4xl">🏦</span>
              <h3 className="font-semibold mt-2 mb-1">Bank Transactions</h3>
              <p className="text-muted-foreground text-sm">Automatic tracking of all bank account debits and credits with smart categorization.</p>
            </div>
            <div>
              <span className="text-4xl">💳</span>
              <h3 className="font-semibold mt-2 mb-1">Credit Card Analytics</h3>
              <p className="text-muted-foreground text-sm">Track spending across all cards, interest charges, due dates, and payment patterns.</p>
            </div>
            <div>
              <span className="text-4xl">📱</span>
              <h3 className="font-semibold mt-2 mb-1">UPI & Wallet Tracking</h3>
              <p className="text-muted-foreground text-sm">Monitor PhonePe, GPay, Paytm transactions with merchant identification and categorization.</p>
            </div>
            <div>
              <span className="text-4xl">🔄</span>
              <h3 className="font-semibold mt-2 mb-1">Subscription Management</h3>
              <p className="text-muted-foreground text-sm">Track all recurring payments, renewal dates, and forgotten subscriptions across services.</p>
            </div>
            <div>
              <span className="text-4xl">🛒</span>
              <h3 className="font-semibold mt-2 mb-1">E-commerce Tracking</h3>
              <p className="text-muted-foreground text-sm">Amazon, Flipkart, and other online shopping with detailed product categorization.</p>
            </div>
            <div>
              <span className="text-4xl">🚗</span>
              <h3 className="font-semibold mt-2 mb-1">Transportation & Travel</h3>
              <p className="text-muted-foreground text-sm">Uber, Ola, flight bookings, and travel expenses with location-based insights.</p>
            </div>
            <div>
              <span className="text-4xl">💡</span>
              <h3 className="font-semibold mt-2 mb-1">Bills & Utilities</h3>
              <p className="text-muted-foreground text-sm">Electricity, internet, mobile bills with usage patterns and cost optimization tips.</p>
            </div>
            <div>
              <span className="text-4xl">🎯</span>
              <h3 className="font-semibold mt-2 mb-1">Smart Budgeting</h3>
              <p className="text-muted-foreground text-sm">AI-powered budget recommendations based on your historical spending patterns.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How Slash Works */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-[1100px] mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">How Slash's AI Finance Tracking Works</h2>
          <div className="grid md:grid-cols-4 gap-8">
            <Card className="bg-background/60">
              <CardHeader>
                <CardTitle className="text-xl">1. Connect Gmail Securely</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                OAuth 2.0 access to scan only financial transaction emails.<br />
                Banks, UPI, wallets, credit cards, subscriptions, and services.<br />
                Zero access to personal or non-financial emails.
              </CardContent>
            </Card>
            <Card className="bg-background/60">
              <CardHeader>
                <CardTitle className="text-xl">2. AI Extracts & Categorizes</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                Advanced AI parses transaction amounts, merchants, and categories.<br />
                Smart deduplication prevents double-counting across platforms.<br />
                Automatic merchant normalization and spending categorization.
              </CardContent>
            </Card>
            <Card className="bg-background/60">
              <CardHeader>
                <CardTitle className="text-xl">3. Rich Analytics Dashboard</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                Complete financial overview with spending breakdowns, trends, and insights.<br />
                Category-wise analysis, monthly comparisons, and behavioral patterns.<br />
                Beautiful charts and visualizations for all your financial data.
              </CardContent>
            </Card>
            <Card className="bg-background/60">
              <CardHeader>
                <CardTitle className="text-xl">4. Chat with Your Money</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                Ask natural language questions about your finances:<br />
                &quot;How much did I spend on food this month?&quot;<br />
                &quot;Which subscriptions can I cancel?&quot;<br />
                &quot;Am I spending more than last year?&quot;
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Perfect For */}
      <section className="py-16 bg-background">
        <div className="max-w-[900px] mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">Perfect For Modern Spenders</h2>
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <span className="text-4xl">💼</span>
              <h3 className="font-semibold mt-2 mb-1">Busy Professionals</h3>
              <p className="text-muted-foreground text-sm">No time for manual expense tracking</p>
            </div>
            <div>
              <span className="text-4xl">📱</span>
              <h3 className="font-semibold mt-2 mb-1">Digital-First Users</h3>
              <p className="text-muted-foreground text-sm">Most transactions via apps and cards</p>
            </div>
            <div>
              <span className="text-4xl">💰</span>
              <h3 className="font-semibold mt-2 mb-1">Budget-Conscious People</h3>
              <p className="text-muted-foreground text-sm">Want to understand spending patterns</p>
            </div>
            <div>
              <span className="text-4xl">🎯</span>
              <h3 className="font-semibold mt-2 mb-1">Goal-Oriented Savers</h3>
              <p className="text-muted-foreground text-sm">Need insights to optimize spending</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-[900px] mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">Early Users Love Slash</h2>
          <Carousel>
            <CarouselContent>
              <CarouselItem>
                <Card className="bg-background/60">
                  <CardContent className="flex flex-col items-center py-8">
                    <Avatar className="mb-4 w-16 h-16">
                      <AvatarImage src="/avatars/aarav.png" alt="Aarav" />
                      <AvatarFallback>AR</AvatarFallback>
                    </Avatar>
                    <div className="text-lg font-medium mb-2">&quot;Started with Swiggy tracking and was shocked at my ₹15,000 monthly food spending! Can't wait for full bank integration.&quot;</div>
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
                    <div className="text-lg font-medium mb-2">&quot;Finally, an expense tracker that works automatically! The AI insights are incredible—no more manual entry headaches.&quot;</div>
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
                    <div className="text-lg font-medium mb-2">&quot;The behavioral insights are game-changing. Slash showed me patterns I never noticed and helped me save ₹8,000 monthly.&quot;</div>
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

      {/* Final Call to Action */}
      <section className="py-16 bg-background">
        <div className="max-w-[700px] mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Your AI finance assistant awaits</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Start with Swiggy analytics today and be first in line for complete expense tracking when we expand.
          </p>
          <Button size="lg" className="h-12 px-8 text-lg" asChild>
            <a href="https://app.slash.cash" target="_blank" rel="noopener noreferrer">
              🤖 Get Started with AI Finance Tracking →
            </a>
          </Button>
        </div>
      </section>
    </div>
  )
}
