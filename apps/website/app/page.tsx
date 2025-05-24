export const dynamic = 'force-static';
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@workspace/ui/components/carousel"
import { TypewriterText } from "@workspace/ui/components/typewriter-text"

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-20 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 hero-gradient opacity-40" />
        <div className="relative z-10 max-w-[900px] mx-auto text-center">
          <Badge variant="secondary" className="mb-6 text-sm px-4 py-1">
            Starting with Swiggy. More Coming Soon!
          </Badge>
          <h1 className="font-inter text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-primary to-foreground/80">
            <span className="block">Swiggy Spends Sorted.</span>
            <TypewriterText 
              text="Save Smarter." 
              speed={100} 
              className="block bg-clip-text text-transparent bg-gradient-to-b from-primary to-foreground/80" 
            />
          </h1>
          <p className="text-xl md:text-2xl text-primary mb-6">
            Your AI-powered finance assistant that reads your emails and tracks your Swiggy orders—showing exactly how much you're spending on food delivery. More platforms coming soon!
          </p >
          <div className="flex items-center justify-center gap-4 mb-4">
            <Button size="lg" className="h-12 px-8">Get Early Access for Free →</Button>
            <Button size="lg" variant="outline" className="h-12 px-8">Watch Demo →</Button>
          </div>
          <div className="text-sm text-muted-foreground font-medium mb-8">Starting with Swiggy. More platforms coming soon!</div>
          {/* Hero Imagery Placeholder */}
          <div className="flex justify-center mt-8">
            <img
              src="/images/hero-illustration.jpg"
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
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">How Slash Works?</h2>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="bg-background/80 p-6 rounded-xl border border-border/50 hover:border-border transition-colors">
              <h3 className="text-xl font-semibold mb-4">1. Connect Your Gmail (Securely)</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Slash uses OAuth 2.0 to request read-only access to Swiggy order emails.<br />
                Only scans Swiggy transaction data.<br />
                More platforms will be added soon.
              </p>
            </div>
            <div className="bg-background/80 p-6 rounded-xl border border-border/50 hover:border-border transition-colors">
              <h3 className="text-xl font-semibold mb-4">2. AI Parses Your Swiggy Orders</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Restaurant and cuisine classification.<br />
                Order amount and item breakdown.<br />
                Smart deduplication for accurate tracking.
              </p>
            </div>
            <div className="bg-background/80 p-6 rounded-xl border border-border/50 hover:border-border transition-colors">
              <h3 className="text-xl font-semibold mb-4">3. Swiggy Spend Dashboard</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Visualize monthly Swiggy spend.<br />
                Top restaurants and cuisines.<br />
                Order frequency and average order value.
              </p>
            </div>
            <div className="bg-background/80 p-6 rounded-xl border border-border/50 hover:border-border transition-colors">
              <h3 className="text-xl font-semibold mb-4">4. Ask About Your Swiggy Habits</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Chat interface for questions like:<br />
                "How much did I spend on Swiggy last month?"<br />
                "Which restaurant do I order from the most?"<br />
                "What's my average order value?"
              </p>
            </div>
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
              <h3 className="font-semibold mt-2 mb-1">Email-Based Swiggy Tracking</h3>
              <p className="text-muted-foreground text-sm">No manual entry needed. Slash reads your Swiggy order emails.</p>
            </div>
            <div>
              <span className="text-4xl">🧠</span>
              <h3 className="font-semibold mt-2 mb-1">Smart Food Insights</h3>
              <p className="text-muted-foreground text-sm">Understand your food ordering patterns and spending habits.</p>
            </div>
            <div>
              <span className="text-4xl">🔍</span>
              <h3 className="font-semibold mt-2 mb-1">Order History Analysis</h3>
              <p className="text-muted-foreground text-sm">Track trends in your Swiggy orders over time.</p>
            </div>
            <div>
              <span className="text-4xl">💬</span>
              <h3 className="font-semibold mt-2 mb-1">AI Chat for Swiggy Data</h3>
              <p className="text-muted-foreground text-sm">Ask anything about your Swiggy spending habits.</p>
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
              <h3 className="font-semibold mt-2 mb-1">Food lovers</h3>
              <p className="text-muted-foreground text-sm">Who order frequently on Swiggy</p>
            </div>
            <div>
              <span className="text-4xl">💳</span>
              <h3 className="font-semibold mt-2 mb-1">Regular orderers</h3>
              <p className="text-muted-foreground text-sm">Looking to track food expenses</p>
            </div>
            <div>
              <span className="text-4xl">📦</span>
              <h3 className="font-semibold mt-2 mb-1">Busy professionals</h3>
              <p className="text-muted-foreground text-sm">Who rely on food delivery</p>
            </div>
            <div>
              <span className="text-4xl">💼</span>
              <h3 className="font-semibold mt-2 mb-1">Anyone curious</h3>
              <p className="text-muted-foreground text-sm">About their Swiggy habits</p>
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
                    <div className="text-lg font-medium mb-2">"I was shocked to see I spent ₹15,000 on Swiggy last month. Slash helped me set a food budget."</div>
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
                    <div className="text-lg font-medium mb-2">"Now I know exactly which restaurants I order from the most. Great for expense tracking!"</div>
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
                    <div className="text-lg font-medium mb-2">"The weekly Swiggy spend insights helped me cut down on impulsive food ordering."</div>
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
                Track last 90 days of Swiggy orders<br />
                Access to all Swiggy insights & chatbot<br />
                More platforms coming soon
              </CardContent>
            </Card>
            <Card className="bg-background/60">
              <CardHeader>
                <CardTitle className="text-xl">Pro Plan (Coming Soon)</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                ₹99/month<br />
                Full 1-year Swiggy history<br />
                Support for all food delivery platforms<br />
                Export detailed reports
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
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Take control of your food spending. More platforms coming soon!</h2>
          <Button size="lg" className="h-12 px-8 text-lg">👉 Join the Waitlist → slash.cash</Button>
        </div>
      </section>
    </div>
  )
}
