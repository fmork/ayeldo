/**
 * Cookie name constants used throughout the application
 * Centralizing these ensures consistency and makes maintenance easier
 */

// Session-related cookies
export const COOKIE_NAMES = {
  // Session ID cookie - uses __Host- prefix for additional security
  SESSION_ID: '__Host-sid',

  // CSRF token cookie
  CSRF: 'csrf',

  // Alternative session ID names (for backward compatibility)
  SESSION_ID_ALT: 'session-id',
  SID_ALT: 'sid',
} as const;

// Type for cookie names
export type CookieName = (typeof COOKIE_NAMES)[keyof typeof COOKIE_NAMES];
