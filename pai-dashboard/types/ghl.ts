/**
 * GoHighLevel API Type Definitions
 *
 * These types define the structure of data from the GoHighLevel API
 * and are used throughout the PAI Dashboard application.
 */

// ============================================================================
// Contact Types
// ============================================================================

export interface Contact {
  id: string;
  locationId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  tags: string[];
  source?: string;
  dateAdded: string;
  dateUpdated?: string;
  customFields?: Record<string, any>;
  address1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  companyName?: string;
  website?: string;
  timezone?: string;
  dnd?: boolean;
  dndSettings?: {
    Call?: {
      status: string;
      message: string;
    };
    Email?: {
      status: string;
      message: string;
    };
    SMS?: {
      status: string;
      message: string;
    };
    WhatsApp?: {
      status: string;
      message: string;
    };
    GMB?: {
      status: string;
      message: string;
    };
    FB?: {
      status: string;
      message: string;
    };
  };
}

export interface ContactCreateInput {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  tags?: string[];
  source?: string;
  customFields?: Record<string, any>;
  address1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  companyName?: string;
  website?: string;
}

export interface ContactUpdateInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  tags?: string[];
  customFields?: Record<string, any>;
  address1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  companyName?: string;
  website?: string;
}

export interface ContactListParams {
  limit?: number;
  skip?: number;
  query?: string;
  locationId?: string;
}

export interface ContactListResponse {
  contacts: Contact[];
  total: number;
  count: number;
}

// ============================================================================
// Conversation Types
// ============================================================================

export interface Conversation {
  id: string;
  locationId: string;
  contactId: string;
  assignedTo?: string;
  lastMessageDate: string;
  lastMessageBody: string;
  lastMessageType: 'SMS' | 'Email' | 'WhatsApp' | 'GMB' | 'FB' | 'Instagram' | 'Live_Chat' | 'Call';
  unreadCount: number;
  starred: boolean;
  status: 'active' | 'closed' | 'pending';
  contact?: Contact;
}

export interface ConversationListParams {
  locationId: string;
  limit?: number;
  skip?: number;
  assignedTo?: string;
  status?: 'active' | 'closed' | 'pending';
}

export interface ConversationListResponse {
  conversations: Conversation[];
  total: number;
  count: number;
}

// ============================================================================
// Message Types
// ============================================================================

export interface Message {
  id: string;
  conversationId: string;
  locationId: string;
  contactId: string;
  body: string;
  type: 'SMS' | 'Email' | 'WhatsApp' | 'GMB' | 'FB' | 'Instagram' | 'Live_Chat' | 'Call';
  direction: 'inbound' | 'outbound';
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  dateAdded: string;
  userId?: string;
  attachments?: MessageAttachment[];
  metadata?: Record<string, any>;
}

export interface MessageAttachment {
  id: string;
  url: string;
  contentType: string;
  fileName: string;
  fileSize: number;
}

export interface MessageListParams {
  conversationId: string;
  limit?: number;
  lastMessageId?: string;
}

export interface MessageListResponse {
  messages: Message[];
  total: number;
  count: number;
}

export interface SendMessageInput {
  type: 'SMS' | 'Email' | 'WhatsApp';
  message: string;
  contactId?: string;
  subject?: string; // For email
  html?: string; // For email
  attachments?: string[]; // URLs to attachments
}

// ============================================================================
// Error Types
// ============================================================================

export class GHLError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'GHLError';
    Object.setPrototypeOf(this, GHLError.prototype);
  }
}

export class GHLAuthError extends GHLError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTH_ERROR');
    this.name = 'GHLAuthError';
    Object.setPrototypeOf(this, GHLAuthError.prototype);
  }
}

export class GHLRateLimitError extends GHLError {
  constructor(
    message: string = 'Rate limit exceeded',
    public retryAfter?: number
  ) {
    super(message, 429, 'RATE_LIMIT_ERROR');
    this.name = 'GHLRateLimitError';
    Object.setPrototypeOf(this, GHLRateLimitError.prototype);
  }
}

export class GHLNotFoundError extends GHLError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'GHLNotFoundError';
    Object.setPrototypeOf(this, GHLNotFoundError.prototype);
  }
}

export class GHLValidationError extends GHLError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'GHLValidationError';
    Object.setPrototypeOf(this, GHLValidationError.prototype);
  }
}

// ============================================================================
// API Response Types
// ============================================================================

export interface GHLApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  meta?: {
    total?: number;
    count?: number;
    limit?: number;
    skip?: number;
  };
}

// ============================================================================
// Rate Limiting Types
// ============================================================================

export interface RateLimitInfo {
  requestCount: number;
  windowStart: number;
  limit: number;
  remaining: number;
}
