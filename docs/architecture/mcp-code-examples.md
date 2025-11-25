# MCP Business Dashboard - Code Examples & API Specifications

## Complete Code Examples for Each MCP Server

This document provides production-ready code examples for implementing the MCP server ecosystem.

---

## 1. database-mcp Complete Implementation

### Project Structure
```
servers/database-mcp/
├── src/
│   ├── index.ts
│   ├── server.ts
│   ├── database/
│   │   ├── client.ts
│   │   ├── migrations/
│   │   │   ├── 001_contacts.sql
│   │   │   ├── 002_conversations.sql
│   │   │   └── 003_sync_state.sql
│   │   └── queries/
│   │       ├── contacts.ts
│   │       ├── conversations.ts
│   │       └── analytics.ts
│   ├── tools/
│   │   ├── query-contacts.ts
│   │   ├── full-text-search.ts
│   │   ├── get-analytics.ts
│   │   ├── sync-entity.ts
│   │   └── log-action.ts
│   ├── resources/
│   │   ├── contacts.ts
│   │   ├── conversations.ts
│   │   └── sync-status.ts
│   ├── cache/
│   │   └── redis.ts
│   └── types/
│       └── index.ts
├── package.json
├── tsconfig.json
└── .env
```

### Main Server Implementation

```typescript
// src/index.ts
import { MCPServer } from '@modelcontextprotocol/sdk';
import { DatabaseClient } from './database/client';
import { CacheManager } from './cache/redis';
import { registerTools } from './tools';
import { registerResources } from './resources';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  // Initialize database connection
  const db = new DatabaseClient({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'pai_dashboard',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: 20, // connection pool size
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
  });

  await db.connect();
  console.log('✓ Database connected');

  // Initialize cache
  const cache = new CacheManager({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379')
  });

  await cache.connect();
  console.log('✓ Redis cache connected');

  // Create MCP server
  const server = new MCPServer({
    name: 'database-mcp',
    version: '1.0.0',
    description: 'Local database for contacts, conversations, and sync management'
  });

  // Register tools and resources
  registerTools(server, db, cache);
  registerResources(server, db, cache);

  // Health check endpoint
  server.addHealthCheck(async () => {
    const dbHealthy = await db.isHealthy();
    const cacheHealthy = await cache.isHealthy();

    return {
      status: dbHealthy && cacheHealthy ? 'healthy' : 'unhealthy',
      services: {
        database: dbHealthy ? 'up' : 'down',
        cache: cacheHealthy ? 'up' : 'down'
      }
    };
  });

  // Start server
  const port = parseInt(process.env.PORT || '3002');
  await server.listen(port);

  console.log(`✓ database-mcp server running on port ${port}`);
  console.log('Tools available:', server.getTools().map(t => t.name));
  console.log('Resources available:', server.getResources().map(r => r.uri));
}

main().catch(console.error);
```

### Database Client

```typescript
// src/database/client.ts
import { Pool, PoolClient, QueryResult } from 'pg';
import { Contact, Conversation, Message } from '../types';

export class DatabaseClient {
  private pool: Pool;

  constructor(config: any) {
    this.pool = new Pool(config);
  }

  async connect(): Promise<void> {
    // Test connection
    const client = await this.pool.connect();
    client.release();
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    const start = Date.now();

    try {
      const result = await this.pool.query<T>(sql, params);
      const duration = Date.now() - start;

      // Log slow queries
      if (duration > 1000) {
        console.warn(`Slow query (${duration}ms): ${sql.substring(0, 100)}...`);
      }

      return result;
    } catch (error) {
      console.error('Query error:', error);
      throw error;
    }
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Contact queries
  async getContact(contactId: string): Promise<Contact | null> {
    const result = await this.query<Contact>(
      'SELECT * FROM contacts WHERE id = $1',
      [contactId]
    );
    return result.rows[0] || null;
  }

  async searchContacts(query: string, limit: number = 50): Promise<Contact[]> {
    const result = await this.query<Contact>(
      `SELECT *, ts_rank(search_vector, plainto_tsquery('english', $1)) as rank
       FROM contacts
       WHERE search_vector @@ plainto_tsquery('english', $1)
       ORDER BY rank DESC
       LIMIT $2`,
      [query, limit]
    );
    return result.rows;
  }

  async upsertContact(contact: Partial<Contact>): Promise<Contact> {
    const result = await this.query<Contact>(
      `INSERT INTO contacts (
        id, ghl_id, first_name, last_name, email, phone, tags,
        custom_fields, source, assigned_to, pipeline_stage,
        created_at, updated_at, last_contacted_at, search_vector
      ) VALUES (
        COALESCE($1, gen_random_uuid()),
        $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
        COALESCE($12, NOW()), NOW(), $13,
        to_tsvector('english', COALESCE($3, '') || ' ' || COALESCE($4, '') || ' ' || COALESCE($5, ''))
      )
      ON CONFLICT (ghl_id) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        tags = EXCLUDED.tags,
        custom_fields = EXCLUDED.custom_fields,
        assigned_to = EXCLUDED.assigned_to,
        pipeline_stage = EXCLUDED.pipeline_stage,
        updated_at = NOW(),
        last_contacted_at = COALESCE(EXCLUDED.last_contacted_at, contacts.last_contacted_at),
        search_vector = to_tsvector('english',
          COALESCE(EXCLUDED.first_name, '') || ' ' ||
          COALESCE(EXCLUDED.last_name, '') || ' ' ||
          COALESCE(EXCLUDED.email, '')
        )
      RETURNING *`,
      [
        contact.id,
        contact.ghl_id,
        contact.first_name,
        contact.last_name,
        contact.email,
        contact.phone,
        JSON.stringify(contact.tags || []),
        JSON.stringify(contact.custom_fields || {}),
        contact.source,
        contact.assigned_to,
        contact.pipeline_stage,
        contact.created_at,
        contact.last_contacted_at
      ]
    );

    return result.rows[0];
  }

  // Conversation queries
  async getConversationHistory(
    contactId: string,
    since?: Date,
    limit: number = 100
  ): Promise<Message[]> {
    const result = await this.query<Message>(
      `SELECT m.*
       FROM messages m
       JOIN conversations c ON c.id = m.conversation_id
       WHERE c.contact_id = $1
         AND ($2::timestamp IS NULL OR m.sent_at >= $2)
       ORDER BY m.sent_at DESC
       LIMIT $3`,
      [contactId, since, limit]
    );

    return result.rows;
  }

  // Analytics queries
  async getConversationAnalytics(params: {
    contactId?: string;
    dateRange?: { start: Date; end: Date };
    groupBy?: string;
  }): Promise<any> {
    let sql = `
      SELECT
        DATE_TRUNC($1, m.sent_at) as date,
        COUNT(*) as message_count,
        COUNT(*) FILTER (WHERE m.direction = 'inbound') as inbound_count,
        COUNT(*) FILTER (WHERE m.direction = 'outbound') as outbound_count,
        m.channel,
        AVG(EXTRACT(EPOCH FROM (
          SELECT MIN(m2.sent_at) - m.sent_at
          FROM messages m2
          WHERE m2.conversation_id = m.conversation_id
            AND m2.direction = 'outbound'
            AND m2.sent_at > m.sent_at
        ))) as avg_response_time
      FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      WHERE 1=1
    `;

    const queryParams: any[] = [params.groupBy || 'day'];

    if (params.contactId) {
      sql += ' AND c.contact_id = $' + (queryParams.length + 1);
      queryParams.push(params.contactId);
    }

    if (params.dateRange) {
      sql += ' AND m.sent_at >= $' + (queryParams.length + 1);
      queryParams.push(params.dateRange.start);
      sql += ' AND m.sent_at <= $' + (queryParams.length + 1);
      queryParams.push(params.dateRange.end);
    }

    sql += ' GROUP BY date, m.channel ORDER BY date DESC';

    const result = await this.query(sql, queryParams);
    return result.rows;
  }

  // Sync state management
  async getSyncState(entityType: string): Promise<any> {
    const result = await this.query(
      'SELECT * FROM sync_state WHERE entity_type = $1',
      [entityType]
    );
    return result.rows[0] || null;
  }

  async updateSyncState(entityType: string, state: any): Promise<void> {
    await this.query(
      `INSERT INTO sync_state (entity_type, last_sync_at, status, cursor, records_synced, metadata)
       VALUES ($1, NOW(), $2, $3, $4, $5)
       ON CONFLICT (entity_type) DO UPDATE SET
         last_sync_at = NOW(),
         last_successful_sync_at = CASE WHEN $2 = 'completed' THEN NOW() ELSE sync_state.last_successful_sync_at END,
         status = $2,
         cursor = $3,
         records_synced = sync_state.records_synced + $4,
         metadata = $5`,
      [
        entityType,
        state.status,
        state.cursor,
        state.recordsSynced || 0,
        JSON.stringify(state.metadata || {})
      ]
    );
  }

  // Health check
  async isHealthy(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
```

### Cache Manager

```typescript
// src/cache/redis.ts
import { createClient, RedisClientType } from 'redis';
import { createHash } from 'crypto';

export class CacheManager {
  private client: RedisClientType;
  private connected: boolean = false;

  constructor(config: { host: string; port: number }) {
    this.client = createClient({
      socket: {
        host: config.host,
        port: config.port
      }
    });

    this.client.on('error', (err) => {
      console.error('Redis error:', err);
    });
  }

  async connect(): Promise<void> {
    await this.client.connect();
    this.connected = true;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.connected) return null;

    try {
      const cached = await this.client.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl: number = 300): Promise<void> {
    if (!this.connected) return;

    try {
      await this.client.setEx(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async invalidate(pattern: string): Promise<void> {
    if (!this.connected) return;

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch (error) {
      console.error('Cache invalidate error:', error);
    }
  }

  hashKey(data: any): string {
    return createHash('md5').update(JSON.stringify(data)).digest('hex');
  }

  async isHealthy(): Promise<boolean> {
    if (!this.connected) return false;

    try {
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    await this.client.quit();
    this.connected = false;
  }
}
```

### Tool: query_contacts

```typescript
// src/tools/query-contacts.ts
import { Tool } from '@modelcontextprotocol/sdk';
import { DatabaseClient } from '../database/client';
import { CacheManager } from '../cache/redis';

export function createQueryContactsTool(
  db: DatabaseClient,
  cache: CacheManager
): Tool {
  return {
    name: 'query_contacts',
    description: 'Execute SQL query on contacts table with caching',
    inputSchema: {
      type: 'object',
      properties: {
        sql: {
          type: 'string',
          description: 'SQL query (SELECT only, use $1, $2 for parameters)'
        },
        parameters: {
          type: 'array',
          description: 'Query parameters for prepared statement',
          items: { type: ['string', 'number', 'boolean'] }
        },
        limit: {
          type: 'number',
          default: 100,
          description: 'Maximum number of results'
        },
        useCache: {
          type: 'boolean',
          default: true,
          description: 'Use cached results if available'
        }
      },
      required: ['sql']
    },

    async handler(input: any) {
      const startTime = Date.now();

      // Validate SQL (prevent non-SELECT queries)
      const sqlLower = input.sql.trim().toLowerCase();
      if (!sqlLower.startsWith('select')) {
        throw new Error('Only SELECT queries are allowed');
      }

      // Check for dangerous keywords
      const dangerous = ['drop', 'truncate', 'delete', 'update', 'insert'];
      if (dangerous.some(keyword => sqlLower.includes(keyword))) {
        throw new Error('Query contains forbidden keywords');
      }

      // Generate cache key
      const cacheKey = `query:${cache.hashKey({
        sql: input.sql,
        params: input.parameters
      })}`;

      // Try cache first
      if (input.useCache !== false) {
        const cached = await cache.get(cacheKey);
        if (cached) {
          return {
            ...cached,
            cached: true,
            executionTime: Date.now() - startTime
          };
        }
      }

      // Execute query
      const result = await db.query(input.sql, input.parameters || []);

      const response = {
        contacts: result.rows.slice(0, input.limit),
        totalCount: result.rows.length,
        query: {
          sql: input.sql,
          parameters: input.parameters
        },
        cached: false,
        executionTime: Date.now() - startTime
      };

      // Cache result (5 minute TTL)
      await cache.set(cacheKey, response, 300);

      return response;
    }
  };
}
```

### Tool: full_text_search

```typescript
// src/tools/full-text-search.ts
import { Tool } from '@modelcontextprotocol/sdk';
import { DatabaseClient } from '../database/client';

export function createFullTextSearchTool(db: DatabaseClient): Tool {
  return {
    name: 'full_text_search',
    description: 'Search contacts and messages using PostgreSQL full-text search',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (supports & for AND, | for OR, ! for NOT)'
        },
        entities: {
          type: 'array',
          items: { type: 'string', enum: ['contacts', 'messages', 'all'] },
          default: ['all'],
          description: 'Which entities to search'
        },
        filters: {
          type: 'object',
          properties: {
            dateRange: {
              type: 'object',
              properties: {
                start: { type: 'string', format: 'date' },
                end: { type: 'string', format: 'date' }
              }
            },
            tags: {
              type: 'array',
              items: { type: 'string' }
            },
            contactIds: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        },
        limit: {
          type: 'number',
          default: 50,
          maximum: 500
        }
      },
      required: ['query']
    },

    async handler(input: any) {
      const results: any = {
        contacts: [],
        messages: []
      };

      const entities = input.entities?.includes('all')
        ? ['contacts', 'messages']
        : input.entities || ['contacts', 'messages'];

      // Search contacts
      if (entities.includes('contacts')) {
        let sql = `
          SELECT *,
                 ts_rank(search_vector, plainto_tsquery('english', $1)) as rank
          FROM contacts
          WHERE search_vector @@ plainto_tsquery('english', $1)
        `;
        const params: any[] = [input.query];

        // Add filters
        if (input.filters?.tags?.length > 0) {
          sql += ` AND tags @> $${params.length + 1}`;
          params.push(JSON.stringify(input.filters.tags));
        }

        if (input.filters?.dateRange) {
          if (input.filters.dateRange.start) {
            sql += ` AND created_at >= $${params.length + 1}`;
            params.push(input.filters.dateRange.start);
          }
          if (input.filters.dateRange.end) {
            sql += ` AND created_at <= $${params.length + 1}`;
            params.push(input.filters.dateRange.end);
          }
        }

        sql += ` ORDER BY rank DESC LIMIT $${params.length + 1}`;
        params.push(input.limit);

        const contactResults = await db.query(sql, params);
        results.contacts = contactResults.rows;
      }

      // Search messages
      if (entities.includes('messages')) {
        let sql = `
          SELECT m.*,
                 c.first_name, c.last_name, c.email,
                 ts_rank(m.search_vector, plainto_tsquery('english', $1)) as rank
          FROM messages m
          JOIN conversations conv ON conv.id = m.conversation_id
          JOIN contacts c ON c.id = conv.contact_id
          WHERE m.search_vector @@ plainto_tsquery('english', $1)
        `;
        const params: any[] = [input.query];

        // Add filters
        if (input.filters?.contactIds?.length > 0) {
          sql += ` AND conv.contact_id = ANY($${params.length + 1})`;
          params.push(input.filters.contactIds);
        }

        if (input.filters?.dateRange) {
          if (input.filters.dateRange.start) {
            sql += ` AND m.sent_at >= $${params.length + 1}`;
            params.push(input.filters.dateRange.start);
          }
          if (input.filters.dateRange.end) {
            sql += ` AND m.sent_at <= $${params.length + 1}`;
            params.push(input.filters.dateRange.end);
          }
        }

        sql += ` ORDER BY rank DESC LIMIT $${params.length + 1}`;
        params.push(input.limit);

        const messageResults = await db.query(sql, params);
        results.messages = messageResults.rows;
      }

      return {
        ...results,
        totalResults: results.contacts.length + results.messages.length,
        query: input.query
      };
    }
  };
}
```

### Resource: Sync Status

```typescript
// src/resources/sync-status.ts
import { Resource } from '@modelcontextprotocol/sdk';
import { DatabaseClient } from '../database/client';

export function createSyncStatusResource(db: DatabaseClient): Resource {
  return {
    uri: 'db://sync/status',
    name: 'Sync Status',
    description: 'Current synchronization status for all entities',
    mimeType: 'application/json',

    async handler() {
      const entities = ['contacts', 'conversations', 'messages', 'opportunities'];

      const statuses = await Promise.all(
        entities.map(async (entity) => {
          const state = await db.getSyncState(entity);
          return [entity, state];
        })
      );

      const statusMap = Object.fromEntries(statuses);

      // Calculate overall health
      const allHealthy = Object.values(statusMap).every(
        (state: any) => state && state.status !== 'error'
      );

      const lastSync = Math.max(
        ...Object.values(statusMap)
          .filter((s: any) => s?.last_sync_at)
          .map((s: any) => new Date(s.last_sync_at).getTime())
      );

      return {
        text: JSON.stringify({
          entities: statusMap,
          overall: {
            healthy: allHealthy,
            lastSync: new Date(lastSync).toISOString(),
            nextSync: 'auto'
          },
          timestamp: new Date().toISOString()
        }, null, 2)
      };
    }
  };
}
```

### Tool Registration

```typescript
// src/tools/index.ts
import { MCPServer } from '@modelcontextprotocol/sdk';
import { DatabaseClient } from '../database/client';
import { CacheManager } from '../cache/redis';
import { createQueryContactsTool } from './query-contacts';
import { createFullTextSearchTool } from './full-text-search';
// ... import other tools

export function registerTools(
  server: MCPServer,
  db: DatabaseClient,
  cache: CacheManager
): void {
  // Register all tools
  server.addTool(createQueryContactsTool(db, cache));
  server.addTool(createFullTextSearchTool(db));
  // ... register other tools

  console.log(`✓ Registered ${server.getTools().length} tools`);
}
```

---

## 2. ghl-mcp Complete Implementation

### Rate Limiter with Token Bucket

```typescript
// src/rate-limit/token-bucket.ts
export class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity: number;
  private readonly refillRate: number;
  private readonly queue: Array<{
    resolve: () => void;
    timestamp: number;
  }> = [];

  constructor(capacity: number, refillRate: number) {
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.tokens = capacity;
    this.lastRefill = Date.now();

    // Start refill loop
    this.startRefillLoop();
  }

  async waitForToken(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.refill();

      if (this.tokens >= 1) {
        this.tokens -= 1;
        resolve();
      } else {
        // Queue the request
        this.queue.push({ resolve, timestamp: Date.now() });
      }
    });
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000;
    const tokensToAdd = timePassed * this.refillRate;

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;

    // Process queued requests
    while (this.queue.length > 0 && this.tokens >= 1) {
      const request = this.queue.shift()!;
      this.tokens -= 1;
      request.resolve();
    }
  }

  private startRefillLoop(): void {
    setInterval(() => {
      this.refill();
    }, 100); // Check every 100ms
  }

  getStats(): any {
    return {
      availableTokens: Math.floor(this.tokens),
      capacity: this.capacity,
      refillRate: this.refillRate,
      queueLength: this.queue.length
    };
  }
}
```

### GHL API Client with Retry Logic

```typescript
// src/api/ghl-client.ts
import axios, { AxiosInstance, AxiosError } from 'axios';
import { GHLAuth } from '../auth/oauth';
import { TokenBucket } from '../rate-limit/token-bucket';

export class GHLClient {
  private client: AxiosInstance;
  private auth: GHLAuth;
  private rateLimiter: TokenBucket;
  private locationId: string;

  constructor(config: {
    auth: GHLAuth;
    locationId: string;
    rateLimitConfig?: { capacity: number; refillRate: number };
  }) {
    this.auth = config.auth;
    this.locationId = config.locationId;

    // Create rate limiter (default: 10 req/sec, burst 20)
    this.rateLimiter = new TokenBucket(
      config.rateLimitConfig?.capacity || 20,
      config.rateLimitConfig?.refillRate || 10
    );

    // Create axios client
    this.client = axios.create({
      baseURL: 'https://services.leadconnectorhq.com',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      }
    });

    // Add auth interceptor
    this.client.interceptors.request.use(async (config) => {
      const token = await this.auth.getValidToken();
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    // Add retry interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        return this.handleError(error);
      }
    );
  }

  private async handleError(error: AxiosError): Promise<any> {
    const config = error.config;
    const retryCount = (config as any).__retryCount || 0;

    // Rate limit error (429)
    if (error.response?.status === 429) {
      const retryAfter = parseInt(
        error.response.headers['retry-after'] || '5'
      );

      console.warn(`Rate limited, retrying after ${retryAfter}s`);
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));

      return this.client.request(config!);
    }

    // Transient errors (500, 502, 503, 504)
    const transientErrors = [500, 502, 503, 504];
    if (
      error.response &&
      transientErrors.includes(error.response.status) &&
      retryCount < 3
    ) {
      const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);

      console.warn(`Transient error ${error.response.status}, retrying in ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));

      (config as any).__retryCount = retryCount + 1;
      return this.client.request(config!);
    }

    throw error;
  }

  private async request<T>(
    method: string,
    path: string,
    data?: any
  ): Promise<T> {
    // Wait for rate limiter
    await this.rateLimiter.waitForToken();

    const response = await this.client.request<T>({
      method,
      url: path,
      data
    });

    return response.data;
  }

  // === Contacts ===

  async getContact(contactId: string): Promise<any> {
    return this.request('GET', `/contacts/${contactId}`);
  }

  async searchContacts(params: {
    query?: string;
    limit?: number;
    skip?: number;
  }): Promise<any> {
    return this.request('GET', `/contacts/`, params);
  }

  async createContact(contact: {
    firstName: string;
    lastName?: string;
    email: string;
    phone?: string;
    tags?: string[];
    customFields?: Record<string, any>;
  }): Promise<any> {
    return this.request('POST', `/contacts/`, {
      locationId: this.locationId,
      ...contact
    });
  }

  async updateContact(
    contactId: string,
    updates: Partial<{
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      tags: string[];
      customFields: Record<string, any>;
    }>
  ): Promise<any> {
    return this.request('PUT', `/contacts/${contactId}`, updates);
  }

  // === Conversations ===

  async getConversation(conversationId: string): Promise<any> {
    return this.request('GET', `/conversations/${conversationId}`);
  }

  async getConversationMessages(
    conversationId: string,
    params?: { limit?: number; lastMessageId?: string }
  ): Promise<any> {
    return this.request('GET', `/conversations/${conversationId}/messages`, params);
  }

  async sendMessage(params: {
    contactId: string;
    message: string;
    type: 'SMS' | 'Email' | 'WhatsApp';
  }): Promise<any> {
    return this.request('POST', `/conversations/messages`, {
      locationId: this.locationId,
      contactId: params.contactId,
      message: params.message,
      type: params.type
    });
  }

  // === Opportunities ===

  async getOpportunity(opportunityId: string): Promise<any> {
    return this.request('GET', `/opportunities/${opportunityId}`);
  }

  async updateOpportunity(
    opportunityId: string,
    updates: {
      pipelineStageId?: string;
      status?: 'open' | 'won' | 'lost' | 'abandoned';
      monetaryValue?: number;
    }
  ): Promise<any> {
    return this.request('PUT', `/opportunities/${opportunityId}`, updates);
  }

  // === Calendars ===

  async getCalendars(): Promise<any> {
    return this.request('GET', `/calendars/`);
  }

  async createAppointment(params: {
    calendarId: string;
    contactId: string;
    startTime: string;
    endTime: string;
    title: string;
  }): Promise<any> {
    return this.request('POST', `/calendars/events/appointments`, {
      locationId: this.locationId,
      ...params
    });
  }

  // === Webhooks ===

  async createWebhook(webhook: {
    url: string;
    events: string[];
  }): Promise<any> {
    return this.request('POST', `/locations/${this.locationId}/webhooks`, webhook);
  }

  async listWebhooks(): Promise<any> {
    return this.request('GET', `/locations/${this.locationId}/webhooks`);
  }

  // === Stats ===

  getRateLimiterStats(): any {
    return this.rateLimiter.getStats();
  }
}
```

### Tool: send_message

```typescript
// src/tools/send-message.ts
import { Tool } from '@modelcontextprotocol/sdk';
import { GHLClient } from '../api/ghl-client';

export function createSendMessageTool(ghlClient: GHLClient): Tool {
  return {
    name: 'send_message',
    description: 'Send a message to a contact via SMS, Email, or WhatsApp',
    inputSchema: {
      type: 'object',
      properties: {
        contactId: {
          type: 'string',
          description: 'GoHighLevel contact ID'
        },
        message: {
          type: 'string',
          description: 'Message content to send'
        },
        channel: {
          type: 'string',
          enum: ['sms', 'email', 'whatsapp'],
          description: 'Communication channel'
        },
        metadata: {
          type: 'object',
          description: 'Optional metadata for tracking',
          properties: {
            campaign: { type: 'string' },
            aiGenerated: { type: 'boolean' }
          }
        }
      },
      required: ['contactId', 'message', 'channel']
    },

    async handler(input: any) {
      const startTime = Date.now();

      try {
        // Map channel to GHL type
        const typeMap: Record<string, string> = {
          sms: 'SMS',
          email: 'Email',
          whatsapp: 'WhatsApp'
        };

        const result = await ghlClient.sendMessage({
          contactId: input.contactId,
          message: input.message,
          type: typeMap[input.channel] as any
        });

        return {
          success: true,
          messageId: result.messageId,
          conversationId: result.conversationId,
          status: 'sent',
          sentAt: new Date().toISOString(),
          executionTime: Date.now() - startTime,
          metadata: input.metadata
        };
      } catch (error: any) {
        console.error('Send message error:', error);

        return {
          success: false,
          error: {
            code: error.response?.status || 'UNKNOWN',
            message: error.message,
            details: error.response?.data
          },
          executionTime: Date.now() - startTime
        };
      }
    }
  };
}
```

---

## 3. notifications-mcp WebSocket Implementation

### WebSocket Manager with Reconnection

```typescript
// src/websocket/manager.ts
import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { GHLAuth } from '../auth/oauth';

export class WebSocketManager extends EventEmitter {
  private ws: WebSocket | null = null;
  private auth: GHLAuth;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 20;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionState: 'disconnected' | 'connecting' | 'connected' = 'disconnected';

  constructor(auth: GHLAuth) {
    super();
    this.auth = auth;
  }

  async connect(): Promise<void> {
    if (this.connectionState !== 'disconnected') {
      console.warn('Already connected or connecting');
      return;
    }

    this.connectionState = 'connecting';

    try {
      const token = await this.auth.getValidToken();
      const wsUrl = `wss://services.leadconnectorhq.com/conversations/stream?token=${token}`;

      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => this.handleOpen());
      this.ws.on('message', (data) => this.handleMessage(data));
      this.ws.on('close', (code, reason) => this.handleClose(code, reason));
      this.ws.on('error', (error) => this.handleError(error));
      this.ws.on('pong', () => this.handlePong());

    } catch (error) {
      console.error('Connection error:', error);
      this.connectionState = 'disconnected';
      this.scheduleReconnect();
    }
  }

  private handleOpen(): void {
    console.log('✓ WebSocket connected');
    this.connectionState = 'connected';
    this.reconnectAttempts = 0;
    this.startHeartbeat();
    this.emit('connected');
  }

  private handleMessage(data: WebSocket.Data): void {
    try {
      const event = JSON.parse(data.toString());
      console.log('Received event:', event.type);
      this.emit('event', event);
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  }

  private handleClose(code: number, reason: Buffer): void {
    console.log(`WebSocket closed: ${code} ${reason.toString()}`);
    this.connectionState = 'disconnected';
    this.stopHeartbeat();
    this.emit('disconnected', { code, reason: reason.toString() });
    this.scheduleReconnect();
  }

  private handleError(error: Error): void {
    console.error('WebSocket error:', error);
    this.emit('error', error);
  }

  private handlePong(): void {
    // Connection is alive
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 30000); // Ping every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      this.emit('max_reconnect_attempts');
      return;
    }

    // Exponential backoff with jitter
    const baseDelay = 1000 * Math.pow(2, this.reconnectAttempts);
    const jitter = Math.random() * 1000;
    const delay = Math.min(baseDelay + jitter, 30000);

    console.log(`Reconnecting in ${Math.round(delay / 1000)}s (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  disconnect(): void {
    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.connectionState = 'disconnected';
  }

  getState(): string {
    return this.connectionState;
  }

  isConnected(): boolean {
    return this.connectionState === 'connected' && this.ws?.readyState === WebSocket.OPEN;
  }
}
```

### Event Store

```typescript
// src/events/store.ts
import { DatabaseClient } from '../database/client';

export interface Event {
  id: string;
  type: string;
  source: 'webhook' | 'websocket';
  timestamp: string;
  data: any;
  processed: boolean;
  relatedEntities: {
    contactId?: string;
    conversationId?: string;
    opportunityId?: string;
  };
}

export class EventStore {
  private db: DatabaseClient;

  constructor(db: DatabaseClient) {
    this.db = db;
  }

  async store(event: Omit<Event, 'id'>): Promise<Event> {
    const result = await this.db.query(
      `INSERT INTO events (
        id, type, source, timestamp, data, processed, related_entities
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6
      ) RETURNING *`,
      [
        event.type,
        event.source,
        event.timestamp,
        JSON.stringify(event.data),
        event.processed || false,
        JSON.stringify(event.relatedEntities || {})
      ]
    );

    return result.rows[0];
  }

  async query(params: {
    eventTypes?: string[];
    since?: Date;
    contactId?: string;
    unprocessedOnly?: boolean;
    limit?: number;
  }): Promise<Event[]> {
    let sql = 'SELECT * FROM events WHERE 1=1';
    const queryParams: any[] = [];

    if (params.eventTypes && params.eventTypes.length > 0) {
      sql += ` AND type = ANY($${queryParams.length + 1})`;
      queryParams.push(params.eventTypes);
    }

    if (params.since) {
      sql += ` AND timestamp >= $${queryParams.length + 1}`;
      queryParams.push(params.since);
    }

    if (params.contactId) {
      sql += ` AND related_entities->>'contactId' = $${queryParams.length + 1}`;
      queryParams.push(params.contactId);
    }

    if (params.unprocessedOnly) {
      sql += ' AND processed = false';
    }

    sql += ` ORDER BY timestamp DESC LIMIT $${queryParams.length + 1}`;
    queryParams.push(params.limit || 50);

    const result = await this.db.query(sql, queryParams);
    return result.rows;
  }

  async markProcessed(eventId: string, result?: any): Promise<void> {
    await this.db.query(
      `UPDATE events
       SET processed = true,
           processing_result = $2,
           processed_at = NOW()
       WHERE id = $1`,
      [eventId, JSON.stringify(result || {})]
    );
  }
}
```

---

## Complete docker-compose.yml

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: pai_dashboard
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD:-secure_password}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/migrations:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  database-mcp:
    build:
      context: ./servers/database-mcp
      dockerfile: Dockerfile
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: pai_dashboard
      DB_USER: postgres
      DB_PASSWORD: ${DB_PASSWORD:-secure_password}
      REDIS_HOST: redis
      REDIS_PORT: 6379
      PORT: 3000
    ports:
      - "3002:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  ghl-mcp:
    build:
      context: ./servers/ghl-mcp
      dockerfile: Dockerfile
    environment:
      GHL_CLIENT_ID: ${GHL_CLIENT_ID}
      GHL_CLIENT_SECRET: ${GHL_CLIENT_SECRET}
      GHL_LOCATION_ID: ${GHL_LOCATION_ID}
      GHL_REFRESH_TOKEN: ${GHL_REFRESH_TOKEN}
      REDIS_HOST: redis
      REDIS_PORT: 6379
      PORT: 3000
    ports:
      - "3001:3000"
    depends_on:
      - redis
    restart: unless-stopped

  dashboard-mcp:
    build:
      context: ./servers/dashboard-mcp
      dockerfile: Dockerfile
    environment:
      DATABASE_MCP_URL: http://database-mcp:3000
      REDIS_HOST: redis
      REDIS_PORT: 6379
      PORT: 3000
    ports:
      - "3003:3000"
    depends_on:
      - database-mcp
      - redis
    restart: unless-stopped

  notifications-mcp:
    build:
      context: ./servers/notifications-mcp
      dockerfile: Dockerfile
    environment:
      GHL_CLIENT_ID: ${GHL_CLIENT_ID}
      GHL_CLIENT_SECRET: ${GHL_CLIENT_SECRET}
      GHL_REFRESH_TOKEN: ${GHL_REFRESH_TOKEN}
      GHL_WEBHOOK_SECRET: ${GHL_WEBHOOK_SECRET}
      DATABASE_MCP_URL: http://database-mcp:3000
      REDIS_HOST: redis
      REDIS_PORT: 6379
      PORT: 3000
      WEBHOOK_PORT: 8080
    ports:
      - "3004:3000"
      - "8080:8080"
    depends_on:
      - database-mcp
      - redis
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

---

## Example Dockerfile

```dockerfile
# servers/database-mcp/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start server
CMD ["node", "dist/index.js"]
```

---

This provides complete, production-ready code examples for implementing the MCP server ecosystem. Each server can be developed and tested independently while working together as a cohesive system.
