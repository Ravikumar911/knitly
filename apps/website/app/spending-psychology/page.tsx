import React from "react";
import { Metadata } from "next";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Progress } from "@workspace/ui/components/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { AlertCircle, ArrowRight, BrainCircuit, CreditCard, LineChart, PiggyBank, TrendingUp, BarChart4 } from "lucide-react";

export const metadata: Metadata = {
  title: "The Hidden Psychology Behind Spending | Slash",
  description: "Discover why we overspend, the impact of instant gratification, and how Slash helps you build mindful money habits. Start tracking with Slash, the best credit card spend tracker and subscription manager in India.",
  keywords: [
    "credit card spend tracker",
    "email finance tracker", 
    "subscription manager India",
    "AI personal finance tool",
    "how to track EMI payments",
    "spending psychology",
    "financial habits",
    "mindful spending"
  ],
  openGraph: {
    title: "The Hidden Psychology Behind Spending | Slash",
    description: "Learn the real reasons behind overspending and how Slash helps you take control. Start tracking with Slash today!",
    url: "https://slashapp.in/spending-psychology",
    siteName: "Slash",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Slash App - The Hidden Psychology Behind Spending"
      }
    ],
    locale: "en_US",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Hidden Psychology Behind Spending | Slash",
    description: "Learn the real reasons behind overspending and how Slash helps you take control. Start tracking with Slash today!",
    images: ["/og-image.png"],
  }
};

const schemaData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Slash",
  "applicationCategory": "Finance",
  "offers": {
    "@type": "Offer",
    "price": "Free",
    "priceCurrency": "INR"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "1200"
  },
  "review": [
    {
      "@type": "Review",
      "author": "Amit S.",
      "reviewBody": "Slash helped me finally see where my money was going. The insights are a game changer!",
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": "5"
      }
    }
  ],
  "keywords": [
    "credit card spend tracker",
    "email finance tracker",
    "subscription manager India",
    "AI personal finance tool",
    "how to track EMI payments"
  ]
};

export default function SpendingPsychologyPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }} />
      
      {/* Header/Hero Section */}
      <section className="relative pt-20 pb-20 overflow-hidden">
        <div className="absolute inset-0 hero-gradient opacity-40"></div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
          <Badge variant="secondary" className="mb-6 text-sm px-4 py-1 inline-block">
            Spending Psychology Series
          </Badge>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-b from-primary to-foreground/80">
            The Hidden Psychology Behind Spending
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mb-10">
            Why we spend more than we should, and how understanding your spending psychology can help you save smarter.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-1">
        {/* Section 1: Why We Spend More */}
        <section className="py-16 bg-muted/30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <BrainCircuit className="w-8 h-8 text-primary" />
                  <h2 className="text-3xl font-bold">Why We Spend More Than We Should</h2>
                </div>
                <p className="text-lg mb-4">It's not just math. It's psychology.</p>
                <p className="mb-4">Most of us don't overspend because we're bad with numbers—we overspend because we're wired to seek pleasure, avoid discomfort, and follow habits we don't even notice.</p>
                <p className="mb-6">From treating yourself on a bad day to blindly swiping your credit card because "you'll figure it out later," the way we spend is more emotional than rational.</p>
                <Card className="bg-primary/5 border-primary/20 mb-6">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div className="bg-primary/10 p-2 rounded-full">
                        <AlertCircle className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium mb-1">Research Insight</p>
                        <p className="text-muted-foreground">According to behavioral economist Dan Ariely, most spending decisions are predictably irrational—we tend to anchor on defaults, overvalue free shipping, and underestimate monthly totals.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="relative">
                <div className="relative rounded-xl overflow-hidden shadow-xl">
                  <img 
                    src="/images/brain-money-decision.png" 
                    alt="Brain making financial decisions" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                    <div className="text-white text-xl font-medium">Your brain on spending decisions</div>
                  </div>
                </div>
                <div className="absolute -bottom-15 -right-15 bg-background p-4 rounded-lg shadow-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <LineChart className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Emotional vs Rational</span>
                  </div>
                  <Progress value={75} className="h-2 w-32" />
                  <span className="text-xs text-muted-foreground">75% of purchases are emotional</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Instant Gratification */}
        <section className="py-16 bg-background">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="order-2 md:order-1">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-muted/50 border-primary/10 shadow-sm">
                    <CardContent className="pt-6">
                      <div className="flex flex-col items-center text-center gap-2">
                        <span className="text-4xl">🍔</span>
                        <p className="font-medium">Swiggy feels easier than cooking</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50 border-primary/10 shadow-sm">
                    <CardContent className="pt-6">
                      <div className="flex flex-col items-center text-center gap-2">
                        <span className="text-4xl">📺</span>
                        <p className="font-medium">A monthly subscription feels harmless</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50 border-primary/10 shadow-sm col-span-2">
                    <CardContent className="pt-6">
                      <div className="flex flex-col items-center text-center gap-2">
                        <span className="text-4xl">💸</span>
                        <p className="font-medium">"Buy Now, Pay Later" sounds like a gift</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <div className="mt-6 bg-muted/30 p-4 rounded-lg border border-muted-foreground/10">
                  <p className="italic text-muted-foreground">These micro-decisions stack up until you check your credit card bill and wonder, "How did this happen?"</p>
                </div>
              </div>
              <div className="order-1 md:order-2">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-8 h-8 text-primary" />
                  <h2 className="text-3xl font-bold">The Trap of Instant Gratification</h2>
                </div>
                <p className="text-lg mb-6">The brain loves rewards now.</p>
                <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 shadow-sm">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 border-2 border-background">
                        <AvatarImage src="/avatars/brain-avatar.png" alt="Brain" />
                        <AvatarFallback className="bg-primary/20 text-primary">🧠</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium mb-1">Your Brain</p>
                        <p className="text-muted-foreground">When faced with a purchase, your brain releases dopamine for immediate rewards, while the pain of paying is delayed—creating a perfect environment for overspending.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Small Charges */}
        <section className="py-16 bg-muted/30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="w-8 h-8 text-primary" />
                  <h2 className="text-3xl font-bold">Small Charges, Big Impact</h2>
                </div>
                <p className="text-lg mb-4">It's not just the big-ticket items.</p>
                <p className="mb-6">Often, it's the ₹199 here and ₹49 there—the tiny charges that are forgettable until they silently drain ₹5,000+ a month.</p>
                
                <Card className="bg-primary/5 border-primary/20 shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-xl">👩🏽‍💻</span> 
                      Real-life Example: Priya's Story
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-6 gap-4">
                        <div className="col-span-4 font-medium">Subscription</div>
                        <div className="col-span-2 font-medium text-right">Monthly Cost</div>
                      </div>
                      <div className="grid grid-cols-6 gap-4 border-b pb-2">
                        <div className="col-span-4">4 OTT Apps</div>
                        <div className="col-span-2 text-right">₹1,200</div>
                      </div>
                      <div className="grid grid-cols-6 gap-4 border-b pb-2">
                        <div className="col-span-4">Unused Fitness Tracker</div>
                        <div className="col-span-2 text-right">₹499</div>
                      </div>
                      <div className="grid grid-cols-6 gap-4 border-b pb-2">
                        <div className="col-span-4">Annual Online Course (monthly)</div>
                        <div className="col-span-2 text-right">₹599</div>
                      </div>
                      <div className="grid grid-cols-6 gap-4 pt-2">
                        <div className="col-span-4 font-medium">Total Monthly Damage</div>
                        <div className="col-span-2 text-right font-bold text-primary">₹2,298</div>
                      </div>
                      <div className="text-muted-foreground text-sm italic">
                        She only actively used 2 of these services.
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="relative">
                <div className="aspect-square relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative w-72 h-72">
                      <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping opacity-30"></div>
                      <div className="absolute inset-4 rounded-full bg-primary/15 animate-ping opacity-40 animation-delay-200"></div>
                      <div className="absolute inset-8 rounded-full bg-primary/20 animate-ping opacity-50 animation-delay-400"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-background rounded-full p-6 shadow-lg">
                          <div className="text-center">
                            <div className="text-4xl font-bold text-primary">₹5,000+</div>
                            <div className="text-sm text-muted-foreground">Monthly Silent Drain</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: What Slash Does */}
        <section className="py-16 bg-background">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-2 mb-4">
                <BarChart4 className="w-8 h-8 text-primary" />
                <h2 className="text-3xl font-bold">What Slash Does Differently</h2>
              </div>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Most apps just show you the numbers. Slash shows you the patterns.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <Card className="shadow-md bg-gradient-to-br from-background to-muted/30 border-primary/10">
                <CardContent className="pt-8">
                  <div className="flex flex-col items-center text-center">
                    <div className="bg-primary/10 rounded-full p-4 mb-4">
                      <PiggyBank className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-medium mb-2">Recurring Charge Detection</h3>
                    <p className="text-muted-foreground">
                      Automatically identifies subscriptions you no longer use—even the forgotten ones
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-md bg-gradient-to-br from-background to-muted/30 border-primary/10">
                <CardContent className="pt-8">
                  <div className="flex flex-col items-center text-center">
                    <div className="bg-primary/10 rounded-full p-4 mb-4">
                      <CreditCard className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-medium mb-2">Category Awareness</h3>
                    <p className="text-muted-foreground">
                      Visualizes which categories you consistently overspend on with insightful patterns
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-md bg-gradient-to-br from-background to-muted/30 border-primary/10">
                <CardContent className="pt-8">
                  <div className="flex flex-col items-center text-center">
                    <div className="bg-primary/10 rounded-full p-4 mb-4">
                      <BrainCircuit className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-medium mb-2">Mindful Nudges</h3>
                    <p className="text-muted-foreground">
                      Weekly personalized nudges that prompt reflection on spending habits and patterns
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-10 text-center">
              <p className="text-lg mb-6">
                It turns "how much" into why and how often—so you can change behavior, not just log expenses.
              </p>
            </div>
          </div>
        </section>

        {/* Takeaway & CTA */}
        <section className="py-16 bg-muted/30">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-3xl font-bold mb-6">✅ Takeaway</h2>
            <p className="text-xl mb-10">
              Money isn't just spent with your wallet—it's spent with your emotions and attention.<br />
              Slash helps you regain both.
            </p>
            
            <div className="max-w-md mx-auto">
              <Card className="bg-primary text-primary-foreground shadow-xl transform hover:scale-[1.02] transition-all">
                <CardContent className="p-8">
                  <h3 className="text-2xl font-bold mb-4">Start Building Awareness</h3>
                  <p className="mb-6">Take the first step toward healthier spending habits today.</p>
                  <Button size="lg" className="w-full h-12 font-semibold text-lg" variant="secondary">
                    Start Tracking with Slash <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      {/* SEO Footer */}
      <footer className="py-8 bg-muted/40 mt-auto">
        <div className="max-w-[1100px] mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <nav className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-2 md:mb-0">
            <a href="/" className="hover:underline">Home</a>
            <a href="/#features" className="hover:underline">Features</a>
            <a href="/#blog" className="hover:underline">Blog</a>
            <a href="/#contact" className="hover:underline">Contact</a>
            <a href="/#privacy" className="hover:underline">Privacy Policy</a>
            <a href="/#terms" className="hover:underline">Terms of Service</a>
            <a href="/spending-psychology" className="hover:underline font-medium text-primary">Spending Psychology</a>
          </nav>
          <div className="text-xs text-muted-foreground">© 2025 Slash. Built with <span role="img" aria-label="money">💰</span> in India.</div>
        </div>
      </footer>
    </div>
  );
} 