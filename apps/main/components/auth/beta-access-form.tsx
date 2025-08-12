"use client"

import * as React from "react"
import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { useTRPC } from "@/trpc/client"
import { TRPCClientError } from "@trpc/client"

// UI Components
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { CheckCircle, Mail, AlertCircle } from "lucide-react"

export function BetaAccessForm() {
  const trpc = useTRPC()
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)

  const requestBetaAccessMutation = useMutation(
    trpc.feedback.requestBetaAccess.mutationOptions({
      onSuccess: () => {
        setIsSubmitted(true)
        setError("")
      },
      onError: (err) => {
        if (err instanceof TRPCClientError) {
          setError(err.message || "Failed to submit beta access request")
        } else {
          setError("An error occurred while submitting your request")
        }
      }
    })
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    
    if (!email.trim()) {
      setError("Please enter your email address")
      return
    }

    if (!email.endsWith('@gmail.com')) {
      setError("Only Gmail addresses are allowed for beta access")
      return
    }

    requestBetaAccessMutation.mutate({
      email: email.trim(),
      userAgent: navigator.userAgent,
    })
  }

  if (isSubmitted) {
    return (
      <Card className="w-full max-w-md border-green-200 bg-green-50">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <CardTitle className="text-green-800">Request Submitted!</CardTitle>
          <CardDescription className="text-green-700">
            Thank you for your interest in Slash. We've received your beta access request and will notify you when access is available.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button 
            variant="outline" 
            className="w-full border-green-300 text-green-700 hover:bg-green-100"
            onClick={() => {
              setIsSubmitted(false)
              setEmail("")
            }}
          >
            Submit Another Request
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Mail className="w-5 h-5 text-blue-600" />
          <CardTitle>Request Beta Access</CardTitle>
        </div>
        <CardDescription>
          Enter your Gmail address to request early access to Slash. We're currently in private beta and only accepting Gmail users.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Gmail Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={requestBetaAccessMutation.isPending}
                className={error ? "border-red-300 focus:border-red-500" : ""}
              />
              <p className="text-sm text-muted-foreground">
                Only @gmail.com addresses are accepted
              </p>
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            type="submit" 
            className="w-full"
            disabled={requestBetaAccessMutation.isPending}
          >
            {requestBetaAccessMutation.isPending ? (
              <div className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle 
                    className="opacity-25" 
                    cx="12" 
                    cy="12" 
                    r="10" 
                    stroke="currentColor" 
                    strokeWidth="4"
                  />
                  <path 
                    className="opacity-75" 
                    fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Submitting...</span>
              </div>
            ) : (
              "Request Beta Access"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}