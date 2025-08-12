"use client"

import * as React from "react"
import { useEffect, useState, useCallback, useRef } from "react"
import { useMutation } from "@tanstack/react-query"
import { useTRPC } from "@/trpc/client"
import { TRPCClientError } from "@trpc/client"

// UI Components
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { CheckCircle, Mail, AlertCircle, Loader2, Clock } from "lucide-react"

export function BetaAccessForm() {
  const trpc = useTRPC()
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [lastSubmitTime, setLastSubmitTime] = useState<number | null>(null)
  const [cooldownTimeLeft, setCooldownTimeLeft] = useState(0)
  const [validationError, setValidationError] = useState("")
  
  const debounceTimerRef = useRef<NodeJS.Timeout>()
  const cooldownTimerRef = useRef<NodeJS.Timeout>()
  
  const SUBMIT_COOLDOWN_MS = 30000 // 30 seconds between submissions

  useEffect(() => {
    const id = requestAnimationFrame(() => setIsMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // Check localStorage for previous submissions to prevent easy bypassing
  useEffect(() => {
    const lastSubmit = localStorage.getItem('beta-access-last-submit')
    if (lastSubmit) {
      const lastSubmitTime = parseInt(lastSubmit, 10)
      const timeSince = Date.now() - lastSubmitTime
      if (timeSince < SUBMIT_COOLDOWN_MS) {
        setLastSubmitTime(lastSubmitTime)
        setCooldownTimeLeft(Math.ceil((SUBMIT_COOLDOWN_MS - timeSince) / 1000))
      }
    }
  }, [])

  // Cooldown timer effect
  useEffect(() => {
    if (cooldownTimeLeft > 0) {
      cooldownTimerRef.current = setTimeout(() => {
        setCooldownTimeLeft(prev => prev - 1)
      }, 1000)
    } else if (lastSubmitTime) {
      setLastSubmitTime(null)
    }
    
    return () => {
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current)
      }
    }
  }, [cooldownTimeLeft, lastSubmitTime])

  // Debounced email validation
  const validateEmail = useCallback((emailValue: string) => {
    setValidationError("")
    
    if (!emailValue.trim()) {
      return
    }

    if (emailValue.length < 5) {
      setValidationError("Email is too short")
      return
    }

    if (!emailValue.endsWith('@gmail.com')) {
      setValidationError("Only Gmail addresses are accepted")
      return
    }

    const localPart = emailValue.split('@')[0]
    if (!localPart || localPart.length < 3) {
      setValidationError("Please enter a valid Gmail address")
      return
    }

    if (/^[0-9]+$/.test(localPart)) {
      setValidationError("Please enter a valid personal Gmail address")
      return
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /test[0-9]*@gmail\.com/,
      /temp[0-9]*@gmail\.com/,
      /fake[0-9]*@gmail\.com/,
      /spam[0-9]*@gmail\.com/,
    ]
    
    if (suspiciousPatterns.some(pattern => pattern.test(emailValue.toLowerCase()))) {
      setValidationError("Please enter a valid personal Gmail address")
      return
    }
  }, [])

  const debouncedValidateEmail = useCallback((emailValue: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      validateEmail(emailValue)
    }, 500)
  }, [validateEmail])

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current)
      }
    }
  }, [])

  const requestBetaAccessMutation = useMutation(
    trpc.feedback.requestBetaAccess.mutationOptions({
      onSuccess: (data) => {
        setIsSubmitted(true)
        setError("")
        setValidationError("")
        
        // Store submission time in localStorage
        localStorage.setItem('beta-access-last-submit', Date.now().toString())
        localStorage.setItem('beta-access-email', email.trim().toLowerCase())
        
        console.log('✅ Beta access request submitted:', data)
      },
      onError: (err) => {
        if (err instanceof TRPCClientError) {
          // Handle specific error types
          if (err.data?.code === 'TOO_MANY_REQUESTS') {
            setError(err.message)
            setLastSubmitTime(Date.now())
            setCooldownTimeLeft(30) // 30 second cooldown on rate limit
          } else if (err.data?.code === 'CONFLICT') {
            setError(err.message)
          } else {
            setError(err.message || "Failed to submit beta access request")
          }
        } else {
          setError("An error occurred while submitting your request")
        }
      }
    })
  )

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value
    setEmail(newEmail)
    setError("") // Clear server errors when user types
    debouncedValidateEmail(newEmail)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setValidationError("")
    
    // Check cooldown
    if (cooldownTimeLeft > 0) {
      setError(`Please wait ${cooldownTimeLeft} seconds before submitting again`)
      return
    }
    
    const trimmedEmail = email.trim().toLowerCase()
    
    if (!trimmedEmail) {
      setError("Please enter your email address")
      return
    }

    // Client-side validation
    if (validationError) {
      setError(validationError)
      return
    }

    if (!trimmedEmail.endsWith('@gmail.com')) {
      setError("Only Gmail addresses are allowed for beta access")
      return
    }

    // Check if they've already submitted this email recently
    const lastSubmittedEmail = localStorage.getItem('beta-access-email')
    if (lastSubmittedEmail === trimmedEmail) {
      setError("You've already requested beta access with this email address")
      return
    }

    // Set cooldown immediately to prevent double-submission
    setLastSubmitTime(Date.now())
    setCooldownTimeLeft(30)

    requestBetaAccessMutation.mutate({
      email: trimmedEmail,
      userAgent: navigator.userAgent,
    })
  }

  const isFormDisabled = requestBetaAccessMutation.isPending || cooldownTimeLeft > 0 || !!validationError

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
                  onChange={handleEmailChange}
                  disabled={isFormDisabled}
                  className={error || validationError ? "border-red-300 focus:border-red-500" : ""}
                />
                {validationError && (
                  <p className="text-sm text-red-600 mt-1">{validationError}</p>
                )}
                {cooldownTimeLeft > 0 && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-amber-600">
                    <Clock className="h-4 w-4" />
                    <span>Please wait {cooldownTimeLeft} seconds before submitting again</span>
                  </div>
                )}
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
              disabled={isFormDisabled}
            >
              {requestBetaAccessMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Submitting...</span>
                </div>
              ) : cooldownTimeLeft > 0 ? (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Wait {cooldownTimeLeft}s</span>
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