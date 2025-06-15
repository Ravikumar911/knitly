export const dynamic = 'force-static';
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@workspace/ui/components/carousel"
import Image from "next/image"
import Link from "next/link"

export default function SwiggyPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-20 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 hero-gradient opacity-40" />
        <div className="relative z-10 max-w-[900px] mx-auto text-center">
          <Badge variant="secondary" className="mb-6 text-sm px-4 py-1">
            🍽️ Swiggy Analytics Dashboard
          </Badge>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-b from-primary to-foreground/80">
            Master Your Swiggy Spending
          </h1>
          <h2 className="text-2xl md:text-3xl font-semibold text-primary mb-6">
            Get comprehensive insights into your Swiggy habits across Food delivery, Instamart groceries, and Dineout experiences. Track spending patterns, discover favorites, and optimize your food budget with AI-powered analytics.
          </h2>
          <div className="text-sm text-muted-foreground font-medium mb-8">
            Live demo of Slash's AI finance capabilities • Swiggy emails only
          </div>
          <Button size="lg" className="h-12 px-8 text-lg mb-8" asChild>
            <a href="https://app.slash.cash" target="_blank" rel="noopener noreferrer">
              🍽️ Start Tracking Your Swiggy Habits →
            </a>
          </Button>
          {/* Hero Imagery Placeholder */}
          <div className="flex justify-center mt-8">
            <Image
              src="/images/hero-illustration.jpg"
              alt="Swiggy analytics dashboard showing food delivery insights"
              className="w-full max-w-2xl rounded-xl shadow-lg object-cover"
              width={800}
              height={450}
              priority
              style={{ aspectRatio: '16/9' }}
            />
          </div>
        </div>
      </section>

      {/* Key Analytics Features */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-[1100px] mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Complete Swiggy Analytics Dashboard</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-background/60">
              <CardHeader>
                <CardTitle className="text-xl">🍕 Food Delivery Insights</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                • Top restaurants by spend and order frequency<br />
                • Average order value and delivery fee analysis<br />
                • Favorite cuisines and meal preferences<br />
                • Peak ordering hours and weekend vs weekday patterns
              </CardContent>
            </Card>
            <Card className="bg-background/60">
              <CardHeader>
                <CardTitle className="text-xl">🛒 Instamart Analytics</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                • Grocery spending separate from food delivery<br />
                • Most frequently ordered items and categories<br />
                • Shopping patterns and bulk vs regular orders<br />
                • Cost per item analysis and savings opportunities
              </CardContent>
            </Card>
            <Card className="bg-background/60">
              <CardHeader>
                <CardTitle className="text-xl">🍽️ Dineout Tracking</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                • Restaurant bookings and dining experiences<br />
                • Average spend per dineout vs delivery<br />
                • Preferred dining areas and restaurant types<br />
                • Special occasion vs regular dining patterns
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Detailed Features */}
      <section className="py-16 bg-background">
        <div className="max-w-[1100px] mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Deep Behavioral Insights</h2>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left side - Features list */}
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-3 flex items-center">
                  <span className="text-2xl mr-3">⏰</span>
                  Peak Ordering Analysis
                </h3>
                <p className="text-muted-foreground">
                  Discover your most active ordering hours. Are you a late-night snacker or a lunch-time orderer? 
                  Our AI identifies your peak ordering times across different days of the week.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3 flex items-center">
                  <span className="text-2xl mr-3">📍</span>
                  Delivery Area Insights
                </h3>
                <p className="text-muted-foreground">
                  See which areas you order to most frequently. Track spending by location, 
                  understand delivery patterns, and optimize for convenience.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3 flex items-center">
                  <span className="text-2xl mr-3">📊</span>
                  Service Breakdown
                </h3>
                <p className="text-muted-foreground">
                  Beautiful charts showing your spending split across Food delivery, Instamart groceries, 
                  and Dineout experiences with month-over-month comparisons.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3 flex items-center">
                  <span className="text-2xl mr-3">🚚</span>
                  Cost Optimization
                </h3>
                <p className="text-muted-foreground">
                  Track delivery fees vs food costs, identify expensive ordering patterns, 
                  and get suggestions to optimize your Swiggy spending.
                </p>
              </div>
            </div>

            {/* Right side - Demo visualization placeholder */}
            <div className="bg-muted/30 rounded-xl p-8 min-h-[400px] flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-4">📊</div>
                <h4 className="text-lg font-semibold mb-2">Live Dashboard Preview</h4>
                <p className="text-muted-foreground text-sm">
                  Interactive charts and insights based on your actual Swiggy data
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Chat Feature */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-[1100px] mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Chat with Your Swiggy Data</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Ask natural language questions about your Swiggy habits and get instant AI-powered insights.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="bg-background/60">
              <CardHeader>
                <CardTitle className="text-lg">💬 Example Questions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium">"Which restaurant do I order from most?"</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium">"How much did I spend on groceries vs food this month?"</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium">"What's my most expensive Swiggy order?"</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium">"Am I spending more on delivery fees than last month?"</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-background/60">
              <CardHeader>
                <CardTitle className="text-lg">🎯 AI-Powered Answers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <p className="text-sm">"Your top restaurant is <strong>Biryani Paradise</strong> with ₹3,200 spent across 12 orders this month."</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg">
                  <p className="text-sm">"Food delivery: ₹8,500 vs Instamart groceries: ₹4,200. You spend 67% more on restaurants."</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg">
                  <p className="text-sm">"Your highest order was ₹1,850 from <strong>The Breakfast Club</strong> on March 15th."</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg">
                  <p className="text-sm">"Delivery fees increased 15% to ₹180 this month. Consider bulk orders to save."</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works for Swiggy */}
      <section className="py-16 bg-background">
        <div className="max-w-[1100px] mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">How Swiggy Analytics Works</h2>
          <div className="grid md:grid-cols-4 gap-8">
            <Card className="bg-background border-2">
              <CardHeader>
                <CardTitle className="text-xl">1. Connect Gmail</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                Secure OAuth 2.0 access to scan only Swiggy transaction emails. 
                Zero access to personal emails or other services.
              </CardContent>
            </Card>
            <Card className="bg-background border-2">
              <CardHeader>
                <CardTitle className="text-xl">2. AI Extraction</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                Advanced AI parses order amounts, restaurant names, delivery locations, and item details from your Swiggy emails.
              </CardContent>
            </Card>
            <Card className="bg-background border-2">
              <CardHeader>
                <CardTitle className="text-xl">3. Smart Categorization</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                Automatically categorizes Food vs Instamart vs Dineout with deduplication and refund handling.
              </CardContent>
            </Card>
            <Card className="bg-background border-2">
              <CardHeader>
                <CardTitle className="text-xl">4. Rich Dashboard</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                Beautiful analytics dashboard with charts, trends, insights, and natural language chat interface.
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* User Testimonials */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-[900px] mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">Swiggy Power Users Love It</h2>
          <Carousel>
            <CarouselContent>
              <CarouselItem>
                <Card className="bg-background/60">
                  <CardContent className="flex flex-col items-center py-8">
                    <Avatar className="mb-4 w-16 h-16">
                      <AvatarImage src="/avatars/aarav.png" alt="Aarav" />
                      <AvatarFallback>AR</AvatarFallback>
                    </Avatar>
                    <div className="text-lg font-medium mb-2">&quot;I had no idea I was spending ₹15,000+ monthly on Swiggy until I saw the dashboard. The restaurant rankings helped me discover I have 3 go-to places that make up 60% of my orders!&quot;</div>
                    <div className="text-muted-foreground text-sm">— Aarav, Hyderabad • Heavy Food Orderer</div>
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
                    <div className="text-lg font-medium mb-2">&quot;The Instamart vs Food delivery breakdown was eye-opening. I was spending more on groceries than actual meals! Now I plan my grocery orders better and save ₹3,000 monthly.&quot;</div>
                    <div className="text-muted-foreground text-sm">— Meena, Mumbai • Instamart Regular</div>
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
                    <div className="text-lg font-medium mb-2">&quot;Peak ordering hours feature helped me realize I order most at 2 AM during work-from-home nights. The delivery fee tracking showed I was paying ₹200+ just on delivery charges monthly!&quot;</div>
                    <div className="text-muted-foreground text-sm">— Rahul, Bengaluru • Night Owl Orderer</div>
                  </CardContent>
                </Card>
              </CarouselItem>
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      </section>

      {/* Future Vision */}
      <section className="py-16 bg-background">
        <div className="max-w-[1100px] mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">
              🚀 What's Next
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">This is Just the Beginning</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Swiggy analytics showcases Slash's AI capabilities. Soon, we'll expand to track ALL your expenses—banks, credit cards, UPI, subscriptions, and more.
            </p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-6 text-center">
            <div className="p-4">
              <span className="text-3xl">🏦</span>
              <h3 className="font-semibold mt-2 text-sm">Bank Transactions</h3>
            </div>
            <div className="p-4">
              <span className="text-3xl">💳</span>
              <h3 className="font-semibold mt-2 text-sm">Credit Cards</h3>
            </div>
            <div className="p-4">
              <span className="text-3xl">📱</span>
              <h3 className="font-semibold mt-2 text-sm">UPI & Wallets</h3>
            </div>
            <div className="p-4">
              <span className="text-3xl">🔄</span>
              <h3 className="font-semibold mt-2 text-sm">Subscriptions</h3>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary/5">
        <div className="max-w-[700px] mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Master Your Swiggy Spending?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join early users who've discovered insights about their food habits they never knew existed. 
            Start with Swiggy analytics and be first in line for complete expense tracking.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="h-12 px-8 text-lg" asChild>
              <a href="https://app.slash.cash" target="_blank" rel="noopener noreferrer">
                🍽️ Start Tracking Swiggy Now →
              </a>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 text-lg" asChild>
              <Link href="/">← Back to Home</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
} 