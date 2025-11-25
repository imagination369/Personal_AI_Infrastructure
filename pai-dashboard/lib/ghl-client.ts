/**
 * GoHighLevel API Client
 *
 * A robust client for interacting with the GoHighLevel API with:
 * - Rate limiting awareness
 * - Comprehensive error handling
 * - Type-safe methods
 * - Mock data fallback for development
 */

import {
  Contact,
  ContactCreateInput,
  ContactUpdateInput,
  ContactListParams,
  ContactListResponse,
  Conversation,
  ConversationListParams,
  ConversationListResponse,
  Message,
  MessageListParams,
  MessageListResponse,
  SendMessageInput,
  GHLError,
  GHLAuthError,
  GHLRateLimitError,
  GHLNotFoundError,
  GHLValidationError,
  RateLimitInfo,
} from '@/types/ghl';

// ============================================================================
// Mock Data for Development
// ============================================================================

const MOCK_CONTACTS: Contact[] = [
  {
    id: '1',
    locationId: 'loc_1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    tags: ['lead', 'vip'],
    source: 'website',
    dateAdded: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    companyName: 'Acme Corp',
    city: 'New York',
    state: 'NY',
  },
  {
    id: '2',
    locationId: 'loc_1',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    phone: '+1234567891',
    tags: ['customer', 'active'],
    source: 'referral',
    dateAdded: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    companyName: 'Tech Solutions Inc',
    city: 'San Francisco',
    state: 'CA',
  },
  {
    id: '3',
    locationId: 'loc_1',
    firstName: 'Bob',
    lastName: 'Johnson',
    email: 'bob.johnson@example.com',
    phone: '+1234567892',
    tags: ['prospect'],
    source: 'linkedin',
    dateAdded: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    companyName: 'Marketing Pro',
    city: 'Austin',
    state: 'TX',
  },
];

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv_1',
    locationId: 'loc_1',
    contactId: '1',
    lastMessageDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    lastMessageBody: 'Thanks for reaching out! I am interested in learning more.',
    lastMessageType: 'SMS',
    unreadCount: 2,
    starred: true,
    status: 'active',
  },
  {
    id: 'conv_2',
    locationId: 'loc_1',
    contactId: '2',
    lastMessageDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    lastMessageBody: 'Can we schedule a demo?',
    lastMessageType: 'Email',
    unreadCount: 0,
    starred: false,
    status: 'active',
  },
];

const MOCK_MESSAGES: Record<string, Message[]> = {
  conv_1: [
    {
      id: 'msg_1',
      conversationId: 'conv_1',
      locationId: 'loc_1',
      contactId: '1',
      body: 'Hi! I saw your website and I am interested in your services.',
      type: 'SMS',
      direction: 'inbound',
      status: 'delivered',
      dateAdded: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'msg_2',
      conversationId: 'conv_1',
      locationId: 'loc_1',
      contactId: '1',
      body: 'Thank you for your interest! I would love to tell you more. When would be a good time to chat?',
      type: 'SMS',
      direction: 'outbound',
      status: 'delivered',
      dateAdded: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'msg_3',
      conversationId: 'conv_1',
      locationId: 'loc_1',
      contactId: '1',
      body: 'Thanks for reaching out! I am interested in learning more.',
      type: 'SMS',
      direction: 'inbound',
      status: 'delivered',
      dateAdded: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
  ],
  conv_2: [
    {
      id: 'msg_4',
      conversationId: 'conv_2',
      locationId: 'loc_1',
      contactId: '2',
      body: 'Can we schedule a demo?',
      type: 'Email',
      direction: 'inbound',
      status: 'delivered',
      dateAdded: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
};

// ============================================================================
// GHL Client Configuration
// ============================================================================

interface GHLClientConfig {
  apiKey?: string;
  locationId?: string;
  baseUrl?: string;
  rateLimitPerMinute?: number;
  useMockData?: boolean;
}

// ============================================================================
// GoHighLevel API Client Class
// ============================================================================

export class GHLClient {
  private apiKey?: string;
  private locationId?: string;
  private baseUrl: string;
  private rateLimitPerMinute: number;
  private useMockData: boolean;
  private requestLog: number[] = []; // Timestamps of recent requests

  constructor(config: GHLClientConfig = {}) {
    this.apiKey = config.apiKey || process.env.GHL_API_KEY;
    this.locationId = config.locationId || process.env.GHL_LOCATION_ID;
    this.baseUrl = config.baseUrl || 'https://rest.gohighlevel.com/v1';
    this.rateLimitPerMinute = config.rateLimitPerMinute || 60;
    this.useMockData = config.useMockData ?? !this.apiKey; // Use mock if no API key
  }

  // ==========================================================================
  // Rate Limiting
  // ==========================================================================

  private getRateLimitInfo(): RateLimitInfo {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Remove requests older than 1 minute
    this.requestLog = this.requestLog.filter(timestamp => timestamp > oneMinuteAgo);

    return {
      requestCount: this.requestLog.length,
      windowStart: oneMinuteAgo,
      limit: this.rateLimitPerMinute,
      remaining: this.rateLimitPerMinute - this.requestLog.length,
    };
  }

  private async checkRateLimit(): Promise<void> {
    const rateLimitInfo = this.getRateLimitInfo();

    if (rateLimitInfo.remaining <= 0) {
      const waitTime = 60000 - (Date.now() - rateLimitInfo.windowStart);
      throw new GHLRateLimitError(
        `Rate limit exceeded. Try again in ${Math.ceil(waitTime / 1000)} seconds.`,
        Math.ceil(waitTime / 1000)
      );
    }

    // Track this request
    this.requestLog.push(Date.now());
  }

  // ==========================================================================
  // HTTP Request Handler
  // ==========================================================================

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Check rate limiting before making request
    await this.checkRateLimit();

    if (!this.apiKey) {
      throw new GHLAuthError('API key is required but not provided');
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle rate limiting from API
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
        throw new GHLRateLimitError(
          'Rate limit exceeded by API',
          retryAfter
        );
      }

      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        throw new GHLAuthError('Invalid or expired API key');
      }

      // Handle not found
      if (response.status === 404) {
        throw new GHLNotFoundError('Resource not found');
      }

      // Handle validation errors
      if (response.status === 400) {
        const errorData = await response.json().catch(() => ({}));
        throw new GHLValidationError(
          errorData.message || 'Validation error',
          errorData
        );
      }

      // Handle other errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new GHLError(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorData.code
        );
      }

      return await response.json();
    } catch (error) {
      // Re-throw our custom errors
      if (error instanceof GHLError) {
        throw error;
      }

      // Wrap other errors
      throw new GHLError(
        error instanceof Error ? error.message : 'Unknown error occurred',
        undefined,
        'NETWORK_ERROR',
        error
      );
    }
  }

  // ==========================================================================
  // Contact Methods
  // ==========================================================================

  /**
   * Get a list of contacts with optional filtering and pagination
   */
  async getContacts(params: ContactListParams = {}): Promise<ContactListResponse> {
    // Use mock data if API key not configured
    if (this.useMockData) {
      const { limit = 20, skip = 0, query = '' } = params;
      let filteredContacts = [...MOCK_CONTACTS];

      // Apply search filter
      if (query) {
        const searchLower = query.toLowerCase();
        filteredContacts = filteredContacts.filter(contact =>
          contact.firstName.toLowerCase().includes(searchLower) ||
          contact.lastName.toLowerCase().includes(searchLower) ||
          contact.email.toLowerCase().includes(searchLower) ||
          contact.phone.includes(query)
        );
      }

      const total = filteredContacts.length;
      const paginatedContacts = filteredContacts.slice(skip, skip + limit);

      return {
        contacts: paginatedContacts,
        total,
        count: paginatedContacts.length,
      };
    }

    // Real API call would go here
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.skip) queryParams.append('skip', params.skip.toString());
    if (params.query) queryParams.append('query', params.query);
    if (params.locationId) queryParams.append('locationId', params.locationId);

    const response = await this.request<any>(
      `/contacts?${queryParams.toString()}`
    );

    return {
      contacts: response.contacts || [],
      total: response.total || 0,
      count: response.count || 0,
    };
  }

  /**
   * Get a single contact by ID
   */
  async getContact(id: string): Promise<Contact> {
    // Use mock data if API key not configured
    if (this.useMockData) {
      const contact = MOCK_CONTACTS.find(c => c.id === id);
      if (!contact) {
        throw new GHLNotFoundError(`Contact with ID ${id} not found`);
      }
      return contact;
    }

    // Real API call would go here
    const response = await this.request<any>(`/contacts/${id}`);
    return response.contact;
  }

  /**
   * Create a new contact
   */
  async createContact(data: ContactCreateInput): Promise<Contact> {
    // Validate required fields
    if (!data.firstName) {
      throw new GHLValidationError('firstName is required');
    }

    // Use mock data if API key not configured
    if (this.useMockData) {
      const newContact: Contact = {
        id: `mock_${Date.now()}`,
        locationId: this.locationId || 'loc_1',
        firstName: data.firstName,
        lastName: data.lastName || '',
        email: data.email || '',
        phone: data.phone || '',
        tags: data.tags || [],
        source: data.source,
        dateAdded: new Date().toISOString(),
        customFields: data.customFields,
        address1: data.address1,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        country: data.country,
        companyName: data.companyName,
        website: data.website,
      };

      MOCK_CONTACTS.push(newContact);
      return newContact;
    }

    // Real API call would go here
    const response = await this.request<any>('/contacts', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        locationId: this.locationId,
      }),
    });

    return response.contact;
  }

  /**
   * Update an existing contact
   */
  async updateContact(id: string, data: ContactUpdateInput): Promise<Contact> {
    // Use mock data if API key not configured
    if (this.useMockData) {
      const index = MOCK_CONTACTS.findIndex(c => c.id === id);
      if (index === -1) {
        throw new GHLNotFoundError(`Contact with ID ${id} not found`);
      }

      MOCK_CONTACTS[index] = {
        ...MOCK_CONTACTS[index],
        ...data,
        dateUpdated: new Date().toISOString(),
      };

      return MOCK_CONTACTS[index];
    }

    // Real API call would go here
    const response = await this.request<any>(`/contacts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });

    return response.contact;
  }

  /**
   * Delete a contact
   */
  async deleteContact(id: string): Promise<void> {
    // Use mock data if API key not configured
    if (this.useMockData) {
      const index = MOCK_CONTACTS.findIndex(c => c.id === id);
      if (index === -1) {
        throw new GHLNotFoundError(`Contact with ID ${id} not found`);
      }

      MOCK_CONTACTS.splice(index, 1);
      return;
    }

    // Real API call would go here
    await this.request<void>(`/contacts/${id}`, {
      method: 'DELETE',
    });
  }

  // ==========================================================================
  // Conversation Methods
  // ==========================================================================

  /**
   * Get a list of conversations with optional filtering
   */
  async getConversations(params: ConversationListParams): Promise<ConversationListResponse> {
    // Use mock data if API key not configured
    if (this.useMockData) {
      const { limit = 20, skip = 0 } = params;
      let filteredConversations = [...MOCK_CONVERSATIONS];

      // Apply filters
      if (params.status) {
        filteredConversations = filteredConversations.filter(
          conv => conv.status === params.status
        );
      }

      if (params.assignedTo) {
        filteredConversations = filteredConversations.filter(
          conv => conv.assignedTo === params.assignedTo
        );
      }

      const total = filteredConversations.length;
      const paginatedConversations = filteredConversations.slice(skip, skip + limit);

      // Attach contact information
      const conversationsWithContacts = paginatedConversations.map(conv => ({
        ...conv,
        contact: MOCK_CONTACTS.find(c => c.id === conv.contactId),
      }));

      return {
        conversations: conversationsWithContacts,
        total,
        count: conversationsWithContacts.length,
      };
    }

    // Real API call would go here
    const queryParams = new URLSearchParams();
    queryParams.append('locationId', params.locationId);
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.skip) queryParams.append('skip', params.skip.toString());
    if (params.assignedTo) queryParams.append('assignedTo', params.assignedTo);
    if (params.status) queryParams.append('status', params.status);

    const response = await this.request<any>(
      `/conversations?${queryParams.toString()}`
    );

    return {
      conversations: response.conversations || [],
      total: response.total || 0,
      count: response.count || 0,
    };
  }

  /**
   * Get messages for a specific conversation
   */
  async getMessages(params: MessageListParams): Promise<MessageListResponse> {
    // Use mock data if API key not configured
    if (this.useMockData) {
      const messages = MOCK_MESSAGES[params.conversationId] || [];
      const { limit = 50, lastMessageId } = params;

      let filteredMessages = [...messages];

      // Implement pagination by lastMessageId if provided
      if (lastMessageId) {
        const lastIndex = filteredMessages.findIndex(m => m.id === lastMessageId);
        if (lastIndex !== -1) {
          filteredMessages = filteredMessages.slice(0, lastIndex);
        }
      }

      const paginatedMessages = filteredMessages.slice(0, limit);

      return {
        messages: paginatedMessages,
        total: messages.length,
        count: paginatedMessages.length,
      };
    }

    // Real API call would go here
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.lastMessageId) queryParams.append('lastMessageId', params.lastMessageId);

    const response = await this.request<any>(
      `/conversations/${params.conversationId}/messages?${queryParams.toString()}`
    );

    return {
      messages: response.messages || [],
      total: response.total || 0,
      count: response.count || 0,
    };
  }

  /**
   * Send a message in a conversation
   */
  async sendMessage(conversationId: string, messageData: SendMessageInput): Promise<Message> {
    // Validate required fields
    if (!messageData.message) {
      throw new GHLValidationError('message is required');
    }

    if (!messageData.type) {
      throw new GHLValidationError('type is required');
    }

    // Use mock data if API key not configured
    if (this.useMockData) {
      const conversation = MOCK_CONVERSATIONS.find(c => c.id === conversationId);
      if (!conversation) {
        throw new GHLNotFoundError(`Conversation with ID ${conversationId} not found`);
      }

      const newMessage: Message = {
        id: `msg_${Date.now()}`,
        conversationId,
        locationId: conversation.locationId,
        contactId: messageData.contactId || conversation.contactId,
        body: messageData.message,
        type: messageData.type,
        direction: 'outbound',
        status: 'sent',
        dateAdded: new Date().toISOString(),
      };

      if (!MOCK_MESSAGES[conversationId]) {
        MOCK_MESSAGES[conversationId] = [];
      }

      MOCK_MESSAGES[conversationId].push(newMessage);

      // Update conversation
      conversation.lastMessageBody = newMessage.body;
      conversation.lastMessageDate = newMessage.dateAdded;
      conversation.lastMessageType = newMessage.type;

      return newMessage;
    }

    // Real API call would go here
    const response = await this.request<any>(
      `/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify(messageData),
      }
    );

    return response.message;
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Check if client is using mock data
   */
  isUsingMockData(): boolean {
    return this.useMockData;
  }

  /**
   * Get current rate limit information
   */
  getRateLimitStatus(): RateLimitInfo {
    return this.getRateLimitInfo();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let clientInstance: GHLClient | null = null;

/**
 * Get or create the GHL client singleton instance
 */
export function getGHLClient(config?: GHLClientConfig): GHLClient {
  if (!clientInstance) {
    clientInstance = new GHLClient(config);
  }
  return clientInstance;
}

/**
 * Reset the client instance (useful for testing)
 */
export function resetGHLClient(): void {
  clientInstance = null;
}
