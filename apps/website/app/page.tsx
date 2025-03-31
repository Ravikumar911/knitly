import { Metadata } from "next"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@workspace/ui/components/carousel"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Progress } from "@workspace/ui/components/progress"
import { MonthlySavingsChart } from "../components/monthly-savings-chart"

export const metadata: Metadata = {
  title: "Finwise - Your AI-Powered Personal Finance Coach",
  description: "Transform your financial future with personalized AI coaching. Get smart budgeting insights, automated expense tracking, and intelligent financial planning tailored just for you.",
  keywords: [
    "personal finance",
    "AI financial coach",
    "budgeting app",
    "expense tracking",
    "financial planning",
    "money management",
    "financial goals",
    "AI-powered finance",
    "personal budget",
    "financial wellness"
  ],
  openGraph: {
    title: "Finwise - Your AI-Powered Personal Finance Coach",
    description: "Transform your financial future with personalized AI coaching",
    type: "website",
    locale: "en_US",
    siteName: "Finwise"
  },
  twitter: {
    card: "summary_large_image",
    title: "Finwise - Your AI-Powered Personal Finance Coach",
    description: "Transform your financial future with personalized AI coaching"
  }
}

const demoChartData = [
  { month: "Jan", savings: 1200 },
  { month: "Feb", savings: 1400 },
  { month: "Mar", savings: 1600 },
  { month: "Apr", savings: 1800 },
  { month: "May", savings: 2200 },
  { month: "Jun", savings: 2600 }
]

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-20 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 hero-gradient opacity-40" />
        <div className="relative z-10 max-w-[1200px] mx-auto text-center">
          <Badge variant="secondary" className="mb-6 text-sm px-4 py-1">
            Early Access Now Available
          </Badge>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/80">
            Your Personal AI
            <br />
            Finance Coach
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-[700px] mx-auto mb-8">
            Smart budgeting, intelligent insights, and personalized financial guidance — powered by AI.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" className="h-12 px-8">Start Free Trial</Button>
            <Button size="lg" variant="outline" className="h-12 px-8">See How It Works</Button>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-[1200px] mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Experience the Future of Finance</h2>
          <Tabs defaultValue="insights" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="insights">AI Insights</TabsTrigger>
              <TabsTrigger value="tracking">Expense Tracking</TabsTrigger>
              <TabsTrigger value="goals">Goal Planning</TabsTrigger>
            </TabsList>
            <TabsContent value="insights" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <MonthlySavingsChart data={demoChartData} />
                <Card>
                  <CardHeader>
                    <CardTitle>AI Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Alert>
                      <AlertDescription>
                        Based on your spending patterns, you could save $240 monthly by optimizing your subscription services.
                      </AlertDescription>
                    </Alert>
                    <Alert>
                      <AlertDescription>
                        Your emergency fund is below the recommended 6-month coverage. Consider allocating 15% more to savings.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            <TabsContent value="tracking">
              <Card>
                <CardHeader>
                  <CardTitle>Smart Expense Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span>Housing & Utilities</span>
                        <span>35%</span>
                      </div>
                      <Progress value={35} />
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span>Food & Dining</span>
                        <span>25%</span>
                      </div>
                      <Progress value={25} />
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span>Transportation</span>
                        <span>15%</span>
                      </div>
                      <Progress value={15} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="goals">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Financial Goals</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-2">
                          <span>Emergency Fund</span>
                          <span>75% Complete</span>
                        </div>
                        <Progress value={75} />
                      </div>
                      <div>
                        <div className="flex justify-between mb-2">
                          <span>Home Down Payment</span>
                          <span>45% Complete</span>
                        </div>
                        <Progress value={45} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>AI Goal Insights</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Alert>
                      <AlertDescription>
                        You're on track to reach your emergency fund goal by September 2024. Keep up the great work!
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-32 bg-background">
        <div className="max-w-[1200px] mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            Why Choose Finwise?
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="bg-background/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-xl">Smart Expense Tracking</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground">
                Automatically categorize and track your expenses with AI-powered insights that understand your spending patterns.
              </CardContent>
            </Card>
            <Card className="bg-background/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-xl">Personalized Budgeting</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground">
                Get custom budget recommendations based on your income, lifestyle, and financial goals.
              </CardContent>
            </Card>
            <Card className="bg-background/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-xl">AI Financial Coach</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground">
                Receive personalized advice and actionable insights to improve your financial health.
              </CardContent>
            </Card>
            <Card className="bg-background/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-xl">Goal Planning</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground">
                Set and achieve your financial goals with AI-powered strategies and progress tracking.
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 md:py-32 bg-muted/30">
        <div className="max-w-[1200px] mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            What Our Users Say
          </h2>
          <Carousel className="w-full max-w-xl mx-auto">
            <CarouselContent>
              <CarouselItem>
                <div className="text-center p-6">
                  <Avatar className="w-20 h-20 mx-auto mb-4">
                    <AvatarImage src="https://i.pravatar.cc/150?img=1" />
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                  <p className="text-lg mb-4">"Finwise has completely transformed how I manage my money. The AI insights are like having a personal financial advisor."</p>
                  <p className="font-semibold">John Doe</p>
                  <p className="text-sm text-muted-foreground">Software Engineer</p>
                </div>
              </CarouselItem>
              <CarouselItem>
                <div className="text-center p-6">
                  <Avatar className="w-20 h-20 mx-auto mb-4">
                    <AvatarImage src="https://i.pravatar.cc/150?img=2" />
                    <AvatarFallback>JS</AvatarFallback>
                  </Avatar>
                  <p className="text-lg mb-4">"The automated expense tracking and budgeting features have helped me save more than ever before."</p>
                  <p className="font-semibold">Jane Smith</p>
                  <p className="text-sm text-muted-foreground">Marketing Manager</p>
                </div>
              </CarouselItem>
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 md:py-32">
        <div className="max-w-[1200px] mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            Your Journey to Financial Freedom
          </h2>
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-6">1</div>
              <h3 className="text-xl font-semibold mb-4">Connect Your Accounts</h3>
              <p className="text-muted-foreground">Securely link your accounts for automated expense tracking</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-6">2</div>
              <h3 className="text-xl font-semibold mb-4">Set Your Goals</h3>
              <p className="text-muted-foreground">Define your financial objectives and let AI create your path</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-6">3</div>
              <h3 className="text-xl font-semibold mb-4">Achieve Results</h3>
              <p className="text-muted-foreground">Watch your finances improve with personalized guidance</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 bg-muted/40">
        <div className="max-w-[700px] mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Start Your Financial Journey Today</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of users who are taking control of their finances with AI-powered guidance.
          </p>
          <Button size="lg" className="h-12 px-8">
            Start Free Trial
          </Button>
        </div>
      </section>
    </div>
  )
}
