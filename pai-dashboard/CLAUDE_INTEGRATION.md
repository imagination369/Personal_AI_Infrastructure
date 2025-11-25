# Claude API Integration Guide

This document explains how the PAI Business Dashboard integrates with Anthropic's Claude API to provide intelligent AI assistance.

## Overview

The PAI Business Dashboard now includes production-ready integration with Claude API, providing:
- Real-time AI chat assistance for business operations
- Context-aware responses based on current page and user actions
- Streaming and non-streaming response modes
- Graceful fallback to mock responses when API key is not configured
- Comprehensive error handling and logging

## Architecture

### Components

1. **Claude Client Library** (`/lib/claude-client.ts`)
   - Handles all communication with Anthropic API
   - Manages system prompts and context injection
   - Provides both streaming and non-streaming interfaces
   - Implements singleton pattern for consistent configuration

2. **Chat API Route** (`/app/api/pai/chat/route.ts`)
   - REST API endpoint for PAI chat functionality
   - Integrates with Claude client
   - Falls back to mock responses when Claude is unavailable
   - Returns structured responses with suggestions and actions

3. **Environment Configuration**
   - `ANTHROPIC_API_KEY`: Your Anthropic API key
   - `PAI_MODEL`: Claude model to use (default: claude-sonnet-4-20250514)

## Setup Instructions

### 1. Install Dependencies

```bash
cd pai-dashboard
npm install
# or
bun install
```

### 2. Configure Environment Variables

Create a `.env.local` file based on `.env.example`:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Anthropic API key:

```env
# Get your API key from: https://console.anthropic.com/settings/keys
ANTHROPIC_API_KEY=sk-ant-api03-...

# Optional: Specify a different model
PAI_MODEL=claude-sonnet-4-20250514
```

### 3. Available Models

Choose from these Claude models:

- `claude-sonnet-4-20250514` (default) - Best balance of intelligence and speed
- `claude-opus-4-20250514` - Highest intelligence, slower
- `claude-3-5-sonnet-20241022` - Previous generation, faster and cheaper

### 4. Start the Development Server

```bash
npm run dev
# or
bun dev
```

The dashboard will be available at `http://localhost:3000`

## Usage

### Basic Chat

The PAI assistant is available in the dashboard header. Click the chat icon to open the chat interface.

### API Endpoints

#### POST /api/pai/chat

Send a message to PAI and receive a response.

**Request:**

```json
{
  "message": "Help me find contacts added this week",
  "context": {
    "page": "contacts",
    "selectedText": "John Doe",
    "contactId": "123",
    "previousMessages": [
      {
        "role": "user",
        "content": "Hello",
        "timestamp": "2024-01-15T10:00:00Z"
      },
      {
        "role": "assistant",
        "content": "Hi! How can I help?",
        "timestamp": "2024-01-15T10:00:01Z"
      }
    ]
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "I can help you find contacts added this week...",
    "timestamp": "2024-01-15T10:00:05Z",
    "source": "claude",
    "suggestions": [
      "Show me contacts added this week",
      "Find VIP customers",
      "Export contacts to CSV"
    ],
    "actions": [
      {
        "type": "open_search",
        "label": "Open Search",
        "data": { "query": "added:this-week" }
      }
    ]
  }
}
```

#### GET /api/pai/chat

Get information about PAI capabilities and status.

**Response:**

```json
{
  "success": true,
  "data": {
    "name": "Personal AI Assistant",
    "version": "1.0.0",
    "status": "connected",
    "message": "Connected to Claude API (claude-sonnet-4-20250514)",
    "capabilities": [
      "contact_management",
      "conversation_assistance",
      "analytics_insights",
      "automation_setup",
      "natural_language_search",
      "contextual_suggestions"
    ],
    "modelInfo": {
      "model": "claude-sonnet-4-20250514",
      "maxTokens": 4096,
      "temperature": 0.7,
      "isConfigured": true
    }
  }
}
```

## Context-Aware Responses

PAI provides intelligent, context-aware responses based on:

### Page Context

The AI knows which page you're on:
- **Contacts Page**: Focuses on contact management, searching, and organization
- **Conversations Page**: Helps with message drafting, summarization, and prioritization
- **Analytics Page**: Provides data interpretation, trend analysis, and insights
- **Automation Page**: Suggests workflow optimizations and automation strategies

### User Context

The system can include:
- Currently selected text or items
- Active contact or conversation IDs
- Previous conversation history
- User preferences and settings

### System Prompts

The Claude client includes a comprehensive system prompt that:
- Defines PAI's role as a business operations assistant
- Lists specific capabilities for each dashboard section
- Establishes communication style guidelines
- Provides context-specific guidance based on the current page

## Fallback Behavior

The system is designed to work seamlessly without API configuration:

1. **Without ANTHROPIC_API_KEY**: Uses intelligent mock responses
2. **With API key but error occurs**: Falls back to mock responses
3. **API rate limit exceeded**: Gracefully falls back with error logging

This ensures users can demo and test the dashboard without requiring API access.

## Error Handling

The integration includes comprehensive error handling:

```typescript
try {
  const result = await claudeClient.chat({
    message: userMessage,
    context: dashboardContext,
  });
  // Use Claude response
} catch (error) {
  console.error('Claude API error:', error);
  // Fall back to mock response
  const mockResponse = generateMockResponse(request);
}
```

Errors are logged but don't break the user experience.

## Performance Considerations

### Response Times

- **Streaming mode**: Faster perceived performance, chunks arrive immediately
- **Non-streaming mode**: Simpler implementation, full response at once
- **Mock mode**: Instant responses with simulated delay for realism

### Token Usage

Monitor token usage through the API response:

```typescript
console.log('Token usage:', {
  inputTokens: result.usage.inputTokens,
  outputTokens: result.usage.outputTokens,
});
```

### Optimization Tips

1. **Use appropriate models**: Sonnet for most cases, Opus only when needed
2. **Limit conversation history**: Keep only relevant previous messages
3. **Cache common responses**: Consider caching for frequently asked questions
4. **Use streaming**: For better user experience with long responses

## Security Best Practices

1. **Never commit API keys**: Always use environment variables
2. **Use .env.local**: For local development (ignored by git)
3. **Rotate keys regularly**: Update keys periodically for security
4. **Monitor usage**: Track API calls to detect anomalies
5. **Validate input**: All user input is validated before sending to API

## Development

### Testing Without API Key

The system works perfectly without an API key for testing:

```bash
# Don't set ANTHROPIC_API_KEY
npm run dev
```

You'll see mock responses with a banner indicating demo mode.

### Testing With API Key

Set your API key and test real Claude integration:

```bash
# In .env.local
ANTHROPIC_API_KEY=sk-ant-api03-...

npm run dev
```

Check the console logs to see Claude API calls.

### Custom Integration

You can use the Claude client directly in your code:

```typescript
import { getClaudeClient } from '@/lib/claude-client';

const client = getClaudeClient();

if (client.isReady()) {
  const result = await client.chat({
    message: 'Your message here',
    context: {
      page: 'contacts',
      // ... other context
    },
  });

  console.log(result.message);
}
```

## Monitoring & Logging

The integration logs key events:

- API requests and responses
- Token usage statistics
- Error conditions and fallbacks
- Model configuration

Check your console output for detailed logs:

```
PAI Chat Request: { message: '...', context: {...} }
Using Claude API for response...
Claude API response received: { model: '...', usage: {...} }
```

## Troubleshooting

### "Claude client is not configured"

**Solution**: Set `ANTHROPIC_API_KEY` in your `.env.local` file

### API Key Invalid

**Solution**: Verify your API key at https://console.anthropic.com/settings/keys

### Slow Responses

**Solution**:
- Use streaming mode for better UX
- Consider using a faster model
- Check your network connection

### Rate Limit Errors

**Solution**:
- Upgrade your Anthropic plan
- Implement request throttling
- Use caching for common queries

## Future Enhancements

Potential improvements to consider:

1. **Streaming Support**: Add streaming responses to the UI
2. **Response Caching**: Cache common queries for faster responses
3. **Advanced Context**: Include more dashboard data in context
4. **Function Calling**: Use Claude's function calling for actions
5. **Multi-modal**: Support image analysis for screenshots
6. **Analytics**: Track conversation analytics and user satisfaction

## Additional Resources

- [Anthropic API Documentation](https://docs.anthropic.com/)
- [Claude API SDK on npm](https://www.npmjs.com/package/@anthropic-ai/sdk)
- [PAI Dashboard Documentation](./README.md)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)

## Support

For issues or questions:
1. Check the console logs for detailed error messages
2. Verify your API key and configuration
3. Review this documentation
4. Check Anthropic's API status page
5. Open an issue in the repository

---

**Note**: This integration is production-ready but should be monitored and optimized based on your specific usage patterns and requirements.
