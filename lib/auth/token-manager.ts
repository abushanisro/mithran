/**
 * Centralized Auth Token Manager
 * 
 * Industry Standard Architecture:
 * - Token manager = STATE only
 * - Auth provider = BEHAVIOR
 * - NO refresh tokens exposed
 * - NO circular dependencies
 * - Signals refresh need via callbacks
 */

export interface AccessToken {
  token: string
  expiresAt: number
}

type TokenChangeListener = (token: AccessToken | null) => void
type RefreshNeededCallback = () => void

class AuthTokenManager {
  private currentToken: AccessToken | null = null
  private listeners: Set<TokenChangeListener> = new Set()
  private refreshNeededCallback: RefreshNeededCallback | null = null

  /**
   * Get current token without any async calls
   * Returns null if token is expired or about to expire
   */
  getCurrentToken(): string | null {
    if (!this.currentToken) {
      return null
    }

    // Check if token is expired (with 2 minute buffer for requests)
    const now = Date.now()
    const bufferTime = 2 * 60 * 1000 // 2 minutes buffer
    
    if (now >= (this.currentToken.expiresAt - bufferTime)) {
      // Signal refresh needed to auth provider
      if (process.env.NODE_ENV === 'development') {
        const minutesToExpiry = Math.round((this.currentToken.expiresAt - now) / (60 * 1000))
        console.log('[TokenManager] Token near expiry, signaling refresh. Minutes to expiry:', minutesToExpiry)
      }
      this.signalRefreshNeeded()
      return null
    }

    return this.currentToken.token
  }

  /**
   * Set token from auth provider (called when user signs in or token refreshes)
   * Auth provider owns the refresh token - never exposed here
   */
  setToken(token: AccessToken | null): void {
    if (process.env.NODE_ENV === 'development') {
      if (token) {
        const minutesToExpiry = Math.round((token.expiresAt - Date.now()) / (60 * 1000))
        console.log('[TokenManager] Token set, valid for:', minutesToExpiry, 'minutes')
      } else {
        console.log('[TokenManager] Token cleared')
      }
    }
    
    this.currentToken = token
    // Reset refresh signal when new token is set
    this.refreshSignalSent = false
    this.notifyListeners()
  }

  /**
   * Check if token is valid and not expired
   */
  isTokenValid(): boolean {
    if (!this.currentToken) {
      return false
    }

    const now = Date.now()
    const bufferTime = 2 * 60 * 1000 // 2 minutes buffer
    
    return now < (this.currentToken.expiresAt - bufferTime)
  }

  /**
   * Clear token (called on logout)
   */
  clearToken(): void {
    this.currentToken = null
    this.notifyListeners()
  }

  /**
   * Listen to token changes
   */
  onTokenChange(listener: TokenChangeListener): () => void {
    this.listeners.add(listener)
    
    // Immediately call with current token
    listener(this.currentToken)
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Set refresh callback - called by auth provider
   * NO circular dependency - auth provider registers itself
   */
  setRefreshCallback(callback: RefreshNeededCallback): void {
    this.refreshNeededCallback = callback
  }

  /**
   * Check if refresh is needed (called by auth provider on intervals)
   * Returns true if token needs refresh
   */
  needsRefresh(): boolean {
    if (!this.currentToken) {
      return false
    }

    const now = Date.now()
    const refreshThreshold = 10 * 60 * 1000 // 10 minutes before expiry
    
    return now >= (this.currentToken.expiresAt - refreshThreshold)
  }

  private refreshSignalSent: boolean = false

  /**
   * Signal refresh needed to auth provider (once per expiry cycle)
   * Auth provider handles the actual refresh logic
   */
  private signalRefreshNeeded(): void {
    // Only signal once per token expiry cycle to prevent spam
    if (this.refreshNeededCallback && !this.refreshSignalSent) {
      this.refreshSignalSent = true
      this.refreshNeededCallback()
    }
  }

  /**
   * Reset refresh signal (called by auth provider after successful refresh)
   */
  resetRefreshSignal(): void {
    this.refreshSignalSent = false
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentToken))
  }
}

// Singleton instance
export const authTokenManager = new AuthTokenManager()