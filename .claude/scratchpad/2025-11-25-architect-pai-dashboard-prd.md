# PAI Business Dashboard - Complete Technical Architecture & PRD

**Document Version:** 1.0
**Date:** 2025-11-25
**Architect:** Atlas (PAI Principal Software Architect)
**Status:** Complete Architecture Design

---

## EXECUTIVE SUMMARY

### Project Overview
The PAI Business Dashboard is an AI-native command center that enables both humans AND AI agents to view and operate a unified business management interface. This system integrates contacts, conversations, and GoHighLevel (GHL) CRM with real-time synchronization, offline-first capabilities, and full MCP (Model Context Protocol) server integration for seamless AI interaction.

**Key Innovation:** This is not just a dashboard for humans - it's designed from the ground up to be AI-controllable through MCP servers, enabling your PAI to autonomously manage business operations.

### Success Metrics
- **Real-time Sync Latency**: < 100ms for local updates, < 500ms for external sync
- **Offline Capability**: 100% feature availability when offline
- **AI Interaction**: 100% of UI operations accessible via MCP
- **Data Consistency**: 99.99% sync reliability with conflict resolution
- **Performance**: Search 100K+ records in < 120ms client-side
- **Scalability**: Support 1M+ contacts, 10M+ messages

### Technical Stack Summary

```
Frontend:      Next.js 15 + React 19 + TypeScript
State:         Zustand + RxDB (reactive local-first)
Backend:       Node.js + Fastify + WebSocket Server
Database:      PostgreSQL (primary) + RxDB (local cache)
Real-time:     Server-Sent Events (SSE) + WebSocket (for MCP)
MCP Servers:   Dedicated microservices per domain
Package Mgr:   bun (per PAI standards)
Deployment:    Docker + AWS Fargate (stateful containers)
```

### Timeline Estimate
- **Phase 1 - Core Infrastructure** (4 weeks): Database, API, basic sync
- **Phase 2 - MCP Integration** (3 weeks): MCP servers, AI interface layer
- **Phase 3 - Real-time Features** (3 weeks): SSE, WebSocket, hot reloading
- **Phase 4 - UI & Polish** (3 weeks): Dashboard UI, UX refinement
- **Phase 5 - Testing & Launch** (2 weeks): E2E testing, deployment
**Total: 15 weeks**

### Resource Requirements
- **Senior Full-Stack Engineer** (TypeScript/React/Node.js)
- **Backend Engineer** (API design, WebSocket, real-time systems)
- **Database Specialist** (PostgreSQL, sync patterns, conflict resolution)
- **MCP Integration Engineer** (Protocol implementation, AI integration)
- **UI/UX Engineer** (Dashboard design, accessibility)

---

## SYSTEM ARCHITECTURE OVERVIEW

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PAI BUSINESS DASHBOARD                            │
│                     (AI-Native Command Center)                           │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌───────────────┐         ┌──────────────┐        ┌─────────────────┐
│   HUMAN UI    │         │   MCP LAYER  │        │  EXTERNAL APIS  │
│  (Next.js)    │         │ (AI Control) │        │  (GoHighLevel)  │
└───────┬───────┘         └──────┬───────┘        └────────┬────────┘
        │                         │                         │
        └─────────────────────────┼─────────────────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │   APPLICATION LAYER       │
                    │  (State Management)       │
                    │                           │
                    │  ┌─────────────────────┐  │
                    │  │  Zustand (Global)   │  │
                    │  │  RxDB (Local Store) │  │
                    │  └─────────────────────┘  │
                    └─────────────┬─────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌───────────────┐         ┌──────────────┐        ┌─────────────────┐
│   SSE/WS      │         │  REST API    │        │   MCP SERVERS   │
│ (Real-time)   │         │  (CRUD)      │        │  (AI Gateway)   │
└───────┬───────┘         └──────┬───────┘        └────────┬────────┘
        │                         │                         │
        └─────────────────────────┼─────────────────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │    BACKEND SERVICES       │
                    │                           │
                    │  ┌─────────────────────┐  │
                    │  │  Fastify API Server │  │
                    │  │  WebSocket Server   │  │
                    │  │  SSE Manager        │  │
                    │  │  Sync Engine        │  │
                    │  └─────────────────────┘  │
                    └─────────────┬─────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌───────────────┐         ┌──────────────┐        ┌─────────────────┐
│  PostgreSQL   │         │    Redis     │        │   GHL Webhook   │
│  (Primary DB) │         │  (PubSub)    │        │    Handler      │
└───────────────┘         └──────────────┘        └─────────────────┘
```

### Data Flow Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      DATA FLOW LAYERS                             │
└──────────────────────────────────────────────────────────────────┘

LAYER 1: UI Interaction (Human OR AI via MCP)
    ↓
LAYER 2: State Management (Zustand + RxDB Reactive Queries)
    ↓
LAYER 3: Optimistic Updates (Instant UI feedback)
    ↓
LAYER 4: Local Persistence (RxDB with OPFS)
    ↓
LAYER 5: Background Sync (Bi-directional)
    ↓
LAYER 6: Backend API (Fastify REST + GraphQL)
    ↓
LAYER 7: Database Layer (PostgreSQL + Redis)
    ↓
LAYER 8: External Integrations (GoHighLevel, SMS, Email)


┌──────────────────────────────────────────────────────────────────┐
│                  REAL-TIME UPDATE FLOW                            │
└──────────────────────────────────────────────────────────────────┘

External Event (GHL Webhook)
    ↓
Backend Webhook Handler → PostgreSQL Write
    ↓
Redis PubSub Broadcast
    ↓
SSE Manager → Push to all connected clients
    ↓
Client receives SSE event
    ↓
RxDB Replication pulls changes
    ↓
Reactive Queries auto-update
    ↓
UI re-renders automatically (React)
```

---

## DETAILED TECHNICAL SPECIFICATIONS

## 1. FRONTEND ARCHITECTURE

### 1.1 Technology Stack & Justification

**Core Framework: Next.js 15 (App Router)**

**WHY Next.js 15:**
- **Server Components**: Reduce client bundle, faster initial load
- **Streaming SSR**: Progressive page rendering for perceived performance
- **Built-in SSE Support**: Native Route Handlers for Server-Sent Events
- **TypeScript Native**: First-class TypeScript support
- **Production Ready**: Battle-tested for enterprise dashboards
- **Edge Runtime**: Optional edge deployment for global low-latency

**WHY NOT Vue/Svelte:**
- React ecosystem is more mature for enterprise dashboards
- Better MCP client library support (TypeScript SDK)
- Larger talent pool for maintenance
- Superior real-time data visualization libraries (Recharts, Apache ECharts)

### 1.2 State Management Architecture

**Multi-Layer State Strategy:**

```typescript
// LAYER 1: Global UI State (Zustand)
// Fast, simple, perfect for UI state
// Located: /src/stores/ui-store.ts

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface UIStore {
  sidebarOpen: boolean
  activeView: 'contacts' | 'conversations' | 'analytics'
  theme: 'light' | 'dark'
  notifications: Notification[]
}

export const useUIStore = create<UIStore>()(
  devtools(
    persist(
      (set) => ({
        sidebarOpen: true,
        activeView: 'contacts',
        theme: 'dark',
        notifications: [],
      }),
      { name: 'pai-ui-state' }
    )
  )
)


// LAYER 2: Data State (RxDB Reactive)
// Offline-first, reactive, auto-sync
// Located: /src/db/rxdb-instance.ts

import { createRxDatabase, addRxPlugin } from 'rxdb'
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie'
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode'
import { RxDBReplicationPlugin } from 'rxdb/plugins/replication'

// Initialize RxDB with OPFS for best performance
export async function initDatabase() {
  const db = await createRxDatabase({
    name: 'pai_dashboard',
    storage: getRxStorageDexie(), // Uses IndexedDB with Dexie
    multiInstance: true, // Multi-tab support
    eventReduce: true, // Performance optimization
    cleanupPolicy: {
      minimumDeletedTime: 1000 * 60 * 60 * 24 * 30, // 30 days
      minimumCollectionAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      runEach: 1000 * 60 * 60, // Every hour
      awaitReplicationsInSync: true,
      waitForLeadership: true
    }
  })

  // Collections defined below
  await db.addCollections({
    contacts: { schema: contactSchema },
    conversations: { schema: conversationSchema },
    messages: { schema: messageSchema },
    ghl_sync_state: { schema: syncStateSchema }
  })

  return db
}


// LAYER 3: Server State (React Query for non-reactive data)
// For one-off API calls, analytics queries
// Located: /src/lib/react-query.ts

import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      refetchOnWindowFocus: true,
      retry: 3,
    },
  },
})
```

**WHY this multi-layer approach:**
- **Zustand**: Lightweight (< 1KB), no boilerplate, perfect for UI state
- **RxDB**: Purpose-built for offline-first, reactive queries, automatic sync
- **React Query**: Handles server state, caching, background refetching for analytics

**WHY NOT Redux:**
- Too much boilerplate for modern apps
- Zustand provides same functionality with 90% less code
- RxDB handles data state reactivity better than Redux

### 1.3 Database Schema (RxDB Collections)

```typescript
// /src/db/schemas/contact.schema.ts

export const contactSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 }, // UUID from GHL or generated
    firstName: { type: 'string' },
    lastName: { type: 'string' },
    email: { type: 'string' },
    phone: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    customFields: { type: 'object' },

    // GHL specific fields
    ghlContactId: { type: 'string' },
    ghlLocationId: { type: 'string' },

    // Metadata
    source: { type: 'string', enum: ['ghl', 'manual', 'import'] },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    lastSyncedAt: { type: 'string', format: 'date-time' },

    // Sync state
    syncStatus: {
      type: 'string',
      enum: ['synced', 'pending', 'conflict', 'error']
    },
    localChanges: { type: 'boolean', default: false },

    // Soft delete
    deletedAt: { type: ['string', 'null'], format: 'date-time' }
  },
  required: ['id', 'createdAt', 'updatedAt'],
  indexes: [
    'email',
    'phone',
    'ghlContactId',
    ['syncStatus', 'updatedAt'], // Compound index for sync queries
    ['tags[0]', 'updatedAt'], // Tag search optimization
  ],
  attachments: {
    encrypted: false
  }
}


// /src/db/schemas/conversation.schema.ts

export const conversationSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    contactId: { type: 'string', ref: 'contacts' }, // Foreign key
    channel: {
      type: 'string',
      enum: ['sms', 'email', 'whatsapp', 'facebook', 'instagram', 'webchat']
    },
    status: {
      type: 'string',
      enum: ['open', 'closed', 'snoozed', 'archived']
    },
    assignedTo: { type: 'string' }, // User ID
    lastMessageAt: { type: 'string', format: 'date-time' },
    unreadCount: { type: 'number', default: 0 },

    // GHL specific
    ghlConversationId: { type: 'string' },
    ghlLocationId: { type: 'string' },

    // Metadata
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    lastSyncedAt: { type: 'string', format: 'date-time' },
    syncStatus: {
      type: 'string',
      enum: ['synced', 'pending', 'conflict', 'error']
    }
  },
  required: ['id', 'contactId', 'channel', 'createdAt'],
  indexes: [
    'contactId',
    'ghlConversationId',
    ['status', 'lastMessageAt'], // Active conversations
    ['channel', 'status'], // Filter by channel
    ['unreadCount', 'lastMessageAt'] // Unread priority
  ]
}


// /src/db/schemas/message.schema.ts

export const messageSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    conversationId: { type: 'string', ref: 'conversations' },
    direction: { type: 'string', enum: ['inbound', 'outbound'] },
    body: { type: 'string' },
    attachments: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          url: { type: 'string' },
          type: { type: 'string' },
          filename: { type: 'string' }
        }
      }
    },

    // Message metadata
    sentAt: { type: 'string', format: 'date-time' },
    deliveredAt: { type: ['string', 'null'], format: 'date-time' },
    readAt: { type: ['string', 'null'], format: 'date-time' },

    // Sender info
    senderId: { type: 'string' }, // User ID or contact ID
    senderType: { type: 'string', enum: ['user', 'contact', 'ai'] },

    // GHL specific
    ghlMessageId: { type: 'string' },

    // Metadata
    createdAt: { type: 'string', format: 'date-time' },
    syncStatus: {
      type: 'string',
      enum: ['synced', 'sending', 'sent', 'failed', 'pending']
    }
  },
  required: ['id', 'conversationId', 'direction', 'body', 'sentAt'],
  indexes: [
    'conversationId',
    'ghlMessageId',
    ['conversationId', 'sentAt'], // Conversation timeline
    ['syncStatus', 'createdAt'], // Pending messages
    ['direction', 'sentAt'] // Inbound/outbound queries
  ]
}
```

### 1.4 Real-Time Reactive Queries

```typescript
// /src/hooks/useContacts.ts

import { useEffect, useState } from 'react'
import { useRxDatabase } from '@/db/RxDBProvider'
import type { RxDocument } from 'rxdb'

export function useContacts(filters?: {
  search?: string
  tags?: string[]
  limit?: number
}) {
  const db = useRxDatabase()
  const [contacts, setContacts] = useState<RxDocument[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let query = db.contacts.find({
      selector: {
        deletedAt: { $eq: null } // Exclude soft-deleted
      },
      sort: [{ updatedAt: 'desc' }]
    })

    // Apply filters
    if (filters?.search) {
      query = query.where('$or').eq([
        { firstName: { $regex: new RegExp(filters.search, 'i') } },
        { lastName: { $regex: new RegExp(filters.search, 'i') } },
        { email: { $regex: new RegExp(filters.search, 'i') } }
      ])
    }

    if (filters?.tags?.length) {
      query = query.where('tags').in(filters.tags)
    }

    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    // Subscribe to reactive query - auto-updates on changes!
    const subscription = query.$.subscribe(docs => {
      setContacts(docs)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [db, filters])

  return { contacts, loading }
}


// /src/hooks/useConversations.ts

export function useConversations(contactId?: string) {
  const db = useRxDatabase()
  const [conversations, setConversations] = useState<RxDocument[]>([])

  useEffect(() => {
    let query = db.conversations.find({
      sort: [{ lastMessageAt: 'desc' }]
    })

    if (contactId) {
      query = query.where('contactId').eq(contactId)
    }

    const subscription = query.$.subscribe(setConversations)
    return () => subscription.unsubscribe()
  }, [db, contactId])

  return conversations
}
```

**WHY Reactive Queries:**
- **Zero manual refetching**: UI updates automatically when data changes
- **Multi-tab sync**: Changes in one tab instantly reflect in others
- **Memory efficient**: RxDB manages subscriptions and cleanup
- **Performance**: Only re-renders affected components

### 1.5 UI Component Architecture

```typescript
// /src/app/dashboard/page.tsx

import { ContactsList } from '@/components/ContactsList'
import { ConversationsPanel } from '@/components/ConversationsPanel'
import { CommandPalette } from '@/components/CommandPalette'

export default function DashboardPage() {
  return (
    <div className="flex h-screen bg-gray-900">
      {/* Command Palette - AI can trigger via MCP */}
      <CommandPalette />

      {/* Sidebar */}
      <aside className="w-80 border-r border-gray-800">
        <ContactsList />
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col">
        <ConversationsPanel />
      </main>

      {/* Status Bar - shows sync status */}
      <footer className="h-8 border-t border-gray-800 flex items-center justify-between px-4">
        <SyncStatus />
        <OnlineIndicator />
      </footer>
    </div>
  )
}


// /src/components/ContactsList.tsx

'use client'

import { useContacts } from '@/hooks/useContacts'
import { useState } from 'react'
import { ContactCard } from './ContactCard'
import { SearchBar } from './SearchBar'

export function ContactsList() {
  const [search, setSearch] = useState('')
  const { contacts, loading } = useContacts({ search })

  return (
    <div className="flex flex-col h-full">
      <SearchBar value={search} onChange={setSearch} />

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <LoadingSkeleton />
        ) : (
          contacts.map(contact => (
            <ContactCard key={contact.id} contact={contact} />
          ))
        )}
      </div>
    </div>
  )
}
```

---

## 2. BACKEND ARCHITECTURE

### 2.1 Technology Stack

**Core: Node.js + Fastify**

**WHY Fastify over Express:**
- **3x faster**: Optimized for high throughput
- **Schema validation**: Built-in JSON Schema validation
- **TypeScript native**: First-class TypeScript support
- **Plugin system**: Clean architecture separation
- **Async/await**: Modern async handling
- **Low overhead**: Minimal memory footprint

```typescript
// /backend/src/server.ts

import Fastify from 'fastify'
import cors from '@fastify/cors'
import websocket from '@fastify/websocket'
import { SSEPlugin } from './plugins/sse'
import { authPlugin } from './plugins/auth'
import { contactRoutes } from './routes/contacts'
import { conversationRoutes } from './routes/conversations'
import { webhookRoutes } from './routes/webhooks'
import { mcpRoutes } from './routes/mcp'

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty'
    }
  },
  trustProxy: true,
  requestIdHeader: 'x-request-id',
  bodyLimit: 10485760, // 10MB
})

// Plugins
await fastify.register(cors, {
  origin: process.env.FRONTEND_URL,
  credentials: true
})
await fastify.register(websocket)
await fastify.register(SSEPlugin)
await fastify.register(authPlugin)

// Routes
await fastify.register(contactRoutes, { prefix: '/api/v1/contacts' })
await fastify.register(conversationRoutes, { prefix: '/api/v1/conversations' })
await fastify.register(webhookRoutes, { prefix: '/webhooks' })
await fastify.register(mcpRoutes, { prefix: '/mcp' })

// Start server
const port = parseInt(process.env.PORT || '3001')
await fastify.listen({ port, host: '0.0.0.0' })
console.log(`🚀 Server running on port ${port}`)
```

### 2.2 API Layer Design

**RESTful API + GraphQL Hybrid**

**REST for CRUD operations:**
```typescript
// /backend/src/routes/contacts.ts

import type { FastifyPluginAsync } from 'fastify'
import { contactService } from '../services/contact.service'

export const contactRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v1/contacts
  fastify.get('/', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', default: 1 },
          limit: { type: 'number', default: 50 },
          search: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          syncStatus: { type: 'string', enum: ['synced', 'pending', 'conflict'] }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: { type: 'array', items: { $ref: 'contact#' } },
            pagination: { $ref: 'pagination#' },
            meta: { type: 'object' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { page, limit, search, tags, syncStatus } = request.query
    const result = await contactService.list({ page, limit, search, tags, syncStatus })
    return result
  })

  // GET /api/v1/contacts/:id
  fastify.get('/:id', {
    schema: {
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id']
      },
      response: {
        200: { $ref: 'contact#' },
        404: { $ref: 'error#' }
      }
    }
  }, async (request, reply) => {
    const contact = await contactService.findById(request.params.id)
    if (!contact) {
      reply.code(404).send({ error: 'Contact not found' })
      return
    }
    return contact
  })

  // POST /api/v1/contacts
  fastify.post('/', {
    schema: {
      body: { $ref: 'contactInput#' },
      response: {
        201: { $ref: 'contact#' },
        400: { $ref: 'error#' }
      }
    }
  }, async (request, reply) => {
    const contact = await contactService.create(request.body)
    reply.code(201).send(contact)
  })

  // PATCH /api/v1/contacts/:id
  fastify.patch('/:id', {
    schema: {
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id']
      },
      body: { $ref: 'contactUpdate#' },
      response: {
        200: { $ref: 'contact#' },
        404: { $ref: 'error#' },
        409: { $ref: 'conflict#' } // Sync conflict
      }
    }
  }, async (request, reply) => {
    try {
      const contact = await contactService.update(
        request.params.id,
        request.body,
        { userId: request.user.id } // For audit trail
      )
      return contact
    } catch (error) {
      if (error.code === 'SYNC_CONFLICT') {
        reply.code(409).send({
          error: 'Sync conflict',
          localVersion: error.localVersion,
          remoteVersion: error.remoteVersion,
          conflictResolution: error.suggestedResolution
        })
      }
      throw error
    }
  })

  // DELETE /api/v1/contacts/:id
  fastify.delete('/:id', {
    schema: {
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id']
      },
      response: {
        204: { type: 'null' },
        404: { $ref: 'error#' }
      }
    }
  }, async (request, reply) => {
    await contactService.softDelete(request.params.id)
    reply.code(204).send()
  })
}
```

### 2.3 Real-Time Infrastructure

**Server-Sent Events (SSE) for Push Notifications**

```typescript
// /backend/src/plugins/sse.ts

import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import { EventEmitter } from 'events'

export class SSEManager extends EventEmitter {
  private clients = new Map<string, Set<Response>>()

  addClient(userId: string, response: Response) {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set())
    }
    this.clients.get(userId)!.add(response)

    // Cleanup on disconnect
    response.on('close', () => {
      this.removeClient(userId, response)
    })
  }

  removeClient(userId: string, response: Response) {
    const userClients = this.clients.get(userId)
    if (userClients) {
      userClients.delete(response)
      if (userClients.size === 0) {
        this.clients.delete(userId)
      }
    }
  }

  broadcast(event: string, data: any, userId?: string) {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`

    if (userId) {
      // Send to specific user
      const userClients = this.clients.get(userId)
      if (userClients) {
        userClients.forEach(client => {
          client.write(message)
        })
      }
    } else {
      // Broadcast to all
      this.clients.forEach(clients => {
        clients.forEach(client => {
          client.write(message)
        })
      })
    }
  }
}

export const SSEPlugin: FastifyPluginAsync = fp(async (fastify) => {
  const sseManager = new SSEManager()

  // Decorate fastify with SSE manager
  fastify.decorate('sse', sseManager)

  // SSE endpoint
  fastify.get('/api/v1/events', async (request, reply) => {
    const userId = request.user.id

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no' // Disable nginx buffering
    })

    // Send initial connection message
    reply.raw.write(`event: connected\ndata: {"status":"connected","userId":"${userId}"}\n\n`)

    // Add client to manager
    sseManager.addClient(userId, reply.raw)

    // Keep connection alive with heartbeat
    const heartbeat = setInterval(() => {
      reply.raw.write(': heartbeat\n\n')
    }, 30000) // Every 30 seconds

    // Cleanup on close
    reply.raw.on('close', () => {
      clearInterval(heartbeat)
      sseManager.removeClient(userId, reply.raw)
    })
  })
})
```

**Redis PubSub for Multi-Instance Coordination**

```typescript
// /backend/src/services/redis.service.ts

import Redis from 'ioredis'

export class RedisService {
  private publisher: Redis
  private subscriber: Redis

  constructor() {
    this.publisher = new Redis(process.env.REDIS_URL)
    this.subscriber = new Redis(process.env.REDIS_URL)
  }

  async publish(channel: string, message: any) {
    await this.publisher.publish(channel, JSON.stringify(message))
  }

  subscribe(channel: string, handler: (message: any) => void) {
    this.subscriber.subscribe(channel)
    this.subscriber.on('message', (ch, msg) => {
      if (ch === channel) {
        handler(JSON.parse(msg))
      }
    })
  }
}

// Usage in sync engine
const redis = new RedisService()

// When data changes in PostgreSQL, broadcast to all instances
await redis.publish('contact.updated', {
  contactId: '123',
  userId: 'user-456',
  timestamp: new Date().toISOString(),
  changes: { email: 'new@email.com' }
})

// All backend instances receive and forward to their SSE clients
redis.subscribe('contact.updated', async (event) => {
  fastify.sse.broadcast('contact.updated', event, event.userId)
})
```

### 2.4 Bi-Directional Sync Engine

```typescript
// /backend/src/services/sync.service.ts

import { DatabaseService } from './database.service'
import { GHLService } from './ghl.service'
import { ConflictResolver } from './conflict-resolver'

export class SyncService {
  constructor(
    private db: DatabaseService,
    private ghl: GHLService,
    private conflictResolver: ConflictResolver
  ) {}

  /**
   * Pull changes from GoHighLevel
   */
  async pullFromGHL(userId: string, lastSyncTime: Date) {
    const ghlContacts = await this.ghl.getContactsSince(lastSyncTime)

    for (const ghlContact of ghlContacts) {
      const localContact = await this.db.contacts.findByGhlId(ghlContact.id)

      if (!localContact) {
        // New contact - create locally
        await this.db.contacts.create({
          ...this.mapGHLContact(ghlContact),
          syncStatus: 'synced',
          lastSyncedAt: new Date()
        })
      } else if (localContact.localChanges) {
        // Conflict - both changed since last sync
        const resolution = await this.conflictResolver.resolve(
          localContact,
          ghlContact,
          'contact'
        )

        if (resolution.strategy === 'merge') {
          await this.db.contacts.update(localContact.id, resolution.merged)
        } else if (resolution.strategy === 'remote_wins') {
          await this.db.contacts.update(localContact.id, this.mapGHLContact(ghlContact))
        }
        // 'local_wins' = do nothing, will push to GHL

        await this.db.contacts.update(localContact.id, {
          syncStatus: 'synced',
          lastSyncedAt: new Date(),
          localChanges: false
        })
      } else {
        // Remote changed, no local changes - update
        await this.db.contacts.update(localContact.id, {
          ...this.mapGHLContact(ghlContact),
          syncStatus: 'synced',
          lastSyncedAt: new Date()
        })
      }
    }
  }

  /**
   * Push local changes to GoHighLevel
   */
  async pushToGHL(userId: string) {
    const pendingContacts = await this.db.contacts.findPending()

    for (const contact of pendingContacts) {
      try {
        if (!contact.ghlContactId) {
          // Create new in GHL
          const ghlContact = await this.ghl.createContact(
            this.mapLocalContact(contact)
          )
          await this.db.contacts.update(contact.id, {
            ghlContactId: ghlContact.id,
            syncStatus: 'synced',
            lastSyncedAt: new Date(),
            localChanges: false
          })
        } else {
          // Update existing
          await this.ghl.updateContact(
            contact.ghlContactId,
            this.mapLocalContact(contact)
          )
          await this.db.contacts.update(contact.id, {
            syncStatus: 'synced',
            lastSyncedAt: new Date(),
            localChanges: false
          })
        }
      } catch (error) {
        await this.db.contacts.update(contact.id, {
          syncStatus: 'error',
          syncError: error.message
        })
      }
    }
  }

  /**
   * Bi-directional sync - orchestrates pull + push
   */
  async syncBidirectional(userId: string) {
    const lastSync = await this.db.syncState.getLastSync(userId)

    // Pull first to get latest from GHL
    await this.pullFromGHL(userId, lastSync)

    // Then push local changes
    await this.pushToGHL(userId)

    // Update sync timestamp
    await this.db.syncState.updateLastSync(userId, new Date())
  }
}
```

**Conflict Resolution Strategy**

```typescript
// /backend/src/services/conflict-resolver.ts

export interface ConflictResolution {
  strategy: 'local_wins' | 'remote_wins' | 'merge' | 'manual'
  merged?: any
  requiresUserInput?: boolean
}

export class ConflictResolver {
  /**
   * Automatic conflict resolution rules
   */
  async resolve(
    local: any,
    remote: any,
    entityType: 'contact' | 'conversation' | 'message'
  ): Promise<ConflictResolution> {

    // Rule 1: Most recent timestamp wins for simple fields
    if (local.updatedAt > remote.updatedAt) {
      return { strategy: 'local_wins' }
    } else if (remote.updatedAt > local.updatedAt) {
      return { strategy: 'remote_wins' }
    }

    // Rule 2: Merge non-conflicting fields
    const merged = this.mergeObjects(local, remote)
    if (merged.hasConflicts) {
      // Fields genuinely conflict - needs manual resolution
      return {
        strategy: 'manual',
        requiresUserInput: true,
        merged: merged.data
      }
    }

    return {
      strategy: 'merge',
      merged: merged.data
    }
  }

  private mergeObjects(local: any, remote: any) {
    const merged: any = {}
    const conflicts: string[] = []

    const allKeys = new Set([...Object.keys(local), ...Object.keys(remote)])

    for (const key of allKeys) {
      if (local[key] === remote[key]) {
        merged[key] = local[key]
      } else if (local[key] && !remote[key]) {
        merged[key] = local[key]
      } else if (!local[key] && remote[key]) {
        merged[key] = remote[key]
      } else {
        // Actual conflict
        conflicts.push(key)
        merged[key] = remote[key] // Default to remote for auto-merge
      }
    }

    return {
      data: merged,
      hasConflicts: conflicts.length > 0,
      conflicts
    }
  }
}
```

---

## 3. DATABASE DESIGN

### 3.1 PostgreSQL Schema (Primary Database)

```sql
-- /backend/db/migrations/001_initial_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  password_hash VARCHAR(255),
  ghl_location_id VARCHAR(255),
  ghl_access_token TEXT,
  ghl_refresh_token TEXT,
  ghl_token_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Contacts table
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Basic info
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  tags TEXT[], -- PostgreSQL array
  custom_fields JSONB,

  -- GHL integration
  ghl_contact_id VARCHAR(255),
  ghl_location_id VARCHAR(255),

  -- Metadata
  source VARCHAR(50) DEFAULT 'manual',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_synced_at TIMESTAMP,

  -- Sync state
  sync_status VARCHAR(20) DEFAULT 'pending',
  sync_error TEXT,
  local_changes BOOLEAN DEFAULT FALSE,

  -- Soft delete
  deleted_at TIMESTAMP,

  -- Constraints
  UNIQUE(user_id, ghl_contact_id)
);

-- Indexes for performance
CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_contacts_ghl_contact_id ON contacts(ghl_contact_id);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_phone ON contacts(phone);
CREATE INDEX idx_contacts_tags ON contacts USING GIN(tags);
CREATE INDEX idx_contacts_sync_status ON contacts(sync_status, updated_at);
CREATE INDEX idx_contacts_deleted_at ON contacts(deleted_at) WHERE deleted_at IS NULL;

-- Full-text search index
CREATE INDEX idx_contacts_search ON contacts
  USING GIN(to_tsvector('english',
    COALESCE(first_name, '') || ' ' ||
    COALESCE(last_name, '') || ' ' ||
    COALESCE(email, '')
  ));


-- Conversations table
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,

  channel VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'open',
  assigned_to UUID REFERENCES users(id),
  last_message_at TIMESTAMP,
  unread_count INTEGER DEFAULT 0,

  -- GHL integration
  ghl_conversation_id VARCHAR(255),
  ghl_location_id VARCHAR(255),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_synced_at TIMESTAMP,
  sync_status VARCHAR(20) DEFAULT 'pending',

  UNIQUE(user_id, ghl_conversation_id)
);

CREATE INDEX idx_conversations_contact_id ON conversations(contact_id);
CREATE INDEX idx_conversations_status ON conversations(status, last_message_at);
CREATE INDEX idx_conversations_channel ON conversations(channel, status);
CREATE INDEX idx_conversations_unread ON conversations(unread_count, last_message_at);


-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,

  direction VARCHAR(10) NOT NULL, -- 'inbound' or 'outbound'
  body TEXT,
  attachments JSONB,

  sent_at TIMESTAMP NOT NULL,
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,

  sender_id UUID,
  sender_type VARCHAR(20), -- 'user', 'contact', 'ai'

  ghl_message_id VARCHAR(255),

  created_at TIMESTAMP DEFAULT NOW(),
  sync_status VARCHAR(20) DEFAULT 'pending',

  UNIQUE(conversation_id, ghl_message_id)
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id, sent_at DESC);
CREATE INDEX idx_messages_sync_status ON messages(sync_status, created_at);
CREATE INDEX idx_messages_direction ON messages(direction, sent_at);

-- Full-text search on message body
CREATE INDEX idx_messages_search ON messages USING GIN(to_tsvector('english', body));


-- Sync state tracking
CREATE TABLE sync_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL,
  last_sync_at TIMESTAMP,
  last_pull_at TIMESTAMP,
  last_push_at TIMESTAMP,
  sync_cursor VARCHAR(255),

  UNIQUE(user_id, entity_type)
);


-- Audit log for compliance and debugging
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  entity_type VARCHAR(50),
  entity_id UUID,
  action VARCHAR(50),
  changes JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user_id ON audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);


-- Update triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**WHY PostgreSQL:**
- **JSONB**: Native JSON support for flexible custom fields
- **Arrays**: Native array type for tags (better than JOIN tables)
- **Full-text search**: Built-in FTS without separate service
- **ACID compliance**: Critical for sync conflict resolution
- **Mature ecosystem**: Battle-tested, reliable, well-documented
- **Performance**: Handles millions of rows efficiently

**WHY NOT MongoDB:**
- Sync conflict resolution requires ACID transactions
- Complex joins needed for conversations + messages + contacts
- PostgreSQL JSONB gives us schema + flexibility

### 3.2 Local-First Sync Strategy

```typescript
// /src/db/replication.ts

import type { RxDatabase } from 'rxdb'
import { replicateRxCollection } from 'rxdb/plugins/replication'

export async function setupReplication(db: RxDatabase) {

  // Contacts replication
  const contactReplication = replicateRxCollection({
    collection: db.contacts,
    replicationIdentifier: 'contacts-sync',

    pull: {
      async handler(checkpoint, batchSize) {
        const response = await fetch('/api/v1/sync/contacts/pull', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            checkpoint,
            batchSize
          })
        })

        const data = await response.json()

        return {
          documents: data.documents,
          checkpoint: data.checkpoint
        }
      },
      batchSize: 50,
      modifier: (doc) => doc // Transform if needed
    },

    push: {
      async handler(docs) {
        const response = await fetch('/api/v1/sync/contacts/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documents: docs })
        })

        return await response.json()
      },
      batchSize: 50,
      modifier: (doc) => doc
    },

    // Live replication - instant updates
    live: true,

    // Retry strategy
    retryTime: 5000, // 5 seconds
    autoStart: true,

    // Deletion handling
    deletedField: 'deletedAt',

    // Pull interval when not using SSE
    pull: {
      interval: 60000 // 1 minute fallback
    }
  })

  // Error handling
  contactReplication.error$.subscribe(error => {
    console.error('Replication error:', error)
    // Show user notification
  })

  // Active state - show sync indicator
  contactReplication.active$.subscribe(active => {
    console.log('Replication active:', active)
  })

  return contactReplication
}
```

---

## 4. MCP SERVER ARCHITECTURE

### 4.1 MCP Server Design for PAI Integration

**Core Concept:** Each domain (Contacts, Conversations, Analytics) gets its own MCP server. PAI connects to these servers to interact with the dashboard programmatically.

```
┌─────────────────────────────────────────────────────────────┐
│                    PAI (Claude Agent)                        │
└─────────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ MCP Server:  │  │ MCP Server:  │  │ MCP Server:  │
│  Contacts    │  │Conversations │  │  Analytics   │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       └─────────────────┼─────────────────┘
                         │
              ┌──────────▼──────────┐
              │  Backend API Layer  │
              │   (Fastify + WS)    │
              └──────────┬──────────┘
                         │
              ┌──────────▼──────────┐
              │   PostgreSQL + Redis│
              └─────────────────────┘
```

### 4.2 MCP Server Implementation

```typescript
// /mcp-servers/contacts/src/server.ts

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { ContactsAPI } from './api-client.js'

const server = new Server(
  {
    name: 'pai-dashboard-contacts',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
)

const contactsAPI = new ContactsAPI(process.env.API_BASE_URL)

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'search_contacts',
        description: 'Search contacts by name, email, phone, or tags',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query (name, email, or phone)'
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by tags'
            },
            limit: {
              type: 'number',
              description: 'Max results to return',
              default: 20
            }
          }
        }
      },
      {
        name: 'get_contact',
        description: 'Get full details of a specific contact by ID',
        inputSchema: {
          type: 'object',
          properties: {
            contactId: {
              type: 'string',
              description: 'Contact ID (UUID)'
            }
          },
          required: ['contactId']
        }
      },
      {
        name: 'create_contact',
        description: 'Create a new contact',
        inputSchema: {
          type: 'object',
          properties: {
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            customFields: { type: 'object' }
          },
          required: ['email']
        }
      },
      {
        name: 'update_contact',
        description: 'Update an existing contact',
        inputSchema: {
          type: 'object',
          properties: {
            contactId: { type: 'string' },
            updates: {
              type: 'object',
              properties: {
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                email: { type: 'string' },
                phone: { type: 'string' },
                tags: { type: 'array', items: { type: 'string' } }
              }
            }
          },
          required: ['contactId', 'updates']
        }
      },
      {
        name: 'delete_contact',
        description: 'Soft delete a contact (can be restored)',
        inputSchema: {
          type: 'object',
          properties: {
            contactId: { type: 'string' }
          },
          required: ['contactId']
        }
      },
      {
        name: 'add_tags',
        description: 'Add tags to a contact',
        inputSchema: {
          type: 'object',
          properties: {
            contactId: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } }
          },
          required: ['contactId', 'tags']
        }
      },
      {
        name: 'remove_tags',
        description: 'Remove tags from a contact',
        inputSchema: {
          type: 'object',
          properties: {
            contactId: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } }
          },
          required: ['contactId', 'tags']
        }
      }
    ]
  }
})

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    switch (name) {
      case 'search_contacts': {
        const results = await contactsAPI.search({
          query: args.query,
          tags: args.tags,
          limit: args.limit || 20
        })

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2)
            }
          ]
        }
      }

      case 'get_contact': {
        const contact = await contactsAPI.getById(args.contactId)

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(contact, null, 2)
            }
          ]
        }
      }

      case 'create_contact': {
        const newContact = await contactsAPI.create({
          firstName: args.firstName,
          lastName: args.lastName,
          email: args.email,
          phone: args.phone,
          tags: args.tags || [],
          customFields: args.customFields || {}
        })

        return {
          content: [
            {
              type: 'text',
              text: `Contact created successfully:\n${JSON.stringify(newContact, null, 2)}`
            }
          ]
        }
      }

      case 'update_contact': {
        const updated = await contactsAPI.update(args.contactId, args.updates)

        return {
          content: [
            {
              type: 'text',
              text: `Contact updated:\n${JSON.stringify(updated, null, 2)}`
            }
          ]
        }
      }

      case 'delete_contact': {
        await contactsAPI.delete(args.contactId)

        return {
          content: [
            {
              type: 'text',
              text: `Contact ${args.contactId} deleted successfully`
            }
          ]
        }
      }

      case 'add_tags': {
        const updated = await contactsAPI.addTags(args.contactId, args.tags)

        return {
          content: [
            {
              type: 'text',
              text: `Tags added. Updated contact:\n${JSON.stringify(updated, null, 2)}`
            }
          ]
        }
      }

      case 'remove_tags': {
        const updated = await contactsAPI.removeTags(args.contactId, args.tags)

        return {
          content: [
            {
              type: 'text',
              text: `Tags removed. Updated contact:\n${JSON.stringify(updated, null, 2)}`
            }
          ]
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`
        }
      ],
      isError: true
    }
  }
})

// Resources - expose contacts as readable resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'contact://list',
        name: 'All Contacts',
        description: 'List all contacts in the system',
        mimeType: 'application/json'
      }
    ]
  }
})

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params

  if (uri === 'contact://list') {
    const contacts = await contactsAPI.list({ limit: 1000 })
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(contacts, null, 2)
        }
      ]
    }
  }

  throw new Error(`Unknown resource: ${uri}`)
})

// Start server
const transport = new StdioServerTransport()
await server.connect(transport)
console.error('Contacts MCP Server running on stdio')
```

**Conversations MCP Server**

```typescript
// /mcp-servers/conversations/src/server.ts

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

const server = new Server(
  {
    name: 'pai-dashboard-conversations',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
)

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_conversations',
        description: 'Get all conversations, optionally filtered by contact',
        inputSchema: {
          type: 'object',
          properties: {
            contactId: { type: 'string' },
            status: {
              type: 'string',
              enum: ['open', 'closed', 'snoozed', 'archived']
            },
            channel: {
              type: 'string',
              enum: ['sms', 'email', 'whatsapp', 'facebook', 'instagram', 'webchat']
            },
            limit: { type: 'number', default: 20 }
          }
        }
      },
      {
        name: 'get_messages',
        description: 'Get messages in a conversation',
        inputSchema: {
          type: 'object',
          properties: {
            conversationId: { type: 'string' },
            limit: { type: 'number', default: 50 }
          },
          required: ['conversationId']
        }
      },
      {
        name: 'send_message',
        description: 'Send a message in a conversation',
        inputSchema: {
          type: 'object',
          properties: {
            conversationId: { type: 'string' },
            body: { type: 'string' },
            attachments: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  url: { type: 'string' },
                  type: { type: 'string' },
                  filename: { type: 'string' }
                }
              }
            }
          },
          required: ['conversationId', 'body']
        }
      },
      {
        name: 'update_conversation_status',
        description: 'Update conversation status (open/closed/snoozed/archived)',
        inputSchema: {
          type: 'object',
          properties: {
            conversationId: { type: 'string' },
            status: {
              type: 'string',
              enum: ['open', 'closed', 'snoozed', 'archived']
            }
          },
          required: ['conversationId', 'status']
        }
      },
      {
        name: 'assign_conversation',
        description: 'Assign conversation to a user',
        inputSchema: {
          type: 'object',
          properties: {
            conversationId: { type: 'string' },
            userId: { type: 'string' }
          },
          required: ['conversationId', 'userId']
        }
      }
    ]
  }
})

// ... similar handler implementation
```

### 4.3 MCP Configuration for PAI

```json
// /home/user/.claude/mcp.json

{
  "mcpServers": {
    "pai-dashboard-contacts": {
      "command": "node",
      "args": ["/home/user/pai-dashboard/mcp-servers/contacts/dist/index.js"],
      "env": {
        "API_BASE_URL": "http://localhost:3001/api/v1",
        "API_KEY": "${PAI_DASHBOARD_API_KEY}"
      }
    },
    "pai-dashboard-conversations": {
      "command": "node",
      "args": ["/home/user/pai-dashboard/mcp-servers/conversations/dist/index.js"],
      "env": {
        "API_BASE_URL": "http://localhost:3001/api/v1",
        "API_KEY": "${PAI_DASHBOARD_API_KEY}"
      }
    },
    "pai-dashboard-analytics": {
      "command": "node",
      "args": ["/home/user/pai-dashboard/mcp-servers/analytics/dist/index.js"],
      "env": {
        "API_BASE_URL": "http://localhost:3001/api/v1",
        "API_KEY": "${PAI_DASHBOARD_API_KEY}"
      }
    }
  }
}
```

**Example PAI Usage:**

```
User: "Show me all contacts tagged with 'hot-lead' who haven't been contacted in the last 7 days"

PAI:
1. Calls MCP tool: search_contacts({ tags: ['hot-lead'], limit: 100 })
2. Filters results by lastContactedAt < 7 days ago
3. Calls get_conversations({ contactId: each_contact_id })
4. Analyzes and presents results

User: "Send them all a follow-up SMS"

PAI:
1. For each contact:
   - Calls send_message({ conversationId, body: "personalized message" })
2. Reports success/failure
```

---

## 5. REAL-TIME SYNC PATTERNS

### 5.1 SSE vs WebSocket Decision Matrix

| Feature | SSE | WebSocket | Our Choice |
|---------|-----|-----------|------------|
| Bi-directional | ❌ No | ✅ Yes | **SSE for dashboard updates** |
| Server Push | ✅ Yes | ✅ Yes | **WebSocket for MCP control** |
| Complexity | ⭐ Simple | ⭐⭐⭐ Complex | SSE preferred where possible |
| Auto-reconnect | ✅ Built-in | ❌ Manual | SSE advantage |
| Firewall friendly | ✅ HTTP | ⚠️ Some blocked | SSE advantage |
| Overhead | ⭐ Low | ⭐⭐ Medium | SSE more efficient |
| Use case | Data feeds | Interactive apps | Both needed |

**Our Strategy:**
- **SSE**: Dashboard real-time updates (contacts, messages, sync status)
- **WebSocket**: MCP AI control channel (bidirectional commands)

### 5.2 Event-Driven Architecture

```typescript
// /backend/src/events/event-bus.ts

import { EventEmitter } from 'events'
import type { FastifyInstance } from 'fastify'

export enum DashboardEvent {
  CONTACT_CREATED = 'contact.created',
  CONTACT_UPDATED = 'contact.updated',
  CONTACT_DELETED = 'contact.deleted',
  CONVERSATION_UPDATED = 'conversation.updated',
  MESSAGE_RECEIVED = 'message.received',
  MESSAGE_SENT = 'message.sent',
  SYNC_STARTED = 'sync.started',
  SYNC_COMPLETED = 'sync.completed',
  SYNC_ERROR = 'sync.error',
}

export interface EventPayload {
  userId: string
  timestamp: string
  data: any
}

export class DashboardEventBus extends EventEmitter {
  constructor(private fastify: FastifyInstance) {
    super()
    this.setupEventHandlers()
  }

  private setupEventHandlers() {
    // When events are emitted, broadcast to SSE clients
    this.on(DashboardEvent.CONTACT_CREATED, (payload: EventPayload) => {
      this.fastify.sse.broadcast('contact.created', payload.data, payload.userId)
    })

    this.on(DashboardEvent.CONTACT_UPDATED, (payload: EventPayload) => {
      this.fastify.sse.broadcast('contact.updated', payload.data, payload.userId)
    })

    this.on(DashboardEvent.MESSAGE_RECEIVED, (payload: EventPayload) => {
      this.fastify.sse.broadcast('message.received', payload.data, payload.userId)

      // Also trigger notification
      this.emit('notification.create', {
        userId: payload.userId,
        type: 'new_message',
        data: payload.data
      })
    })

    this.on(DashboardEvent.SYNC_COMPLETED, (payload: EventPayload) => {
      this.fastify.sse.broadcast('sync.completed', {
        timestamp: payload.timestamp,
        stats: payload.data
      }, payload.userId)
    })
  }

  publish(event: DashboardEvent, payload: EventPayload) {
    this.emit(event, payload)

    // Also publish to Redis for multi-instance coordination
    this.fastify.redis.publish(`dashboard:${event}`, JSON.stringify(payload))
  }
}


// Usage in service
class ContactService {
  async create(data: CreateContactDTO, userId: string) {
    const contact = await this.db.contacts.create(data)

    // Emit event
    this.eventBus.publish(DashboardEvent.CONTACT_CREATED, {
      userId,
      timestamp: new Date().toISOString(),
      data: contact
    })

    return contact
  }
}
```

### 5.3 Hot Reloading Implementation

```typescript
// /src/hooks/useRealtimeSync.ts

import { useEffect } from 'react'
import { useRxDatabase } from '@/db/RxDBProvider'

export function useRealtimeSync() {
  const db = useRxDatabase()

  useEffect(() => {
    // Connect to SSE endpoint
    const eventSource = new EventSource('/api/v1/events', {
      withCredentials: true
    })

    eventSource.addEventListener('contact.updated', async (event) => {
      const contact = JSON.parse(event.data)

      // RxDB will automatically update reactive queries
      await db.contacts.upsert(contact)
    })

    eventSource.addEventListener('message.received', async (event) => {
      const message = JSON.parse(event.data)

      // Update message in local DB
      await db.messages.upsert(message)

      // Update conversation unread count
      await db.conversations.findOne(message.conversationId).update({
        $inc: { unreadCount: 1 },
        $set: { lastMessageAt: message.sentAt }
      })

      // Show notification
      if (Notification.permission === 'granted') {
        new Notification('New message', {
          body: message.body.substring(0, 100),
          tag: message.conversationId
        })
      }
    })

    eventSource.addEventListener('sync.completed', (event) => {
      const { stats } = JSON.parse(event.data)
      console.log('Sync completed:', stats)
      // Show toast notification
    })

    eventSource.onerror = (error) => {
      console.error('SSE error:', error)
      // Implement exponential backoff reconnection
    }

    return () => {
      eventSource.close()
    }
  }, [db])
}
```

---

## 6. GOHIGHLEVEL INTEGRATION

### 6.1 GHL API Client

```typescript
// /backend/src/integrations/ghl/client.ts

import axios, { type AxiosInstance } from 'axios'

export class GHLClient {
  private client: AxiosInstance

  constructor(
    private locationId: string,
    private accessToken: string
  ) {
    this.client = axios.create({
      baseURL: 'https://services.leadconnectorhq.com',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json'
      }
    })
  }

  // Contacts
  async getContacts(params?: {
    limit?: number
    startAfterId?: string
    startAfter?: number
  }) {
    const response = await this.client.get(`/contacts/`, {
      params: {
        locationId: this.locationId,
        ...params
      }
    })
    return response.data
  }

  async getContact(contactId: string) {
    const response = await this.client.get(`/contacts/${contactId}`)
    return response.data.contact
  }

  async createContact(data: any) {
    const response = await this.client.post('/contacts/', {
      locationId: this.locationId,
      ...data
    })
    return response.data.contact
  }

  async updateContact(contactId: string, data: any) {
    const response = await this.client.put(`/contacts/${contactId}`, data)
    return response.data.contact
  }

  async deleteContact(contactId: string) {
    await this.client.delete(`/contacts/${contactId}`)
  }

  // Conversations
  async getConversations(contactId: string) {
    const response = await this.client.get(`/conversations/search`, {
      params: {
        locationId: this.locationId,
        contactId
      }
    })
    return response.data.conversations
  }

  async getMessages(conversationId: string, params?: {
    limit?: number
    lastMessageId?: string
  }) {
    const response = await this.client.get(
      `/conversations/${conversationId}/messages`,
      { params }
    )
    return response.data.messages
  }

  async sendMessage(conversationId: string, data: {
    type: 'SMS' | 'Email' | 'WhatsApp'
    message: string
    attachments?: string[]
  }) {
    const response = await this.client.post(
      `/conversations/${conversationId}/messages`,
      data
    )
    return response.data
  }
}
```

### 6.2 Webhook Handler

```typescript
// /backend/src/routes/webhooks/ghl.ts

import type { FastifyPluginAsync } from 'fastify'
import crypto from 'crypto'
import { DashboardEventBus, DashboardEvent } from '@/events/event-bus'

export const ghlWebhookRoutes: FastifyPluginAsync = async (fastify) => {

  fastify.post('/ghl', {
    config: {
      rawBody: true // Need raw body for signature verification
    }
  }, async (request, reply) => {

    // Verify webhook signature
    const signature = request.headers['x-ghl-signature'] as string
    const isValid = verifyGHLSignature(
      request.rawBody,
      signature,
      process.env.GHL_WEBHOOK_SECRET
    )

    if (!isValid) {
      reply.code(401).send({ error: 'Invalid signature' })
      return
    }

    const event = request.body as any

    // Process webhook based on type
    switch (event.type) {
      case 'ContactCreate':
      case 'ContactUpdate':
        await handleContactEvent(event)
        break

      case 'InboundMessage':
        await handleInboundMessage(event)
        break

      case 'OutboundMessage':
        await handleOutboundMessage(event)
        break

      case 'ConversationUnreadUpdate':
        await handleConversationUpdate(event)
        break

      default:
        fastify.log.warn(`Unhandled webhook type: ${event.type}`)
    }

    reply.code(200).send({ received: true })
  })
}

async function handleContactEvent(event: any) {
  const { contact, locationId } = event

  // Find user by location ID
  const user = await db.users.findByGHLLocation(locationId)
  if (!user) return

  // Upsert contact in database
  const existingContact = await db.contacts.findByGHLId(contact.id)

  if (existingContact) {
    await db.contacts.update(existingContact.id, {
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      tags: contact.tags,
      customFields: contact.customFields,
      lastSyncedAt: new Date(),
      syncStatus: 'synced'
    })

    // Broadcast update event
    fastify.eventBus.publish(DashboardEvent.CONTACT_UPDATED, {
      userId: user.id,
      timestamp: new Date().toISOString(),
      data: existingContact
    })
  } else {
    const newContact = await db.contacts.create({
      userId: user.id,
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      tags: contact.tags,
      customFields: contact.customFields,
      ghlContactId: contact.id,
      ghlLocationId: locationId,
      source: 'ghl',
      syncStatus: 'synced',
      lastSyncedAt: new Date()
    })

    fastify.eventBus.publish(DashboardEvent.CONTACT_CREATED, {
      userId: user.id,
      timestamp: new Date().toISOString(),
      data: newContact
    })
  }
}

async function handleInboundMessage(event: any) {
  const { message, conversationId, contactId, locationId } = event

  const user = await db.users.findByGHLLocation(locationId)
  if (!user) return

  // Create message in database
  const newMessage = await db.messages.create({
    conversationId,
    direction: 'inbound',
    body: message.body,
    attachments: message.attachments || [],
    sentAt: new Date(message.dateAdded),
    senderId: contactId,
    senderType: 'contact',
    ghlMessageId: message.id,
    syncStatus: 'synced'
  })

  // Update conversation
  await db.conversations.updateOne({
    ghlConversationId: conversationId
  }, {
    $inc: { unreadCount: 1 },
    $set: { lastMessageAt: new Date(message.dateAdded) }
  })

  // Broadcast real-time update
  fastify.eventBus.publish(DashboardEvent.MESSAGE_RECEIVED, {
    userId: user.id,
    timestamp: new Date().toISOString(),
    data: newMessage
  })
}

function verifyGHLSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(payload)
  const computed = hmac.digest('hex')
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(computed)
  )
}
```

---

## 7. AUTHENTICATION & SECURITY

### 7.1 Authentication Strategy

**OAuth 2.1 + JWT Hybrid**

```typescript
// /backend/src/auth/oauth.ts

import { OAuth2Client } from '@fastify/oauth2'

// OAuth providers
fastify.register(require('@fastify/oauth2'), {
  name: 'googleOAuth2',
  scope: ['profile', 'email'],
  credentials: {
    client: {
      id: process.env.GOOGLE_CLIENT_ID,
      secret: process.env.GOOGLE_CLIENT_SECRET
    },
    auth: {
      authorizeHost: 'https://accounts.google.com',
      authorizePath: '/o/oauth2/v2/auth',
      tokenHost: 'https://www.googleapis.com',
      tokenPath: '/oauth2/v4/token'
    }
  },
  startRedirectPath: '/auth/google',
  callbackUri: `${process.env.API_URL}/auth/google/callback`
})

// GHL OAuth for API access
fastify.register(require('@fastify/oauth2'), {
  name: 'ghlOAuth2',
  scope: ['contacts.readonly', 'contacts.write', 'conversations.readonly', 'conversations.write'],
  credentials: {
    client: {
      id: process.env.GHL_CLIENT_ID,
      secret: process.env.GHL_CLIENT_SECRET
    },
    auth: {
      authorizeHost: 'https://marketplace.gohighlevel.com',
      authorizePath: '/oauth/chooselocation',
      tokenHost: 'https://services.leadconnectorhq.com',
      tokenPath: '/oauth/token'
    }
  },
  startRedirectPath: '/auth/ghl',
  callbackUri: `${process.env.API_URL}/auth/ghl/callback`
})

// JWT token generation
import jwt from 'jsonwebtoken'

export function generateTokens(userId: string) {
  const accessToken = jwt.sign(
    { userId, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  )

  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  )

  return { accessToken, refreshToken }
}
```

### 7.2 Security Middleware

```typescript
// /backend/src/plugins/auth.ts

import type { FastifyPluginAsync } from 'fastify'
import jwt from 'jsonwebtoken'

export const authPlugin: FastifyPluginAsync = async (fastify) => {

  fastify.decorate('authenticate', async (request, reply) => {
    try {
      const token = request.headers.authorization?.replace('Bearer ', '')

      if (!token) {
        throw new Error('No token provided')
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET)

      if (decoded.type !== 'access') {
        throw new Error('Invalid token type')
      }

      const user = await fastify.db.users.findById(decoded.userId)

      if (!user) {
        throw new Error('User not found')
      }

      request.user = user

    } catch (error) {
      reply.code(401).send({ error: 'Unauthorized' })
    }
  })

  // Rate limiting
  await fastify.register(import('@fastify/rate-limit'), {
    max: 100,
    timeWindow: '1 minute',
    cache: 10000,
    allowList: ['127.0.0.1'],
    redis: fastify.redis,
    nameSpace: 'rate-limit:',
    continueExceeding: false,
    skipOnError: false
  })
}
```

### 7.3 API Key for MCP Servers

```typescript
// /backend/src/middleware/mcp-auth.ts

export async function mcpAuth(request: FastifyRequest, reply: FastifyReply) {
  const apiKey = request.headers['x-api-key'] as string

  if (!apiKey) {
    reply.code(401).send({ error: 'API key required' })
    return
  }

  const key = await db.apiKeys.findOne({ key: apiKey, active: true })

  if (!key) {
    reply.code(401).send({ error: 'Invalid API key' })
    return
  }

  // Check rate limits for API key
  const usage = await redis.incr(`api-key:${key.id}:${Date.now()}`)

  if (usage > key.rateLimit) {
    reply.code(429).send({ error: 'Rate limit exceeded' })
    return
  }

  request.user = await db.users.findById(key.userId)
}
```

---

## 8. DEPLOYMENT & SCALABILITY

### 8.1 Docker Configuration

```dockerfile
# /backend/Dockerfile

FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json bun.lockb ./
RUN npm install -g bun && bun install --frozen-lockfile

# Build
COPY . .
RUN bun run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Install bun
RUN npm install -g bun

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

EXPOSE 3001

CMD ["bun", "run", "dist/server.js"]
```

```yaml
# /docker-compose.yml

version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: pai_dashboard
      POSTGRES_USER: pai
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U pai"]
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
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://pai:${DB_PASSWORD}@postgres:5432/pai_dashboard
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
      GHL_CLIENT_ID: ${GHL_CLIENT_ID}
      GHL_CLIENT_SECRET: ${GHL_CLIENT_SECRET}
    ports:
      - "3001:3001"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    environment:
      NEXT_PUBLIC_API_URL: ${API_URL}
    ports:
      - "3000:3000"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### 8.2 AWS Fargate Deployment

```yaml
# /terraform/main.tf

provider "aws" {
  region = "us-east-1"
}

# ECS Cluster
resource "aws_ecs_cluster" "pai_dashboard" {
  name = "pai-dashboard-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# Task Definition
resource "aws_ecs_task_definition" "backend" {
  family                   = "pai-dashboard-backend"
  requires_compatibilities = ["FARGATE"]
  network_mode            = "awsvpc"
  cpu                     = "512"
  memory                  = "1024"

  container_definitions = jsonencode([
    {
      name  = "backend"
      image = "${aws_ecr_repository.backend.repository_url}:latest"

      portMappings = [
        {
          containerPort = 3001
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        }
      ]

      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = aws_secretsmanager_secret.db_url.arn
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/pai-dashboard"
          "awslogs-region"        = "us-east-1"
          "awslogs-stream-prefix" = "backend"
        }
      }
    }
  ])
}

# ALB for load balancing
resource "aws_lb" "main" {
  name               = "pai-dashboard-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id
}

# Auto-scaling based on CPU/Memory
resource "aws_appautoscaling_target" "backend" {
  max_capacity       = 10
  min_capacity       = 2
  resource_id        = "service/${aws_ecs_cluster.pai_dashboard.name}/${aws_ecs_service.backend.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "backend_cpu" {
  name               = "backend-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.backend.resource_id
  scalable_dimension = aws_appautoscaling_target.backend.scalable_dimension
  service_namespace  = aws_appautoscaling_target.backend.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70.0
  }
}
```

---

## 9. TESTING STRATEGY

### 9.1 Test Pyramid

```typescript
// /backend/tests/integration/contacts.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { build } from '../helper'

describe('Contacts API', () => {
  let app
  let token

  beforeAll(async () => {
    app = await build()
    // Login and get token
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'test@example.com',
        password: 'password'
      }
    })
    token = response.json().accessToken
  })

  afterAll(async () => {
    await app.close()
  })

  it('should create a contact', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/contacts',
      headers: {
        authorization: `Bearer ${token}`
      },
      payload: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890'
      }
    })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toHaveProperty('id')
    expect(response.json().email).toBe('john@example.com')
  })

  it('should search contacts', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/contacts?search=john',
      headers: {
        authorization: `Bearer ${token}`
      }
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().data.length).toBeGreaterThan(0)
  })
})
```

### 9.2 E2E Testing with Playwright

```typescript
// /frontend/tests/e2e/dashboard.spec.ts

import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard')
  })

  test('should display contacts list', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Contacts' })).toBeVisible()
    await expect(page.getByTestId('contacts-list')).toBeVisible()
  })

  test('should create new contact', async ({ page }) => {
    await page.getByRole('button', { name: 'New Contact' }).click()

    await page.getByLabel('First Name').fill('Jane')
    await page.getByLabel('Last Name').fill('Smith')
    await page.getByLabel('Email').fill('jane@example.com')

    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByText('Contact created')).toBeVisible()
  })

  test('should receive real-time updates', async ({ page }) => {
    // Trigger server-side event
    await page.evaluate(() => {
      const sse = new EventSource('/api/v1/events')
      sse.addEventListener('contact.created', (event) => {
        console.log('Received SSE:', event.data)
      })
    })

    // Wait for update to appear
    await expect(page.getByTestId('contact-123')).toBeVisible()
  })
})
```

---

## 10. IMPLEMENTATION CHECKLISTS

### 10.1 Phase 1: Core Infrastructure (Week 1-4)

**Database Setup**
- [ ] PostgreSQL setup with migrations
- [ ] Create all tables (users, contacts, conversations, messages, sync_state, audit_log)
- [ ] Add indexes and constraints
- [ ] Setup Redis for caching and PubSub
- [ ] Test database connection and queries

**Backend API Foundation**
- [ ] Initialize Fastify server
- [ ] Setup TypeScript configuration
- [ ] Implement authentication middleware (JWT + OAuth)
- [ ] Create base CRUD routes for contacts
- [ ] Create base CRUD routes for conversations
- [ ] Create base CRUD routes for messages
- [ ] Implement request validation schemas
- [ ] Add error handling middleware
- [ ] Setup logging (Pino)
- [ ] Write unit tests for services

**Frontend Foundation**
- [ ] Initialize Next.js 15 project with App Router
- [ ] Setup TypeScript and ESLint
- [ ] Configure Tailwind CSS
- [ ] Create layout components (Sidebar, Header, Main)
- [ ] Setup Zustand for UI state
- [ ] Initialize RxDB with collections
- [ ] Create database schemas
- [ ] Implement authentication flow
- [ ] Build login/signup pages

**Security Checklist**
- [ ] Implement CORS properly
- [ ] Add rate limiting
- [ ] Setup HTTPS/TLS certificates
- [ ] Implement CSRF protection
- [ ] Add input sanitization
- [ ] Setup API key management
- [ ] Implement audit logging
- [ ] Add security headers

**Performance Checklist**
- [ ] Add database query indexes
- [ ] Implement query result caching
- [ ] Setup CDN for static assets
- [ ] Enable compression (gzip/brotli)
- [ ] Optimize bundle size (code splitting)
- [ ] Implement lazy loading for routes
- [ ] Add image optimization

**Documentation Checklist**
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Database schema documentation
- [ ] Setup instructions (README)
- [ ] Environment variables documentation
- [ ] Architecture decision records (ADRs)

### 10.2 Phase 2: MCP Integration (Week 5-7)

**MCP Server Development**
- [ ] Create Contacts MCP server
  - [ ] Implement search_contacts tool
  - [ ] Implement get_contact tool
  - [ ] Implement create_contact tool
  - [ ] Implement update_contact tool
  - [ ] Implement delete_contact tool
  - [ ] Implement tag management tools
  - [ ] Add resource endpoints
  - [ ] Write tests for all tools

- [ ] Create Conversations MCP server
  - [ ] Implement get_conversations tool
  - [ ] Implement get_messages tool
  - [ ] Implement send_message tool
  - [ ] Implement update_conversation_status tool
  - [ ] Implement assign_conversation tool
  - [ ] Add conversation resources
  - [ ] Write tests

- [ ] Create Analytics MCP server
  - [ ] Implement get_stats tool
  - [ ] Implement get_reports tool
  - [ ] Implement export_data tool
  - [ ] Write tests

**MCP Configuration**
- [ ] Create MCP server configuration files
- [ ] Setup environment variables
- [ ] Test MCP server connections
- [ ] Document MCP usage examples
- [ ] Create troubleshooting guide

**AI Control Layer**
- [ ] Implement WebSocket server for bidirectional control
- [ ] Create command queue system
- [ ] Add command authentication
- [ ] Implement command logging
- [ ] Create UI state observation endpoint
- [ ] Test AI-driven workflows

### 10.3 Phase 3: Real-Time Features (Week 8-10)

**SSE Implementation**
- [ ] Create SSE plugin for Fastify
- [ ] Implement SSE client manager
- [ ] Add connection heartbeat
- [ ] Implement reconnection logic
- [ ] Add SSE authentication
- [ ] Create event broadcasting system
- [ ] Test multi-tab support

**Event System**
- [ ] Design event schema
- [ ] Implement event bus
- [ ] Add Redis PubSub integration
- [ ] Create event handlers for all entities
- [ ] Add event filtering
- [ ] Implement event replay capability
- [ ] Write integration tests

**Sync Engine**
- [ ] Implement RxDB replication
- [ ] Create pull handler
- [ ] Create push handler
- [ ] Add conflict resolution
- [ ] Implement retry logic
- [ ] Add sync status tracking
- [ ] Test offline scenarios
- [ ] Test multi-device sync

**GHL Integration**
- [ ] Create GHL API client
- [ ] Implement OAuth flow for GHL
- [ ] Setup webhook endpoints
- [ ] Implement webhook signature verification
- [ ] Create webhook handlers for all event types
- [ ] Add webhook retry logic
- [ ] Test webhook delivery
- [ ] Document GHL setup process

### 10.4 Phase 4: UI & Polish (Week 11-13)

**Dashboard UI**
- [ ] Design contacts list view
- [ ] Design contact detail view
- [ ] Design conversations panel
- [ ] Design message thread view
- [ ] Implement search functionality
- [ ] Add filtering and sorting
- [ ] Create settings page
- [ ] Add dark mode support
- [ ] Implement responsive design

**Real-Time UI Updates**
- [ ] Implement useRealtimeSync hook
- [ ] Add optimistic updates
- [ ] Show sync status indicator
- [ ] Add loading states
- [ ] Implement error handling
- [ ] Add toast notifications
- [ ] Test reactivity

**UX Enhancements**
- [ ] Add keyboard shortcuts
- [ ] Implement command palette
- [ ] Add drag-and-drop
- [ ] Create onboarding flow
- [ ] Add tooltips and help text
- [ ] Implement undo/redo
- [ ] Add accessibility features (ARIA labels, keyboard nav)

**Performance Optimization**
- [ ] Implement virtual scrolling for large lists
- [ ] Add pagination
- [ ] Optimize re-renders
- [ ] Add memoization
- [ ] Implement code splitting
- [ ] Optimize images
- [ ] Run Lighthouse audits

### 10.5 Phase 5: Testing & Launch (Week 14-15)

**Testing**
- [ ] Write unit tests (80% coverage)
- [ ] Write integration tests
- [ ] Write E2E tests
- [ ] Perform load testing
- [ ] Test offline functionality
- [ ] Test sync conflict resolution
- [ ] Security penetration testing
- [ ] Accessibility testing

**Deployment**
- [ ] Create Docker images
- [ ] Setup CI/CD pipeline
- [ ] Configure AWS infrastructure
- [ ] Setup monitoring (CloudWatch, Datadog, Sentry)
- [ ] Configure alerts
- [ ] Setup backup strategy
- [ ] Create disaster recovery plan
- [ ] Perform staging deployment
- [ ] Perform production deployment

**Launch Preparation**
- [ ] Write user documentation
- [ ] Create video tutorials
- [ ] Setup support channels
- [ ] Prepare rollback plan
- [ ] Train support team
- [ ] Create launch checklist
- [ ] Perform final security audit

---

## CONCLUSION & NEXT STEPS

This architecture provides a **production-ready, scalable, AI-native** dashboard that enables both human and AI interaction through:

1. **Offline-first architecture** with RxDB for instant performance
2. **Real-time synchronization** using SSE and WebSocket
3. **MCP server integration** for complete AI control
4. **Bi-directional sync** with GoHighLevel
5. **Event-driven architecture** for hot reloading
6. **Security-first design** with OAuth, JWT, and API keys
7. **Horizontal scalability** with containerized microservices

**Key Differentiators:**
- **AI-Native**: Built for AI interaction via MCP, not an afterthought
- **Local-First**: Works perfectly offline with intelligent sync
- **Real-Time**: Sub-second updates across all connected clients
- **Scalable**: Designed to handle millions of records efficiently
- **Modern Stack**: Uses 2025's best practices and technologies

**Recommended Next Steps:**
1. Review and approve architecture
2. Setup development environment
3. Begin Phase 1: Core Infrastructure
4. Establish development cadence with weekly demos
5. Prioritize MCP integration early for AI testing

**Resources & Documentation:**
- [Next.js 15 SSE Guide](https://hackernoon.com/streaming-in-nextjs-15-websockets-vs-server-sent-events)
- [MCP Architecture Docs](https://modelcontextprotocol.io/specification/2025-06-18/architecture)
- [RxDB Replication Guide](https://rxdb.info/replication.html)
- [GoHighLevel Webhook Integration](https://marketplace.gohighlevel.com/docs/webhook/WebhookIntegrationGuide/index.html)

This PRD is ready for implementation. All technical decisions are justified, the architecture is comprehensive, and the implementation path is clear.
