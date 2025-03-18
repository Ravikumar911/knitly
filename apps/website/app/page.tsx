import { Metadata } from "next"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"

export const metadata: Metadata = {
  title: "Knitly - Where Micro-Communities Come to Life",
  description: "Connect with like-minded locals and make real-world friendships — powered by AI. Join micro-communities, discover local events, and create meaningful connections in your neighborhood.",
  keywords: [
    "micro-communities",
    "local events",
    "AI-powered social platform",
    "community building",
    "local networking",
    "meetup groups",
    "social connections",
    "local activities",
    "community events",
    "neighborhood groups"
  ],
  openGraph: {
    title: "Knitly - Where Micro-Communities Come to Life",
    description: "Connect with like-minded locals and make real-world friendships — powered by AI",
    type: "website",
    locale: "en_US",
    siteName: "Knitly"
  },
  twitter: {
    card: "summary_large_image",
    title: "Knitly - Where Micro-Communities Come to Life",
    description: "Connect with like-minded locals and make real-world friendships — powered by AI"
  }
}

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-20 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 hero-gradient opacity-40" />
        <div className="relative z-10 max-w-[1200px] mx-auto text-center">
          <Badge variant="secondary" className="mb-6 text-sm px-4 py-1">
            Join the Beta
          </Badge>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/80">
            Where Micro-Communities
            <br />
            Come to Life
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-[700px] mx-auto mb-8">
            Connect with like-minded locals and make real-world friendships — powered by AI.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" className="h-12 px-8">Get Started</Button>
            <Button size="lg" variant="outline" className="h-12 px-8">Learn More</Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-32 bg-muted/40">
        <div className="max-w-[1200px] mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            Why Choose Knitly?
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="bg-background/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-xl">AI-Powered Matching</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground">
                Our AI analyzes your interests and preferences to connect you with the perfect local events and communities.
              </CardContent>
            </Card>
            <Card className="bg-background/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-xl">Instant Communities</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground">
                Create or join micro-communities around your hobbies, career goals, or random passions instantly.
              </CardContent>
            </Card>
            <Card className="bg-background/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-xl">Real Connections</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground">
                Get off the screen and make genuine local friendships through in-person experiences.
              </CardContent>
            </Card>
            <Card className="bg-background/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-xl">Easy Events</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground">
                Host and manage events effortlessly with AI-powered suggestions for optimal scheduling.
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 md:py-32">
        <div className="max-w-[1200px] mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-6">1</div>
              <h3 className="text-xl font-semibold mb-4">Sign Up & Set Preferences</h3>
              <p className="text-muted-foreground">Create your profile and tell us about your interests</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-6">2</div>
              <h3 className="text-xl font-semibold mb-4">Discover Communities</h3>
              <p className="text-muted-foreground">Browse and join local groups that match your interests</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-6">3</div>
              <h3 className="text-xl font-semibold mb-4">Meet & Connect</h3>
              <p className="text-muted-foreground">Attend events and make real-world connections</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 bg-muted/40">
        <div className="max-w-[700px] mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Join Your Community?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Be among the first to discover events, connect with micro-communities, and shape the future of local networking.
          </p>
          <Button size="lg" className="h-12 px-8">
            Join the Beta
          </Button>
        </div>
      </section>
    </div>
  )
}
