# Quick Setup Guide: Claude API Integration

This guide will get you up and running with Claude API integration in 5 minutes.

## Prerequisites

- Node.js 18.17+ or Bun 1.0+
- An Anthropic API account

## Step-by-Step Setup

### 1. Get Your Anthropic API Key

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to **Settings** → **API Keys**
4. Click **Create Key**
5. Copy your API key (starts with `sk-ant-api03-`)

### 2. Install Dependencies

```bash
cd pai-dashboard

# Using npm
npm install

# OR using bun
bun install
```

This will install the `@anthropic-ai/sdk` package and all other dependencies.

### 3. Configure Environment

Create a `.env.local` file:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your API key:

```env
ANTHROPIC_API_KEY=sk-ant-api03-YOUR_KEY_HERE
PAI_MODEL=claude-sonnet-4-20250514
```

### 4. Start the Development Server

```bash
# Using npm
npm run dev

# OR using bun
bun dev
```

### 5. Test the Integration

1. Open http://localhost:3000 in your browser
2. Click the chat icon in the header
3. Type a message like "Help me with contacts"
4. You should see a real Claude API response!

## Verify It's Working

### Check API Status

Visit http://localhost:3000/api/pai/chat in your browser.

**With API key configured:**
```json
{
  "status": "connected",
  "message": "Connected to Claude API (claude-sonnet-4-20250514)"
}
```

**Without API key:**
```json
{
  "status": "mock",
  "message": "Claude API not configured. Using mock responses..."
}
```

### Check Console Logs

In your terminal, you should see:

```
PAI Chat Request: { message: '...', context: {...} }
Using Claude API for response...
Claude API response received: { model: 'claude-sonnet-4-20250514', usage: {...} }
```

## Testing Without API Key

The dashboard works perfectly without an API key:

1. Don't set `ANTHROPIC_API_KEY` in `.env.local`
2. Start the dev server
3. The system will use mock responses
4. You'll see a banner indicating demo mode

This is great for:
- Testing the UI
- Demoing to stakeholders
- Development without API costs

## Model Selection

Choose the right model for your needs:

### claude-sonnet-4-20250514 (Default)
- **Best for**: Most use cases
- **Speed**: Fast
- **Cost**: Moderate
- **Intelligence**: Very high

### claude-opus-4-20250514
- **Best for**: Complex reasoning tasks
- **Speed**: Slower
- **Cost**: Higher
- **Intelligence**: Highest

### claude-3-5-sonnet-20241022
- **Best for**: High-volume, cost-sensitive applications
- **Speed**: Fastest
- **Cost**: Lower
- **Intelligence**: High

Change the model in `.env.local`:

```env
PAI_MODEL=claude-opus-4-20250514
```

## Cost Estimation

Approximate costs per 1M tokens (as of 2025):

| Model | Input | Output |
|-------|-------|--------|
| Sonnet 4 | $3 | $15 |
| Opus 4 | $15 | $75 |
| Sonnet 3.5 | $3 | $15 |

**Typical chat message**: 500-2000 tokens (input + output)
**Average cost per message**: $0.01 - $0.05

Monitor your usage at: https://console.anthropic.com/settings/usage

## Common Issues

### "Module not found: @anthropic-ai/sdk"

**Solution**: Install dependencies
```bash
npm install
# or
bun install
```

### "Claude client is not configured"

**Solution**: Set your API key in `.env.local`

### API Key Invalid

**Solution**:
1. Verify the key at https://console.anthropic.com/settings/keys
2. Make sure it starts with `sk-ant-api03-`
3. Check for typos or extra whitespace

### Changes Not Taking Effect

**Solution**: Restart the dev server after changing `.env.local`
```bash
# Stop the server (Ctrl+C)
npm run dev
```

## Next Steps

1. **Read Full Documentation**: See [CLAUDE_INTEGRATION.md](./CLAUDE_INTEGRATION.md)
2. **Customize System Prompts**: Edit `/lib/claude-client.ts`
3. **Add Streaming**: Implement streaming responses in the UI
4. **Monitor Usage**: Track API calls and costs
5. **Optimize Performance**: Implement caching and rate limiting

## Production Deployment

For production deployment:

1. **Secure Your API Key**
   - Never commit to version control
   - Use environment variables in your hosting platform
   - Rotate keys regularly

2. **Set Production Environment Variables**
   ```env
   NODE_ENV=production
   ANTHROPIC_API_KEY=sk-ant-api03-...
   PAI_MODEL=claude-sonnet-4-20250514
   ```

3. **Add Rate Limiting**
   - Implement per-user rate limits
   - Add request queuing for high traffic
   - Monitor API usage

4. **Enable Monitoring**
   - Log API errors and latency
   - Track token usage per user/session
   - Set up alerts for failures

5. **Add Caching**
   - Cache common queries
   - Implement Redis for session management
   - Reduce API calls for repeated questions

## Getting Help

- **API Issues**: Check [Anthropic Status](https://status.anthropic.com/)
- **Documentation**: [Anthropic Docs](https://docs.anthropic.com/)
- **Dashboard Issues**: Check application logs in terminal
- **Integration Guide**: [CLAUDE_INTEGRATION.md](./CLAUDE_INTEGRATION.md)

---

**Congratulations!** You now have a production-ready Claude API integration. Happy building!
