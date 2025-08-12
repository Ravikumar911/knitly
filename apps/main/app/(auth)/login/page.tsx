import { Metadata } from "next"
import { LoginForm } from "@/components/auth/login-form"
import { BetaAccessForm } from "@/components/auth/beta-access-form"
import { Separator } from "@workspace/ui/components/separator"

export const metadata: Metadata = {
  title: "Login - Slash",
  description: "Login to your account",
}

export default function LoginPage() {
  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome to Slash
        </h1>
        <p className="text-muted-foreground mt-2">
          Your smart expense tracking companion
        </p>
      </div>
      
      <LoginForm />
      
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator className="w-full" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or
          </span>
        </div>
      </div>
      
      <BetaAccessForm />
    </div>
  )
} 