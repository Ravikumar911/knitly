import { create } from "zustand";
import { devtools } from "zustand/middleware";

export type UserState =
  | "new_user"
  | "oauth_error"
  | "sync_failed"
  | "sync_in_progress"
  | "has_data";

export type OAuthError = {
  type: string | null;
  code: string | null;
  requiresReauth: boolean;
  userFriendlyMessage: string | null;
} | null;

// Simplified error types - just what we actually need
export type ErrorType = "oauth" | "sync" | "network" | "unknown";
export type ErrorSeverity = "low" | "medium" | "high" | "critical";

export interface SimpleError {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  canRetry: boolean;
  needsReauth: boolean;
  timestamp: Date;
}

interface SyncState {
  // Sync Progress - main focus now
  totalEmails: number | null;
  processedEmails: number;
  progressPercentage: number;
  estimatedCompletion: Date | null;
  syncStatus: string | null;

  // OAuth Errors (keep for compatibility)
  oauthError: OAuthError;

  // Simplified Error State
  currentError: SimpleError | null;

  // Loading States
  isLoading: boolean;
  isInitiating: boolean;
  error: string | null; // Keep for backward compatibility

  // Polling Control
  isPolling: boolean;
  pollIntervalId: NodeJS.Timeout | null;
}

interface SyncActions {
  // Main sync progress update
  updateSyncProgress: (progress: {
    totalEmails: number | null;
    processedEmails: number;
    progressPercentage: number;
    estimatedCompletion: Date | null;
    syncStatus: string | null;
    oauthError: OAuthError;
  }) => void;

  // Simplified Error Management
  setOAuthError: (error: OAuthError) => void;
  setSyncError: (message: string, canRetry?: boolean) => void;
  setNetworkError: (message: string) => void;
  clearError: () => void;

  // Error Actions - now returns stable reference
  getErrorActions: () => {
    primaryAction: string;
    secondaryAction?: string;
    canRetry: boolean;
    needsReauth: boolean;
  };

  // Polling control
  startPolling: (callback: () => void) => void;
  stopPolling: () => void;

  // Loading and error states
  setLoading: (loading: boolean) => void;
  setInitiating: (initiating: boolean) => void;
  setError: (error: string | null) => void;

  // Reset
  reset: () => void;
}

const initialState: SyncState = {
  totalEmails: null,
  processedEmails: 0,
  progressPercentage: 0,
  estimatedCompletion: null,
  syncStatus: null,
  oauthError: null,
  currentError: null,
  isLoading: false,
  isInitiating: false,
  error: null,
  isPolling: false,
  pollIntervalId: null,
};

export const useSyncStore = create<SyncState & SyncActions>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Update sync progress from tRPC
      updateSyncProgress: (progress) => {
        set({
          totalEmails: progress.totalEmails,
          processedEmails: progress.processedEmails,
          progressPercentage: progress.progressPercentage,
          estimatedCompletion: progress.estimatedCompletion,
          syncStatus: progress.syncStatus,
          oauthError: progress.oauthError,
        });

        // Handle OAuth errors
        if (progress.oauthError?.requiresReauth) {
          get().setOAuthError(progress.oauthError);
        } else if (progress.syncStatus === "failed") {
          get().setSyncError("Sync failed during processing");
        } else if (
          progress.syncStatus &&
          ["counting_emails", "in_progress", "syncing"].includes(
            progress.syncStatus,
          )
        ) {
          get().clearError();
        } else if (progress.syncStatus === "complete") {
          get().clearError();
        }

        // Stop polling if sync is complete or failed
        if (["complete", "failed"].includes(progress.syncStatus || "")) {
          get().stopPolling();
        }
      },

      // Simplified Error Management
      setOAuthError: (oauthError: OAuthError) => {
        const error: SimpleError = {
          type: "oauth",
          severity: oauthError?.requiresReauth ? "critical" : "high",
          message: oauthError?.userFriendlyMessage || "Authentication error",
          canRetry: !oauthError?.requiresReauth,
          needsReauth: oauthError?.requiresReauth || false,
          timestamp: new Date(),
        };

        set({
          currentError: error,
          oauthError,
        });
      },

      setSyncError: (message: string, canRetry = true) => {
        const error: SimpleError = {
          type: "sync",
          severity: "medium",
          message,
          canRetry,
          needsReauth: false,
          timestamp: new Date(),
        };

        set({
          currentError: error,
        });
      },

      setNetworkError: (message: string) => {
        const error: SimpleError = {
          type: "network",
          severity: "low",
          message,
          canRetry: true,
          needsReauth: false,
          timestamp: new Date(),
        };

        set({ currentError: error });
      },

      clearError: () => {
        set({
          currentError: null,
          oauthError: null,
          error: null,
        });
      },

      // Get appropriate actions for current error
      getErrorActions: () => {
        const { currentError } = get();

        if (!currentError) {
          return {
            primaryAction: "Continue",
            canRetry: false,
            needsReauth: false,
          };
        }

        switch (currentError.type) {
          case "oauth":
            return {
              primaryAction: currentError.needsReauth
                ? "Sign In Again"
                : "Grant Permissions",
              secondaryAction: currentError.canRetry ? "Try Again" : undefined,
              canRetry: currentError.canRetry,
              needsReauth: currentError.needsReauth,
            };

          case "sync":
            return {
              primaryAction: "Try Again",
              secondaryAction: "Contact Support",
              canRetry: currentError.canRetry,
              needsReauth: false,
            };

          case "network":
            return {
              primaryAction: "Retry",
              canRetry: true,
              needsReauth: false,
            };

          default:
            return {
              primaryAction: "Try Again",
              canRetry: true,
              needsReauth: false,
            };
        }
      },

      // Start polling with a callback function
      startPolling: (callback: () => void) => {
        const { isPolling, pollIntervalId } = get();

        if (isPolling || pollIntervalId) {
          return; // Already polling
        }

        const intervalId = setInterval(callback, 2000); // Poll every 2 seconds

        set({
          isPolling: true,
          pollIntervalId: intervalId,
        });
      },

      // Stop polling
      stopPolling: () => {
        const { pollIntervalId } = get();

        if (pollIntervalId) {
          clearInterval(pollIntervalId);
        }

        set({
          isPolling: false,
          pollIntervalId: null,
        });
      },

      // Loading and error state management
      setLoading: (isLoading: boolean) => set({ isLoading }),
      setInitiating: (isInitiating: boolean) => set({ isInitiating }),
      setError: (error: string | null) => set({ error }),

      // Reset store to initial state
      reset: () => {
        const { stopPolling } = get();
        stopPolling();
        set(initialState);
      },
    }),
    {
      name: "sync-store", // Name for devtools
    },
  ),
);

// Note: Removed selector functions to avoid hydration issues with useSyncExternalStore
// Components now use the store directly: const store = useSyncStore();
