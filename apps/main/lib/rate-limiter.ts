/**
 * Simple in-memory rate limiter for beta access requests
 * In production, consider using Redis for distributed rate limiting
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class InMemoryRateLimiter {
  private cache = new Map<string, RateLimitEntry>();
  private readonly defaultWindowMs: number;
  private readonly defaultMaxRequests: number;

  constructor(windowMs: number = 15 * 60 * 1000, maxRequests: number = 5) {
    this.defaultWindowMs = windowMs; // 15 minutes default
    this.defaultMaxRequests = maxRequests; // 5 requests per window
    
    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Check if a request should be rate limited
   * @param identifier - IP address or other unique identifier
   * @param windowMs - Time window in milliseconds (optional)
   * @param maxRequests - Maximum requests per window (optional)
   * @returns { blocked: boolean, remainingTime?: number }
   */
  check(
    identifier: string, 
    windowMs?: number, 
    maxRequests?: number
  ): { blocked: boolean; remainingTime?: number; requestsRemaining?: number } {
    const window = windowMs ?? this.defaultWindowMs;
    const max = maxRequests ?? this.defaultMaxRequests;
    const now = Date.now();
    const resetTime = now + window;

    const entry = this.cache.get(identifier);

    if (!entry || now > entry.resetTime) {
      // No entry or window has expired, create new entry
      this.cache.set(identifier, { count: 1, resetTime });
      return { 
        blocked: false, 
        requestsRemaining: max - 1 
      };
    }

    if (entry.count >= max) {
      // Rate limit exceeded
      return { 
        blocked: true, 
        remainingTime: entry.resetTime - now,
        requestsRemaining: 0
      };
    }

    // Increment counter
    entry.count++;
    this.cache.set(identifier, entry);
    
    return { 
      blocked: false, 
      requestsRemaining: max - entry.count 
    };
  }

  /**
   * Get current usage for an identifier
   */
  getUsage(identifier: string): { count: number; resetTime: number } | null {
    const entry = this.cache.get(identifier);
    if (!entry || Date.now() > entry.resetTime) {
      return null;
    }
    return entry;
  }

  /**
   * Clear rate limit for an identifier (admin function)
   */
  clear(identifier: string): void {
    this.cache.delete(identifier);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.resetTime) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics (for monitoring)
   */
  getStats(): { totalEntries: number; cacheSize: number } {
    return {
      totalEntries: this.cache.size,
      cacheSize: JSON.stringify([...this.cache.entries()]).length,
    };
  }
}

// Create singleton instance
export const rateLimiter = new InMemoryRateLimiter(
  15 * 60 * 1000, // 15 minutes window
  3 // Max 3 beta requests per 15 minutes per IP
);

/**
 * Get client IP address from request
 */
export function getClientIP(request: Request): string {
  // Check common headers for real IP
  const xForwardedFor = request.headers.get('x-forwarded-for');
  const xRealIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  // Return first valid IP from x-forwarded-for chain
  if (xForwardedFor) {
    const ips = xForwardedFor.split(',').map(ip => ip.trim());
    return ips[0] || 'unknown';
  }
  
  return xRealIP || cfConnectingIP || 'unknown';
}

/**
 * Email-based rate limiting with stricter limits
 */
export const emailRateLimiter = new InMemoryRateLimiter(
  60 * 60 * 1000, // 1 hour window  
  1 // Max 1 request per email per hour
);
