# PAI Business Dashboard MCP Architecture

## Overview

This directory contains the complete architecture and implementation specifications for a Model Context Protocol (MCP) server ecosystem that enables AI-driven business operations through GoHighLevel integration.

## 📚 Documentation Structure

### 1. [MCP Business Dashboard Design](./mcp-business-dashboard-design.md) (64KB)
**Complete system architecture and specifications**

- Executive summary and architecture overview
- Detailed specifications for all 4 MCP servers:
  - **ghl-mcp**: GoHighLevel API integration layer
  - **database-mcp**: Local PostgreSQL data store
  - **dashboard-mcp**: UI control and visibility
  - **notifications-mcp**: Real-time event streaming
- Resources, tools, and schemas for each server
- Integration patterns and data flow
- Complete example workflow: "Send follow-up to contacts I spoke with last week"
- Security, performance, reliability, and monitoring considerations

### 2. [MCP Implementation Roadmap](./mcp-implementation-roadmap.md) (38KB)
**Day-by-day implementation plan (6 weeks)**

- **Week 1**: Foundation (PostgreSQL, database-mcp, caching)
- **Week 2**: GHL Integration (OAuth, rate limiting, ghl-mcp)
- **Week 3**: Real-time Events (webhooks, WebSocket, notifications-mcp)
- **Week 4**: Dashboard Integration (UI state tracking, dashboard-mcp)
- **Week 5**: AI Integration (MCP configuration, workflow orchestration)
- **Week 6-7**: Production Hardening (error handling, security, performance)

Each phase includes:
- Specific tasks with code examples
- Success metrics and deliverables
- Testing strategies
- Common issues and solutions

### 3. [MCP Code Examples](./mcp-code-examples.md) (40KB)
**Production-ready code implementations**

- Complete TypeScript implementations for each server
- Database schema and migrations
- Rate limiting with token bucket algorithm
- WebSocket manager with reconnection logic
- Cache layer with Redis
- Docker configuration and deployment setup
- Tool and resource implementations
- Error handling and retry logic

## 🚀 Quick Start

### Prerequisites

```bash
# Required software
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional but recommended)
```

### 1. Clone and Setup

```bash
# Create project structure
mkdir -p pai-dashboard/{servers,database,config}
cd pai-dashboard

# Create server directories
mkdir -p servers/{database-mcp,ghl-mcp,dashboard-mcp,notifications-mcp}
```

### 2. Database Setup

```bash
# Start PostgreSQL
docker run -d \
  --name pai-postgres \
  -e POSTGRES_DB=pai_dashboard \
  -e POSTGRES_PASSWORD=secure_password \
  -p 5432:5432 \
  postgres:15-alpine

# Create schema (see mcp-code-examples.md for SQL)
psql -h localhost -U postgres pai_dashboard < database/schema.sql
```

### 3. Start MCP Servers

```bash
# Option A: Using Docker Compose (recommended)
docker-compose up -d

# Option B: Run individually
cd servers/database-mcp && npm start &
cd servers/ghl-mcp && npm start &
cd servers/dashboard-mcp && npm start &
cd servers/notifications-mcp && npm start &
```

### 4. Configure GoHighLevel

```bash
# Set environment variables
export GHL_CLIENT_ID="your_client_id"
export GHL_CLIENT_SECRET="your_client_secret"
export GHL_LOCATION_ID="your_location_id"

# Run OAuth flow to get refresh token
node scripts/ghl-authorize.js
```

### 5. Test MCP Servers

```bash
# Test database-mcp
curl http://localhost:3002/resources/db://sync/status

# Test ghl-mcp
curl http://localhost:3001/tools/search_contacts \
  -H "Content-Type: application/json" \
  -d '{"query": "john"}'

# Test dashboard-mcp
curl http://localhost:3003/resources/dashboard://view/current

# Test notifications-mcp
curl http://localhost:3004/resources/notifications://stream/live
```

### 6. Connect to Claude

```json
// .pai/config/mcp-servers.json
{
  "servers": {
    "database-mcp": {
      "type": "http",
      "url": "http://localhost:3002"
    },
    "ghl-mcp": {
      "type": "http",
      "url": "http://localhost:3001"
    },
    "dashboard-mcp": {
      "type": "http",
      "url": "http://localhost:3003"
    },
    "notifications-mcp": {
      "type": "http",
      "url": "http://localhost:3004"
    }
  }
}
```

## 🏗️ Architecture at a Glance

```
┌─────────────────────────────────────────────────────────┐
│                    PAI Agent (Claude)                    │
│          Natural Language Business Operations            │
└─────────────────────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  database-   │  │    ghl-      │  │  dashboard-  │
│     mcp      │  │     mcp      │  │     mcp      │
│              │  │              │  │              │
│ PostgreSQL   │  │ GHL API      │  │ UI Control   │
│ Cache        │  │ OAuth        │  │ State Sync   │
│ Analytics    │  │ Rate Limit   │  │ Navigation   │
└──────────────┘  └──────────────┘  └──────────────┘
        │                │                │
        └────────┬───────┴────────┬───────┘
                 │                │
                 ▼                ▼
        ┌──────────────┐  ┌──────────────┐
        │notifications-│  │  GoHighLevel │
        │     mcp      │  │   Platform   │
        │              │  │              │
        │ WebSocket    │  │ REST API     │
        │ Webhooks     │  │ WebSocket    │
        │ Event Queue  │  │ Webhooks     │
        └──────────────┘  └──────────────┘
```

## 🎯 Key Features

### For AI Agents
- **Natural Language Operations**: Execute complex business workflows through conversation
- **Full Visibility**: AI can "see" dashboard state, contacts, and conversations
- **Proactive Actions**: AI responds to events (new messages, status changes)
- **Context Awareness**: Access to full conversation history and contact data

### For Developers
- **Modular Design**: Each MCP server has a single, clear responsibility
- **Type Safety**: Full TypeScript implementation with schemas
- **Production Ready**: Error handling, retry logic, monitoring, and logging built-in
- **Scalable**: Rate limiting, caching, and connection pooling

### For Business Users
- **Automation**: AI handles routine follow-ups and communications
- **Personalization**: Messages generated based on conversation context
- **Real-time**: Instant responses to customer interactions
- **Analytics**: Track AI actions and campaign performance

## 📊 Example Workflows

### 1. Send Follow-up Messages

```
User: "Send a follow-up to all contacts I spoke with last week"

AI Process:
1. Query database-mcp for contacts (last_contacted_at within 7 days)
2. Get conversation history for context
3. Generate personalized messages for each contact
4. Send via ghl-mcp (respecting rate limits)
5. Log actions in database
6. Update dashboard with results
7. Monitor delivery via notifications-mcp
```

### 2. Handle Incoming Messages

```
Event: New message received from contact

AI Process:
1. notifications-mcp receives 'message.received' event
2. Retrieve contact info from database-mcp
3. Analyze message sentiment and intent
4. Determine if response needed
5. Generate appropriate response
6. Send via ghl-mcp
7. Update conversation in database
8. Refresh dashboard if visible
```

### 3. Pipeline Management

```
User: "Move all qualified leads from consultation to proposal stage"

AI Process:
1. Query database-mcp for leads with "qualified" tag
2. Check consultation notes and readiness criteria
3. Update opportunities via ghl-mcp
4. Send proposal emails
5. Schedule follow-up tasks
6. Update dashboard view
7. Log pipeline changes
```

## 🔐 Security Considerations

- **OAuth2 Flow**: Secure token management with auto-refresh
- **API Key Encryption**: Secrets stored encrypted at rest
- **SQL Injection Prevention**: Parameterized queries only
- **Rate Limiting**: Prevent API abuse and stay within limits
- **Audit Logging**: All AI actions logged for review
- **RBAC**: Role-based access control for sensitive operations

## 📈 Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Query Response | < 100ms | Simple queries with caching |
| API Call | < 500ms | Including rate limiter wait time |
| Event Processing | < 1s | From webhook receipt to database update |
| Dashboard Sync | < 100ms | UI state updates |
| Cache Hit Rate | > 90% | For frequently accessed data |
| Uptime | 99.9% | With health checks and auto-recovery |

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Test connection
psql -h localhost -U postgres pai_dashboard -c "SELECT 1"

# Check logs
docker logs pai-postgres
```

### Rate Limiting

```bash
# Check rate limiter status
curl http://localhost:3001/debug/rate-limit

# Adjust limits in config
# Edit servers/ghl-mcp/.env:
RATE_LIMIT_CAPACITY=20
RATE_LIMIT_REFILL_RATE=10
```

### WebSocket Disconnections

```bash
# Check notifications-mcp logs
docker logs -f pai-notifications-mcp

# Verify webhook configuration
curl http://localhost:3004/webhooks/status
```

### Cache Issues

```bash
# Check Redis
redis-cli ping

# Clear cache
redis-cli FLUSHDB

# Monitor cache hits/misses
redis-cli MONITOR
```

## 📝 Next Steps

1. **Start with Phase 1** of the implementation roadmap
2. **Review code examples** for each component
3. **Set up development environment** (PostgreSQL, Redis, Node.js)
4. **Implement database-mcp first** (foundation for other servers)
5. **Test each component independently** before integration
6. **Configure GoHighLevel OAuth** and test API access
7. **Build incrementally** and test at each phase

## 🤝 Contributing

When extending this system:

1. **Follow MCP Standards**: Use official SDK and patterns
2. **Add Tests**: Unit, integration, and end-to-end tests
3. **Document Tools**: Clear descriptions and input schemas
4. **Handle Errors**: Graceful degradation and retry logic
5. **Monitor Performance**: Log execution times and errors
6. **Security First**: Never expose credentials or PII

## 📚 Additional Resources

- [MCP Official Documentation](https://modelcontextprotocol.io)
- [GoHighLevel API Docs](https://highlevel.stoplight.io)
- [PostgreSQL Full-Text Search](https://www.postgresql.org/docs/current/textsearch.html)
- [Token Bucket Rate Limiting](https://en.wikipedia.org/wiki/Token_bucket)

## 🎓 Learning Path

### Week 1: Foundation
- Study MCP protocol and SDK
- Set up PostgreSQL with full-text search
- Implement basic CRUD operations
- Add caching layer

### Week 2: Integration
- Learn GoHighLevel API
- Implement OAuth2 flow
- Build rate limiter
- Test API calls

### Week 3: Real-time
- Study WebSocket protocol
- Set up webhook endpoint
- Implement event processing
- Build event store

### Week 4: Advanced
- UI state synchronization
- Complex workflow orchestration
- Analytics and reporting
- Production hardening

## 💡 Key Insights

1. **MCP Enables AI-First Development**: Resources and tools designed for AI consumption make natural language interfaces possible

2. **Separation of Concerns**: Each server handles one responsibility, making the system maintainable and scalable

3. **Real-time is Critical**: WebSocket + webhooks enable reactive AI that responds instantly to business events

4. **Caching is Essential**: Reduces API calls and improves response times significantly

5. **Rate Limiting is Not Optional**: Protects against API throttling and ensures reliable operation

6. **Context is Everything**: Full conversation history and contact data enable truly personalized AI interactions

## 🎯 Success Metrics

### Technical
- ✅ All 4 MCP servers operational
- ✅ < 0.1% error rate
- ✅ 99.9% uptime
- ✅ < 500ms average response time
- ✅ Zero data loss

### Business
- ✅ AI successfully handles routine communications
- ✅ 90%+ of follow-ups automated
- ✅ Response time < 5 minutes for customer messages
- ✅ Personalization score > 8/10
- ✅ User adoption > 80%

## 🚀 Deployment

### Development
```bash
docker-compose -f docker-compose.dev.yml up
```

### Staging
```bash
docker-compose -f docker-compose.staging.yml up -d
```

### Production
```bash
# Use Kubernetes for production
kubectl apply -f k8s/
```

## 📞 Support

For questions or issues:
1. Check troubleshooting section
2. Review implementation roadmap
3. Examine code examples
4. Test with provided scripts

---

**Version**: 1.0.0
**Last Updated**: 2025-01-25
**Status**: Design Complete, Ready for Implementation

This architecture provides a complete, production-ready foundation for building AI-driven business operations systems using the Model Context Protocol.
