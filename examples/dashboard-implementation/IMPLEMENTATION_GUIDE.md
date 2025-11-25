# PAI Business Dashboard - Implementation Guide

## Phase 1: Foundation (Week 1-2)

### Step 1: Project Setup

```bash
# Create monorepo
npm create turbo@latest pai-business-dashboard

cd pai-business-dashboard

# Install dependencies
npm install

# Add packages
npm install -w apps/web react react-dom zustand @tanstack/react-query socket.io-client
npm install -w apps/server fastify socket.io prisma @prisma/client bullmq ioredis
npm install -w packages/shared-types zod
```

### Step 2: Database Setup

```bash
# Initialize Prisma
cd apps/server
npx prisma init

# Edit prisma/schema.prisma
```

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Contact {
  id           String   @id @default(cuid())
  ghlId        String?  @unique
  firstName    String
  lastName     String
  email        String   @unique
  phone        String?
  tags         String[]
  status       String   @default("lead")
  customFields Json?

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  lastSyncedAt DateTime?
  ghlVersion   Int      @default(1)

  conversations Conversation[]

  @@index([email])
  @@index([ghlId])
}

model Conversation {
  id           String   @id @default(cuid())
  ghlId        String?  @unique
  contactId    String
  contact      Contact  @relation(fields: [contactId], references: [id])

  lastMessage  String?
  lastMessageAt DateTime?
  unreadCount  Int      @default(0)
  status       String   @default("active")

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  messages     Message[]

  @@index([contactId])
  @@index([ghlId])
}

model Message {
  id             String   @id @default(cuid())
  ghlId          String?  @unique
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id])

  content        String
  direction      String   // "inbound" | "outbound"
  status         String   @default("sent")

  createdAt      DateTime @default(now())

  @@index([conversationId])
  @@index([createdAt])
}

model SyncLog {
  id           String   @id @default(cuid())
  entityType   String
  entityId     String
  action       String   // "create" | "update" | "delete"
  source       String   // "local" | "ghl"
  status       String   // "pending" | "completed" | "failed"
  error        String?

  createdAt    DateTime @default(now())

  @@index([entityType, entityId])
  @@index([createdAt])
}
```

```bash
# Generate Prisma client and migrate
npx prisma migrate dev --name init
npx prisma generate
```

### Step 3: Server Setup

```typescript
// apps/server/src/index.ts
import Fastify from 'fastify';
import { Server as SocketIOServer } from 'socket.io';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const fastify = Fastify({ logger: true });

// Socket.IO setup
const io = new SocketIOServer(fastify.server, {
  cors: {
    origin: 'http://localhost:5173',
    credentials: true,
  },
});

// WebSocket connection handler
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('subscribe', (channel) => {
    socket.join(channel);
    console.log(`Client ${socket.id} subscribed to ${channel}`);
  });

  socket.on('entity:sync', async (event, callback) => {
    try {
      // Handle sync event
      console.log('Sync event:', event);

      // Broadcast to other clients
      socket.broadcast.emit('entity:updated', event);

      callback({ success: true, data: event });
    } catch (error) {
      callback({ success: false, error: error.message });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// API Routes
fastify.get('/api/contacts', async (request, reply) => {
  const contacts = await prisma.contact.findMany();
  return contacts;
});

fastify.post('/api/contacts', async (request, reply) => {
  const contact = await prisma.contact.create({
    data: request.body as any,
  });

  // Broadcast to WebSocket clients
  io.emit('entity:created', {
    type: 'create',
    entityType: 'contact',
    entityId: contact.id,
    data: contact,
    timestamp: Date.now(),
  });

  return contact;
});

fastify.put('/api/contacts/:id', async (request, reply) => {
  const { id } = request.params as any;
  const contact = await prisma.contact.update({
    where: { id },
    data: request.body as any,
  });

  io.emit('entity:updated', {
    type: 'update',
    entityType: 'contact',
    entityId: contact.id,
    data: contact,
    timestamp: Date.now(),
  });

  return contact;
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('Server running on http://localhost:3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
```

### Step 4: Frontend Setup

```typescript
// apps/web/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './stores/dashboard-store';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
```

```typescript
// apps/web/src/App.tsx
import { ContactsTab } from './components/ContactsTab';
import { useDashboardStore } from './stores/dashboard-store';

function App() {
  const activeTab = useDashboardStore((state) => state.ui.activeTab);
  const setActiveTab = useDashboardStore((state) => state.setActiveTab);

  return (
    <div className="app">
      <nav className="tabs">
        <button
          className={activeTab === 'contacts' ? 'active' : ''}
          onClick={() => setActiveTab('contacts')}
        >
          Contacts
        </button>
        <button
          className={activeTab === 'conversations' ? 'active' : ''}
          onClick={() => setActiveTab('conversations')}
        >
          Conversations
        </button>
      </nav>

      <main>
        {activeTab === 'contacts' && <ContactsTab />}
        {activeTab === 'conversations' && <div>Conversations (Coming soon)</div>}
      </main>
    </div>
  );
}

export default App;
```

---

## Phase 2: Real-time Sync (Week 3-4)

### Step 1: Implement Sync Manager

Copy the `realtime-sync-manager.ts` and `useRealtimeSync.tsx` files from the examples.

### Step 2: Connect to WebSocket

```typescript
// apps/web/src/lib/websocket.ts
import { RealtimeSyncManager } from './realtime-sync-manager';

export const syncManager = new RealtimeSyncManager(
  import.meta.env.VITE_WS_URL || 'http://localhost:3000',
  'latest-wins'
);

// Setup global listeners
syncManager.on('connected', () => {
  console.log('✅ Connected to sync server');
});

syncManager.on('disconnected', () => {
  console.log('❌ Disconnected from sync server');
});

syncManager.on('error', (error) => {
  console.error('Sync error:', error);
});
```

### Step 3: Use Real-time Hook in Components

Update `ContactsTab.tsx` to use the `useRealtimeSync` hook (see example above).

---

## Phase 3: GHL Integration (Week 5-6)

### Step 1: Setup GHL API Wrapper

Copy `ghl-api-wrapper.ts` and configure with your GHL API key.

```typescript
// apps/server/src/lib/ghl.ts
import { GoHighLevelAPI } from './ghl-api-wrapper';

export const ghlAPI = new GoHighLevelAPI(process.env.GHL_API_KEY!, {
  baseURL: 'https://rest.gohighlevel.com/v1',
  rateLimit: { capacity: 100, refillRate: 1.67 },
  cacheExpiry: 60,
});

// Setup event listeners
ghlAPI.on('rate-limit:warning', ({ remaining }) => {
  console.warn(`⚠️ GHL rate limit warning: ${remaining} remaining`);
});

ghlAPI.on('rate-limit:exceeded', ({ retryAfter }) => {
  console.error(`❌ GHL rate limit exceeded. Retry after ${retryAfter}s`);
});
```

### Step 2: Setup Webhook Handler

```typescript
// apps/server/src/routes/webhooks.ts
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

export async function webhookRoutes(fastify: FastifyInstance) {
  const prisma = new PrismaClient();

  fastify.post('/webhooks/ghl', async (request, reply) => {
    const { event, data } = request.body as any;

    console.log(`📩 GHL Webhook: ${event}`, data);

    switch (event) {
      case 'ContactCreate':
        await prisma.contact.create({
          data: {
            ghlId: data.id,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone,
            tags: data.tags || [],
            lastSyncedAt: new Date(),
          },
        });
        break;

      case 'ContactUpdate':
        await prisma.contact.update({
          where: { ghlId: data.id },
          data: {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone,
            tags: data.tags || [],
            lastSyncedAt: new Date(),
          },
        });
        break;

      case 'ContactDelete':
        await prisma.contact.delete({
          where: { ghlId: data.id },
        });
        break;
    }

    return { success: true };
  });
}
```

### Step 3: Setup Sync Orchestrator

Copy `sync-orchestrator.ts` and initialize:

```typescript
// apps/server/src/lib/sync.ts
import { SyncOrchestrator } from './sync-orchestrator';
import { ghlAPI } from './ghl';
import { syncManager } from './realtime-sync-manager';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const syncOrchestrator = new SyncOrchestrator(
  ghlAPI,
  syncManager,
  prisma
);

// Start bidirectional sync every 5 minutes
syncOrchestrator.startPeriodicSync({
  entityType: 'contact',
  direction: 'bidirectional',
  interval: 300000, // 5 minutes
  conflictResolution: 'newest-wins',
});

console.log('✅ Sync orchestrator started');
```

---

## Phase 4: MCP Integration (Week 7-8)

### Step 1: Setup MCP Servers

Copy `mcp-ui-observer.ts` and `mcp-ui-controller.ts`.

### Step 2: Configure MCP in PAI Config

```json
// mcp-config.json
{
  "mcpServers": {
    "pai-ui-observer": {
      "command": "node",
      "args": ["/path/to/mcp-ui-observer.js"],
      "env": {
        "DASHBOARD_IPC_PORT": "8080"
      }
    },
    "pai-ui-controller": {
      "command": "node",
      "args": ["/path/to/mcp-ui-controller.js"],
      "env": {
        "DASHBOARD_IPC_PORT": "8080"
      }
    }
  }
}
```

### Step 3: Implement IPC Bridge

```typescript
// apps/web/src/lib/ipc-bridge.ts
import express from 'express';

const app = express();
app.use(express.json());

let currentUIState: any = null;

// Endpoint for MCP to fetch UI state
app.get('/ui-state', (req, res) => {
  res.json(currentUIState);
});

// Endpoint for MCP to dispatch actions
app.post('/dispatch-action', (req, res) => {
  const { action } = req.body;

  // Dispatch to dashboard
  window.dispatchEvent(
    new CustomEvent('pai:action', { detail: action })
  );

  res.json({ success: true });
});

app.listen(8080, () => {
  console.log('IPC bridge running on port 8080');
});

// Update UI state periodically
export function updateUIState(state: any) {
  currentUIState = state;
}
```

---

## Phase 5: Testing & Polish (Week 9-10)

### Step 1: Add Tests

```bash
# Install testing dependencies
npm install -D vitest @testing-library/react @testing-library/jest-dom @playwright/test
```

### Step 2: Write Tests

Copy test files from `testing-strategy.md`.

### Step 3: CI/CD Setup

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npx playwright install
      - run: npm run test:e2e
```

---

## Quick Commands

```bash
# Development
npm run dev              # Start all apps
npm run dev:web          # Start frontend only
npm run dev:server       # Start backend only

# Database
npm run db:migrate       # Run migrations
npm run db:seed          # Seed data
npm run db:studio        # Open Prisma Studio

# Testing
npm run test             # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report

# Build
npm run build            # Build for production
npm run start            # Start production server

# Docker
docker-compose up -d     # Start services
docker-compose logs -f   # View logs
docker-compose down      # Stop services
```

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/pai_dashboard
REDIS_URL=redis://localhost:6379

# GoHighLevel
GHL_API_KEY=your_api_key_here
GHL_WEBHOOK_SECRET=your_webhook_secret

# Server
PORT=3000
NODE_ENV=development

# Frontend
VITE_API_URL=http://localhost:3000
VITE_WS_URL=http://localhost:3000
```

---

## Troubleshooting

### WebSocket not connecting
- Check CORS settings in server
- Verify WS_URL environment variable
- Check browser console for errors

### Database connection issues
- Verify DATABASE_URL is correct
- Ensure PostgreSQL is running
- Run `npx prisma migrate deploy`

### GHL API rate limits
- Reduce sync frequency
- Implement request prioritization
- Cache more aggressively

### Sync conflicts
- Review conflict resolution strategy
- Check entity version tracking
- Verify timestamp accuracy

---

## Next Steps

1. ✅ Complete Phase 1-2 for basic functionality
2. ✅ Add Phase 3 for GHL integration
3. ✅ Implement Phase 4 for PAI control
4. ✅ Add comprehensive tests in Phase 5
5. 🚀 Deploy to production
