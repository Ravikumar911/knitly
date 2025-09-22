export const dynamic = 'force-static';
import { Badge } from "@workspace/ui/components/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@workspace/ui/components/carousel"
import Image from "next/image"
import Link from "next/link"

// Magic UI Components
import { AnimatedShinyText } from "@workspace/ui/components/magicui/animated-shiny-text"
import { AnimatedGradientText } from "@workspace/ui/components/magicui/animated-gradient-text"
import { ShimmerButton } from "@workspace/ui/components/magicui/shimmer-button"
import { MagicCard } from "@workspace/ui/components/magicui/magic-card"
import { BlurFade } from "@workspace/ui/components/magicui/blur-fade"
import { Particles } from "@workspace/ui/components/magicui/particles"
import { cn } from "@workspace/ui/lib/utils"

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-background relative overflow-hidden">
      {/* Single global Particles background */}
      <Particles className="absolute inset-0" quantity={140} ease={80} color="#9ca3af" refresh />

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-20 md:py-32 relative">
        <div className="relative z-10 max-w-[900px] mx-auto text-center">
          <BlurFade delay={0.1} inView>
            <Badge variant="secondary" className="mb-6 text-sm px-4 py-1 bg-black/10 backdrop-blur-sm">
              <AnimatedShinyText className="inline-flex items-center justify-center transition ease-out hover:text-neutral-600 hover:duration-300 hover:dark:text-neutral-400">
                <span>✨ AI-Powered Personal Finance</span>
              </AnimatedShinyText>
            </Badge>
          </BlurFade>

          <BlurFade delay={0.2} inView>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-4">
              <AnimatedGradientText>
                Your AI Finance Assistant
              </AnimatedGradientText>
            </h1>
          </BlurFade>

          <BlurFade delay={0.3} inView>
            <h2 className="text-xl md:text-2xl font-medium text-muted-foreground mb-6 max-w-3xl mx-auto leading-relaxed">
              Slash automatically tracks your expenses by reading your emails. Starting with Swiggy analytics, expanding to track all your spending across banks, wallets, subscriptions, and more—giving you complete financial visibility.
            </h2>
          </BlurFade>

          <BlurFade delay={0.4} inView>
            <div className="text-sm text-muted-foreground font-medium mb-8">Connect Gmail • Smart expense tracking • No manual entry</div>
          </BlurFade>
        </div>
      </section>

      {/* Current: Swiggy Analytics */}
      <section className="py-16 relative">
        <div className="max-w-[1100px] mx-auto px-4">
          <BlurFade delay={0.1} inView>
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4">
                <AnimatedShinyText className="inline-flex items-center justify-center">
                  📍 Currently Available
                </AnimatedShinyText>
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                <AnimatedGradientText>Starting with Swiggy Analytics</AnimatedGradientText>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                See the power of AI-driven expense tracking with our Swiggy integration—a preview of what's coming for all your financial data.
              </p>
            </div>
          </BlurFade>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "🍽️ Food & Grocery Insights",
                content: "Complete breakdown of Food delivery vs Instamart vs Dineout spending. Top restaurants, favorite items, and delivery patterns.",
                delay: 0.2
              },
              {
                title: "⏰ Behavioral Analytics",
                content: "Peak ordering hours, day-wise patterns, and monthly trends. Understand your spending psychology and habits.",
                delay: 0.3
              },
              {
                title: "🎯 Smart AI Insights",
                content: "Ask questions like \"Where do I order most?\" or \"How much do I spend on delivery fees?\" AI-powered answers with visual data.",
                delay: 0.4
              }
            ].map((item, index) => (
              <BlurFade key={index} delay={item.delay} inView>
                <MagicCard
                  className="cursor-pointer h-full rounded-xl border border-white/10 shadow-lg shadow-black/10 hover:shadow-2xl hover:shadow-black/20 transition-transform duration-300 hover:-translate-y-1"
                  gradientSize={280}
                  gradientFrom="#22d3ee"
                  gradientTo="#a78bfa"
                  gradientOpacity={0.25}
                  gradientColor="rgba(255,255,255,0.4)"
                >
                  <div className="p-6 h-full flex flex-col">
                    <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed flex-1">{item.content}</p>
                  </div>
                </MagicCard>
              </BlurFade>
            ))}
          </div>

          <BlurFade delay={0.5} inView>
            <div className="flex justify-center mt-12">
              <a 
                href="https://app.slash.cash"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block"
              >
                <ShimmerButton className="shadow-2xl h-12 px-8 text-lg">
                  <span className="whitespace-pre-wrap text-center font-medium leading-none tracking-tight text-white dark:from-white dark:to-slate-900/10">
                    🍽️ Explore Swiggy Analytics →
                  </span>
                </ShimmerButton>
              </a>
            </div>
          </BlurFade>
        </div>
      </section>

      {/* The Vision: Complete Personal Finance */}
      <section className="py-16 relative">
        <div className="max-w-[1100px] mx-auto px-4">
          <BlurFade delay={0.1} inView>
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4">
                <AnimatedShinyText className="inline-flex items-center justify-center">
                  🚀 Coming Soon
                </AnimatedShinyText>
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                <AnimatedGradientText>The Future: Complete AI Finance Tracking</AnimatedGradientText>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Slash will expand to automatically track ALL your expenses from emails—banks, credit cards, UPI, wallets, subscriptions, and more.
              </p>
            </div>
          </BlurFade>

          <div className="grid md:grid-cols-4 gap-8 auto-rows-fr">
            {[
              { icon: "🏦", title: "Bank Transactions", desc: "Automatic tracking of all bank account debits and credits with smart categorization.", delay: 0.2 },
              { icon: "💳", title: "Credit Card Analytics", desc: "Track spending across all cards, interest charges, due dates, and payment patterns.", delay: 0.3 },
              { icon: "📱", title: "UPI & Wallet Tracking", desc: "Monitor PhonePe, GPay, Paytm transactions with merchant identification and categorization.", delay: 0.4 },
              { icon: "🔄", title: "Subscription Management", desc: "Track all recurring payments, renewal dates, and forgotten subscriptions across services.", delay: 0.5 },
              { icon: "🛒", title: "E-commerce Tracking", desc: "Amazon, Flipkart, and other online shopping with detailed product categorization.", delay: 0.6 },
              { icon: "🚗", title: "Transportation & Travel", desc: "Uber, Ola, flight bookings, and travel expenses with location-based insights.", delay: 0.7 },
              { icon: "💡", title: "Bills & Utilities", desc: "Electricity, internet, mobile bills with usage patterns and cost optimization tips.", delay: 0.8 },
              { icon: "🎯", title: "Smart Budgeting", desc: "AI-powered budget recommendations based on your historical spending patterns.", delay: 0.9 }
            ].map((feature, index) => (
              <BlurFade key={index} delay={feature.delay} inView>
                <MagicCard
                  className="cursor-pointer h-full rounded-xl border border-white/10 shadow-lg shadow-black/10 hover:shadow-2xl hover:shadow-black/20 transition-transform duration-300 hover:-translate-y-1"
                  gradientSize={260}
                  gradientFrom="#22d3ee"
                  gradientTo="#a78bfa"
                  gradientOpacity={0.25}
                  gradientColor="rgba(255,255,255,0.4)"
                >
                  <div className="p-6 h-full flex flex-col text-center">
                    <span className="text-4xl mb-4 block">{feature.icon}</span>
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm flex-1">{feature.desc}</p>
                  </div>
                </MagicCard>
              </BlurFade>
            ))}
          </div>
        </div>
      </section>

      {/* How Slash Works */}
      <section className="py-16 relative">
        <div className="max-w-[1100px] mx-auto px-4">
          <BlurFade delay={0.1} inView>
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              <AnimatedGradientText>How Slash's AI Finance Tracking Works</AnimatedGradientText>
            </h2>
          </BlurFade>

          <div className="grid md:grid-cols-4 gap-8 auto-rows-fr">
            {[
              {
                title: "1. Connect Gmail Securely",
                content: "OAuth 2.0 access to scan only financial transaction emails. Banks, UPI, wallets, credit cards, subscriptions, and services. Zero access to personal or non-financial emails.",
                delay: 0.2
              },
              {
                title: "2. AI Extracts & Categorizes",
                content: "Advanced AI parses transaction amounts, merchants, and categories. Smart deduplication prevents double-counting across platforms. Automatic merchant normalization and spending categorization.",
                delay: 0.3
              },
              {
                title: "3. Rich Analytics Dashboard",
                content: "Complete financial overview with spending breakdowns, trends, and insights. Category-wise analysis, monthly comparisons, and behavioral patterns. Beautiful charts and visualizations for all your financial data.",
                delay: 0.4
              },
              {
                title: "4. Chat with Your Money",
                content: "Ask natural language questions about your finances: \"How much did I spend on food this month?\" \"Which subscriptions can I cancel?\" \"Am I spending more than last year?\"",
                delay: 0.5
              }
            ].map((item, index) => (
              <BlurFade key={index} delay={item.delay} inView>
                <MagicCard
                  className="cursor-pointer h-full rounded-xl border border-white/10 shadow-lg shadow-black/10 hover:shadow-2xl hover:shadow-black/20 transition-transform duration-300 hover:-translate-y-1"
                  gradientSize={280}
                  gradientFrom="#22d3ee"
                  gradientTo="#a78bfa"
                  gradientOpacity={0.25}
                  gradientColor="rgba(255,255,255,0.4)"
                >
                  <div className="p-6 h-full flex flex-col">
                    <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed flex-1">{item.content}</p>
                  </div>
                </MagicCard>
              </BlurFade>
            ))}
          </div>
        </div>
      </section>

      {/* Perfect For */}
      <section className="py-16 relative">
        <div className="max-w-[900px] mx-auto px-4">
          <BlurFade delay={0.1} inView>
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">
              <AnimatedGradientText>Perfect For Modern Spenders</AnimatedGradientText>
            </h2>
          </BlurFade>

          <div className="grid md:grid-cols-4 gap-8 auto-rows-fr">
            {[
              { icon: "💼", title: "Busy Professionals", desc: "No time for manual expense tracking", delay: 0.2 },
              { icon: "📱", title: "Digital-First Users", desc: "Most transactions via apps and cards", delay: 0.3 },
              { icon: "💰", title: "Budget-Conscious People", desc: "Want to understand spending patterns", delay: 0.4 },
              { icon: "🎯", title: "Goal-Oriented Savers", desc: "Need insights to optimize spending", delay: 0.5 }
            ].map((item, index) => (
              <BlurFade key={index} delay={item.delay} inView>
                <MagicCard
                  className="cursor-pointer h-full rounded-xl border border-white/10 shadow-lg shadow-black/10 hover:shadow-2xl hover:shadow-black/20 transition-transform duration-300 hover:-translate-y-1"
                  gradientSize={260}
                  gradientFrom="#22d3ee"
                  gradientTo="#a78bfa"
                  gradientOpacity={0.25}
                  gradientColor="rgba(255,255,255,0.4)"
                >
                  <div className="p-6 h-full flex flex-col text-center">
                    <span className="text-4xl mb-4 block">{item.icon}</span>
                    <h3 className="font-semibold mb-2">{item.title}</h3>
                    <p className="text-muted-foreground text-sm flex-1">{item.desc}</p>
                  </div>
                </MagicCard>
              </BlurFade>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 relative">
        <div className="max-w-[900px] mx-auto px-4">
          <BlurFade delay={0.1} inView>
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">
              <AnimatedGradientText>Early Users Love Slash</AnimatedGradientText>
            </h2>
          </BlurFade>

          <BlurFade delay={0.2} inView>
            <Carousel>
              <CarouselContent>
                {[
                  {
                    quote: "Started with Swiggy tracking and was shocked at my ₹15,000 monthly food spending! Can't wait for full bank integration.",
                    author: "Aarav, Hyderabad",
                    avatar: "/avatars/aarav.png",
                    fallback: "AR"
                  },
                  {
                    quote: "Finally, an expense tracker that works automatically! The AI insights are incredible—no more manual entry headaches.",
                    author: "Meena, Mumbai",
                    avatar: "/avatars/meena.png",
                    fallback: "MN"
                  },
                  {
                    quote: "The behavioral insights are game-changing. Slash showed me patterns I never noticed and helped me save ₹8,000 monthly.",
                    author: "Rahul, Bengaluru",
                    avatar: "/avatars/rahul.png",
                    fallback: "RH"
                  }
                ].map((testimonial, index) => (
                  <CarouselItem key={index}>
                    <MagicCard
                      className="cursor-pointer rounded-xl border border-white/10 shadow-lg shadow-black/10 hover:shadow-2xl hover:shadow-black/20 transition-transform duration-300 hover:-translate-y-1"
                      gradientSize={260}
                      gradientFrom="#22d3ee"
                      gradientTo="#a78bfa"
                      gradientOpacity={0.25}
                      gradientColor="rgba(255,255,255,0.4)"
                    >
                      <div className="flex flex-col items-center py-8 px-6">
                        <Avatar className="mb-4 w-16 h-16">
                          <AvatarImage src={testimonial.avatar} alt={testimonial.author} />
                          <AvatarFallback>{testimonial.fallback}</AvatarFallback>
                        </Avatar>
                        <div className="text-lg font-medium mb-2 text-center">"{testimonial.quote}"</div>
                        <div className="text-muted-foreground text-sm">— {testimonial.author}</div>
                      </div>
                    </MagicCard>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </BlurFade>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="py-16 relative">
        <div className="max-w-[700px] mx-auto px-4 text-center">
          <BlurFade delay={0.1} inView>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              <AnimatedGradientText>
                Your AI finance assistant awaits
              </AnimatedGradientText>
            </h2>
          </BlurFade>

          <BlurFade delay={0.2} inView>
            <p className="text-lg text-muted-foreground mb-8">
              Start with Swiggy analytics today and be first in line for complete expense tracking when we expand.
            </p>
          </BlurFade>

          <BlurFade delay={0.3} inView>
            <div className="flex justify-center">
              <a 
                href="https://app.slash.cash"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block"
              >
                <ShimmerButton className="shadow-2xl h-12 px-8">
                  <span className="whitespace-pre-wrap text-center font-medium leading-none tracking-tight text-white dark:from-white dark:to-slate-900/10">
                    ✨ Get Started with AI Finance Tracking →
                  </span>
                </ShimmerButton>
              </a>
            </div>
          </BlurFade>
        </div>
      </section>
    </div>
  )
}
