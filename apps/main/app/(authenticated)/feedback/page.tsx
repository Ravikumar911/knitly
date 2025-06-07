"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { TRPCClientError } from "@trpc/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { RadioGroup, RadioGroupItem } from "@workspace/ui/components/radio-group";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Separator } from "@workspace/ui/components/separator";
import { 
  Send, 
  Bug, 
  Lightbulb, 
  MessageSquare, 
  Zap,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { useTRPC } from "@/trpc/client";

const feedbackTypes = [
  {
    value: "bug",
    label: "Bug Report",
    description: "Report a problem or error",
    icon: Bug,
    color: "text-red-500"
  },
  {
    value: "feature",
    label: "Feature Request", 
    description: "Suggest a new feature",
    icon: Lightbulb,
    color: "text-yellow-500"
  },
  {
    value: "improvement",
    label: "Improvement",
    description: "Suggest an enhancement",
    icon: Zap,
    color: "text-blue-500"
  },
  {
    value: "general",
    label: "General Feedback",
    description: "Share your thoughts",
    icon: MessageSquare,
    color: "text-green-500"
  }
];

export default function FeedbackPage() {
  const router = useRouter();
  const trpc = useTRPC();
  const [formData, setFormData] = useState({
    subject: "",
    message: "",
    type: "",
    priority: "medium" as "low" | "medium" | "high",
    userEmail: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const createFeedbackMutation = useMutation(trpc.feedback.create.mutationOptions({
    onSuccess: () => {
      setSubmitStatus("success");
      setIsSubmitting(false);
      // Reset form
      setFormData({
        subject: "",
        message: "",
        type: "",
        priority: "medium",
        userEmail: "",
      });
      // Redirect after a delay
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    },
    onError: (error: any) => {
      setSubmitStatus("error");
      setErrorMessage(error.message || "An error occurred");
      setIsSubmitting(false);
    },
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject.trim() || !formData.message.trim() || !formData.type) {
      setSubmitStatus("error");
      setErrorMessage("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus("idle");
    
    createFeedbackMutation.mutate({
      subject: formData.subject,
      message: formData.message,
      type: formData.type as "bug" | "feature" | "general" | "improvement",
      priority: formData.priority,
      userEmail: formData.userEmail || undefined,
      userAgent: navigator.userAgent,
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (submitStatus === "error") {
      setSubmitStatus("idle");
    }
  };

  if (submitStatus === "success") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
            <p className="text-muted-foreground mb-4">
              Your feedback has been submitted successfully. We appreciate you taking the time to help us improve.
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecting to dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Send Feedback</h1>
        <p className="text-muted-foreground mt-2">
          Help us improve by sharing your thoughts, reporting bugs, or suggesting new features
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Feedback Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">What type of feedback do you have?</CardTitle>
            <CardDescription>
              Select the category that best describes your feedback
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup 
              value={formData.type} 
              onValueChange={(value) => handleInputChange("type", value)}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {feedbackTypes.map((type) => (
                <div key={type.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={type.value} id={type.value} />
                  <Label 
                    htmlFor={type.value} 
                    className="flex items-center space-x-3 cursor-pointer flex-1 p-3 rounded-lg border hover:bg-accent"
                  >
                    <type.icon className={`h-5 w-5 ${type.color}`} />
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-sm text-muted-foreground">{type.description}</div>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Subject and Priority */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  placeholder="Brief summary of your feedback"
                  value={formData.subject}
                  onChange={(e) => handleInputChange("subject", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(value) => handleInputChange("priority", value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                placeholder="Please provide detailed information about your feedback..."
                value={formData.message}
                onChange={(e) => handleInputChange("message", e.target.value)}
                className="mt-1 min-h-[120px]"
              />
            </div>

            <div>
              <Label htmlFor="userEmail">Email (Optional)</Label>
              <Input
                id="userEmail"
                type="email"
                placeholder="your.email@example.com"
                value={formData.userEmail}
                onChange={(e) => handleInputChange("userEmail", e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Provide your email if you'd like us to follow up with you
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {submitStatus === "error" && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting || !formData.subject.trim() || !formData.message.trim() || !formData.type}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Feedback
              </>
            )}
          </Button>
        </div>
      </form>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Other Ways to Reach Us</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">For urgent issues:</h4>
              <p className="text-muted-foreground">
                Email us directly at support@slash.cash
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Feature discussions:</h4>
              <p className="text-muted-foreground">
                Join our community forum for feature discussions
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 