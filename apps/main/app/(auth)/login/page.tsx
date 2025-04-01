import { Metadata } from "next"
import { LoginForm } from "@/components/auth/login-form"

export const metadata: Metadata = {
  title: "Login - Finwise",
  description: "Login to your account",
}

export default function LoginPage() {
  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back
        </h1>
        <p className="text-muted-foreground mt-2">
          Sign in to your account
        </p>
      </div>
      <LoginForm />
    </div>
  )
} 