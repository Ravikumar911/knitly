import { useMemo } from 'react';
import { 
  ErrorState, 
  ErrorDisplayConfig, 
  ErrorDisplayFactory, 
  OAuthError, 
  SyncError,
  UserState 
} from '@workspace/database';

/**
 * Props for the error state hook
 */
interface UseErrorStateProps {
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
}

/**
 * Hook for unified error state management
 * Provides consistent error handling and display configuration
 */
export function useErrorState({
  userState,
  syncStatus,
  oauthError,
  syncError
}: UseErrorStateProps): ErrorState & {
  displayConfig: ErrorDisplayConfig | null;
  canRetry: boolean;
  needsReauth: boolean;
  isRecoverable: boolean;
} {
  
  const errorState = useMemo((): ErrorState & {
    displayConfig: ErrorDisplayConfig | null;
    canRetry: boolean;
    needsReauth: boolean;
    isRecoverable: boolean;
  } => {
    
    // Check for OAuth errors first (highest priority)
    if (oauthError?.type && oauthError.requiresReauth) {
      const oauthErrorObj: OAuthError = {
        code: oauthError.code || 'UNKNOWN',
        type: oauthError.type as any,
        message: oauthError.userFriendlyMessage || 'OAuth error occurred',
        requiresReauth: oauthError.requiresReauth,
        userFriendlyMessage: oauthError.userFriendlyMessage || 'Authentication error occurred',
        severity: 'critical',
        recoveryAction: 'reauth',
        timestamp: new Date()
      };

      const displayConfig = ErrorDisplayFactory.getOAuthErrorDisplay(oauthErrorObj);

      return {
        hasError: true,
        oauthError: oauthErrorObj,
        userState,
        displayConfig,
        canRetry: oauthErrorObj.type === 'EXPIRED_TOKEN',
        needsReauth: true,
        isRecoverable: true,
        lastErrorAt: new Date()
      };
    }

    // Check for sync errors
    if (syncError || (userState === 'sync_failed' && syncStatus === 'failed')) {
      const syncErrorObj: SyncError = {
        code: syncError?.code || 'UNKNOWN_SYNC_ERROR',
        type: (syncError?.type as any) || 'UNKNOWN_SYNC_ERROR',
        message: syncError?.message || 'Sync operation failed',
        userFriendlyMessage: syncError?.message || 'Something went wrong during sync. Please try again.',
        severity: 'medium',
        recoveryAction: 'retry',
        retryable: true,
        timestamp: new Date()
      };

      const displayConfig = ErrorDisplayFactory.getSyncErrorDisplay(syncErrorObj);

      return {
        hasError: true,
        syncError: syncErrorObj,
        userState,
        displayConfig,
        canRetry: syncErrorObj.retryable,
        needsReauth: false,
        isRecoverable: true,
        lastErrorAt: new Date()
      };
    }

    // No errors detected
    return {
      hasError: false,
      userState,
      displayConfig: null,
      canRetry: false,
      needsReauth: false,
      isRecoverable: true
    };

  }, [userState, syncStatus, oauthError, syncError]);

  return errorState;
}

/**
 * Hook for getting error-specific actions
 */
export function useErrorActions() {
  return useMemo(() => ({
    
    /**
     * Get appropriate action text based on error state
     */
    getActionText: (errorState: ErrorState): string => {
      if (errorState.oauthError) {
        switch (errorState.oauthError.recoveryAction) {
          case 'reauth':
            return 'Sign In Again';
          case 'check_permissions':
            return 'Grant Permissions';
          default:
            return 'Fix Authentication';
        }
      }

      if (errorState.syncError) {
        switch (errorState.syncError.recoveryAction) {
          case 'retry':
            return 'Try Again';
          case 'wait_and_retry':
            return 'Try Again Later';
          case 'contact_support':
            return 'Contact Support';
          default:
            return 'Retry Sync';
        }
      }

      return 'Continue';
    },

    /**
     * Get appropriate button variant based on error severity
     */
    getActionVariant: (errorState: ErrorState): 'default' | 'destructive' | 'outline' | 'secondary' => {
      if (errorState.oauthError) {
        return errorState.oauthError.severity === 'critical' ? 'default' : 'outline';
      }

      if (errorState.syncError) {
        switch (errorState.syncError.severity) {
          case 'critical':
            return 'destructive';
          case 'high':
            return 'default';
          default:
            return 'outline';
        }
      }

      return 'default';
    },

    /**
     * Check if error should show contact support option
     */
    shouldShowContactSupport: (errorState: ErrorState): boolean => {
      if (errorState.oauthError) {
        return errorState.oauthError.severity === 'critical' && 
               errorState.oauthError.type === 'UNKNOWN_ERROR';
      }

      if (errorState.syncError) {
        return errorState.syncError.severity === 'critical' || 
               errorState.syncError.recoveryAction === 'contact_support';
      }

      return false;
    },

    /**
     * Get retry delay based on error type
     */
    getRetryDelay: (errorState: ErrorState): number => {
      if (errorState.syncError?.type === 'RATE_LIMIT_EXCEEDED') {
        return 60000; // 1 minute for rate limits
      }

      if (errorState.syncError?.type === 'NETWORK_ERROR') {
        return 5000; // 5 seconds for network errors
      }

      return 1000; // 1 second default
    }

  }), []);
}

/**
 * Hook for error analytics and tracking
 */
export function useErrorTracking() {
  return useMemo(() => ({
    
    /**
     * Track error occurrence for analytics
     */
    trackError: (errorState: ErrorState, context?: Record<string, any>) => {
      // This would integrate with your analytics service
      console.log('Error tracked:', {
        errorType: errorState.oauthError?.type || errorState.syncError?.type,
        severity: errorState.oauthError?.severity || errorState.syncError?.severity,
        userState: errorState.userState,
        timestamp: new Date().toISOString(),
        context
      });
    },

    /**
     * Track error recovery attempts
     */
    trackRecoveryAttempt: (errorState: ErrorState, action: string) => {
      console.log('Recovery attempt tracked:', {
        errorType: errorState.oauthError?.type || errorState.syncError?.type,
        recoveryAction: action,
        timestamp: new Date().toISOString()
      });
    },

    /**
     * Track successful error recovery
     */
    trackRecoverySuccess: (errorState: ErrorState) => {
      console.log('Recovery success tracked:', {
        errorType: errorState.oauthError?.type || errorState.syncError?.type,
        timestamp: new Date().toISOString()
      });
    }

  }), []);
} 