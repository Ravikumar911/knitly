"use client"

import { useState } from "react"
import { LoginForm } from "@/components/auth/login-form"
import { BetaRequestForm } from "@/components/auth/beta-request-form"
import { Button } from "@workspace/ui/components/button"

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<"login" | "beta">("login")

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome to Slash
        </h1>
        <p className="text-muted-foreground mt-2">
          {activeTab === "login" 
            ? "Sign in to your account" 
            : "Request beta access to get started"
          }
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={activeTab === "login" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("login")}
          className="flex-1"
        >
          Sign In
        </Button>
        <Button
          variant={activeTab === "beta" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("beta")}
          className="flex-1"
        >
          Request Beta Access
        </Button>
      </div>

      {/* Form content */}
      {activeTab === "login" ? (
        <>
          <LoginForm />
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have access yet?{" "}
              <button
                onClick={() => setActiveTab("beta")}
                className="text-primary hover:underline font-medium"
              >
                Request beta access
              </button>
            </p>
          </div>
        </>
      ) : (
        <>
          <BetaRequestForm 
            onSuccess={() => {
              // Optionally switch back to login after successful beta request
              setTimeout(() => setActiveTab("login"), 3000)
            }}
          />
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Already have access?{" "}
              <button
                onClick={() => setActiveTab("login")}
                className="text-primary hover:underline font-medium"
              >
                Sign in here
              </button>
            </p>
          </div>
        </>
      )}
    </div>
  )
} 