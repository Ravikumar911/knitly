// Unified Error Types for Sync Operations
// This file provides consistent error handling across all sync components

/**
 * OAuth Error Types - Specific to Google OAuth/Gmail API errors
 */
export type OAuthErrorType =
  | "INSUFFICIENT_PERMISSIONS" // User hasn't granted Gmail permissions
  | "REVOKED_ACCESS" // User revoked access to their account
  | "EXPIRED_TOKEN" // Token has expired and refresh failed
  | "INVALID_GRANT" // Grant is invalid or malformed
  | "OAUTH_ERROR" // Generic OAuth error
  | "UNKNOWN_ERROR"; // Fallback for unclassified errors

/**
 * Sync Error Types - General sync operation errors
 */
export type SyncErrorType =
  | "NETWORK_ERROR" // Network connectivity issues
  | "RATE_LIMIT_EXCEEDED" // API rate limits hit
  | "GMAIL_API_ERROR" // Gmail API specific errors
  | "DATABASE_ERROR" // Database operation failures
  | "PROCESSING_ERROR" // Email processing/parsing errors
  | "PARTIAL_BATCH_FAILURE" // Some batches failed during sync
  | "CRITICAL_PROCESSING_ERROR" // Unrecoverable processing errors
  | "PROVIDER_TOKEN_REFRESH_FAILED" // Token refresh failures
  | "UNKNOWN_SYNC_ERROR"; // Fallback for unclassified sync errors

/**
 * Error Severity Levels
 */
export type ErrorSeverity =
  | "low" // Minor issues, sync can continue
  | "medium" // Significant issues, may need user attention
  | "high" // Critical issues, requires immediate user action
  | "critical"; // Blocking issues, sync cannot proceed

/**
 * Error Recovery Actions - What the user can do to fix the error
 */
export type ErrorRecoveryAction =
  | "retry" // Simple retry of the operation
  | "reauth" // Re-authenticate with Google
  | "check_permissions" // Review and grant necessary permissions
  | "contact_support" // Contact support for assistance
  | "wait_and_retry" // Wait for rate limits to reset
  | "manual_intervention"; // Requires manual intervention

/**
 * User State Types - Comprehensive user states for better UX
 */
export type UserState =
  | "new_user" // Never attempted sync
  | "oauth_error" // Has OAuth/permission errors
  | "sync_failed" // Has non-OAuth sync failures
  | "sync_in_progress" // Currently syncing
  | "has_data" // Successfully synced data
  | "partial_sync" // Has some data but last sync failed
  | "rate_limited" // Temporarily rate limited
  | "maintenance"; // System maintenance mode

/**
 * Unified OAuth Error Interface
 */
export interface OAuthError {
  code: string;
  type: OAuthErrorType;
  message: string;
  requiresReauth: boolean;
  userFriendlyMessage: string;
  severity: ErrorSeverity;
  recoveryAction: ErrorRecoveryAction;
  timestamp?: Date;
}

/**
 * Unified Sync Error Interface
 */
export interface SyncError {
  code: string;
  type: SyncErrorType;
  message: string;
  userFriendlyMessage: string;
  severity: ErrorSeverity;
  recoveryAction: ErrorRecoveryAction;
  retryable: boolean;
  timestamp?: Date;
  context?: Record<string, any>; // Additional error context
}

/**
 * Error Display Configuration
 */
export interface ErrorDisplayConfig {
  title: string;
  description: string;
  actionText: string;
  actionVariant: "default" | "destructive" | "outline" | "secondary";
  showRetry: boolean;
  showContactSupport: boolean;
  icon: "alert" | "lock" | "refresh" | "warning" | "error";
}

/**
 * Error State Interface - Complete error state information
 */
export interface ErrorState {
  hasError: boolean;
  oauthError?: OAuthError;
  syncError?: SyncError;
  userState: UserState;
  displayConfig?: ErrorDisplayConfig | null;
  lastErrorAt?: Date;
  errorCount?: number; // For tracking repeated errors
}

/**
 * Error Factory Functions
 */
export class ErrorFactory {
  /**
   * Create OAuth Error with proper defaults
   */
  static createOAuthError(
    type: OAuthErrorType,
    code: string,
    message: string,
    overrides?: Partial<OAuthError>,
  ): OAuthError {
    const baseError: OAuthError = {
      code,
      type,
      message,
      requiresReauth: type !== "EXPIRED_TOKEN", // Most OAuth errors require reauth
      userFriendlyMessage: this.getOAuthUserFriendlyMessage(type),
      severity: this.getOAuthSeverity(type),
      recoveryAction: this.getOAuthRecoveryAction(type),
      timestamp: new Date(),
    };

    return { ...baseError, ...overrides };
  }

  /**
   * Create Sync Error with proper defaults
   */
  static createSyncError(
    type: SyncErrorType,
    code: string,
    message: string,
    overrides?: Partial<SyncError>,
  ): SyncError {
    const baseError: SyncError = {
      code,
      type,
      message,
      userFriendlyMessage: this.getSyncUserFriendlyMessage(type),
      severity: this.getSyncSeverity(type),
      recoveryAction: this.getSyncRecoveryAction(type),
      retryable: this.isSyncErrorRetryable(type),
      timestamp: new Date(),
    };

    return { ...baseError, ...overrides };
  }

  /**
   * Get user-friendly message for OAuth errors
   */
  private static getOAuthUserFriendlyMessage(type: OAuthErrorType): string {
    switch (type) {
      case "INSUFFICIENT_PERMISSIONS":
        return "You haven't granted permission to access your Gmail. Please sign in again and allow email access.";
      case "REVOKED_ACCESS":
        return "Your Google account access has been revoked. Please sign in again to continue.";
      case "EXPIRED_TOKEN":
        return "Your session has expired. Please sign in again to continue.";
      case "INVALID_GRANT":
        return "There was an issue with your authentication. Please sign in again.";
      case "OAUTH_ERROR":
        return "There was an authentication issue with your Google account. Please sign in again.";
      default:
        return "An authentication error occurred. Please sign in again to continue.";
    }
  }

  /**
   * Get user-friendly message for sync errors
   */
  private static getSyncUserFriendlyMessage(type: SyncErrorType): string {
    switch (type) {
      case "NETWORK_ERROR":
        return "Network connection issue. Please check your internet connection and try again.";
      case "RATE_LIMIT_EXCEEDED":
        return "We're processing too many requests right now. Please wait a few minutes and try again.";
      case "GMAIL_API_ERROR":
        return "There was an issue connecting to Gmail. Please try again in a few moments.";
      case "DATABASE_ERROR":
        return "There was a temporary issue saving your data. Please try again.";
      case "PROCESSING_ERROR":
        return "There was an issue processing your emails. Our team has been notified.";
      case "PARTIAL_BATCH_FAILURE":
        return "Some of your emails couldn't be processed. We'll retry the failed items automatically.";
      case "CRITICAL_PROCESSING_ERROR":
        return "A critical error occurred during processing. Our team has been notified and will investigate.";
      case "PROVIDER_TOKEN_REFRESH_FAILED":
        return "Unable to refresh your Google account access. Please sign in again.";
      default:
        return "An unexpected error occurred. Please try again or contact support if the issue persists.";
    }
  }

  /**
   * Get severity for OAuth errors
   */
  private static getOAuthSeverity(type: OAuthErrorType): ErrorSeverity {
    switch (type) {
      case "INSUFFICIENT_PERMISSIONS":
      case "REVOKED_ACCESS":
        return "critical";
      case "EXPIRED_TOKEN":
        return "high";
      case "INVALID_GRANT":
        return "high";
      default:
        return "medium";
    }
  }

  /**
   * Get severity for sync errors
   */
  private static getSyncSeverity(type: SyncErrorType): ErrorSeverity {
    switch (type) {
      case "CRITICAL_PROCESSING_ERROR":
        return "critical";
      case "DATABASE_ERROR":
      case "PROVIDER_TOKEN_REFRESH_FAILED":
        return "high";
      case "GMAIL_API_ERROR":
      case "PROCESSING_ERROR":
        return "medium";
      case "NETWORK_ERROR":
      case "RATE_LIMIT_EXCEEDED":
      case "PARTIAL_BATCH_FAILURE":
        return "low";
      default:
        return "medium";
    }
  }

  /**
   * Get recovery action for OAuth errors
   */
  private static getOAuthRecoveryAction(
    type: OAuthErrorType,
  ): ErrorRecoveryAction {
    switch (type) {
      case "INSUFFICIENT_PERMISSIONS":
        return "check_permissions";
      case "REVOKED_ACCESS":
      case "EXPIRED_TOKEN":
      case "INVALID_GRANT":
        return "reauth";
      default:
        return "reauth";
    }
  }

  /**
   * Get recovery action for sync errors
   */
  private static getSyncRecoveryAction(
    type: SyncErrorType,
  ): ErrorRecoveryAction {
    switch (type) {
      case "NETWORK_ERROR":
      case "GMAIL_API_ERROR":
        return "retry";
      case "RATE_LIMIT_EXCEEDED":
        return "wait_and_retry";
      case "DATABASE_ERROR":
      case "PROCESSING_ERROR":
        return "retry";
      case "CRITICAL_PROCESSING_ERROR":
        return "contact_support";
      case "PROVIDER_TOKEN_REFRESH_FAILED":
        return "reauth";
      default:
        return "retry";
    }
  }

  /**
   * Check if sync error is retryable
   */
  private static isSyncErrorRetryable(type: SyncErrorType): boolean {
    switch (type) {
      case "CRITICAL_PROCESSING_ERROR":
        return false;
      case "PROVIDER_TOKEN_REFRESH_FAILED":
        return false; // Requires reauth, not retry
      default:
        return true;
    }
  }
}

/**
 * Error Display Configuration Factory
 */
export class ErrorDisplayFactory {
  /**
   * Get display configuration for OAuth errors
   */
  static getOAuthErrorDisplay(error: OAuthError): ErrorDisplayConfig {
    switch (error.type) {
      case "INSUFFICIENT_PERMISSIONS":
        return {
          title: "Gmail Permission Required",
          description: error.userFriendlyMessage,
          actionText: "Grant Permissions",
          actionVariant: "default",
          showRetry: false,
          showContactSupport: false,
          icon: "lock",
        };
      case "REVOKED_ACCESS":
        return {
          title: "Access Revoked",
          description: error.userFriendlyMessage,
          actionText: "Sign In Again",
          actionVariant: "default",
          showRetry: false,
          showContactSupport: false,
          icon: "lock",
        };
      case "EXPIRED_TOKEN":
        return {
          title: "Session Expired",
          description: error.userFriendlyMessage,
          actionText: "Sign In Again",
          actionVariant: "default",
          showRetry: true,
          showContactSupport: false,
          icon: "refresh",
        };
      default:
        return {
          title: "Authentication Issue",
          description: error.userFriendlyMessage,
          actionText: "Sign In Again",
          actionVariant: "default",
          showRetry: false,
          showContactSupport: true,
          icon: "alert",
        };
    }
  }

  /**
   * Get display configuration for sync errors
   */
  static getSyncErrorDisplay(error: SyncError): ErrorDisplayConfig {
    switch (error.type) {
      case "NETWORK_ERROR":
        return {
          title: "Connection Issue",
          description: error.userFriendlyMessage,
          actionText: "Try Again",
          actionVariant: "default",
          showRetry: true,
          showContactSupport: false,
          icon: "refresh",
        };
      case "RATE_LIMIT_EXCEEDED":
        return {
          title: "Please Wait",
          description: error.userFriendlyMessage,
          actionText: "Try Again Later",
          actionVariant: "outline",
          showRetry: true,
          showContactSupport: false,
          icon: "warning",
        };
      case "CRITICAL_PROCESSING_ERROR":
        return {
          title: "Critical Error",
          description: error.userFriendlyMessage,
          actionText: "Contact Support",
          actionVariant: "destructive",
          showRetry: false,
          showContactSupport: true,
          icon: "error",
        };
      default:
        return {
          title: "Sync Failed",
          description: error.userFriendlyMessage,
          actionText: "Try Again",
          actionVariant: "default",
          showRetry: true,
          showContactSupport: true,
          icon: "alert",
        };
    }
  }
}
