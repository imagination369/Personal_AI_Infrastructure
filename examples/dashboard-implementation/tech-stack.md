# PAI Business Dashboard - Technology Stack

## Frontend

### Core Framework
- **React 18** - UI library with concurrent features
- **TypeScript 5** - Type safety and developer experience
- **Vite** - Fast build tool and dev server

### State Management
- **Zustand** - Lightweight client state (UI state, selections, filters)
- **React Query (TanStack Query)** - Server state management with caching
- **Immer** - Immutable state updates with mutable syntax

### Real-time Communication
- **Socket.IO Client** - WebSocket connection with fallback
- **EventEmitter3** - Custom event system for sync manager

### UI Components
- **Radix UI** - Accessible component primitives
- **TailwindCSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **React Virtual** - List virtualization for large datasets

### Forms & Validation
- **React Hook Form** - Performant form management
- **Zod** - Schema validation with TypeScript inference

### Data Visualization
- **Recharts** - Charts for analytics dashboard
- **React Flow** - Pipeline kanban visualization

---

## Backend

### Server Framework
- **Node.js 20** - Runtime
- **Fastify** - Fast web framework
- **Socket.IO Server** - Real-time bidirectional communication

### API Layer
- **tRPC** - End-to-end type-safe APIs
- **Axios** - HTTP client for GHL API

### Database
- **PostgreSQL 15** - Primary data store
- **Prisma** - Type-safe ORM
- **Redis** - Caching and pub/sub for multi-instance sync

### Job Queue
- **BullMQ** - Redis-based queue for background jobs
- **p-queue** - In-memory queue for rate limiting

---

## MCP (Model Context Protocol)

### MCP SDK
- **@modelcontextprotocol/sdk** - Official MCP server implementation
- **stdio transport** - Communication with PAI agents

### MCP Servers
- **pai-ui-observer** - Exposes dashboard UI state
- **pai-ui-controller** - Allows PAI to control dashboard
- **pai-data-access** - Provides access to dashboard data

---

## External Integrations

### GoHighLevel
- **GHL REST API v1** - Contact, conversation, opportunity sync
- **GHL Webhooks** - Real-time event notifications
- **OAuth 2.0** - Secure authentication

---

## Development Tools

### Testing
- **Vitest** - Unit test runner
- **React Testing Library** - Component testing
- **Playwright** - End-to-end testing
- **MSW (Mock Service Worker)** - API mocking
- **k6** - Load testing

### Code Quality
- **ESLint** - Linting
- **Prettier** - Code formatting
- **TypeScript ESLint** - TypeScript-specific rules
- **Husky** - Git hooks

### DevOps
- **Docker** - Containerization
- **Docker Compose** - Local development orchestration
- **GitHub Actions** - CI/CD

---

## Monitoring & Observability

### Logging
- **Pino** - Fast JSON logging
- **Winston** - Fallback logger with transports

### Metrics
- **Prometheus** - Metrics collection
- **Grafana** - Metrics visualization

### Error Tracking
- **Sentry** - Error monitoring and alerting

---

## Architecture Patterns

### Design Patterns
- **Event Sourcing** - For sync audit trail
- **CQRS** - Separate read/write models
- **Optimistic UI** - Immediate feedback with rollback
- **Command Pattern** - PAI action dispatching
- **Observer Pattern** - Real-time event subscriptions
- **Repository Pattern** - Data access abstraction

### Sync Strategies
- **Operational Transformation** - For concurrent edits (future)
- **Vector Clocks** - Conflict detection (future)
- **Last Write Wins** - Simple conflict resolution
- **Three-way Merge** - Complex conflict resolution

---

## File Structure

```
pai-business-dashboard/
├── apps/
│   ├── web/                    # React frontend
│   │   ├── src/
│   │   │   ├── components/     # React components
│   │   │   ├── hooks/          # Custom hooks
│   │   │   ├── stores/         # Zustand stores
│   │   │   ├── pages/          # Page components
│   │   │   └── lib/            # Utilities
│   │   └── public/
│   │
│   ├── server/                 # Node.js backend
│   │   ├── src/
│   │   │   ├── routes/         # API routes
│   │   │   ├── services/       # Business logic
│   │   │   ├── db/             # Database layer
│   │   │   ├── websocket/      # Socket.IO handlers
│   │   │   └── queue/          # Job queue handlers
│   │   └── prisma/             # Database schema
│   │
│   └── mcp-servers/            # MCP servers
│       ├── ui-observer/
│       ├── ui-controller/
│       └── data-access/
│
├── packages/
│   ├── shared-types/           # Shared TypeScript types
│   ├── sync-engine/            # Real-time sync logic
│   ├── ghl-client/             # GHL API wrapper
│   └── message-queue/          # Message queue implementation
│
├── docker/
│   ├── Dockerfile.web
│   ├── Dockerfile.server
│   └── docker-compose.yml
│
└── tests/
    ├── unit/
    ├── integration/
    ├── e2e/
    └── load/
```

---

## Performance Targets

### Frontend
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Largest Contentful Paint**: < 2.5s
- **Bundle Size**: < 500KB (gzipped)

### Backend
- **API Response Time**: < 200ms (p95)
- **WebSocket Latency**: < 50ms
- **Database Query Time**: < 100ms (p95)
- **Throughput**: 1000+ req/sec

### Real-time Sync
- **Update Propagation**: < 500ms
- **Conflict Resolution**: < 1s
- **Offline Queue Flush**: < 5s

---

## Scalability Considerations

### Horizontal Scaling
- **Stateless API servers** - Scale with load balancer
- **Redis pub/sub** - Sync WebSocket events across instances
- **Database read replicas** - Distribute read load
- **CDN** - Static asset delivery

### Caching Strategy
- **Browser cache** - Static assets (1 year)
- **React Query cache** - API responses (30s-5min)
- **Redis cache** - Frequently accessed data (1 hour)
- **PostgreSQL query cache** - Database level caching

### Rate Limiting
- **GHL API**: 100 req/min (standard tier)
- **Client requests**: 1000 req/hour per user
- **WebSocket connections**: 10,000 concurrent
- **Database connections**: 100 max (pooling)

---

## Security Measures

### Authentication
- **JWT tokens** - Stateless auth
- **Refresh tokens** - Long-lived sessions
- **OAuth 2.0** - GHL integration

### Authorization
- **RBAC** - Role-based access control
- **Row-level security** - PostgreSQL RLS
- **API key rotation** - Automated credential management

### Data Protection
- **TLS 1.3** - Transport encryption
- **AES-256** - Data at rest encryption
- **Input sanitization** - XSS/SQL injection prevention
- **CORS** - Cross-origin request protection

### Compliance
- **GDPR** - Data privacy regulations
- **SOC 2** - Security controls
- **Data retention policies** - Automated cleanup

---

## Environment Configuration

### Development
```env
NODE_ENV=development
DATABASE_URL=postgresql://localhost:5432/pai_dashboard_dev
REDIS_URL=redis://localhost:6379
GHL_API_KEY=dev_key
WS_PORT=3001
```

### Production
```env
NODE_ENV=production
DATABASE_URL=postgresql://prod-db:5432/pai_dashboard
REDIS_URL=redis://prod-redis:6379
GHL_API_KEY=prod_key
WS_PORT=443
SENTRY_DSN=https://...
```

---

## Deployment Strategy

### CI/CD Pipeline
1. **Code push** → GitHub
2. **Run tests** → GitHub Actions
3. **Build Docker images** → Multi-stage builds
4. **Push to registry** → ECR/Docker Hub
5. **Deploy to staging** → Auto-deploy on main
6. **Run E2E tests** → Playwright in staging
7. **Manual approval** → Production gate
8. **Deploy to production** → Blue-green deployment
9. **Health checks** → Auto-rollback on failure

### Infrastructure
- **AWS ECS/Fargate** - Container orchestration
- **RDS PostgreSQL** - Managed database
- **ElastiCache Redis** - Managed cache
- **CloudFront** - CDN
- **Application Load Balancer** - Traffic distribution
- **Route 53** - DNS management

---

## Cost Optimization

### Resource Utilization
- **Auto-scaling** - Scale based on load
- **Spot instances** - Reduce compute costs
- **Reserved capacity** - Database/cache savings
- **Lambda functions** - Serverless webhooks

### Monitoring
- **CloudWatch** - AWS metrics and alarms
- **Cost Explorer** - Budget tracking
- **Resource tagging** - Cost attribution

---

## Future Enhancements

### Phase 2
- **Offline-first architecture** - IndexedDB persistence
- **Mobile apps** - React Native
- **Advanced analytics** - ML-powered insights
- **Multi-tenant support** - Workspace isolation

### Phase 3
- **Real-time collaboration** - Operational Transformation
- **Video calls** - WebRTC integration
- **AI copilot** - In-dashboard PAI assistance
- **Custom workflows** - Visual automation builder
