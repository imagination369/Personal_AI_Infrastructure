/**
 * Application-wide constants and configuration
 */

export const APP_NAME = "PAI Business Dashboard";
export const APP_DESCRIPTION = "Personal AI Infrastructure Business Dashboard";
export const APP_VERSION = "0.1.0";

// API Configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
export const API_TIMEOUT = 30000; // 30 seconds

// WebSocket Configuration
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8888";
export const WS_RECONNECT_INTERVAL = 5000; // 5 seconds
export const WS_MAX_RECONNECT_ATTEMPTS = 10;

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Cache durations (in milliseconds)
export const CACHE_DURATION = {
  SHORT: 60 * 1000, // 1 minute
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 30 * 60 * 1000, // 30 minutes
  VERY_LONG: 60 * 60 * 1000, // 1 hour
};

// Date formats
export const DATE_FORMATS = {
  SHORT: "MMM d, yyyy",
  LONG: "MMMM d, yyyy",
  FULL: "EEEE, MMMM d, yyyy",
  TIME: "h:mm a",
  DATETIME: "MMM d, yyyy h:mm a",
  ISO: "yyyy-MM-dd",
};

// Status types
export const STATUS_TYPES = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  PENDING: "pending",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
} as const;

// Priority levels
export const PRIORITY_LEVELS = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  URGENT: "urgent",
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  THEME: "pai_theme",
  USER_PREFERENCES: "pai_user_preferences",
  AUTH_TOKEN: "pai_auth_token",
  LAST_SYNC: "pai_last_sync",
} as const;

// Error messages
export const ERROR_MESSAGES = {
  GENERIC: "An unexpected error occurred. Please try again.",
  NETWORK: "Network error. Please check your connection.",
  UNAUTHORIZED: "You are not authorized to perform this action.",
  NOT_FOUND: "The requested resource was not found.",
  VALIDATION: "Please check your input and try again.",
  TIMEOUT: "Request timed out. Please try again.",
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  SAVED: "Changes saved successfully.",
  DELETED: "Item deleted successfully.",
  CREATED: "Item created successfully.",
  UPDATED: "Item updated successfully.",
} as const;

// Feature flags (can be controlled via environment variables)
export const FEATURES = {
  ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true",
  REAL_TIME: process.env.NEXT_PUBLIC_ENABLE_REAL_TIME === "true",
  NOTIFICATIONS: process.env.NEXT_PUBLIC_ENABLE_NOTIFICATIONS === "true",
} as const;

// Route paths
export const ROUTES = {
  HOME: "/",
  DASHBOARD: "/dashboard",
  CONTACTS: "/contacts",
  ANALYTICS: "/analytics",
  SETTINGS: "/settings",
  LOGIN: "/login",
  LOGOUT: "/logout",
} as const;
