export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      {/* Left side - Auth form */}
      <div className="flex items-center justify-center p-4 md:p-8">
        {children}
      </div>
      
      {/* Right side - Hero image/content */}
      <div className="hidden md:block relative bg-muted">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-muted-foreground/20" />
        <div className="relative h-full flex items-center justify-center p-8">
          <div className="max-w-lg">
            <h2 className="text-3xl font-bold mb-4">
              Take Control of Your Finances
            </h2>
            <p className="text-muted-foreground text-lg">
              Join thousands of users who are transforming their financial future with AI-powered insights and personalized guidance.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 