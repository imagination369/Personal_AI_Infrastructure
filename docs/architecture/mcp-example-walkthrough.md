# Complete Walkthrough: "Send Follow-up to Contacts from Last Week"

## Step-by-Step Execution with All MCP Interactions

This document provides a detailed, step-by-step walkthrough of how the PAI system handles the request: **"Send a follow-up to all contacts I spoke with last week"**

---

## User Request

```
User: "Send a follow-up to all contacts I spoke with last week"
```

## AI Processing Flow

### Phase 1: Intent Recognition & Planning

**Claude's Internal Process**:
```
Analyzing request:
- Action: send messages (bulk operation)
- Target: contacts
- Filter: last contacted within 7 days
- Message type: follow-up (context-aware)

Plan:
1. Query database for target contacts
2. Retrieve conversation history for context
3. Generate personalized messages
4. Preview for user approval
5. Execute sends
6. Monitor results
```

---

## Phase 2: Database Query

### Step 1: Query Target Contacts

**MCP Call**: `database-mcp.query_contacts`

```json
{
  "tool": "query_contacts",
  "parameters": {
    "sql": "SELECT * FROM contacts WHERE last_contacted_at >= $1 AND last_contacted_at < $2 ORDER BY last_contacted_at DESC",
    "parameters": [
      "2025-01-13T00:00:00Z",
      "2025-01-20T23:59:59Z"
    ],
    "limit": 100
  }
}
```

**Response**:
```json
{
  "contacts": [
    {
      "id": "db_cont_001",
      "ghl_id": "ghl_abc123",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "tags": ["prospect", "interested"],
      "last_contacted_at": "2025-01-18T14:30:00Z",
      "metadata": {
        "totalConversations": 3,
        "lastActivityDate": "2025-01-18T14:30:00Z"
      }
    },
    {
      "id": "db_cont_002",
      "ghl_id": "ghl_def456",
      "first_name": "Sarah",
      "last_name": "Johnson",
      "email": "sarah@company.com",
      "phone": "+1987654321",
      "tags": ["vip", "hot-lead"],
      "last_contacted_at": "2025-01-17T10:15:00Z",
      "metadata": {
        "totalConversations": 8,
        "lastActivityDate": "2025-01-17T10:15:00Z"
      }
    },
    {
      "id": "db_cont_003",
      "ghl_id": "ghl_ghi789",
      "first_name": "Michael",
      "last_name": "Chen",
      "email": "michael@startup.io",
      "phone": "+1555123456",
      "tags": ["prospect", "demo-scheduled"],
      "last_contacted_at": "2025-01-16T16:45:00Z",
      "metadata": {
        "totalConversations": 2,
        "lastActivityDate": "2025-01-16T16:45:00Z"
      }
    }
  ],
  "totalCount": 3,
  "cached": false,
  "executionTime": 45
}
```

**What Happened**:
- Database-mcp executed SQL query on PostgreSQL
- Filtered contacts by date range (last 7 days)
- Used index on `last_contacted_at` for fast query
- Result not in cache, so executed fresh query
- Took 45ms to execute

---

### Step 2: Get Conversation History

**MCP Call**: `database-mcp.get_conversation_analytics` (for each contact)

```json
{
  "tool": "get_conversation_analytics",
  "parameters": {
    "contactId": "db_cont_001",
    "dateRange": {
      "start": "2025-01-13T00:00:00Z",
      "end": "2025-01-20T23:59:59Z"
    }
  }
}
```

**Response (for John Doe)**:
```json
{
  "contactId": "db_cont_001",
  "analytics": {
    "messageCount": 12,
    "inboundCount": 6,
    "outboundCount": 6,
    "averageResponseTime": 1800,
    "channels": ["sms", "email"],
    "lastMessage": {
      "id": "msg_xyz123",
      "body": "Thanks for the info! I'll review the pricing and get back to you.",
      "direction": "inbound",
      "sentAt": "2025-01-18T14:30:00Z",
      "channel": "sms"
    },
    "topics": ["pricing", "features", "timeline"],
    "sentiment": "positive",
    "engagementScore": 8.5
  }
}
```

**What Happened**:
- Retrieved message history for John from last 7 days
- Calculated analytics (response times, message counts)
- Extracted topics from conversation (pricing, features, timeline)
- Analyzed sentiment (positive)
- Identified preferred channel (SMS)

---

### Step 3: Get Full Message History

**MCP Call**: `ghl-mcp.get_conversation_history`

```json
{
  "tool": "get_conversation_history",
  "parameters": {
    "contactId": "ghl_abc123",
    "since": "2025-01-13T00:00:00Z",
    "limit": 50
  }
}
```

**Response**:
```json
{
  "conversations": [
    {
      "id": "conv_001",
      "messages": [
        {
          "id": "msg_001",
          "direction": "outbound",
          "body": "Hi John! Following up on our call yesterday. Here's the pricing breakdown you requested...",
          "sentAt": "2025-01-16T09:00:00Z",
          "channel": "email"
        },
        {
          "id": "msg_002",
          "direction": "inbound",
          "body": "Thanks! This looks great. Can you clarify the enterprise tier pricing?",
          "sentAt": "2025-01-16T10:30:00Z",
          "channel": "email"
        },
        {
          "id": "msg_003",
          "direction": "outbound",
          "body": "Absolutely! The enterprise tier includes...",
          "sentAt": "2025-01-16T11:00:00Z",
          "channel": "email"
        },
        // ... more messages ...
        {
          "id": "msg_xyz123",
          "direction": "inbound",
          "body": "Thanks for the info! I'll review the pricing and get back to you.",
          "sentAt": "2025-01-18T14:30:00Z",
          "channel": "sms"
        }
      ]
    }
  ]
}
```

**What Happened**:
- ghl-mcp made authenticated API call to GoHighLevel
- Retrieved complete conversation thread
- Rate limiter waited for token (no delay, tokens available)
- Response time: 250ms (API call + processing)
- Result cached for 5 minutes

---

## Phase 3: Message Generation

### Step 4: AI Analyzes Context & Generates Messages

**Claude's Analysis for John Doe**:
```
Contact: John Doe
Last Interaction: 2 days ago
Channel Preference: SMS (based on last message)
Context:
  - Discussed pricing details
  - Interested in enterprise tier
  - Said he would "review and get back"
  - Positive sentiment throughout
  - 2 days since last message (good timing for follow-up)

Follow-up Strategy:
  - Reference pricing discussion
  - Gentle reminder without pressure
  - Offer to answer questions
  - Keep it conversational and brief (SMS)
```

**Generated Message for John**:
```
Hi John! Hope you had a chance to review the pricing info I sent over.
I'm here if you have any questions or want to discuss the enterprise tier
in more detail. No rush - just wanted to check in! 🙂
```

**Generated Message for Sarah**:
```
Hey Sarah! Following up on our conversation about the project timeline.
Have you had a chance to discuss with your team? I'd love to help move
things forward whenever you're ready.
```

**Generated Message for Michael**:
```
Hi Michael! Excited about our upcoming demo on Thursday! In the meantime,
let me know if there are any specific features you'd like me to focus on
during the session.
```

**What Happened**:
- Claude analyzed conversation context for each contact
- Identified topics, sentiment, and next logical steps
- Generated personalized messages appropriate for:
  - Relationship stage
  - Last conversation topic
  - Preferred communication channel
  - Time since last contact
- Matched tone to previous interactions

---

## Phase 4: User Preview & Approval

### Step 5: Display in Dashboard

**MCP Call**: `dashboard-mcp.navigate_to`

```json
{
  "tool": "navigate_to",
  "parameters": {
    "page": "bulk_message_review",
    "params": {
      "messagePlan": [/* generated messages */]
    }
  }
}
```

**Dashboard UI Shows**:

```
╔═══════════════════════════════════════════════════════════════╗
║           Review Follow-up Messages (3 contacts)               ║
╠═══════════════════════════════════════════════════════════════╣
║                                                                ║
║  📱 John Doe (john@example.com)                                ║
║     Via: SMS  •  Last contact: 2 days ago                      ║
║  ┌─────────────────────────────────────────────────────────┐  ║
║  │ Hi John! Hope you had a chance to review the pricing    │  ║
║  │ info I sent over. I'm here if you have any questions    │  ║
║  │ or want to discuss the enterprise tier in more detail.  │  ║
║  │ No rush - just wanted to check in! 🙂                    │  ║
║  └─────────────────────────────────────────────────────────┘  ║
║     [Edit] [Remove] [Change Channel]                          ║
║                                                                ║
║  ───────────────────────────────────────────────────────────  ║
║                                                                ║
║  📧 Sarah Johnson (sarah@company.com)                          ║
║     Via: Email  •  Last contact: 3 days ago                    ║
║  ┌─────────────────────────────────────────────────────────┐  ║
║  │ Hey Sarah! Following up on our conversation about the   │  ║
║  │ project timeline. Have you had a chance to discuss      │  ║
║  │ with your team? I'd love to help move things forward    │  ║
║  │ whenever you're ready.                                   │  ║
║  └─────────────────────────────────────────────────────────┘  ║
║     [Edit] [Remove] [Change Channel]                          ║
║                                                                ║
║  ───────────────────────────────────────────────────────────  ║
║                                                                ║
║  📱 Michael Chen (michael@startup.io)                          ║
║     Via: SMS  •  Last contact: 4 days ago                      ║
║  ┌─────────────────────────────────────────────────────────┐  ║
║  │ Hi Michael! Excited about our upcoming demo on          │  ║
║  │ Thursday! In the meantime, let me know if there are     │  ║
║  │ any specific features you'd like me to focus on         │  ║
║  │ during the session.                                      │  ║
║  └─────────────────────────────────────────────────────────┘  ║
║     [Edit] [Remove] [Change Channel]                          ║
║                                                                ║
╠═══════════════════════════════════════════════════════════════╣
║  Estimated send time: 3 seconds                                ║
║  Rate limited: No                                              ║
║                                                                ║
║  [📤 Send All]  [✏️ Edit Campaign]  [❌ Cancel]                ║
╚═══════════════════════════════════════════════════════════════╝
```

**User Action**: Clicks "Send All"

---

## Phase 5: Message Sending

### Step 6: Send Messages via GHL

**MCP Call 1**: `ghl-mcp.send_message` (John Doe)

```json
{
  "tool": "send_message",
  "parameters": {
    "contactId": "ghl_abc123",
    "message": "Hi John! Hope you had a chance to review the pricing info I sent over. I'm here if you have any questions or want to discuss the enterprise tier in more detail. No rush - just wanted to check in! 🙂",
    "channel": "sms",
    "metadata": {
      "campaign": "follow_up_last_week",
      "aiGenerated": true,
      "generatedAt": "2025-01-20T15:30:00Z"
    }
  }
}
```

**Internal ghl-mcp Processing**:
```
1. Rate Limiter Check
   - Current tokens: 18/20
   - Request granted immediately
   - Tokens remaining: 17/20

2. API Request
   POST https://services.leadconnectorhq.com/conversations/messages
   Headers:
     Authorization: Bearer eyJhbG...
     Content-Type: application/json
   Body: {
     "locationId": "loc_xyz",
     "contactId": "ghl_abc123",
     "message": "Hi John! Hope you...",
     "type": "SMS"
   }

3. Response Received (235ms)
   Status: 200 OK
   Body: {
     "messageId": "msg_new_001",
     "conversationId": "conv_001",
     "status": "sent"
   }

4. Cache Update
   - Invalidate contact cache: contacts:ghl_abc123
   - Invalidate conversation cache: conv:conv_001
```

**Response**:
```json
{
  "success": true,
  "messageId": "msg_new_001",
  "conversationId": "conv_001",
  "status": "sent",
  "sentAt": "2025-01-20T15:30:15Z",
  "executionTime": 235,
  "metadata": {
    "campaign": "follow_up_last_week",
    "aiGenerated": true
  }
}
```

**Repeat for other contacts** (Sarah and Michael)...

**All Messages Sent**:
```
✓ John Doe - SMS sent (235ms)
✓ Sarah Johnson - Email sent (312ms)
✓ Michael Chen - SMS sent (198ms)

Total time: 745ms
Rate limiter: No delays needed
Success rate: 100% (3/3)
```

---

### Step 7: Log Actions in Database

**MCP Call**: `database-mcp.log_ai_action` (for each message)

```json
{
  "tool": "log_ai_action",
  "parameters": {
    "actionType": "send_follow_up_message",
    "targetType": "contact",
    "targetId": "db_cont_001",
    "parameters": {
      "channel": "sms",
      "campaign": "follow_up_last_week",
      "messageLength": 187
    },
    "result": {
      "messageId": "msg_new_001",
      "status": "sent"
    },
    "success": true,
    "executionTimeMs": 235
  }
}
```

**Database Entry Created**:
```sql
INSERT INTO ai_actions (
  id, action_type, target_type, target_id,
  parameters, result, success, executed_at, execution_time_ms
) VALUES (
  'action_001',
  'send_follow_up_message',
  'contact',
  'db_cont_001',
  '{"channel":"sms","campaign":"follow_up_last_week","messageLength":187}',
  '{"messageId":"msg_new_001","status":"sent"}',
  true,
  '2025-01-20 15:30:15',
  235
);
```

**What Happened**:
- All AI actions logged for audit trail
- Can track success rates, timing, and patterns
- Enables learning and optimization over time

---

## Phase 6: Real-time Event Handling

### Step 8: Receive Delivery Confirmations

**Event 1**: Message Delivered (via WebSocket)

```json
{
  "type": "message.delivered",
  "timestamp": "2025-01-20T15:30:18Z",
  "data": {
    "messageId": "msg_new_001",
    "conversationId": "conv_001",
    "contactId": "ghl_abc123",
    "status": "delivered",
    "deliveredAt": "2025-01-20T15:30:18Z"
  },
  "source": "websocket"
}
```

**notifications-mcp Processing**:
```typescript
// Receive event via WebSocket
websocket.on('message', async (event) => {
  // Store event
  await eventStore.store({
    type: event.type,
    source: 'websocket',
    timestamp: event.timestamp,
    data: event.data,
    processed: false,
    relatedEntities: {
      contactId: 'db_cont_001',
      conversationId: 'conv_001'
    }
  });

  // Update message status in database
  await databaseMCP.updateMessageStatus({
    messageId: event.data.messageId,
    status: 'delivered',
    deliveredAt: event.data.deliveredAt
  });

  // Notify dashboard if visible
  if (await dashboardMCP.isMessageVisible(event.data.messageId)) {
    await dashboardMCP.updateMessageUI({
      messageId: event.data.messageId,
      status: 'delivered'
    });
  }
});
```

**Dashboard Update**:
```
John Doe's message: ✓ Delivered (3 seconds ago)
```

---

### Step 9: Handle Reply from John

**Event 2**: Message Received (via Webhook)

**Webhook Payload**:
```json
POST /webhooks/ghl
X-GHL-Signature: sha256=abc123...

{
  "type": "MessageReceived",
  "timestamp": "2025-01-20T15:45:22Z",
  "data": {
    "messageId": "msg_reply_001",
    "conversationId": "conv_001",
    "contactId": "ghl_abc123",
    "body": "Hey! Yes, I've reviewed everything. Ready to move forward with the enterprise plan. When can we start?",
    "direction": "inbound",
    "channel": "sms"
  }
}
```

**notifications-mcp Processing**:
```typescript
// Verify webhook signature
const isValid = verifySignature(req.body, req.headers['x-ghl-signature']);

if (!isValid) {
  return res.status(401).send('Invalid signature');
}

// Process event
const event = req.body;

// Store in event log
await eventStore.store({
  type: 'message.received',
  source: 'webhook',
  timestamp: event.timestamp,
  data: event.data,
  processed: false,
  relatedEntities: {
    contactId: 'db_cont_001',
    conversationId: 'conv_001'
  }
});

// Store message in database
await databaseMCP.storeMessage({
  id: 'msg_reply_001',
  ghl_id: event.data.messageId,
  conversation_id: 'conv_001',
  contact_id: 'db_cont_001',
  direction: 'inbound',
  body: event.data.body,
  channel: 'sms',
  sent_at: event.timestamp
});

// Trigger AI analysis
await analyzeReply(event.data);

res.status(200).send('OK');
```

**AI Analysis of Reply**:
```
Analyzing John's reply:
- Sentiment: Very positive ("Ready to move forward")
- Intent: Purchase decision made
- Urgency: High ("When can we start?")
- Action needed: Immediate response + next steps

Recommendation: Respond within 5 minutes with:
1. Thank customer for decision
2. Outline onboarding process
3. Schedule kickoff call
4. Send contract/agreement
```

**Dashboard Notification**:
```
╔═══════════════════════════════════════════════╗
║  🔔 New Reply from John Doe                    ║
╠═══════════════════════════════════════════════╣
║  "Ready to move forward with the enterprise   ║
║   plan. When can we start?"                   ║
║                                               ║
║  AI Analysis: Purchase decision - HIGH        ║
║                                               ║
║  [View Conversation]  [Reply Now]             ║
╚═══════════════════════════════════════════════╝
```

**AI Suggested Response**:
```
Fantastic news, John! So excited to work with you! 🎉

Here's what happens next:
1. I'll send over the enterprise agreement today
2. Once signed, we'll schedule your onboarding kickoff
3. Full access within 24-48 hours

How does Tuesday at 2pm work for the kickoff call?
```

---

## Phase 7: Campaign Analytics

### Step 10: Track Campaign Performance

After 24 hours, AI generates campaign report:

**MCP Call**: `database-mcp.get_conversation_analytics`

```json
{
  "tool": "get_conversation_analytics",
  "parameters": {
    "dateRange": {
      "start": "2025-01-20T15:30:00Z",
      "end": "2025-01-21T15:30:00Z"
    },
    "filters": {
      "metadata": {
        "campaign": "follow_up_last_week"
      }
    }
  }
}
```

**Campaign Report**:
```
═══════════════════════════════════════════════════════════
  Follow-up Campaign Report: "Last Week Contacts"
═══════════════════════════════════════════════════════════

📊 CAMPAIGN METRICS

Messages Sent:        3
Delivery Rate:        100% (3/3)
Response Rate:        67% (2/3)
Conversion Rate:      33% (1/3)
Avg Response Time:    15 minutes

───────────────────────────────────────────────────────────

📈 INDIVIDUAL RESULTS

✅ John Doe
   Status: CONVERTED
   Response: 15 minutes
   Outcome: Ready to purchase enterprise plan
   Next: Send agreement, schedule kickoff

✅ Sarah Johnson
   Status: REPLIED
   Response: 3 hours
   Outcome: Team discussion next week, will update
   Next: Follow-up in 5 days

⏳ Michael Chen
   Status: NO REPLY (yet)
   Action: Demo scheduled for Thursday - normal
   Next: Pre-demo reminder on Wednesday

───────────────────────────────────────────────────────────

🎯 INSIGHTS

• SMS had 100% response rate (2/2 replied)
• Email response pending (1/1 no reply yet - normal for email)
• Positive sentiment in all replies
• Average time to reply: 1.75 hours
• Best performing topic: Pricing follow-up

───────────────────────────────────────────────────────────

💡 RECOMMENDATIONS

1. Continue using SMS for time-sensitive follow-ups
2. Reference specific conversation topics (pricing, demos)
3. Keep messages concise and action-oriented
4. Follow up 2-3 days after initial conversation
5. Include subtle CTA without pressure

───────────────────────────────────────────────────────────

✨ NEXT ACTIONS

• Send agreement to John → Priority: HIGH
• Schedule kickoff with John
• Follow up with Sarah in 5 days
• Send demo prep to Michael on Wednesday
```

---

## Summary of MCP Server Interactions

### Total MCP Calls Made

| MCP Server | Tool/Resource | Calls | Total Time |
|------------|---------------|-------|------------|
| database-mcp | query_contacts | 1 | 45ms |
| database-mcp | get_conversation_analytics | 3 | 180ms |
| database-mcp | log_ai_action | 3 | 90ms |
| ghl-mcp | get_conversation_history | 3 | 750ms |
| ghl-mcp | send_message | 3 | 745ms |
| dashboard-mcp | navigate_to | 1 | 50ms |
| dashboard-mcp | updateMessageUI | 3 | 60ms |
| notifications-mcp | (events received) | 6 | - |
| **TOTAL** | | **23** | **1,920ms** |

### Data Flow

```
User Request
    ↓
Claude Analysis
    ↓
database-mcp: Query contacts (45ms)
    ↓
database-mcp: Get analytics for 3 contacts (180ms)
    ↓
ghl-mcp: Get full conversation history (750ms)
    ↓
Claude: Generate personalized messages
    ↓
dashboard-mcp: Show preview (50ms)
    ↓
User: Approve
    ↓
ghl-mcp: Send 3 messages (745ms)
    ↓
database-mcp: Log 3 actions (90ms)
    ↓
notifications-mcp: Receive delivery events
    ↓
database-mcp: Update message statuses
    ↓
dashboard-mcp: Update UI (60ms)
    ↓
notifications-mcp: Receive reply from John
    ↓
Claude: Analyze reply & suggest response
    ↓
dashboard-mcp: Show notification
```

### Performance Analysis

- **Total execution time**: ~2 seconds (user experience)
- **Most expensive operations**: GHL API calls (750ms + 745ms)
- **Database queries**: Very fast (<100ms) due to indexing
- **Rate limiting**: No delays (plenty of tokens available)
- **Cache utilization**: ~40% of queries served from cache
- **Error rate**: 0% (all operations succeeded)

---

## Key Takeaways

### 1. **Composability**
Each MCP server handled its specific responsibility:
- database-mcp: Local data queries and storage
- ghl-mcp: External API integration
- dashboard-mcp: UI control and feedback
- notifications-mcp: Real-time event processing

### 2. **Context Awareness**
AI had full visibility into:
- Complete conversation history
- Contact metadata and tags
- Previous interaction patterns
- Preferred communication channels

### 3. **Real-time Responsiveness**
System reacted to events in real-time:
- Delivery confirmations
- Reply notifications
- UI updates
- Analytics tracking

### 4. **User Control**
User maintained control throughout:
- Preview before sending
- Edit capability
- Approval required
- Full transparency

### 5. **Learning & Optimization**
System tracked everything for improvement:
- Campaign performance
- Response rates
- Channel effectiveness
- Timing patterns

---

This walkthrough demonstrates how the MCP server ecosystem enables sophisticated, context-aware, AI-driven business operations while maintaining reliability, performance, and user control.
