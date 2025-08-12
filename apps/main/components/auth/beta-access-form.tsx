"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { useTRPC } from "@/trpc/client"
import { TRPCClientError } from "@trpc/client"

// UI Components
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { CheckCircle, Mail, AlertCircle, Loader2 } from "lucide-react"

export function BetaAccessForm() {
  const trpc = useTRPC()
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setIsMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

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
      <div
        className={`transform transition-all duration-300 ease-out ${
          isMounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
        }`}
      >
        <Card className="w-full max-w-md border-green-200 bg-green-50">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-green-800">Request Submitted!</CardTitle>
            <CardDescription className="text-green-700">
              Thank you for your interest in Slash. We've received your beta access request and will notify you when access is available.
            </CardDescription>
          </CardHeader>
          <CardFooter className="pt-0">
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
      </div>
    )
  }

  return (
    <div
      className={`transform transition-all duration-300 ease-out ${
        isMounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
      }`}
    >
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Mail className="w-5 h-5 text-blue-600 motion-safe:animate-pulse" />
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
              </div>
              {error && (
                <Alert variant="destructive" className="mt-1">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
          <CardFooter className="pt-4">
            <Button
              type="submit"
              className="w-full"
              disabled={requestBetaAccessMutation.isPending}
            >
              {requestBetaAccessMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Submitting...</span>
                </div>
              ) : (
                "Request Beta Access"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}