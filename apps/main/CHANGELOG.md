# @knitly/main

## 0.1.3

### Patch Changes

- **Security Enhancement: Comprehensive Beta Access Abuse Prevention (Restored)**

  Restored and enhanced multi-layered abuse prevention system for beta access form to prevent spam, fake submissions, and automated attacks.

  **Database Layer (@workspace/database):**

  - Restored `checkExistingBetaRequest()` function to prevent duplicate email submissions
  - Restored `getRecentBetaRequestsCount()` function for global rate limiting monitoring
  - Enhanced feedback queries with proper filtering and time-based restrictions
  - Implemented database-level duplicate detection with email normalization

  **Application Layer (@knitly/main):**

  - **Rate Limiting**: Implemented in-memory rate limiter with configurable windows
    - IP-based limiting: 3 requests per 15 minutes
    - Email-based limiting: 1 request per hour per email
    - Global limiting: 100 total beta requests per 24 hours
  - **Input Validation & Sanitization**:
    - Enhanced email validation beyond Gmail requirement
    - Suspicious pattern detection (blocks test@, temp@, fake@, spam@ patterns)
    - Email length limits and format normalization
    - User agent length limiting to prevent injection
  - **Client-Side Protection**:
    - Real-time debounced email validation with immediate feedback
    - 30-second submission cooldown with visual countdown
    - LocalStorage tracking to prevent easy bypass attempts
    - Progressive validation states and error messaging
  - **Server-Side Security**:
    - Comprehensive TRPCError handling with specific error codes
    - Email prefix validation and suspicious pattern blocking
    - Time-based request tracking and global rate monitoring
    - Proper error responses for different abuse scenarios

  **User Experience Improvements:**

  - Progressive validation with debounced feedback
  - Clear visual indicators for validation errors and cooldowns
  - Enhanced success/error states with contextual messaging
  - Improved form accessibility and state management

  **Technical Implementation:**

  - Type-safe implementation with full TypeScript coverage
  - Efficient database queries with proper indexing considerations
  - Memory-efficient rate limiting with automatic cleanup
  - Proper separation of concerns following monorepo architecture

  This comprehensive implementation provides robust protection against common abuse vectors while maintaining excellent user experience for legitimate beta access requests.

- Updated dependencies
  - @workspace/database@0.1.3
  - @workspace/tasks@0.1.3

## 0.1.2

### Patch Changes

- **Security Enhancement: Comprehensive Beta Access Abuse Prevention**

  Added multi-layered abuse prevention system for beta access form to prevent spam, fake submissions, and automated attacks.

  **Database Layer (@workspace/database):**

  - Added `checkExistingBetaRequest()` function to prevent duplicate email submissions
  - Added `getRecentBetaRequestsCount()` function for global rate limiting monitoring
  - Enhanced feedback queries with proper filtering and time-based restrictions
  - Implemented database-level duplicate detection with email normalization

  **Application Layer (@knitly/main):**

  - **Rate Limiting**: Implemented in-memory rate limiter with configurable windows
    - IP-based limiting: 3 requests per 15 minutes
    - Email-based limiting: 1 request per hour per email
    - Global limiting: 100 total beta requests per 24 hours
  - **Input Validation & Sanitization**:
    - Enhanced email validation beyond Gmail requirement
    - Suspicious pattern detection (blocks test@, temp@, fake@, spam@ patterns)
    - Email length limits and format normalization
    - User agent length limiting to prevent injection
  - **Client-Side Protection**:
    - Real-time debounced email validation with immediate feedback
    - 30-second submission cooldown with visual countdown
    - LocalStorage tracking to prevent easy bypass attempts
    - Progressive validation states and error messaging
  - **Server-Side Security**:
    - Comprehensive TRPCError handling with specific error codes
    - Email prefix validation and suspicious pattern blocking
    - Time-based request tracking and global rate monitoring
    - Proper error responses for different abuse scenarios

  **User Experience Improvements:**

  - Progressive validation with debounced feedback
  - Clear visual indicators for validation errors and cooldowns
  - Enhanced success/error states with contextual messaging
  - Improved form accessibility and state management

  **Technical Implementation:**

  - Type-safe implementation with full TypeScript coverage
  - Efficient database queries with proper indexing considerations
  - Memory-efficient rate limiting with automatic cleanup
  - Proper separation of concerns following monorepo architecture

  This implementation provides robust protection against common abuse vectors while maintaining excellent user experience for legitimate beta access requests.

- Updated dependencies
  - @workspace/database@0.1.2
  - @workspace/tasks@0.1.2

## 0.1.1

### Patch Changes

- Setup proper changelog and release system for monorepo

  - Fixed changeset configuration to work with monorepo
  - Updated all package.json files with consistent versioning
  - Improved GitHub Actions workflow for releases
  - Added comprehensive documentation

- Updated dependencies
  - @workspace/database@0.1.1
  - @workspace/ui@0.1.1
  - @workspace/tasks@0.1.1
