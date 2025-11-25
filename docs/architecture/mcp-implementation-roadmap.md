# MCP Business Dashboard Implementation Roadmap

## Quick Start Guide

This roadmap provides a practical, step-by-step approach to implementing the MCP server ecosystem for the PAI Business Dashboard.

---

## Architecture at a Glance

```
User Request: "Send follow-up to contacts I spoke with last week"
                              │
                              ▼
                    ┌──────────────────┐
                    │   Claude Agent   │
                    │   (PAI Core)     │
                    └──────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
            ▼                 ▼                 ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │  database-   │  │    ghl-      │  │  dashboard-  │
    │     mcp      │  │     mcp      │  │     mcp      │
    └──────────────┘  └──────────────┘  └──────────────┘
            │                 │                 │
            └────────┬────────┴────────┬────────┘
                     │                 │
                     ▼                 ▼
            ┌──────────────┐  ┌──────────────┐
            │notifications-│  │  GoHighLevel │
            │     mcp      │  │     API      │
            └──────────────┘  └──────────────┘
```

---

## Phase 1: Foundation Setup (Week 1)

### Day 1-2: Database Infrastructure

**Goal**: Set up PostgreSQL with complete schema and basic queries

**Tasks**:
1. Install PostgreSQL 15+
   ```bash
   docker run -d \
     --name pai-postgres \
     -e POSTGRES_DB=pai_dashboard \
     -e POSTGRES_PASSWORD=secure_password \
     -p 5432:5432 \
     -v pai_postgres_data:/var/lib/postgresql/data \
     postgres:15-alpine
   ```

2. Create database schema
   ```bash
   psql -h localhost -U postgres pai_dashboard < schema/contacts.sql
   psql -h localhost -U postgres pai_dashboard < schema/conversations.sql
   psql -h localhost -U postgres pai_dashboard < schema/sync_state.sql
   ```

3. Set up full-text search extensions
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_trgm;
   CREATE EXTENSION IF NOT EXISTS btree_gin;
   ```

4. Test basic queries
   ```sql
   -- Test contact search
   SELECT * FROM contacts
   WHERE search_vector @@ plainto_tsquery('english', 'john pricing');

   -- Test date range queries
   SELECT * FROM contacts
   WHERE last_contacted_at >= NOW() - INTERVAL '7 days';
   ```

**Deliverable**: Working PostgreSQL database with schema and test data

### Day 3-4: database-mcp Server (Node.js/TypeScript)

**Goal**: Build functional database MCP server with basic tools

**Project Structure**:
```
servers/database-mcp/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── database/
│   │   ├── client.ts         # PostgreSQL client
│   │   ├── queries.ts        # SQL queries
│   │   └── migrations.ts     # Schema migrations
│   ├── tools/
│   │   ├── query-contacts.ts
│   │   ├── full-text-search.ts
│   │   ├── get-analytics.ts
│   │   └── sync-entity.ts
│   ├── resources/
│   │   ├── contacts.ts
│   │   ├── conversations.ts
│   │   └── sync-status.ts
│   └── cache/
│       └── redis-client.ts
├── package.json
└── tsconfig.json
```

**Implementation Steps**:

1. Initialize project
   ```bash
   cd servers/database-mcp
   npm init -y
   npm install @modelcontextprotocol/sdk pg redis
   npm install -D @types/node @types/pg typescript ts-node
   ```

2. Create basic MCP server
   ```typescript
   // src/index.ts
   import { MCPServer } from '@modelcontextprotocol/sdk';
   import { DatabaseClient } from './database/client';

   const server = new MCPServer({
     name: 'database-mcp',
     version: '1.0.0',
     description: 'Local database for contacts and conversations'
   });

   const db = new DatabaseClient({
     host: process.env.DB_HOST || 'localhost',
     port: parseInt(process.env.DB_PORT || '5432'),
     database: 'pai_dashboard',
     user: 'postgres',
     password: process.env.DB_PASSWORD
   });

   // Register tools
   server.tool({
     name: 'query_contacts',
     description: 'Execute SQL query on contacts table',
     inputSchema: {
       type: 'object',
       properties: {
         sql: { type: 'string' },
         parameters: { type: 'array' },
         limit: { type: 'number', default: 100 }
       },
       required: ['sql']
     },
     handler: async (input) => {
       const results = await db.query(input.sql, input.parameters);
       return {
         contacts: results.rows.slice(0, input.limit),
         totalCount: results.rows.length
       };
     }
   });

   // Start server
   server.listen(3002);
   ```

3. Implement core tools
   - `query_contacts` - SQL queries with parameterization
   - `full_text_search` - PostgreSQL full-text search
   - `get_sync_status` - Check sync state
   - `upsert_contact` - Insert/update contact

4. Test with MCP client
   ```typescript
   // test/client-test.ts
   import { MCPClient } from '@modelcontextprotocol/sdk';

   const client = new MCPClient({
     url: 'http://localhost:3002'
   });

   // Test query_contacts
   const result = await client.callTool('query_contacts', {
     sql: 'SELECT * FROM contacts WHERE email LIKE ?',
     parameters: ['%@example.com'],
     limit: 10
   });

   console.log('Found contacts:', result.contacts.length);
   ```

**Deliverable**: Working database-mcp server with 4-5 core tools

### Day 5: Redis Caching Layer

**Goal**: Add caching for frequently accessed data

**Tasks**:
1. Set up Redis
   ```bash
   docker run -d \
     --name pai-redis \
     -p 6379:6379 \
     redis:7-alpine
   ```

2. Implement cache wrapper
   ```typescript
   // src/cache/manager.ts
   import Redis from 'redis';

   export class CacheManager {
     private client: Redis.RedisClient;

     async get<T>(key: string): Promise<T | null> {
       const cached = await this.client.get(key);
       return cached ? JSON.parse(cached) : null;
     }

     async set<T>(key: string, value: T, ttl: number): Promise<void> {
       await this.client.setex(key, ttl, JSON.stringify(value));
     }

     async invalidate(pattern: string): Promise<void> {
       const keys = await this.client.keys(pattern);
       if (keys.length > 0) {
         await this.client.del(...keys);
       }
     }
   }
   ```

3. Add caching to tools
   ```typescript
   // Wrap query with cache
   const cacheKey = `contacts:query:${hash(input.sql)}`;
   const cached = await cache.get(cacheKey);

   if (cached) {
     return { ...cached, cached: true };
   }

   const results = await db.query(input.sql, input.parameters);
   await cache.set(cacheKey, results, 300); // 5 minute TTL

   return { ...results, cached: false };
   ```

**Deliverable**: Caching integrated with database-mcp

---

## Phase 2: GoHighLevel Integration (Week 2)

### Day 6-7: GHL Authentication & API Client

**Goal**: Implement OAuth2 flow and authenticated API requests

**Tasks**:
1. Register GHL OAuth application
   - Go to GHL Agency Settings > OAuth Apps
   - Create new app with redirect URI
   - Save client ID and secret

2. Implement OAuth2 flow
   ```typescript
   // src/auth/ghl-oauth.ts
   import axios from 'axios';

   export class GHLAuth {
     private clientId: string;
     private clientSecret: string;
     private accessToken: string;
     private refreshToken: string;
     private expiresAt: Date;

     async authorize(code: string): Promise<void> {
       const response = await axios.post(
         'https://services.leadconnectorhq.com/oauth/token',
         {
           client_id: this.clientId,
           client_secret: this.clientSecret,
           grant_type: 'authorization_code',
           code: code
         }
       );

       this.accessToken = response.data.access_token;
       this.refreshToken = response.data.refresh_token;
       this.expiresAt = new Date(Date.now() + response.data.expires_in * 1000);
     }

     async getValidToken(): Promise<string> {
       if (Date.now() >= this.expiresAt.getTime()) {
         await this.refreshAccessToken();
       }
       return this.accessToken;
     }

     private async refreshAccessToken(): Promise<void> {
       const response = await axios.post(
         'https://services.leadconnectorhq.com/oauth/token',
         {
           client_id: this.clientId,
           client_secret: this.clientSecret,
           grant_type: 'refresh_token',
           refresh_token: this.refreshToken
         }
       );

       this.accessToken = response.data.access_token;
       this.refreshToken = response.data.refresh_token;
       this.expiresAt = new Date(Date.now() + response.data.expires_in * 1000);
     }
   }
   ```

3. Build API client
   ```typescript
   // src/api/ghl-client.ts
   import axios, { AxiosInstance } from 'axios';

   export class GHLClient {
     private client: AxiosInstance;
     private auth: GHLAuth;

     constructor(auth: GHLAuth) {
       this.auth = auth;
       this.client = axios.create({
         baseURL: 'https://services.leadconnectorhq.com',
         timeout: 30000
       });

       // Add auth interceptor
       this.client.interceptors.request.use(async (config) => {
         const token = await this.auth.getValidToken();
         config.headers.Authorization = `Bearer ${token}`;
         return config;
       });
     }

     async getContact(contactId: string) {
       const response = await this.client.get(`/contacts/${contactId}`);
       return response.data.contact;
     }

     async searchContacts(query: any) {
       const response = await this.client.post('/contacts/search', query);
       return response.data.contacts;
     }

     async sendMessage(data: any) {
       const response = await this.client.post('/conversations/messages', data);
       return response.data;
     }
   }
   ```

**Deliverable**: Authenticated GHL API client with token refresh

### Day 8-9: Rate Limiting & Request Queue

**Goal**: Implement robust rate limiting to stay within GHL API limits

**Tasks**:
1. Implement token bucket rate limiter
   ```typescript
   // src/rate-limit/token-bucket.ts
   export class TokenBucket {
     private tokens: number;
     private lastRefill: number;
     private readonly capacity: number;
     private readonly refillRate: number; // tokens per second

     constructor(capacity: number, refillRate: number) {
       this.capacity = capacity;
       this.refillRate = refillRate;
       this.tokens = capacity;
       this.lastRefill = Date.now();
     }

     async waitForToken(): Promise<void> {
       while (true) {
         this.refill();

         if (this.tokens >= 1) {
           this.tokens -= 1;
           return;
         }

         // Wait until next token available
         const waitTime = (1 - this.tokens) / this.refillRate * 1000;
         await new Promise(resolve => setTimeout(resolve, waitTime));
       }
     }

     private refill(): void {
       const now = Date.now();
       const timePassed = (now - this.lastRefill) / 1000;
       const tokensToAdd = timePassed * this.refillRate;

       this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
       this.lastRefill = now;
     }
   }
   ```

2. Build request queue
   ```typescript
   // src/rate-limit/queue.ts
   import PQueue from 'p-queue';

   export class RequestQueue {
     private queue: PQueue;
     private rateLimiter: TokenBucket;

     constructor() {
       this.queue = new PQueue({
         concurrency: 5, // max concurrent requests
         interval: 1000, // per second
         intervalCap: 10 // max 10 requests per second
       });

       this.rateLimiter = new TokenBucket(20, 10); // 10 req/sec, burst 20
     }

     async execute<T>(fn: () => Promise<T>): Promise<T> {
       return this.queue.add(async () => {
         await this.rateLimiter.waitForToken();
         return fn();
       });
     }
   }
   ```

3. Integrate with API client
   ```typescript
   // Add to GHLClient
   private queue = new RequestQueue();

   async getContact(contactId: string) {
     return this.queue.execute(async () => {
       const response = await this.client.get(`/contacts/${contactId}`);
       return response.data.contact;
     });
   }
   ```

**Deliverable**: Rate-limited GHL API client with request queue

### Day 10: ghl-mcp Server Implementation

**Goal**: Build ghl-mcp server with core tools

**Tasks**:
1. Create MCP server structure
   ```typescript
   // servers/ghl-mcp/src/index.ts
   import { MCPServer } from '@modelcontextprotocol/sdk';
   import { GHLClient } from './api/ghl-client';

   const server = new MCPServer({
     name: 'ghl-mcp',
     version: '1.0.0',
     description: 'GoHighLevel API integration'
   });

   const ghlClient = new GHLClient(authConfig);

   // Register tools
   server.tool({
     name: 'send_message',
     description: 'Send message to contact via SMS/Email',
     inputSchema: { /* ... */ },
     handler: async (input) => {
       return ghlClient.sendMessage(input);
     }
   });

   server.tool({
     name: 'search_contacts',
     description: 'Search contacts with filters',
     inputSchema: { /* ... */ },
     handler: async (input) => {
       return ghlClient.searchContacts(input);
     }
   });

   server.listen(3001);
   ```

2. Implement 6-8 core tools:
   - send_message
   - search_contacts
   - create_contact
   - update_contact
   - get_conversation_history
   - update_opportunity
   - create_appointment

3. Add error handling
   ```typescript
   async handler(input) {
     try {
       return await ghlClient.sendMessage(input);
     } catch (error) {
       if (error.response?.status === 429) {
         // Rate limited - queue will retry
         throw new MCPError('RATE_LIMITED', 'Too many requests', true);
       } else if (error.response?.status === 404) {
         throw new MCPError('NOT_FOUND', 'Contact not found', false);
       }
       throw error;
     }
   }
   ```

**Deliverable**: Working ghl-mcp server with core tools

---

## Phase 3: Real-time Events (Week 3)

### Day 11-12: Webhook Endpoint

**Goal**: Receive and process GHL webhooks

**Tasks**:
1. Create webhook server
   ```typescript
   // servers/notifications-mcp/src/webhook/server.ts
   import express from 'express';
   import crypto from 'crypto';

   const app = express();

   app.post('/webhooks/ghl', express.json(), async (req, res) => {
     // Verify webhook signature
     const signature = req.headers['x-ghl-signature'];
     const isValid = verifySignature(req.body, signature);

     if (!isValid) {
       return res.status(401).send('Invalid signature');
     }

     // Process event
     const event = req.body;
     await eventProcessor.process(event);

     res.status(200).send('OK');
   });

   function verifySignature(payload: any, signature: string): boolean {
     const hmac = crypto.createHmac('sha256', process.env.GHL_WEBHOOK_SECRET);
     hmac.update(JSON.stringify(payload));
     const expectedSignature = hmac.digest('hex');
     return signature === expectedSignature;
   }

   app.listen(8080, () => {
     console.log('Webhook server listening on port 8080');
   });
   ```

2. Implement event processor
   ```typescript
   // src/webhook/processor.ts
   export class EventProcessor {
     async process(event: GHLEvent): Promise<void> {
       // Store in database
       await this.storeEvent(event);

       // Trigger subscribed handlers
       const handlers = this.getHandlers(event.type);
       await Promise.all(handlers.map(h => h(event)));

       // Update related entities in database-mcp
       await this.syncRelatedData(event);

       // Emit to WebSocket clients
       this.broadcastEvent(event);
     }

     private async syncRelatedData(event: GHLEvent): Promise<void> {
       if (event.type === 'message.received') {
         // Update conversation in database
         await databaseMCP.syncConversation(event.data.conversationId);
       } else if (event.type === 'contact.updated') {
         // Update contact in database
         await databaseMCP.upsertContact(event.data.contact);
       }
     }
   }
   ```

3. Configure webhooks in GHL
   ```typescript
   // scripts/setup-webhooks.ts
   async function setupWebhooks() {
     const webhooks = [
       { type: 'ContactCreate', url: 'https://your-domain.com/webhooks/ghl' },
       { type: 'ContactUpdate', url: 'https://your-domain.com/webhooks/ghl' },
       { type: 'MessageReceived', url: 'https://your-domain.com/webhooks/ghl' },
       { type: 'MessageSent', url: 'https://your-domain.com/webhooks/ghl' },
       { type: 'OpportunityStageChange', url: 'https://your-domain.com/webhooks/ghl' }
     ];

     for (const webhook of webhooks) {
       await ghlClient.createWebhook(webhook);
     }
   }
   ```

**Deliverable**: Webhook endpoint receiving GHL events

### Day 13-14: WebSocket Connection

**Goal**: Maintain real-time WebSocket connection to GHL

**Tasks**:
1. Implement WebSocket client
   ```typescript
   // src/websocket/ghl-ws.ts
   import WebSocket from 'ws';

   export class GHLWebSocketClient {
     private ws: WebSocket | null = null;
     private reconnectAttempts = 0;
     private maxReconnectAttempts = 10;
     private heartbeatInterval: NodeJS.Timeout;

     async connect(): Promise<void> {
       const token = await this.auth.getValidToken();

       this.ws = new WebSocket(
         `wss://services.leadconnectorhq.com/conversations/stream?token=${token}`
       );

       this.ws.on('open', () => {
         console.log('WebSocket connected');
         this.reconnectAttempts = 0;
         this.startHeartbeat();
       });

       this.ws.on('message', (data) => {
         const event = JSON.parse(data.toString());
         this.handleEvent(event);
       });

       this.ws.on('close', () => {
         console.log('WebSocket closed');
         this.stopHeartbeat();
         this.reconnect();
       });

       this.ws.on('error', (error) => {
         console.error('WebSocket error:', error);
       });
     }

     private startHeartbeat(): void {
       this.heartbeatInterval = setInterval(() => {
         if (this.ws?.readyState === WebSocket.OPEN) {
           this.ws.ping();
         }
       }, 30000); // ping every 30 seconds
     }

     private async reconnect(): Promise<void> {
       if (this.reconnectAttempts >= this.maxReconnectAttempts) {
         console.error('Max reconnect attempts reached');
         return;
       }

       const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
       console.log(`Reconnecting in ${delay}ms...`);

       await new Promise(resolve => setTimeout(resolve, delay));

       this.reconnectAttempts++;
       await this.connect();
     }

     private async handleEvent(event: any): Promise<void> {
       // Process event same as webhook
       await eventProcessor.process(event);
     }
   }
   ```

2. Start WebSocket on server startup
   ```typescript
   // src/index.ts
   const wsClient = new GHLWebSocketClient(authConfig);
   await wsClient.connect();
   ```

**Deliverable**: Real-time WebSocket connection handling GHL events

### Day 15: notifications-mcp Server

**Goal**: Complete notifications-mcp with subscription management

**Tasks**:
1. Implement MCP server
   ```typescript
   // src/index.ts
   const server = new MCPServer({
     name: 'notifications-mcp',
     version: '1.0.0',
     description: 'Real-time event streaming'
   });

   // Store event subscriptions
   const subscriptions = new Map<string, EventSubscription>();

   server.tool({
     name: 'subscribe_to_events',
     description: 'Subscribe to real-time events',
     inputSchema: { /* ... */ },
     handler: async (input) => {
       const subId = generateId();

       subscriptions.set(subId, {
         eventTypes: input.eventTypes,
         filters: input.filters,
         handler: input.handler
       });

       return { subscriptionId: subId };
     }
   });

   server.tool({
     name: 'get_recent_events',
     description: 'Get recent events from history',
     inputSchema: { /* ... */ },
     handler: async (input) => {
       return eventStore.query(input);
     }
   });

   server.listen(3004);
   ```

2. Test end-to-end event flow
   ```typescript
   // Send test message via ghl-mcp
   await ghlMCP.sendMessage({
     contactId: 'test_contact',
     message: 'Test',
     channel: 'sms'
   });

   // Should receive 'message.sent' event via notifications-mcp
   const events = await notificationsMCP.getRecentEvents({
     eventTypes: ['message.sent'],
     since: new Date().toISOString()
   });

   expect(events.length).toBeGreaterThan(0);
   ```

**Deliverable**: Complete notifications-mcp with event subscription

---

## Phase 4: Dashboard Integration (Week 4)

### Day 16-17: Dashboard State Tracking

**Goal**: Track dashboard UI state in real-time

**Tasks**:
1. Create dashboard state manager
   ```typescript
   // servers/dashboard-mcp/src/state/manager.ts
   export class DashboardStateManager {
     private currentState: ViewState;

     constructor() {
       this.currentState = {
         page: 'contacts',
         filters: { active: false, criteria: {} },
         visibleElements: [],
         notifications: []
       };
     }

     // Called when UI updates
     updateState(update: Partial<ViewState>): void {
       this.currentState = { ...this.currentState, ...update };
       this.emit('state:changed', this.currentState);
     }

     getCurrentState(): ViewState {
       return this.currentState;
     }

     // Get specific view data
     async getContactListView(): Promise<ContactListView> {
       // Query visible contacts from database
       const contacts = await this.getVisibleContacts();
       return {
         contacts,
         filters: this.currentState.filters,
         sortOrder: this.currentState.sortOrder,
         selectedIds: this.currentState.selectedIds
       };
     }
   }
   ```

2. Integrate with web dashboard
   ```typescript
   // In your React/Vue dashboard
   import { dashboardMCP } from './mcp-client';

   // Update state when page changes
   useEffect(() => {
     dashboardMCP.updateState({
       page: 'contacts',
       filters: activeFilters,
       visibleElements: getVisibleElements()
     });
   }, [page, activeFilters]);

   // Report contact selection
   function handleContactSelect(contactIds: string[]) {
     dashboardMCP.updateState({
       selectedIds: contactIds
     });
   }
   ```

**Deliverable**: Dashboard state tracked in real-time

### Day 18-19: Dashboard Control Tools

**Goal**: Implement tools for AI to control dashboard

**Tasks**:
1. Implement navigation tool
   ```typescript
   server.tool({
     name: 'navigate_to',
     description: 'Navigate to specific page',
     inputSchema: { /* ... */ },
     handler: async (input) => {
       // Send navigation command to dashboard
       await dashboardClient.navigate({
         page: input.page,
         params: input.params
       });

       // Wait for navigation to complete
       await waitForState(state => state.page === input.page);

       return {
         success: true,
         currentPage: input.page
       };
     }
   });
   ```

2. Implement filter tool
   ```typescript
   server.tool({
     name: 'apply_filter',
     description: 'Apply filter to current view',
     inputSchema: { /* ... */ },
     handler: async (input) => {
       await dashboardClient.applyFilter(input);

       // Wait for filter to apply
       await waitForState(state =>
         state.filters.active && state.filters.criteria === input.criteria
       );

       const view = await stateManager.getContactListView();

       return {
         success: true,
         filteredCount: view.contacts.length,
         filters: view.filters
       };
     }
   });
   ```

3. Implement compose message tool
   ```typescript
   server.tool({
     name: 'compose_message',
     description: 'Open message composer',
     inputSchema: { /* ... */ },
     handler: async (input) => {
       await dashboardClient.openComposer({
         contactId: input.contactId,
         channel: input.channel,
         content: input.content
       });

       if (input.autoSend && input.requireConfirmation) {
         // Show confirmation dialog
         const confirmed = await dashboardClient.confirm({
           title: 'Send message?',
           message: `Send to ${contactName}: "${input.content}"`,
           confirmText: 'Send',
           cancelText: 'Cancel'
         });

         if (confirmed) {
           await dashboardClient.sendMessage();
           return { success: true, sent: true };
         }
       }

       return { success: true, sent: false };
     }
   });
   ```

**Deliverable**: AI can control dashboard navigation and actions

### Day 20: Dashboard Resources

**Goal**: Expose dashboard state as MCP resources

**Tasks**:
1. Implement resource endpoints
   ```typescript
   server.resource({
     uri: 'dashboard://view/current',
     name: 'Current Dashboard View',
     description: 'Current page and state',
     mimeType: 'application/json',
     handler: async () => {
       const state = stateManager.getCurrentState();
       return {
         text: JSON.stringify(state, null, 2)
       };
     }
   });

   server.resource({
     uri: 'dashboard://view/contacts',
     name: 'Contact List View',
     description: 'Currently visible contacts',
     mimeType: 'application/json',
     handler: async () => {
       const view = await stateManager.getContactListView();
       return {
         text: JSON.stringify(view, null, 2)
       };
     }
   });
   ```

2. Test AI can "see" dashboard
   ```typescript
   // Test AI query
   const currentView = await mcp.getResource('dashboard://view/current');
   console.log('AI sees:', JSON.parse(currentView.text));

   // AI can check what's visible
   const contactView = await mcp.getResource('dashboard://view/contacts');
   const visible = JSON.parse(contactView.text);
   console.log(`${visible.contacts.length} contacts visible`);
   ```

**Deliverable**: Dashboard state exposed as MCP resources

---

## Phase 5: AI Integration (Week 5)

### Day 21-22: MCP Configuration

**Goal**: Connect all MCPs to Claude

**Tasks**:
1. Create MCP configuration
   ```json
   // .pai/config/mcp-servers.json
   {
     "servers": {
       "database-mcp": {
         "type": "http",
         "url": "http://localhost:3002",
         "description": "Local database operations"
       },
       "ghl-mcp": {
         "type": "http",
         "url": "http://localhost:3001",
         "description": "GoHighLevel API"
       },
       "dashboard-mcp": {
         "type": "http",
         "url": "http://localhost:3003",
         "description": "Dashboard control"
       },
       "notifications-mcp": {
         "type": "http",
         "url": "http://localhost:3004",
         "description": "Real-time events"
       }
     }
   }
   ```

2. Test each MCP individually
   ```bash
   # Test database-mcp
   curl -X POST http://localhost:3002/tools/query_contacts \
     -H "Content-Type: application/json" \
     -d '{"sql": "SELECT * FROM contacts LIMIT 5"}'

   # Test ghl-mcp
   curl -X POST http://localhost:3001/tools/search_contacts \
     -H "Content-Type: application/json" \
     -d '{"query": "john"}'

   # Test dashboard-mcp
   curl http://localhost:3003/resources/dashboard://view/current

   # Test notifications-mcp
   curl -X POST http://localhost:3004/tools/get_recent_events \
     -H "Content-Type: application/json" \
     -d '{"eventTypes": ["message.received"], "limit": 10}'
   ```

3. Connect to Claude
   ```typescript
   // Initialize Claude with MCP servers
   import Anthropic from '@anthropic-ai/sdk';

   const client = new Anthropic({
     apiKey: process.env.ANTHROPIC_API_KEY
   });

   const response = await client.messages.create({
     model: 'claude-sonnet-4.5',
     max_tokens: 8096,
     messages: [{
       role: 'user',
       content: 'List all contacts in the database'
     }],
     tools: [
       // MCP tools automatically registered
     ]
   });
   ```

**Deliverable**: All MCPs connected to Claude

### Day 23-24: Workflow Orchestration

**Goal**: Implement complex multi-step workflows

**Tasks**:
1. Create workflow engine
   ```typescript
   // src/workflows/engine.ts
   export class WorkflowEngine {
     async executeWorkflow(workflow: Workflow): Promise<WorkflowResult> {
       const context = { data: {}, errors: [] };

       for (const step of workflow.steps) {
         try {
           const result = await this.executeStep(step, context);
           context.data[step.name] = result;
         } catch (error) {
           context.errors.push({ step: step.name, error });

           if (step.continueOnError) {
             continue;
           } else {
             throw new WorkflowError(`Failed at step: ${step.name}`, context);
           }
         }
       }

       return {
         success: context.errors.length === 0,
         data: context.data,
         errors: context.errors
       };
     }

     private async executeStep(step: WorkflowStep, context: any): Promise<any> {
       // Resolve dependencies
       const inputs = this.resolveInputs(step.inputs, context);

       // Execute MCP tool
       const result = await mcp.callTool(step.tool, inputs);

       return result;
     }
   }
   ```

2. Define follow-up workflow
   ```typescript
   // workflows/follow-up.ts
   export const followUpWorkflow: Workflow = {
     name: 'send_follow_up',
     steps: [
       {
         name: 'query_contacts',
         tool: 'database-mcp:query_contacts',
         inputs: {
           sql: `
             SELECT * FROM contacts
             WHERE last_contacted_at >= ?
             AND last_contacted_at < ?
           `,
           parameters: ['{{params.startDate}}', '{{params.endDate}}']
         }
       },
       {
         name: 'get_history',
         tool: 'database-mcp:get_conversation_analytics',
         inputs: {
           contactId: '{{steps.query_contacts.contacts[*].id}}',
           dateRange: {
             start: '{{params.startDate}}',
             end: '{{params.endDate}}'
           }
         }
       },
       {
         name: 'generate_messages',
         tool: 'ai:generate_follow_up',
         inputs: {
           contacts: '{{steps.query_contacts.contacts}}',
           history: '{{steps.get_history.analytics}}'
         }
       },
       {
         name: 'send_messages',
         tool: 'ghl-mcp:send_message',
         inputs: '{{steps.generate_messages.messages}}',
         parallel: true
       },
       {
         name: 'log_campaign',
         tool: 'database-mcp:log_ai_action',
         inputs: {
           actionType: 'follow_up_campaign',
           result: '{{steps.send_messages}}'
         }
       }
     ]
   };
   ```

3. Execute workflows via Claude
   ```typescript
   // Claude automatically orchestrates workflow
   const response = await client.messages.create({
     model: 'claude-sonnet-4.5',
     messages: [{
       role: 'user',
       content: 'Send follow-up to contacts I spoke with last week'
     }],
     tools: [/* MCP tools */]
   });

   // Claude will:
   // 1. Query database for contacts
   // 2. Get conversation history
   // 3. Generate personalized messages
   // 4. Send via GHL
   // 5. Log actions
   ```

**Deliverable**: Complex workflows executing automatically

### Day 25: Testing & Debugging

**Goal**: Comprehensive testing of AI interactions

**Tasks**:
1. Test basic queries
   ```typescript
   // Test 1: Simple contact lookup
   const result1 = await askClaude('Find contacts with "urgent" tag');

   // Test 2: Complex search
   const result2 = await askClaude(
     'Show me contacts I talked to last week who mentioned pricing'
   );

   // Test 3: Action execution
   const result3 = await askClaude(
     'Send "Thanks for your time" to john@example.com'
   );
   ```

2. Test error handling
   ```typescript
   // Test error recovery
   const result = await askClaude('Send message to invalid_contact_id');
   expect(result).toContain('Contact not found');

   // Test rate limiting
   const promises = Array(100).fill(null).map(() =>
     askClaude('Get contact count')
   );
   const results = await Promise.allSettled(promises);
   // All should complete eventually
   ```

3. Test complex workflows
   ```typescript
   // Test full follow-up workflow
   const result = await askClaude(
     'Send follow-up to all contacts I spoke with last week about the pricing discussion'
   );

   // Verify execution
   expect(result).toContain('sent');
   expect(result).toContain('contacts');

   // Verify in database
   const actions = await db.query(
     'SELECT * FROM ai_actions WHERE action_type = ?',
     ['follow_up_campaign']
   );
   expect(actions.length).toBeGreaterThan(0);
   ```

**Deliverable**: Comprehensive test suite passing

---

## Phase 6: Production Hardening (Week 6-7)

### Week 6: Error Handling & Monitoring

**Tasks**:
1. Implement comprehensive error handling
2. Add structured logging (winston/pino)
3. Set up monitoring (Prometheus/Grafana)
4. Add health check endpoints
5. Implement circuit breakers

**Deliverables**:
- Error handling covers all edge cases
- Logs structured and searchable
- Monitoring dashboards operational
- Alerts configured for critical issues

### Week 7: Security & Performance

**Tasks**:
1. Security audit (SQL injection, XSS, CSRF)
2. Implement rate limiting for API endpoints
3. Add request/response encryption
4. Performance optimization (caching, queries, indexes)
5. Load testing (k6 or Artillery)

**Deliverables**:
- Security vulnerabilities addressed
- Performance benchmarks met
- Load test results documented
- Production deployment plan

---

## Success Metrics

### Phase 1 (Foundation)
- ✅ Database schema created
- ✅ database-mcp serving resources
- ✅ Query response < 100ms for simple queries
- ✅ Caching working (90%+ hit rate)

### Phase 2 (GHL Integration)
- ✅ OAuth flow working
- ✅ Rate limiting preventing 429 errors
- ✅ All core tools implemented
- ✅ 99%+ API success rate

### Phase 3 (Real-time Events)
- ✅ Webhooks receiving events
- ✅ WebSocket maintaining connection
- ✅ Events processed < 1 second
- ✅ Zero event loss

### Phase 4 (Dashboard)
- ✅ UI state synchronized
- ✅ AI can navigate dashboard
- ✅ Resources updating in real-time
- ✅ User actions reflected instantly

### Phase 5 (AI Integration)
- ✅ Claude can query all MCPs
- ✅ Complex workflows executing
- ✅ 95%+ tool call success rate
- ✅ Response time < 5 seconds

### Phase 6 (Production)
- ✅ 99.9% uptime SLA
- ✅ < 0.1% error rate
- ✅ Security audit passed
- ✅ Load test: 100 concurrent users

---

## Quick Reference Commands

### Start All Services
```bash
docker-compose up -d
```

### Test Individual MCPs
```bash
# database-mcp
curl http://localhost:3002/resources/db://sync/status

# ghl-mcp
curl http://localhost:3001/resources/ghl://contacts/list

# dashboard-mcp
curl http://localhost:3003/resources/dashboard://view/current

# notifications-mcp
curl http://localhost:3004/resources/notifications://stream/live
```

### Monitor Logs
```bash
docker-compose logs -f ghl-mcp
docker-compose logs -f database-mcp
docker-compose logs -f notifications-mcp
```

### Database Operations
```bash
# Connect to PostgreSQL
docker exec -it pai-postgres psql -U postgres pai_dashboard

# Run migrations
npm run migrate

# Seed test data
npm run seed
```

### Debugging
```bash
# Check MCP health
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
curl http://localhost:3004/health

# View metrics
curl http://localhost:3001/metrics

# Check rate limiter status
curl http://localhost:3001/debug/rate-limit
```

---

## Common Issues & Solutions

### Issue: Rate Limiting Errors
**Solution**: Adjust token bucket parameters in config
```typescript
rateLimiter: {
  requestsPerSecond: 5, // reduce from 10
  burstSize: 10 // reduce from 20
}
```

### Issue: Webhook Events Missing
**Solution**: Verify webhook configuration in GHL
```bash
node scripts/verify-webhooks.js
```

### Issue: Database Sync Lag
**Solution**: Increase sync frequency or implement incremental sync
```typescript
syncInterval: 30, // reduce from 60 seconds
```

### Issue: WebSocket Disconnecting
**Solution**: Check heartbeat interval and implement reconnection backoff
```typescript
heartbeatInterval: 15000, // reduce from 30000
maxReconnectAttempts: 20 // increase from 10
```

---

## Next Steps After Implementation

1. **User Training**: Create documentation for end users
2. **Workflow Library**: Build common workflow templates
3. **Analytics Dashboard**: Visualize AI actions and results
4. **A/B Testing**: Test different message strategies
5. **Scaling**: Implement horizontal scaling for high load
6. **Advanced Features**:
   - Sentiment analysis on conversations
   - Predictive lead scoring
   - Automated appointment scheduling
   - Smart contact segmentation
   - Revenue forecasting

---

This roadmap provides a practical, day-by-day implementation plan. Adjust timelines based on team size and complexity. Start with Phase 1 and iterate - each phase builds on the previous one but can be tested independently.
