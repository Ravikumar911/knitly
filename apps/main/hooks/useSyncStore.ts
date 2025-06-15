import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type UserState = 'new_user' | 'oauth_error' | 'sync_failed' | 'sync_in_progress' | 'has_data';

export type OAuthError = {
  type: string | null;
  code: string | null;
  requiresReauth: boolean;
  userFriendlyMessage: string | null;
} | null;

// Simplified error types - just what we actually need
export type ErrorType = 'oauth' | 'sync' | 'network' | 'unknown';
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SimpleError {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  canRetry: boolean;
  needsReauth: boolean;
  timestamp: Date;
}

interface SyncState {
  // User State
  userState: UserState;
  hasEmails: boolean;
  emailCount: number;
  hasInitialSync: boolean;
  
  // Sync Progress
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
  // Data updates from tRPC
  updateDataStatus: (data: {
    userState: UserState;
    hasEmails: boolean;
    emailCount: number;
    hasInitialSync: boolean;
    syncStatus: string | null;
    oauthError: OAuthError;
  }) => void;
  
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
  
  // Manual state updates
  setUserState: (state: UserState) => void;
  
  // Reset
  reset: () => void;
}

const initialState: SyncState = {
  userState: 'new_user',
  hasEmails: false,
  emailCount: 0,
  hasInitialSync: false,
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

      // Update data status from tRPC
      updateDataStatus: (data) => {
        set({
          userState: data.userState,
          hasEmails: data.hasEmails,
          emailCount: data.emailCount,
          hasInitialSync: data.hasInitialSync,
          syncStatus: data.syncStatus,
          oauthError: data.oauthError,
        });

        // Auto-set error state based on user state
        if (data.userState === 'oauth_error' && data.oauthError) {
          get().setOAuthError(data.oauthError);
        } else if (data.userState === 'sync_failed') {
          get().setSyncError('Sync failed. Please try again.');
        } else if (data.userState === 'has_data') {
          get().clearError();
        }
      },

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

        // Update user state based on sync status
        const currentState = get();
        let newUserState: UserState = currentState.userState;

        if (progress.oauthError?.requiresReauth) {
          newUserState = 'oauth_error';
          get().setOAuthError(progress.oauthError);
        } else if (progress.syncStatus === 'failed') {
          newUserState = 'sync_failed';
          get().setSyncError('Sync failed during processing');
        } else if (progress.syncStatus && ['counting_emails', 'in_progress', 'syncing'].includes(progress.syncStatus)) {
          newUserState = 'sync_in_progress';
          get().clearError();
        } else if (progress.syncStatus === 'complete' && currentState.hasEmails) {
          newUserState = 'has_data';
          get().clearError();
        }

        if (newUserState !== currentState.userState) {
          set({ userState: newUserState });
        }

        // Stop polling if sync is complete or failed
        if (['complete', 'failed'].includes(progress.syncStatus || '')) {
          get().stopPolling();
        }
      },

      // Simplified Error Management
      setOAuthError: (oauthError: OAuthError) => {
        const error: SimpleError = {
          type: 'oauth',
          severity: oauthError?.requiresReauth ? 'critical' : 'high',
          message: oauthError?.userFriendlyMessage || 'Authentication error',
          canRetry: !oauthError?.requiresReauth,
          needsReauth: oauthError?.requiresReauth || false,
          timestamp: new Date()
        };
        
        set({ 
          currentError: error,
          oauthError,
          userState: 'oauth_error'
        });
      },

      setSyncError: (message: string, canRetry = true) => {
        const error: SimpleError = {
          type: 'sync',
          severity: 'medium',
          message,
          canRetry,
          needsReauth: false,
          timestamp: new Date()
        };
        
        set({ 
          currentError: error,
          userState: 'sync_failed'
        });
      },

      setNetworkError: (message: string) => {
        const error: SimpleError = {
          type: 'network',
          severity: 'low',
          message,
          canRetry: true,
          needsReauth: false,
          timestamp: new Date()
        };
        
        set({ currentError: error });
      },

      clearError: () => {
        set({ 
          currentError: null,
          oauthError: null,
          error: null
        });
      },

      // Get appropriate actions for current error
      getErrorActions: () => {
        const { currentError } = get();
        
        if (!currentError) {
          return {
            primaryAction: 'Continue',
            canRetry: false,
            needsReauth: false
          };
        }

        switch (currentError.type) {
          case 'oauth':
            return {
              primaryAction: currentError.needsReauth ? 'Sign In Again' : 'Grant Permissions',
              secondaryAction: currentError.canRetry ? 'Try Again' : undefined,
              canRetry: currentError.canRetry,
              needsReauth: currentError.needsReauth
            };
          
          case 'sync':
            return {
              primaryAction: 'Try Again',
              secondaryAction: 'Contact Support',
              canRetry: currentError.canRetry,
              needsReauth: false
            };
          
          case 'network':
            return {
              primaryAction: 'Retry',
              canRetry: true,
              needsReauth: false
            };
          
          default:
            return {
              primaryAction: 'Try Again',
              canRetry: true,
              needsReauth: false
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
          pollIntervalId: intervalId 
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
          pollIntervalId: null 
        });
      },

      // Loading and error state management
      setLoading: (isLoading: boolean) => set({ isLoading }),
      setInitiating: (isInitiating: boolean) => set({ isInitiating }),
      setError: (error: string | null) => set({ error }),

      // Manual state updates
      setUserState: (userState: UserState) => set({ userState }),

      // Reset store to initial state
      reset: () => {
        const { stopPolling } = get();
        stopPolling();
        set(initialState);
      },
    }),
    {
      name: 'sync-store', // Name for devtools
    }
  )
);

// Memoized selectors to prevent infinite loops
export const selectSyncState = (state: SyncState & SyncActions) => ({
  userState: state.userState,
  isLoading: state.isLoading,
  isInitiating: state.isInitiating,
  error: state.error,
  oauthError: state.oauthError,
  currentError: state.currentError,
});

export const selectSyncProgress = (state: SyncState & SyncActions) => ({
  totalEmails: state.totalEmails,
  processedEmails: state.processedEmails,
  progressPercentage: state.progressPercentage,
  estimatedCompletion: state.estimatedCompletion,
  syncStatus: state.syncStatus,
});

// Fixed: Don't call getErrorActions in selector - call it in component
export const selectErrorState = (state: SyncState & SyncActions) => ({
  currentError: state.currentError,
  hasError: !!state.currentError,
});

export const selectSyncActions = (state: SyncState & SyncActions) => ({
  updateDataStatus: state.updateDataStatus,
  updateSyncProgress: state.updateSyncProgress,
  startPolling: state.startPolling,
  stopPolling: state.stopPolling,
  setLoading: state.setLoading,
  setInitiating: state.setInitiating,
  setOAuthError: state.setOAuthError,
  setSyncError: state.setSyncError,
  setNetworkError: state.setNetworkError,
  clearError: state.clearError,
  setError: state.setError,
  setUserState: state.setUserState,
  reset: state.reset,
}); 