"use client"

import * as React from "react"
import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Label } from "@workspace/ui/components/label"
import { useTRPC } from "@/trpc/client"

interface BetaRequestFormProps {
  onSuccess?: () => void
}

export function BetaRequestForm({ onSuccess }: BetaRequestFormProps) {
  const trpc = useTRPC()
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")

  const betaRequestMutation = trpc.feedback.requestBeta.useMutation({
    onSuccess: () => {
      setSubmitStatus("success")
      setIsSubmitting(false)
      setEmail("")
      setMessage("")
      onSuccess?.()
    },
    onError: (error) => {
      setSubmitStatus("error")
      setErrorMessage(error.message || "Failed to submit beta request")
      setIsSubmitting(false)
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim()) {
      setSubmitStatus("error")
      setErrorMessage("Email is required")
      return
    }

    if (!email.endsWith('@gmail.com')) {
      setSubmitStatus("error")
      setErrorMessage("Beta access is currently only available for Gmail users")
      return
    }

    setIsSubmitting(true)
    setSubmitStatus("idle")
    setErrorMessage("")
    
    betaRequestMutation.mutate({
      userEmail: email,
      message: message || undefined,
      userAgent: navigator.userAgent,
    })
  }

  const handleInputChange = (field: string, value: string) => {
    if (field === 'email') {
      setEmail(value)
    } else if (field === 'message') {
      setMessage(value)
    }
    
    if (submitStatus === "error") {
      setSubmitStatus("idle")
      setErrorMessage("")
    }
  }

  if (submitStatus === "success") {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-green-600">Request Submitted!</CardTitle>
          <CardDescription>
            We've received your beta access request. We'll review it and get back to you soon.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 p-4">
              <p className="text-sm text-green-700">
                <strong>What's next?</strong> Our team will review your request and send you an invitation to your Gmail inbox if approved.
              </p>
            </div>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => {
                setSubmitStatus("idle")
                setEmail("")
                setMessage("")
              }}
            >
              Submit Another Request
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Request Beta Access</CardTitle>
        <CardDescription>
          Our app is currently in private beta. Request access with your Gmail account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Gmail Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="your.email@gmail.com"
              value={email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              disabled={isSubmitting}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Beta access is currently limited to Gmail users only
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Why do you want beta access? (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Tell us about your use case or why you're interested..."
              value={message}
              onChange={(e) => handleInputChange('message', e.target.value)}
              disabled={isSubmitting}
              className="min-h-[80px] resize-none"
            />
          </div>

          {submitStatus === "error" && (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <Button 
            type="submit" 
            className="w-full"
            disabled={isSubmitting || !email}
          >
            {isSubmitting ? (
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
        </form>
      </CardContent>
    </Card>
  )
}