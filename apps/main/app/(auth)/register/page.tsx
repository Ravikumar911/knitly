import { Metadata } from "next"
import { RegisterForm } from "@/components/auth/register-form"

export const metadata: Metadata = {
  title: "Register - Finwise",
  description: "Create your account",
}

export default function RegisterPage() {
  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Create an Account
        </h1>
        <p className="text-muted-foreground mt-2">
          Join thousands of users managing their finances with AI
        </p>
      </div>
      <RegisterForm />
    </div>
  )
} 