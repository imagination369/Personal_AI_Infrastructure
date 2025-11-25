# PAI Business Dashboard MCP Server Ecosystem Design

## Executive Summary

This document specifies a comprehensive MCP server ecosystem for the PAI Business Dashboard that enables AI-driven business operations with GoHighLevel integration. The system consists of 4 specialized MCP servers that work together to provide complete visibility, control, and automation capabilities.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         PAI Agent (Claude)                       │
│  "Send a follow-up to all contacts I spoke with last week"      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ MCP Protocol
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐     ┌──────────────┐
│   ghl-mcp    │◄────►│ database-mcp │◄───►│dashboard-mcp │
│ (API Layer)  │      │ (Data Layer) │     │ (UI Layer)   │
└──────────────┘      └──────────────┘     └──────────────┘
        │                     ▲                     ▲
        │                     │                     │
        │              ┌──────────────┐             │
        │              │notifications-│             │
        └─────────────►│     mcp      │─────────────┘
                       │ (Events)     │
                       └──────────────┘
                              │
                              ▼
                   ┌────────────────────┐
                   │   GoHighLevel API  │
                   │   WebSocket Events │
                   └────────────────────┘
```

## Design Principles

1. **Separation of Concerns**: Each MCP server has a clear, distinct responsibility
2. **Composability**: Servers work together to enable complex workflows
3. **Real-time Sync**: Events flow bidirectionally between GHL and local state
4. **AI-First Design**: Resources and tools designed for AI agent consumption
5. **Robust Error Handling**: Graceful degradation and clear error reporting

---

# 1. ghl-mcp Server

## Purpose
Primary integration layer with GoHighLevel APIs. Handles authentication, rate limiting, and provides AI-friendly abstractions over GHL's REST and WebSocket APIs.

## Resources

### Contacts

```typescript
// URI: ghl://contacts/{contactId}
// List: ghl://contacts/list?tags={tags}&dateRange={range}

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  tags: string[];
  customFields: Record<string, any>;
  source: string;
  dateAdded: string;
  lastContacted: string;
  pipelineStage?: string;
  assignedTo?: string;
  metadata: {
    totalConversations: number;
    lastActivityDate: string;
    lifecycleStage: string;
  };
}

// Resource Example
{
  "uri": "ghl://contacts/cont_abc123",
  "mimeType": "application/json",
  "name": "John Doe",
  "description": "Contact: John Doe (john@example.com) - Last contacted: 2025-01-15"
}
```

### Conversations

```typescript
// URI: ghl://conversations/{conversationId}
// List: ghl://conversations/list?contactId={id}&since={date}

interface Conversation {
  id: string;
  contactId: string;
  locationId: string;
  channel: 'sms' | 'email' | 'whatsapp' | 'instagram' | 'fb_messenger';
  messages: Message[];
  status: 'open' | 'closed';
  assignedTo?: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface Message {
  id: string;
  conversationId: string;
  direction: 'inbound' | 'outbound';
  body: string;
  type: 'text' | 'image' | 'file';
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sentAt: string;
  sentBy: 'contact' | 'user' | 'automation';
  attachments?: Attachment[];
}
```

### Pipelines & Opportunities

```typescript
// URI: ghl://pipelines/{pipelineId}
// URI: ghl://opportunities/{opportunityId}

interface Pipeline {
  id: string;
  name: string;
  stages: PipelineStage[];
  locationId: string;
}

interface PipelineStage {
  id: string;
  name: string;
  position: number;
}

interface Opportunity {
  id: string;
  name: string;
  pipelineId: string;
  pipelineStageId: string;
  contactId: string;
  monetaryValue: number;
  status: 'open' | 'won' | 'lost' | 'abandoned';
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Calendars & Appointments

```typescript
// URI: ghl://calendars/{calendarId}
// URI: ghl://appointments/{appointmentId}

interface Calendar {
  id: string;
  name: string;
  description: string;
  slug: string;
  locationId: string;
  availability: AvailabilityConfig;
}

interface Appointment {
  id: string;
  calendarId: string;
  contactId: string;
  startTime: string;
  endTime: string;
  status: 'confirmed' | 'cancelled' | 'no-show' | 'completed';
  title: string;
  notes?: string;
  appointmentType: string;
}
```

## Tools

### 1. send_message

Send a message to a contact via specified channel.

```typescript
{
  name: "send_message",
  description: "Send a message to a contact via SMS, Email, WhatsApp, etc.",
  inputSchema: {
    type: "object",
    properties: {
      contactId: {
        type: "string",
        description: "GHL contact ID"
      },
      message: {
        type: "string",
        description: "Message content"
      },
      channel: {
        type: "string",
        enum: ["sms", "email", "whatsapp"],
        description: "Communication channel"
      },
      attachments: {
        type: "array",
        items: {
          type: "object",
          properties: {
            url: { type: "string" },
            type: { type: "string", enum: ["image", "file"] },
            name: { type: "string" }
          }
        },
        description: "Optional attachments"
      },
      metadata: {
        type: "object",
        description: "Optional metadata for tracking"
      }
    },
    required: ["contactId", "message", "channel"]
  }
}

// Response
{
  success: true,
  messageId: "msg_xyz789",
  status: "sent",
  sentAt: "2025-01-20T10:30:00Z",
  conversationId: "conv_abc123"
}
```

### 2. create_contact

Create a new contact in GoHighLevel.

```typescript
{
  name: "create_contact",
  description: "Create a new contact with optional tags and custom fields",
  inputSchema: {
    type: "object",
    properties: {
      firstName: { type: "string" },
      lastName: { type: "string" },
      email: { type: "string", format: "email" },
      phone: { type: "string" },
      tags: {
        type: "array",
        items: { type: "string" },
        description: "Tags to apply to contact"
      },
      customFields: {
        type: "object",
        description: "Custom field values"
      },
      source: {
        type: "string",
        description: "How this contact was acquired"
      },
      assignedTo: {
        type: "string",
        description: "User ID to assign contact to"
      }
    },
    required: ["email"]
  }
}
```

### 3. update_contact

Update existing contact information.

```typescript
{
  name: "update_contact",
  description: "Update contact information, tags, or custom fields",
  inputSchema: {
    type: "object",
    properties: {
      contactId: { type: "string" },
      updates: {
        type: "object",
        properties: {
          firstName: { type: "string" },
          lastName: { type: "string" },
          email: { type: "string" },
          phone: { type: "string" },
          tags: {
            type: "object",
            properties: {
              add: { type: "array", items: { type: "string" } },
              remove: { type: "array", items: { type: "string" } }
            }
          },
          customFields: { type: "object" }
        }
      }
    },
    required: ["contactId", "updates"]
  }
}
```

### 4. search_contacts

Advanced contact search with filtering.

```typescript
{
  name: "search_contacts",
  description: "Search contacts with complex filtering criteria",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query (name, email, phone)"
      },
      filters: {
        type: "object",
        properties: {
          tags: {
            type: "array",
            items: { type: "string" },
            description: "Filter by tags (AND logic)"
          },
          dateRange: {
            type: "object",
            properties: {
              field: {
                type: "string",
                enum: ["dateAdded", "lastContacted"],
                description: "Which date field to filter"
              },
              start: { type: "string", format: "date-time" },
              end: { type: "string", format: "date-time" }
            }
          },
          pipelineStage: {
            type: "string",
            description: "Filter by pipeline stage"
          },
          customFields: {
            type: "object",
            description: "Filter by custom field values"
          }
        }
      },
      sort: {
        type: "object",
        properties: {
          field: { type: "string" },
          order: { type: "string", enum: ["asc", "desc"] }
        }
      },
      limit: {
        type: "number",
        default: 50,
        description: "Maximum results to return"
      }
    }
  }
}
```

### 5. update_opportunity

Move opportunities through pipeline stages.

```typescript
{
  name: "update_opportunity",
  description: "Update opportunity stage, value, or status",
  inputSchema: {
    type: "object",
    properties: {
      opportunityId: { type: "string" },
      updates: {
        type: "object",
        properties: {
          pipelineStageId: {
            type: "string",
            description: "Move to new stage"
          },
          monetaryValue: {
            type: "number",
            description: "Update deal value"
          },
          status: {
            type: "string",
            enum: ["open", "won", "lost", "abandoned"]
          },
          notes: {
            type: "string",
            description: "Add notes to opportunity"
          }
        }
      }
    },
    required: ["opportunityId", "updates"]
  }
}
```

### 6. create_appointment

Schedule appointments for contacts.

```typescript
{
  name: "create_appointment",
  description: "Schedule a new appointment with a contact",
  inputSchema: {
    type: "object",
    properties: {
      calendarId: { type: "string" },
      contactId: { type: "string" },
      startTime: { type: "string", format: "date-time" },
      endTime: { type: "string", format: "date-time" },
      title: { type: "string" },
      notes: { type: "string" },
      sendConfirmation: {
        type: "boolean",
        default: true,
        description: "Send confirmation email/SMS"
      }
    },
    required: ["calendarId", "contactId", "startTime", "endTime"]
  }
}
```

### 7. get_conversation_history

Retrieve full conversation history.

```typescript
{
  name: "get_conversation_history",
  description: "Get message history for a contact across all channels",
  inputSchema: {
    type: "object",
    properties: {
      contactId: { type: "string" },
      channels: {
        type: "array",
        items: { type: "string", enum: ["sms", "email", "whatsapp", "all"] },
        default: ["all"]
      },
      since: {
        type: "string",
        format: "date-time",
        description: "Only messages after this date"
      },
      limit: {
        type: "number",
        default: 100
      }
    },
    required: ["contactId"]
  }
}
```

## Authentication Handling

```typescript
interface AuthConfig {
  type: "oauth2";
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  accessToken: string;
  tokenExpiry: string;
  locationId: string; // GHL sub-account
}

// Auto-refresh mechanism
class GHLAuthManager {
  async getValidToken(): Promise<string> {
    if (this.isTokenExpired()) {
      await this.refreshAccessToken();
    }
    return this.accessToken;
  }
}
```

## Rate Limiting

```typescript
interface RateLimitConfig {
  requestsPerSecond: 10;
  burstSize: 20;
  backoffStrategy: "exponential";
  maxRetries: 3;
}

// Intelligent rate limiter with queue
class RateLimiter {
  private queue: RequestQueue;
  private limiter: TokenBucket;

  async executeRequest<T>(request: Request): Promise<T> {
    await this.limiter.waitForToken();
    try {
      return await this.execute(request);
    } catch (error) {
      if (error.status === 429) {
        const retryAfter = error.headers['retry-after'];
        await this.backoff(retryAfter);
        return this.executeRequest(request);
      }
      throw error;
    }
  }
}
```

## Error Handling

```typescript
interface GHLError {
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
  context: {
    endpoint: string;
    method: string;
    requestId: string;
  };
}

// Example errors
{
  "RATE_LIMIT_EXCEEDED": { retryable: true, message: "Too many requests" },
  "CONTACT_NOT_FOUND": { retryable: false, message: "Contact does not exist" },
  "INVALID_PHONE": { retryable: false, message: "Phone number format invalid" },
  "AUTH_EXPIRED": { retryable: true, message: "Token expired, refreshing" }
}
```

---

# 2. dashboard-mcp Server

## Purpose
Provides AI visibility into the dashboard UI state and enables programmatic control of the interface. Acts as the "eyes and hands" of the AI in the web application.

## Resources

### Current View State

```typescript
// URI: dashboard://view/current

interface ViewState {
  page: string; // "contacts" | "conversations" | "pipeline" | "calendar"
  selectedContact?: Contact;
  selectedConversation?: Conversation;
  filters: {
    active: boolean;
    criteria: FilterCriteria;
  };
  visibleElements: UIElement[];
  notifications: Notification[];
  context: {
    timestamp: string;
    userLocation: string;
    screenSize: { width: number; height: number };
  };
}

// Resource representation
{
  "uri": "dashboard://view/current",
  "mimeType": "application/json",
  "name": "Current Dashboard View",
  "description": "Currently viewing: Contacts page with 15 contacts visible, filtered by 'last-week' tag"
}
```

### Contact List View

```typescript
// URI: dashboard://view/contacts

interface ContactListView {
  contacts: ContactCard[];
  filters: ActiveFilters;
  sortOrder: SortConfig;
  pagination: {
    page: number;
    totalPages: number;
    itemsPerPage: number;
  };
  selectedIds: string[];
}

interface ContactCard {
  id: string;
  displayName: string;
  avatar: string;
  primaryInfo: string; // email or phone
  tags: string[];
  lastActivity: string;
  unreadMessages: number;
  visible: boolean; // is in current viewport
  position: { x: number; y: number }; // screen position
}
```

### Conversation View

```typescript
// URI: dashboard://view/conversation/{conversationId}

interface ConversationView {
  conversation: Conversation;
  contact: Contact;
  messages: MessageDisplay[];
  inputState: {
    text: string;
    cursorPosition: number;
    attachments: Attachment[];
  };
  composerVisible: boolean;
  scrollPosition: number;
  unreadMarker?: string; // message ID
}
```

### Navigation State

```typescript
// URI: dashboard://navigation/history

interface NavigationState {
  currentPath: string;
  history: NavigationEntry[];
  availableRoutes: Route[];
  breadcrumbs: Breadcrumb[];
}

interface Route {
  path: string;
  name: string;
  description: string;
  parameters?: Parameter[];
}
```

## Tools

### 1. navigate_to

Navigate to different pages in the dashboard.

```typescript
{
  name: "navigate_to",
  description: "Navigate to a specific page or view in the dashboard",
  inputSchema: {
    type: "object",
    properties: {
      page: {
        type: "string",
        enum: ["contacts", "conversations", "pipeline", "calendar", "settings"],
        description: "Page to navigate to"
      },
      params: {
        type: "object",
        properties: {
          contactId: { type: "string" },
          conversationId: { type: "string" },
          view: { type: "string" } // "list" | "kanban" | "grid"
        },
        description: "Optional page parameters"
      },
      clearState: {
        type: "boolean",
        default: false,
        description: "Clear current filters/selections"
      }
    },
    required: ["page"]
  }
}

// Example
navigate_to({
  page: "conversations",
  params: { contactId: "cont_abc123" }
})
```

### 2. select_contact

Select one or multiple contacts in the UI.

```typescript
{
  name: "select_contact",
  description: "Select contact(s) in the dashboard for bulk actions",
  inputSchema: {
    type: "object",
    properties: {
      contactIds: {
        type: "array",
        items: { type: "string" },
        description: "Contact IDs to select"
      },
      mode: {
        type: "string",
        enum: ["replace", "add", "toggle"],
        default: "replace",
        description: "How to modify selection"
      },
      scrollToFirst: {
        type: "boolean",
        default: true,
        description: "Scroll first selected contact into view"
      }
    },
    required: ["contactIds"]
  }
}
```

### 3. apply_filter

Apply filters to the current view.

```typescript
{
  name: "apply_filter",
  description: "Filter contacts or conversations by various criteria",
  inputSchema: {
    type: "object",
    properties: {
      filterType: {
        type: "string",
        enum: ["tags", "dateRange", "search", "stage", "assigned"],
        description: "Type of filter to apply"
      },
      criteria: {
        type: "object",
        description: "Filter-specific criteria",
        oneOf: [
          {
            // Tag filter
            properties: {
              tags: { type: "array", items: { type: "string" } },
              matchMode: { type: "string", enum: ["any", "all"] }
            }
          },
          {
            // Date range filter
            properties: {
              field: { type: "string", enum: ["created", "lastContacted"] },
              start: { type: "string", format: "date" },
              end: { type: "string", format: "date" },
              preset: { type: "string", enum: ["today", "yesterday", "last-week", "last-month"] }
            }
          },
          {
            // Search filter
            properties: {
              query: { type: "string" },
              fields: { type: "array", items: { type: "string" } }
            }
          }
        ]
      },
      additive: {
        type: "boolean",
        default: false,
        description: "Add to existing filters vs replace"
      }
    },
    required: ["filterType", "criteria"]
  }
}

// Example
apply_filter({
  filterType: "dateRange",
  criteria: {
    field: "lastContacted",
    preset: "last-week"
  }
})
```

### 4. compose_message

Open message composer and fill in content.

```typescript
{
  name: "compose_message",
  description: "Open message composer and optionally pre-fill content",
  inputSchema: {
    type: "object",
    properties: {
      contactId: {
        type: "string",
        description: "Contact to message"
      },
      channel: {
        type: "string",
        enum: ["sms", "email", "whatsapp"],
        description: "Preferred channel"
      },
      content: {
        type: "string",
        description: "Pre-fill message content"
      },
      autoSend: {
        type: "boolean",
        default: false,
        description: "Automatically send (requires user confirmation)"
      },
      requireConfirmation: {
        type: "boolean",
        default: true,
        description: "Show confirmation dialog"
      }
    },
    required: ["contactId"]
  }
}
```

### 5. perform_bulk_action

Execute bulk actions on selected items.

```typescript
{
  name: "perform_bulk_action",
  description: "Perform action on multiple contacts/conversations",
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["addTag", "removeTag", "assign", "export", "delete", "archive"],
        description: "Bulk action to perform"
      },
      targetIds: {
        type: "array",
        items: { type: "string" },
        description: "IDs to perform action on"
      },
      parameters: {
        type: "object",
        description: "Action-specific parameters"
      },
      confirmationRequired: {
        type: "boolean",
        default: true,
        description: "Require user confirmation"
      }
    },
    required: ["action", "targetIds"]
  }
}

// Example
perform_bulk_action({
  action: "addTag",
  targetIds: ["cont_1", "cont_2", "cont_3"],
  parameters: { tags: ["follow-up-needed"] }
})
```

### 6. read_notifications

Read and interact with dashboard notifications.

```typescript
{
  name: "read_notifications",
  description: "Get current notifications and alerts",
  inputSchema: {
    type: "object",
    properties: {
      types: {
        type: "array",
        items: { type: "string", enum: ["message", "appointment", "task", "system"] },
        description: "Filter notification types"
      },
      unreadOnly: {
        type: "boolean",
        default: false
      },
      limit: {
        type: "number",
        default: 20
      }
    }
  }
}

// Response
{
  notifications: [
    {
      id: "notif_1",
      type: "message",
      title: "New message from John Doe",
      body: "Hey, when can we meet?",
      timestamp: "2025-01-20T10:30:00Z",
      read: false,
      actions: [
        { label: "Reply", action: "compose_message", params: { contactId: "cont_123" } },
        { label: "View", action: "navigate_to", params: { page: "conversations", contactId: "cont_123" } }
      ]
    }
  ]
}
```

### 7. capture_screenshot

Capture current dashboard state visually.

```typescript
{
  name: "capture_screenshot",
  description: "Capture screenshot of current view for analysis",
  inputSchema: {
    type: "object",
    properties: {
      area: {
        type: "string",
        enum: ["full", "viewport", "element"],
        description: "What to capture"
      },
      elementSelector: {
        type: "string",
        description: "CSS selector if area is 'element'"
      },
      includeMetadata: {
        type: "boolean",
        default: true,
        description: "Include UI state metadata with screenshot"
      }
    }
  }
}

// Response includes base64 image and metadata
```

### 8. get_element_info

Get detailed information about UI elements.

```typescript
{
  name: "get_element_info",
  description: "Get information about specific UI elements",
  inputSchema: {
    type: "object",
    properties: {
      selector: {
        type: "string",
        description: "CSS selector or semantic identifier"
      },
      includeInteractive: {
        type: "boolean",
        default: true,
        description: "Include interactive elements (buttons, inputs)"
      }
    },
    required: ["selector"]
  }
}
```

## UI State Synchronization

The dashboard-mcp maintains a real-time sync of UI state:

```typescript
class DashboardStateManager {
  private state: ViewState;
  private observers: Set<Observer>;

  // Called whenever UI changes
  onUIUpdate(update: Partial<ViewState>) {
    this.state = { ...this.state, ...update };
    this.notifyObservers(update);
    this.emitMCPEvent('dashboard:state:changed', update);
  }

  // Expose current state as MCP resource
  getResource(uri: string): Resource {
    if (uri === 'dashboard://view/current') {
      return {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(this.state)
      };
    }
  }
}
```

---

# 3. database-mcp Server

## Purpose
Local database for caching GHL data, storing conversation history, managing sync state, and providing fast queries for AI operations. Reduces API calls and enables offline capabilities.

## Schema Design

```sql
-- Contacts table with full-text search
CREATE TABLE contacts (
  id TEXT PRIMARY KEY,
  ghl_id TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  tags JSON, -- array of tags
  custom_fields JSON,
  source TEXT,
  assigned_to TEXT,
  pipeline_stage TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  last_contacted_at TIMESTAMP,
  last_synced_at TIMESTAMP,
  sync_status TEXT, -- 'synced' | 'pending' | 'error'
  metadata JSON,
  search_vector TSVECTOR -- for full-text search
);

CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_phone ON contacts(phone);
CREATE INDEX idx_contacts_tags ON contacts USING GIN(tags);
CREATE INDEX idx_contacts_search ON contacts USING GIN(search_vector);
CREATE INDEX idx_contacts_last_contacted ON contacts(last_contacted_at);

-- Conversations table
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  ghl_id TEXT UNIQUE NOT NULL,
  contact_id TEXT REFERENCES contacts(id),
  channel TEXT,
  status TEXT,
  assigned_to TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  last_message_at TIMESTAMP,
  unread_count INTEGER DEFAULT 0,
  metadata JSON
);

CREATE INDEX idx_conversations_contact ON conversations(contact_id);
CREATE INDEX idx_conversations_channel ON conversations(channel);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at);

-- Messages table
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  ghl_id TEXT UNIQUE,
  conversation_id TEXT REFERENCES conversations(id),
  contact_id TEXT REFERENCES contacts(id),
  direction TEXT, -- 'inbound' | 'outbound'
  body TEXT,
  channel TEXT,
  status TEXT,
  sent_at TIMESTAMP,
  sent_by TEXT,
  read_at TIMESTAMP,
  attachments JSON,
  metadata JSON,
  search_vector TSVECTOR
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_contact ON messages(contact_id);
CREATE INDEX idx_messages_sent_at ON messages(sent_at);
CREATE INDEX idx_messages_search ON messages USING GIN(search_vector);

-- Opportunities table
CREATE TABLE opportunities (
  id TEXT PRIMARY KEY,
  ghl_id TEXT UNIQUE NOT NULL,
  contact_id TEXT REFERENCES contacts(id),
  pipeline_id TEXT,
  stage_id TEXT,
  name TEXT,
  value DECIMAL(10,2),
  status TEXT,
  assigned_to TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  closed_at TIMESTAMP,
  metadata JSON
);

CREATE INDEX idx_opportunities_contact ON opportunities(contact_id);
CREATE INDEX idx_opportunities_pipeline ON opportunities(pipeline_id);
CREATE INDEX idx_opportunities_status ON opportunities(status);

-- Sync state tracking
CREATE TABLE sync_state (
  entity_type TEXT PRIMARY KEY, -- 'contacts' | 'conversations' | 'messages'
  last_sync_at TIMESTAMP,
  last_successful_sync_at TIMESTAMP,
  cursor TEXT, -- pagination cursor
  status TEXT, -- 'idle' | 'syncing' | 'error'
  error_message TEXT,
  records_synced INTEGER,
  metadata JSON
);

-- AI interaction history
CREATE TABLE ai_actions (
  id TEXT PRIMARY KEY,
  action_type TEXT,
  target_type TEXT, -- 'contact' | 'conversation' | 'opportunity'
  target_id TEXT,
  parameters JSON,
  result JSON,
  success BOOLEAN,
  error_message TEXT,
  executed_at TIMESTAMP,
  execution_time_ms INTEGER
);

CREATE INDEX idx_ai_actions_executed ON ai_actions(executed_at);
CREATE INDEX idx_ai_actions_target ON ai_actions(target_type, target_id);
```

## Resources

### Contact Query Results

```typescript
// URI: db://contacts/query?sql={encodedQuery}
// URI: db://contacts/search?q={query}

interface ContactQueryResult {
  contacts: Contact[];
  totalCount: number;
  query: {
    sql: string;
    parameters: any[];
    executionTime: number;
  };
  cached: boolean;
}
```

### Conversation History

```typescript
// URI: db://conversations/{contactId}/history

interface ConversationHistory {
  contactId: string;
  conversations: Conversation[];
  messageCount: number;
  dateRange: {
    earliest: string;
    latest: string;
  };
  channels: string[];
  statistics: {
    totalMessages: number;
    inbound: number;
    outbound: number;
    averageResponseTime: number;
  };
}
```

### Sync Status

```typescript
// URI: db://sync/status

interface SyncStatus {
  entities: {
    contacts: EntitySyncState;
    conversations: EntitySyncState;
    messages: EntitySyncState;
    opportunities: EntitySyncState;
  };
  overall: {
    healthy: boolean;
    lastSync: string;
    nextSync: string;
  };
}

interface EntitySyncState {
  lastSync: string;
  status: 'idle' | 'syncing' | 'error';
  recordsSynced: number;
  error?: string;
}
```

## Tools

### 1. query_contacts

Execute SQL query on contacts table.

```typescript
{
  name: "query_contacts",
  description: "Execute SQL query to find contacts with complex criteria",
  inputSchema: {
    type: "object",
    properties: {
      sql: {
        type: "string",
        description: "SQL query (SELECT only, parameterized)"
      },
      parameters: {
        type: "array",
        description: "Query parameters for prepared statement"
      },
      limit: {
        type: "number",
        default: 100,
        description: "Maximum results"
      }
    },
    required: ["sql"]
  }
}

// Example
query_contacts({
  sql: "SELECT * FROM contacts WHERE last_contacted_at >= ? AND tags @> ?",
  parameters: ["2025-01-13", '["follow-up"]']
})
```

### 2. full_text_search

Perform full-text search across contacts and messages.

```typescript
{
  name: "full_text_search",
  description: "Search contacts and conversations using full-text search",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query (supports operators like AND, OR, NOT)"
      },
      entities: {
        type: "array",
        items: { type: "string", enum: ["contacts", "messages", "all"] },
        default: ["all"]
      },
      filters: {
        type: "object",
        properties: {
          dateRange: {
            type: "object",
            properties: {
              start: { type: "string", format: "date" },
              end: { type: "string", format: "date" }
            }
          },
          tags: { type: "array", items: { type: "string" } }
        }
      },
      limit: { type: "number", default: 50 }
    },
    required: ["query"]
  }
}

// Example
full_text_search({
  query: "pricing & (urgent | ASAP)",
  entities: ["messages"],
  filters: {
    dateRange: { start: "2025-01-13", end: "2025-01-20" }
  }
})
```

### 3. get_conversation_analytics

Get analytics for conversations and messages.

```typescript
{
  name: "get_conversation_analytics",
  description: "Get conversation metrics and analytics",
  inputSchema: {
    type: "object",
    properties: {
      contactId: {
        type: "string",
        description: "Specific contact (optional)"
      },
      dateRange: {
        type: "object",
        properties: {
          start: { type: "string", format: "date" },
          end: { type: "string", format: "date" }
        }
      },
      groupBy: {
        type: "string",
        enum: ["day", "week", "month", "contact", "channel"],
        default: "day"
      },
      metrics: {
        type: "array",
        items: {
          type: "string",
          enum: ["messageCount", "responseTime", "sentimentScore", "engagementRate"]
        },
        default: ["messageCount", "responseTime"]
      }
    }
  }
}

// Response
{
  analytics: [
    {
      date: "2025-01-20",
      messageCount: 45,
      responseTime: 3600, // seconds
      channels: {
        sms: 30,
        email: 10,
        whatsapp: 5
      }
    }
  ],
  summary: {
    totalMessages: 450,
    averageResponseTime: 2400,
    mostActiveChannel: "sms",
    mostActiveContacts: [...]
  }
}
```

### 4. sync_entity

Manually trigger sync for specific entity type.

```typescript
{
  name: "sync_entity",
  description: "Trigger manual sync from GoHighLevel for entity type",
  inputSchema: {
    type: "object",
    properties: {
      entityType: {
        type: "string",
        enum: ["contacts", "conversations", "messages", "opportunities", "all"]
      },
      mode: {
        type: "string",
        enum: ["incremental", "full"],
        default: "incremental",
        description: "Incremental syncs changes since last sync, full resyncs everything"
      },
      filters: {
        type: "object",
        description: "Optional filters for sync (e.g., specific contact IDs)"
      }
    },
    required: ["entityType"]
  }
}
```

### 5. upsert_contact

Insert or update contact in local database.

```typescript
{
  name: "upsert_contact",
  description: "Insert or update contact data in local database",
  inputSchema: {
    type: "object",
    properties: {
      contact: {
        type: "object",
        description: "Contact data to upsert"
      },
      source: {
        type: "string",
        enum: ["ghl_sync", "user_input", "ai_action"],
        description: "Source of this data"
      }
    },
    required: ["contact"]
  }
}
```

### 6. get_sync_status

Get current sync status for all entities.

```typescript
{
  name: "get_sync_status",
  description: "Get current sync status and health",
  inputSchema: {
    type: "object",
    properties: {
      detailed: {
        type: "boolean",
        default: false,
        description: "Include detailed sync statistics"
      }
    }
  }
}
```

### 7. log_ai_action

Log AI action for audit and learning.

```typescript
{
  name: "log_ai_action",
  description: "Log an AI action for audit trail and performance tracking",
  inputSchema: {
    type: "object",
    properties: {
      actionType: { type: "string" },
      targetType: { type: "string" },
      targetId: { type: "string" },
      parameters: { type: "object" },
      result: { type: "object" },
      success: { type: "boolean" },
      errorMessage: { type: "string" },
      executionTimeMs: { type: "number" }
    },
    required: ["actionType", "targetType", "success"]
  }
}
```

## Caching Strategy

```typescript
interface CachePolicy {
  contacts: {
    ttl: 300, // 5 minutes
    invalidateOn: ['contact.updated', 'contact.created']
  },
  conversations: {
    ttl: 60, // 1 minute
    invalidateOn: ['message.received', 'conversation.updated']
  },
  messages: {
    ttl: 30, // 30 seconds
    invalidateOn: ['message.received']
  }
}

class CacheManager {
  async get<T>(key: string): Promise<T | null> {
    const cached = await this.db.getCached(key);
    if (cached && !this.isExpired(cached)) {
      return cached.data;
    }
    return null;
  }

  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    await this.db.setCached({
      key,
      data,
      expiresAt: Date.now() + (ttl || this.defaultTTL) * 1000
    });
  }

  invalidate(pattern: string): void {
    // Invalidate all cache entries matching pattern
  }
}
```

---

# 4. notifications-mcp Server

## Purpose
Real-time event streaming from GoHighLevel webhooks and WebSocket connections. Enables reactive AI responses to business events.

## Resources

### Event Stream

```typescript
// URI: notifications://stream/live
// URI: notifications://stream/history?since={timestamp}

interface EventStream {
  events: Event[];
  cursor: string;
  hasMore: boolean;
}

interface Event {
  id: string;
  type: string;
  source: 'ghl_webhook' | 'ghl_websocket' | 'system';
  timestamp: string;
  data: any;
  processed: boolean;
  relatedEntities: {
    contactId?: string;
    conversationId?: string;
    opportunityId?: string;
  };
}
```

### Subscription Status

```typescript
// URI: notifications://subscriptions/active

interface SubscriptionStatus {
  webhooks: WebhookSubscription[];
  websockets: WebSocketConnection[];
  health: {
    connected: boolean;
    lastEvent: string;
    eventsReceived: number;
    errors: number;
  };
}

interface WebhookSubscription {
  id: string;
  eventTypes: string[];
  endpoint: string;
  status: 'active' | 'paused' | 'error';
  lastDelivery: string;
}
```

## Event Types

### Contact Events

```typescript
{
  "contact.created": {
    contactId: string;
    source: string;
    tags: string[];
    timestamp: string;
  },
  "contact.updated": {
    contactId: string;
    changes: Record<string, { old: any; new: any }>;
    timestamp: string;
  },
  "contact.deleted": {
    contactId: string;
    timestamp: string;
  },
  "contact.tag_added": {
    contactId: string;
    tags: string[];
    timestamp: string;
  }
}
```

### Conversation Events

```typescript
{
  "message.received": {
    messageId: string;
    conversationId: string;
    contactId: string;
    channel: string;
    body: string;
    direction: 'inbound';
    timestamp: string;
  },
  "message.sent": {
    messageId: string;
    conversationId: string;
    contactId: string;
    channel: string;
    status: 'sent' | 'delivered' | 'failed';
    timestamp: string;
  },
  "conversation.status_changed": {
    conversationId: string;
    contactId: string;
    oldStatus: string;
    newStatus: string;
    timestamp: string;
  }
}
```

### Opportunity Events

```typescript
{
  "opportunity.created": {
    opportunityId: string;
    contactId: string;
    pipelineId: string;
    stageId: string;
    value: number;
    timestamp: string;
  },
  "opportunity.stage_changed": {
    opportunityId: string;
    contactId: string;
    oldStageId: string;
    newStageId: string;
    timestamp: string;
  },
  "opportunity.won": {
    opportunityId: string;
    contactId: string;
    value: number;
    timestamp: string;
  }
}
```

### Appointment Events

```typescript
{
  "appointment.scheduled": {
    appointmentId: string;
    contactId: string;
    calendarId: string;
    startTime: string;
    endTime: string;
    timestamp: string;
  },
  "appointment.cancelled": {
    appointmentId: string;
    contactId: string;
    reason: string;
    timestamp: string;
  },
  "appointment.no_show": {
    appointmentId: string;
    contactId: string;
    timestamp: string;
  }
}
```

## Tools

### 1. subscribe_to_events

Subscribe to specific event types.

```typescript
{
  name: "subscribe_to_events",
  description: "Subscribe to real-time events from GoHighLevel",
  inputSchema: {
    type: "object",
    properties: {
      eventTypes: {
        type: "array",
        items: { type: "string" },
        description: "Event types to subscribe to (e.g., 'message.received')"
      },
      filters: {
        type: "object",
        properties: {
          contactIds: {
            type: "array",
            items: { type: "string" },
            description: "Only events for specific contacts"
          },
          channels: {
            type: "array",
            items: { type: "string" },
            description: "Only events from specific channels"
          },
          tags: {
            type: "array",
            items: { type: "string" },
            description: "Only events for contacts with specific tags"
          }
        }
      },
      handler: {
        type: "string",
        description: "Handler function name or MCP tool to call"
      }
    },
    required: ["eventTypes", "handler"]
  }
}

// Example
subscribe_to_events({
  eventTypes: ["message.received"],
  filters: {
    tags: ["vip-customer"]
  },
  handler: "handle_vip_message"
})
```

### 2. get_recent_events

Retrieve recent events from history.

```typescript
{
  name: "get_recent_events",
  description: "Get recent events from event history",
  inputSchema: {
    type: "object",
    properties: {
      eventTypes: {
        type: "array",
        items: { type: "string" },
        description: "Filter by event types"
      },
      since: {
        type: "string",
        format: "date-time",
        description: "Events after this timestamp"
      },
      contactId: {
        type: "string",
        description: "Events for specific contact"
      },
      limit: {
        type: "number",
        default: 50
      },
      unprocessedOnly: {
        type: "boolean",
        default: false,
        description: "Only return unprocessed events"
      }
    }
  }
}
```

### 3. mark_event_processed

Mark event as processed to avoid duplicate handling.

```typescript
{
  name: "mark_event_processed",
  description: "Mark an event as processed",
  inputSchema: {
    type: "object",
    properties: {
      eventId: { type: "string" },
      result: {
        type: "object",
        description: "Processing result metadata"
      }
    },
    required: ["eventId"]
  }
}
```

### 4. configure_webhook

Configure webhook endpoint for events.

```typescript
{
  name: "configure_webhook",
  description: "Configure webhook subscription in GoHighLevel",
  inputSchema: {
    type: "object",
    properties: {
      eventTypes: {
        type: "array",
        items: { type: "string" }
      },
      endpoint: {
        type: "string",
        format: "uri",
        description: "Webhook endpoint URL"
      },
      secret: {
        type: "string",
        description: "Webhook signing secret"
      }
    },
    required: ["eventTypes", "endpoint"]
  }
}
```

### 5. test_webhook

Test webhook delivery.

```typescript
{
  name: "test_webhook",
  description: "Send test event to verify webhook configuration",
  inputSchema: {
    type: "object",
    properties: {
      webhookId: { type: "string" },
      eventType: { type: "string" }
    },
    required: ["webhookId"]
  }
}
```

## WebSocket Connection

```typescript
class GHLWebSocketManager {
  private ws: WebSocket;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  async connect() {
    const token = await this.authManager.getValidToken();
    this.ws = new WebSocket(
      `wss://services.leadconnectorhq.com/conversations/stream?token=${token}`
    );

    this.ws.on('message', (data) => {
      const event = JSON.parse(data);
      this.handleEvent(event);
    });

    this.ws.on('close', () => {
      this.handleDisconnect();
    });

    this.ws.on('error', (error) => {
      this.handleError(error);
    });
  }

  private async handleEvent(event: Event) {
    // Store in database
    await this.db.storeEvent(event);

    // Notify subscribed handlers
    await this.notifyHandlers(event);

    // Emit MCP resource update
    this.emitResourceUpdate('notifications://stream/live', event);
  }

  private async handleDisconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      setTimeout(() => this.connect(), delay);
      this.reconnectAttempts++;
    }
  }
}
```

---

# Integration Patterns

## Pattern 1: Query → Action → Notify

Common flow for AI-initiated actions:

```typescript
// 1. AI queries database for targets
const contacts = await mcp.database.query_contacts({
  sql: "SELECT * FROM contacts WHERE last_contacted_at < ?",
  parameters: [sevenDaysAgo]
});

// 2. AI performs actions via GHL
for (const contact of contacts) {
  await mcp.ghl.send_message({
    contactId: contact.ghl_id,
    message: "Hi! Just checking in...",
    channel: "sms"
  });
}

// 3. Events flow back via notifications
// notifications-mcp receives 'message.sent' events
// database-mcp updates message records
// dashboard-mcp reflects changes in UI
```

## Pattern 2: Event → Analyze → React

Reactive AI responses to business events:

```typescript
// 1. Event arrives via webhook
mcp.notifications.on('message.received', async (event) => {

  // 2. AI analyzes context from database
  const contact = await mcp.database.get_contact(event.contactId);
  const history = await mcp.database.get_conversation_history(event.contactId);

  // 3. AI determines if action needed
  const analysis = await ai.analyze({
    message: event.body,
    contact: contact,
    history: history
  });

  // 4. AI takes action if needed
  if (analysis.requiresResponse) {
    await mcp.ghl.send_message({
      contactId: contact.ghl_id,
      message: analysis.suggestedResponse,
      channel: event.channel
    });
  }

  // 5. Update dashboard if visible
  if (await mcp.dashboard.isContactVisible(contact.id)) {
    await mcp.dashboard.refresh_view();
  }
});
```

## Pattern 3: UI Action → Database → Sync

User-initiated actions flow through system:

```typescript
// 1. User action in dashboard
mcp.dashboard.on('contact_selected', async (contactId) => {

  // 2. Check if data is fresh
  const syncStatus = await mcp.database.get_sync_status();

  if (syncStatus.contacts.needsUpdate) {
    // 3. Trigger sync from GHL
    await mcp.ghl.sync_contact(contactId);

    // 4. Update database
    await mcp.database.upsert_contact(contactData);
  }

  // 5. Dashboard displays fresh data
  await mcp.dashboard.display_contact(contactId);
});
```

---

# Example: "Send follow-up to contacts I spoke with last week"

Here's how PAI would execute this complex request using the MCP ecosystem:

## Step 1: Parse Intent

```typescript
const intent = ai.parseIntent(
  "Send a follow-up to all contacts I spoke with last week"
);

// Result:
{
  action: "send_bulk_messages",
  targets: {
    criteria: "last_contacted_at within last 7 days",
    channel: "inferred_from_contact"
  },
  messageType: "follow_up"
}
```

## Step 2: Query Database for Targets

```typescript
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

const contacts = await mcp.database.query_contacts({
  sql: `
    SELECT c.*,
           COUNT(m.id) as message_count,
           MAX(m.sent_at) as last_message_at
    FROM contacts c
    JOIN conversations conv ON conv.contact_id = c.id
    JOIN messages m ON m.conversation_id = conv.id
    WHERE m.sent_at >= ?
      AND m.direction = 'outbound'
    GROUP BY c.id
    HAVING message_count > 0
    ORDER BY last_message_at DESC
  `,
  parameters: [sevenDaysAgo.toISOString()]
});

// Result: 15 contacts found
```

## Step 3: Analyze Each Contact

```typescript
const contactsWithContext = await Promise.all(
  contacts.map(async (contact) => {
    // Get conversation history
    const history = await mcp.database.get_conversation_analytics({
      contactId: contact.id,
      dateRange: {
        start: sevenDaysAgo.toISOString(),
        end: new Date().toISOString()
      }
    });

    // Get full conversation for context
    const messages = await mcp.ghl.get_conversation_history({
      contactId: contact.ghl_id,
      since: sevenDaysAgo.toISOString(),
      limit: 50
    });

    return {
      contact,
      history,
      messages,
      preferredChannel: history.channels[0] // most used channel
    };
  })
);
```

## Step 4: Generate Personalized Messages

```typescript
const messagePlan = await Promise.all(
  contactsWithContext.map(async (ctx) => {
    const message = await ai.generateFollowUp({
      contact: ctx.contact,
      conversationHistory: ctx.messages,
      context: {
        lastTopics: extractTopics(ctx.messages),
        sentiment: analyzeSentiment(ctx.messages),
        actionItems: extractActionItems(ctx.messages)
      }
    });

    return {
      contactId: ctx.contact.ghl_id,
      contactName: ctx.contact.first_name,
      message: message,
      channel: ctx.preferredChannel
    };
  })
);

// Example generated messages:
[
  {
    contactId: "cont_abc123",
    contactName: "John",
    message: "Hi John! Following up on our conversation about the pricing options. Have you had a chance to review the proposal I sent?",
    channel: "sms"
  },
  {
    contactId: "cont_def456",
    contactName: "Sarah",
    message: "Hey Sarah! Hope you're doing well. Wanted to check in on the project timeline we discussed. Let me know if you need any clarification!",
    channel: "email"
  }
]
```

## Step 5: Present to User via Dashboard

```typescript
// Display in dashboard for review
await mcp.dashboard.navigate_to({
  page: "bulk_message_review"
});

await mcp.dashboard.display_message_preview({
  messages: messagePlan,
  totalRecipients: messagePlan.length,
  estimatedSendTime: calculateSendTime(messagePlan.length),
  requiresConfirmation: true
});

// Dashboard shows:
// - List of 15 contacts
// - Preview of each personalized message
// - Option to edit before sending
// - "Send All" and "Cancel" buttons
```

## Step 6: Execute Send (After User Confirmation)

```typescript
// User clicks "Send All"
const sendResults = await Promise.all(
  messagePlan.map(async (plan) => {
    try {
      const result = await mcp.ghl.send_message({
        contactId: plan.contactId,
        message: plan.message,
        channel: plan.channel,
        metadata: {
          campaign: "follow_up_last_week",
          aiGenerated: true,
          timestamp: new Date().toISOString()
        }
      });

      // Log action in database
      await mcp.database.log_ai_action({
        actionType: "send_follow_up_message",
        targetType: "contact",
        targetId: plan.contactId,
        parameters: { channel: plan.channel },
        result: result,
        success: true,
        executionTimeMs: result.executionTime
      });

      return { contactName: plan.contactName, success: true, result };
    } catch (error) {
      // Handle errors gracefully
      await mcp.database.log_ai_action({
        actionType: "send_follow_up_message",
        targetType: "contact",
        targetId: plan.contactId,
        parameters: { channel: plan.channel },
        success: false,
        errorMessage: error.message,
        executionTimeMs: Date.now() - startTime
      });

      return { contactName: plan.contactName, success: false, error };
    }
  })
);

// Summary
const successful = sendResults.filter(r => r.success).length;
const failed = sendResults.filter(r => !r.success).length;

console.log(`Sent ${successful} messages successfully, ${failed} failed`);
```

## Step 7: Real-time Event Handling

```typescript
// As messages are sent, events flow back
mcp.notifications.subscribe_to_events({
  eventTypes: ["message.sent", "message.delivered", "message.received"],
  filters: {
    metadata: { campaign: "follow_up_last_week" }
  },
  handler: async (event) => {
    // Update database with delivery status
    await mcp.database.update_message_status({
      messageId: event.messageId,
      status: event.status
    });

    // Update dashboard if visible
    if (await mcp.dashboard.isMessageVisible(event.messageId)) {
      await mcp.dashboard.update_message_status({
        messageId: event.messageId,
        status: event.status
      });
    }

    // Handle replies automatically
    if (event.type === "message.received") {
      const contact = await mcp.database.get_contact(event.contactId);

      // Notify user of reply
      await mcp.dashboard.show_notification({
        type: "message",
        title: `Reply from ${contact.first_name}`,
        body: event.body,
        actions: [
          { label: "View", action: "navigate_to_conversation" },
          { label: "Reply", action: "compose_message" }
        ]
      });
    }
  }
});
```

## Step 8: Analytics & Learning

```typescript
// After campaign completes, analyze results
setTimeout(async () => {
  const analytics = await mcp.database.get_conversation_analytics({
    dateRange: {
      start: campaignStartTime,
      end: new Date().toISOString()
    },
    filters: {
      metadata: { campaign: "follow_up_last_week" }
    }
  });

  // Generate insights
  const insights = {
    deliveryRate: analytics.delivered / analytics.sent,
    responseRate: analytics.replies / analytics.delivered,
    averageResponseTime: analytics.averageResponseTime,
    bestPerformingChannel: analytics.channelBreakdown.sort(
      (a, b) => b.responseRate - a.responseRate
    )[0],
    topResponders: analytics.contacts
      .filter(c => c.replied)
      .map(c => c.name)
  };

  // Store learnings for future campaigns
  await mcp.database.store_campaign_insights({
    campaign: "follow_up_last_week",
    insights: insights,
    recommendations: generateRecommendations(insights)
  });

  // Show summary in dashboard
  await mcp.dashboard.show_notification({
    type: "campaign_complete",
    title: "Follow-up Campaign Results",
    body: `Sent to ${analytics.sent} contacts. ${analytics.replies} replies received (${(insights.responseRate * 100).toFixed(1)}% response rate)`,
    actions: [
      { label: "View Details", action: "show_campaign_analytics" }
    ]
  });
}, 24 * 60 * 60 * 1000); // Check after 24 hours
```

---

# Implementation Considerations

## 1. Security

```typescript
// All MCP servers must implement:
interface SecurityConfig {
  authentication: {
    type: "oauth2" | "api_key" | "jwt";
    tokenRefresh: boolean;
    tokenStorage: "encrypted_file" | "keychain";
  };
  authorization: {
    rbac: boolean;
    scopes: string[];
    permissionCheck: (action: string, resource: string) => boolean;
  };
  dataProtection: {
    encryptAtRest: boolean;
    encryptInTransit: boolean;
    piiHandling: "mask" | "encrypt" | "tokenize";
  };
  audit: {
    logAllAccess: boolean;
    retentionDays: number;
  };
}
```

## 2. Performance

```typescript
// Performance optimization strategies
interface PerformanceConfig {
  caching: {
    strategy: "lru" | "ttl" | "adaptive";
    maxSize: string; // "100MB"
    warmup: boolean;
  };
  batching: {
    enabled: boolean;
    batchSize: number;
    flushInterval: number; // ms
  };
  rateLimit: {
    requestsPerSecond: number;
    burstAllowance: number;
    queue: boolean;
  };
  compression: {
    enabled: boolean;
    algorithm: "gzip" | "brotli";
    threshold: number; // bytes
  };
}
```

## 3. Reliability

```typescript
// Reliability patterns
interface ReliabilityConfig {
  retry: {
    maxAttempts: number;
    backoff: "exponential" | "linear";
    retryableErrors: string[];
  };
  circuitBreaker: {
    enabled: boolean;
    failureThreshold: number;
    timeout: number;
    halfOpenAttempts: number;
  };
  fallback: {
    enabled: boolean;
    strategy: "cache" | "degraded" | "error";
  };
  healthCheck: {
    enabled: boolean;
    interval: number; // seconds
    endpoint: string;
  };
}
```

## 4. Monitoring

```typescript
// Monitoring and observability
interface MonitoringConfig {
  metrics: {
    enabled: boolean;
    provider: "prometheus" | "datadog" | "custom";
    collectInterval: number; // seconds
    metrics: [
      "request_count",
      "request_duration",
      "error_rate",
      "cache_hit_rate",
      "queue_size"
    ];
  };
  logging: {
    level: "debug" | "info" | "warn" | "error";
    format: "json" | "text";
    destination: "stdout" | "file" | "remote";
    sampling: boolean; // sample high-volume logs
  };
  tracing: {
    enabled: boolean;
    provider: "jaeger" | "zipkin";
    sampleRate: number; // 0-1
  };
}
```

---

# Deployment Architecture

```yaml
# docker-compose.yml for MCP server stack

version: "3.8"

services:
  ghl-mcp:
    build: ./servers/ghl-mcp
    environment:
      - GHL_CLIENT_ID=${GHL_CLIENT_ID}
      - GHL_CLIENT_SECRET=${GHL_CLIENT_SECRET}
      - GHL_LOCATION_ID=${GHL_LOCATION_ID}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    ports:
      - "3001:3000"
    restart: unless-stopped

  database-mcp:
    build: ./servers/database-mcp
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/pai_dashboard
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    ports:
      - "3002:3000"
    volumes:
      - ./data/database:/data
    restart: unless-stopped

  dashboard-mcp:
    build: ./servers/dashboard-mcp
    environment:
      - DASHBOARD_URL=http://dashboard:8080
      - REDIS_URL=redis://redis:6379
    ports:
      - "3003:3000"
    restart: unless-stopped

  notifications-mcp:
    build: ./servers/notifications-mcp
    environment:
      - GHL_WEBHOOK_SECRET=${GHL_WEBHOOK_SECRET}
      - DATABASE_MCP_URL=http://database-mcp:3000
      - REDIS_URL=redis://redis:6379
    ports:
      - "3004:3000"
      - "8080:8080" # webhook endpoint
    depends_on:
      - database-mcp
      - redis
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=pai_dashboard
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"

volumes:
  postgres_data:
  redis_data:
```

---

# Configuration Example

```json
// .pai/config/mcp-servers.json

{
  "servers": {
    "ghl-mcp": {
      "type": "http",
      "url": "http://localhost:3001",
      "description": "GoHighLevel API integration",
      "authentication": {
        "type": "bearer",
        "token": "${GHL_ACCESS_TOKEN}"
      },
      "capabilities": {
        "resources": true,
        "tools": true,
        "prompts": false
      },
      "config": {
        "rateLimiting": {
          "requestsPerSecond": 10,
          "burstSize": 20
        },
        "caching": {
          "enabled": true,
          "ttl": 300
        }
      }
    },
    "database-mcp": {
      "type": "http",
      "url": "http://localhost:3002",
      "description": "Local database for contacts and conversations",
      "capabilities": {
        "resources": true,
        "tools": true,
        "prompts": false
      },
      "config": {
        "syncInterval": 60,
        "cacheSize": "100MB",
        "backupEnabled": true
      }
    },
    "dashboard-mcp": {
      "type": "http",
      "url": "http://localhost:3003",
      "description": "Dashboard UI control and visibility",
      "capabilities": {
        "resources": true,
        "tools": true,
        "prompts": false
      },
      "config": {
        "stateUpdateInterval": 1000,
        "screenshotEnabled": true
      }
    },
    "notifications-mcp": {
      "type": "http",
      "url": "http://localhost:3004",
      "description": "Real-time event streaming",
      "capabilities": {
        "resources": true,
        "tools": true,
        "prompts": false
      },
      "config": {
        "webhookEndpoint": "http://localhost:8080/webhooks/ghl",
        "websocketReconnect": true,
        "eventBufferSize": 1000
      }
    }
  },
  "integrations": {
    "gohighlevel": {
      "clientId": "${GHL_CLIENT_ID}",
      "clientSecret": "${GHL_CLIENT_SECRET}",
      "locationId": "${GHL_LOCATION_ID}",
      "scopes": [
        "contacts.readonly",
        "contacts.write",
        "conversations.readonly",
        "conversations.write",
        "opportunities.readonly",
        "opportunities.write",
        "calendars.readonly",
        "calendars.write"
      ]
    }
  },
  "ai": {
    "model": "claude-sonnet-4.5",
    "systemPrompt": "You are a business operations assistant with access to GoHighLevel CRM...",
    "mcpOrder": [
      "database-mcp",
      "ghl-mcp",
      "dashboard-mcp",
      "notifications-mcp"
    ]
  }
}
```

---

# Testing Strategy

## Unit Tests

```typescript
// Example: ghl-mcp tool tests
describe('ghl-mcp: send_message', () => {
  it('should send SMS message successfully', async () => {
    const result = await mcp.ghl.send_message({
      contactId: 'cont_test123',
      message: 'Test message',
      channel: 'sms'
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
    expect(result.status).toBe('sent');
  });

  it('should handle rate limiting gracefully', async () => {
    // Send burst of requests
    const promises = Array(50).fill(null).map(() =>
      mcp.ghl.send_message({
        contactId: 'cont_test123',
        message: 'Test',
        channel: 'sms'
      })
    );

    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled');

    // All should eventually succeed due to queuing
    expect(successful.length).toBe(50);
  });

  it('should retry on transient errors', async () => {
    // Mock temporary API failure
    mockGHLAPI.mockTemporaryFailure(2); // fail twice, then succeed

    const result = await mcp.ghl.send_message({
      contactId: 'cont_test123',
      message: 'Test',
      channel: 'sms'
    });

    expect(result.success).toBe(true);
    expect(mockGHLAPI.callCount).toBe(3); // 2 failures + 1 success
  });
});
```

## Integration Tests

```typescript
// Example: End-to-end workflow test
describe('Integration: Follow-up workflow', () => {
  it('should complete full follow-up workflow', async () => {
    // Setup: Create test contacts with conversation history
    const contacts = await seedTestData();

    // Step 1: Query contacts
    const results = await mcp.database.query_contacts({
      sql: "SELECT * FROM contacts WHERE last_contacted_at >= ?",
      parameters: [sevenDaysAgo]
    });

    expect(results.contacts.length).toBe(5);

    // Step 2: Send messages
    const messages = await Promise.all(
      results.contacts.map(c =>
        mcp.ghl.send_message({
          contactId: c.ghl_id,
          message: 'Follow-up test',
          channel: 'sms'
        })
      )
    );

    expect(messages.every(m => m.success)).toBe(true);

    // Step 3: Verify events received
    await waitForEvents(5, 'message.sent');

    const events = await mcp.notifications.get_recent_events({
      eventTypes: ['message.sent'],
      since: testStartTime
    });

    expect(events.events.length).toBe(5);

    // Step 4: Verify database updated
    const updatedContacts = await mcp.database.query_contacts({
      sql: "SELECT * FROM contacts WHERE id = ANY(?)",
      parameters: [results.contacts.map(c => c.id)]
    });

    updatedContacts.contacts.forEach(c => {
      expect(new Date(c.last_contacted_at)).toBeAfter(testStartTime);
    });
  });
});
```

---

# Next Steps for Implementation

1. **Phase 1: Core Infrastructure (Week 1-2)**
   - Set up PostgreSQL database with schema
   - Implement database-mcp server with basic CRUD
   - Set up Redis for caching and session management

2. **Phase 2: GHL Integration (Week 2-3)**
   - Implement ghl-mcp authentication flow
   - Build rate limiter and request queue
   - Implement core tools (send_message, search_contacts, etc.)

3. **Phase 3: Real-time Events (Week 3-4)**
   - Set up webhook endpoint for GHL events
   - Implement WebSocket connection manager
   - Build notifications-mcp event streaming

4. **Phase 4: Dashboard Integration (Week 4-5)**
   - Build dashboard-mcp UI state tracking
   - Implement navigation and interaction tools
   - Add screenshot capability for AI vision

5. **Phase 5: AI Integration (Week 5-6)**
   - Connect all MCPs to Claude
   - Implement AI workflow orchestration
   - Build testing suite for AI interactions

6. **Phase 6: Production Hardening (Week 6-8)**
   - Add comprehensive error handling
   - Implement monitoring and alerting
   - Security audit and penetration testing
   - Performance optimization and load testing

---

# Conclusion

This MCP server ecosystem provides a comprehensive, AI-first architecture for business operations automation. The four specialized servers work together to give the AI complete visibility and control over the business dashboard while maintaining clean separation of concerns, robust error handling, and real-time event processing.

Key strengths of this design:

1. **Composable**: Each server has a clear purpose and can be used independently
2. **Scalable**: Caching, rate limiting, and async processing built-in
3. **Real-time**: WebSocket and webhook integration for instant reactivity
4. **AI-Optimized**: Resources and tools designed for AI agent consumption
5. **Production-Ready**: Security, monitoring, and reliability patterns included

The system enables complex AI-driven workflows like "Send follow-up to contacts I spoke with last week" while providing the flexibility to handle any business operation through natural language commands.
