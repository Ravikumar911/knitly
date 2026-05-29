"use client";

import { useSyncStore } from "@/hooks/useSyncStore";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import {
  AlertCircle,
  Lock,
  RefreshCw,
  Wifi,
  MessageCircle,
} from "lucide-react";

interface ErrorDisplayProps {
  onRetry?: () => void;
  onReauth?: () => void;
  onContactSupport?: () => void;
  className?: string;
}

export function ErrorDisplay({
  onRetry,
  onReauth,
  onContactSupport,
  className,
}: ErrorDisplayProps) {
  const syncStore = useSyncStore();
  const { currentError, clearError, getErrorActions } = syncStore;
  const hasError = !!currentError;

  if (!hasError || !currentError) {
    return null;
  }

  // Get error actions from store function
  const errorActions = getErrorActions();

  // Get appropriate icon for error type
  const getErrorIcon = () => {
    switch (currentError.type) {
      case "oauth":
        return <Lock className="h-4 w-4" />;
      case "network":
        return <Wifi className="h-4 w-4" />;
      case "sync":
        return <RefreshCw className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  // Get appropriate alert variant
  const getAlertVariant = () => {
    switch (currentError.severity) {
      case "critical":
        return "destructive";
      case "high":
        return "default";
      default:
        return "default";
    }
  };

  // Handle primary action
  const handlePrimaryAction = () => {
    if (errorActions.needsReauth && onReauth) {
      onReauth();
    } else if (errorActions.canRetry && onRetry) {
      onRetry();
    } else {
      clearError();
    }
  };

  // Handle secondary action
  const handleSecondaryAction = () => {
    if (onContactSupport) {
      onContactSupport();
    }
  };

  return (
    <Alert variant={getAlertVariant()} className={className}>
      {getErrorIcon()}
      <AlertTitle>
        {currentError.type === "oauth"
          ? "Authentication Issue"
          : currentError.type === "network"
            ? "Connection Problem"
            : currentError.type === "sync"
              ? "Sync Error"
              : "Error"}
      </AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-4">{currentError.message}</p>

        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={handlePrimaryAction}
            variant={
              currentError.severity === "critical" ? "default" : "outline"
            }
            size="sm"
          >
            {errorActions.primaryAction}
          </Button>

          {errorActions.secondaryAction && (
            <Button onClick={handleSecondaryAction} variant="outline" size="sm">
              <MessageCircle className="h-3 w-3 mr-1" />
              {errorActions.secondaryAction}
            </Button>
          )}

          {/* Show dismiss option for non-critical errors */}
          {currentError.severity !== "critical" && (
            <Button onClick={clearError} variant="ghost" size="sm">
              Dismiss
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}

// Specific error displays for common scenarios
export function SyncErrorDisplay({
  onRetry,
  onContactSupport,
}: {
  onRetry?: () => void;
  onContactSupport?: () => void;
}) {
  return <ErrorDisplay onRetry={onRetry} onContactSupport={onContactSupport} />;
}

export function OAuthErrorDisplay({
  onReauth,
  onContactSupport,
}: {
  onReauth?: () => void;
  onContactSupport?: () => void;
}) {
  return (
    <ErrorDisplay onReauth={onReauth} onContactSupport={onContactSupport} />
  );
}
