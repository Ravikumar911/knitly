'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert';
import { Button } from '@workspace/ui/components/button';
import { 
  AlertCircle, 
  Lock, 
  RefreshCw, 
  AlertTriangle, 
  XCircle,
  Loader2,
  LogOut 
} from 'lucide-react';
import { useErrorState, useErrorActions, useErrorTracking } from '@/hooks/useErrorState';
import { UserState } from '@workspace/database';

/**
 * Props for the ErrorDisplay component
 */
interface ErrorDisplayProps {
  userState: UserState;
  syncStatus?: string | null;
  oauthError?: {
    type: string | null;
    code: string | null;
    requiresReauth: boolean;
    userFriendlyMessage: string | null;
  } | null;
  syncError?: {
    type: string;
    message: string;
    code?: string;
  } | null;
  onRetry?: () => void;
  onSignOut?: () => void;
  isRetrying?: boolean;
  className?: string;
}

/**
 * Unified error display component
 * Provides consistent error UI across all sync components
 */
export function ErrorDisplay({
  userState,
  syncStatus,
  oauthError,
  syncError,
  onRetry,
  onSignOut,
  isRetrying = false,
  className = ''
}: ErrorDisplayProps) {
  const router = useRouter();
  const errorState = useErrorState({ userState, syncStatus, oauthError, syncError });
  const errorActions = useErrorActions();
  const errorTracking = useErrorTracking();

  // Default sign out handler
  const handleSignOut = useCallback(async () => {
    if (onSignOut) {
      onSignOut();
      return;
    }

    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, [onSignOut, router]);

  // Handle retry with tracking
  const handleRetry = useCallback(() => {
    if (onRetry) {
      errorTracking.trackRecoveryAttempt(errorState, 'retry');
      onRetry();
    }
  }, [onRetry, errorState, errorTracking]);

  // Handle reauth with tracking
  const handleReauth = useCallback(() => {
    errorTracking.trackRecoveryAttempt(errorState, 'reauth');
    handleSignOut();
  }, [errorState, errorTracking, handleSignOut]);

  // Get appropriate icon based on error type
  const getErrorIcon = () => {
    if (!errorState.displayConfig) return <AlertCircle className="h-4 w-4" />;

    switch (errorState.displayConfig.icon) {
      case 'lock':
        return <Lock className="h-4 w-4" />;
      case 'refresh':
        return <RefreshCw className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'error':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  // Get alert variant based on error severity
  const getAlertVariant = () => {
    if (errorState.oauthError) {
      return errorState.oauthError.severity === 'critical' ? 'destructive' : 'default';
    }
    if (errorState.syncError) {
      return errorState.syncError.severity === 'critical' ? 'destructive' : 'default';
    }
    return 'default';
  };

  // Don't render if no error
  if (!errorState.hasError || !errorState.displayConfig) {
    return null;
  }

  const { displayConfig } = errorState;

  return (
    <div className={`space-y-4 ${className}`}>
      <Alert variant={getAlertVariant()}>
        {getErrorIcon()}
        <AlertTitle>{displayConfig.title}</AlertTitle>
        <AlertDescription className="space-y-3">
          <div>{displayConfig.description}</div>
          
          {/* Additional context for OAuth permission errors */}
          {errorState.oauthError?.type === 'INSUFFICIENT_PERMISSIONS' && (
            <div className="text-sm space-y-2">
              <p>To continue, you&apos;ll need to:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Sign out and sign in again</li>
                <li>Make sure to click &quot;Allow&quot; when Google asks for Gmail permissions</li>
                <li>Grant access to read your Gmail messages</li>
              </ul>
              <p className="text-muted-foreground italic">
                Don&apos;t worry - we only read transaction-related emails and never access personal messages.
              </p>
            </div>
          )}

          {/* Rate limit specific guidance */}
          {errorState.syncError?.type === 'RATE_LIMIT_EXCEEDED' && (
            <div className="text-sm text-muted-foreground">
              <p>This usually resolves automatically within a few minutes. You can try again later or contact support if the issue persists.</p>
            </div>
          )}
        </AlertDescription>
      </Alert>
      
      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {/* Primary action button */}
        {errorState.needsReauth ? (
          <Button 
            onClick={handleReauth}
            disabled={isRetrying}
            className="flex items-center gap-2"
            size="lg"
            variant={errorActions.getActionVariant(errorState)}
            aria-label={isRetrying ? 'Signing out...' : displayConfig.actionText}
          >
            {isRetrying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            {isRetrying ? 'Signing Out...' : displayConfig.actionText}
          </Button>
        ) : errorState.canRetry && onRetry ? (
          <Button 
            onClick={handleRetry}
            disabled={isRetrying}
            className="flex items-center gap-2"
            size="lg"
            variant={errorActions.getActionVariant(errorState)}
            aria-label={isRetrying ? 'Retrying...' : displayConfig.actionText}
          >
            {isRetrying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {isRetrying ? 'Retrying...' : displayConfig.actionText}
          </Button>
        ) : null}
        
        {/* Secondary action - Contact Support */}
        {errorActions.shouldShowContactSupport(errorState) && (
          <Button 
            variant="outline" 
            onClick={() => {
              errorTracking.trackRecoveryAttempt(errorState, 'contact_support');
              // This would open a support modal or navigate to support page
              window.open('mailto:support@example.com', '_blank');
            }}
            className="flex items-center gap-2"
            aria-label="Contact support"
          >
            <AlertCircle className="h-4 w-4" />
            Contact Support
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Simplified error display for inline use
 */
export function InlineErrorDisplay({
  userState,
  syncStatus,
  oauthError,
  syncError,
  onRetry,
  className = ''
}: Omit<ErrorDisplayProps, 'onSignOut' | 'isRetrying'>) {
  const errorState = useErrorState({ userState, syncStatus, oauthError, syncError });

  if (!errorState.hasError || !errorState.displayConfig) {
    return null;
  }

  return (
    <Alert variant="destructive" className={className}>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>{errorState.displayConfig.description}</span>
        {errorState.canRetry && onRetry && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRetry}
            className="ml-2"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
} 