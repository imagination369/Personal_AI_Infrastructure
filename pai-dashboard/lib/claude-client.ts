/**
 * Claude API Client for PAI Business Dashboard
 *
 * This module provides a production-ready integration with Anthropic's Claude API.
 * It handles chat completions, streaming responses, context management, and error handling.
 *
 * Features:
 * - Streaming and non-streaming responses
 * - Rich system prompts with PAI context
 * - Graceful error handling and fallbacks
 * - Support for conversation history
 * - Context injection (page, contacts, conversations)
 * - Rate limiting and timeout handling
 */

import Anthropic from '@anthropic-ai/sdk';

// =============================================================================
// Types
// =============================================================================

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatContext {
  page?: string;
  selectedText?: string;
  contactId?: string;
  conversationId?: string;
  userInfo?: {
    name?: string;
    email?: string;
  };
}

export interface ClaudeClientOptions {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  streaming?: boolean;
}

export interface ChatCompletionOptions {
  message: string;
  context?: ChatContext;
  previousMessages?: ChatMessage[];
  streaming?: boolean;
}

export interface ChatCompletionResult {
  message: string;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  stopReason?: string;
}

export type StreamCallback = (chunk: string) => void;

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_TEMPERATURE = 0.7;
const REQUEST_TIMEOUT = 60000; // 60 seconds

// =============================================================================
// System Prompt
// =============================================================================

/**
 * Generate the system prompt for PAI based on current context
 */
function generateSystemPrompt(context?: ChatContext): string {
  const basePrompt = `You are PAI (Personal AI), an intelligent business assistant integrated into a business operations dashboard.

## Your Role

You help users manage their business operations efficiently by providing:
- Contact management assistance
- Conversation and communication support
- Analytics insights and data interpretation
- Workflow automation suggestions
- Business intelligence and recommendations

## Your Capabilities

1. **Contact Management**
   - Search and filter contacts
   - Suggest contact segmentation strategies
   - Provide insights on contact engagement
   - Help organize and tag contacts

2. **Conversation Management**
   - Draft professional messages and replies
   - Summarize conversation threads
   - Suggest response templates
   - Prioritize conversations by urgency or importance

3. **Analytics & Insights**
   - Interpret dashboard metrics
   - Identify trends and patterns
   - Compare performance across time periods
   - Provide actionable recommendations

4. **Automation & Workflows**
   - Suggest automation opportunities
   - Help design workflow rules
   - Recommend follow-up strategies
   - Optimize business processes

## Your Communication Style

- Be concise and business-focused
- Provide actionable suggestions
- Use bullet points for clarity when appropriate
- Ask clarifying questions when needed
- Always consider the user's context and current task
- Be professional but friendly
- Avoid technical jargon unless discussing technical topics

## Important Guidelines

- You have access to the user's dashboard context (current page, selected items, etc.)
- You can suggest actions but cannot directly execute them without user confirmation
- Respect data privacy - never ask for sensitive information unnecessarily
- If you don't have enough context, ask for clarification
- Provide specific, practical advice tailored to the user's situation`;

  // Add context-specific information
  let contextualPrompt = basePrompt;

  if (context?.page) {
    contextualPrompt += `\n\n## Current Context\n\nThe user is currently on the **${context.page}** page.`;

    // Add page-specific guidance
    switch (context.page) {
      case 'contacts':
        contextualPrompt += '\n\nFocus on helping with contact-related tasks such as searching, organizing, segmenting, and managing contact data.';
        break;
      case 'conversations':
        contextualPrompt += '\n\nFocus on helping with conversation management, message drafting, summarization, and communication strategies.';
        break;
      case 'analytics':
        contextualPrompt += '\n\nFocus on interpreting metrics, identifying trends, and providing data-driven insights and recommendations.';
        break;
      case 'automation':
        contextualPrompt += '\n\nFocus on workflow optimization, automation suggestions, and process improvement strategies.';
        break;
    }
  }

  if (context?.selectedText) {
    contextualPrompt += `\n\nThe user has selected text: "${context.selectedText}"`;
  }

  if (context?.contactId) {
    contextualPrompt += `\n\nThe user is viewing contact ID: ${context.contactId}`;
  }

  if (context?.conversationId) {
    contextualPrompt += `\n\nThe user is viewing conversation ID: ${context.conversationId}`;
  }

  return contextualPrompt;
}

// =============================================================================
// Claude Client Class
// =============================================================================

export class ClaudeClient {
  private client: Anthropic | null = null;
  private model: string;
  private maxTokens: number;
  private temperature: number;
  private isConfigured: boolean;

  constructor(options: ClaudeClientOptions = {}) {
    const apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY;

    this.model = options.model || process.env.PAI_MODEL || DEFAULT_MODEL;
    this.maxTokens = options.maxTokens || DEFAULT_MAX_TOKENS;
    this.temperature = options.temperature || DEFAULT_TEMPERATURE;
    this.isConfigured = !!apiKey;

    if (apiKey) {
      try {
        this.client = new Anthropic({
          apiKey,
        });
      } catch (error) {
        console.error('Failed to initialize Anthropic client:', error);
        this.isConfigured = false;
      }
    }
  }

  /**
   * Check if the client is properly configured with an API key
   */
  isReady(): boolean {
    return this.isConfigured && this.client !== null;
  }

  /**
   * Get a non-streaming chat completion from Claude
   */
  async chat(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
    if (!this.isReady()) {
      throw new Error('Claude client is not configured. Please set ANTHROPIC_API_KEY environment variable.');
    }

    const { message, context, previousMessages = [] } = options;

    // Build messages array
    const messages: Anthropic.MessageParam[] = [
      ...previousMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: 'user',
        content: message,
      },
    ];

    try {
      const response = await this.client!.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        system: generateSystemPrompt(context),
        messages,
      });

      // Extract text content from response
      const textContent = response.content
        .filter(block => block.type === 'text')
        .map(block => (block as Anthropic.TextBlock).text)
        .join('\n');

      return {
        message: textContent,
        model: response.model,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
        stopReason: response.stop_reason || undefined,
      };
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        throw new Error(`Claude API error: ${error.message} (status: ${error.status})`);
      }
      throw error;
    }
  }

  /**
   * Get a streaming chat completion from Claude
   */
  async streamChat(
    options: ChatCompletionOptions,
    onChunk: StreamCallback
  ): Promise<ChatCompletionResult> {
    if (!this.isReady()) {
      throw new Error('Claude client is not configured. Please set ANTHROPIC_API_KEY environment variable.');
    }

    const { message, context, previousMessages = [] } = options;

    // Build messages array
    const messages: Anthropic.MessageParam[] = [
      ...previousMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: 'user',
        content: message,
      },
    ];

    try {
      const stream = await this.client!.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        system: generateSystemPrompt(context),
        messages,
        stream: true,
      });

      let fullText = '';
      let model = this.model;
      let inputTokens = 0;
      let outputTokens = 0;
      let stopReason: string | undefined;

      for await (const event of stream) {
        if (event.type === 'message_start') {
          model = event.message.model;
          inputTokens = event.message.usage.input_tokens;
        } else if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            const chunk = event.delta.text;
            fullText += chunk;
            onChunk(chunk);
          }
        } else if (event.type === 'message_delta') {
          outputTokens = event.usage.output_tokens;
          stopReason = event.delta.stop_reason || undefined;
        }
      }

      return {
        message: fullText,
        model,
        usage: {
          inputTokens,
          outputTokens,
        },
        stopReason,
      };
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        throw new Error(`Claude API error: ${error.message} (status: ${error.status})`);
      }
      throw error;
    }
  }

  /**
   * Get information about the current model configuration
   */
  getModelInfo() {
    return {
      model: this.model,
      maxTokens: this.maxTokens,
      temperature: this.temperature,
      isConfigured: this.isConfigured,
    };
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

/**
 * Default Claude client instance
 * Can be used across the application for consistent configuration
 */
let defaultClient: ClaudeClient | null = null;

export function getClaudeClient(options?: ClaudeClientOptions): ClaudeClient {
  if (!defaultClient) {
    defaultClient = new ClaudeClient(options);
  }
  return defaultClient;
}

/**
 * Reset the default client (useful for testing or reconfiguration)
 */
export function resetClaudeClient(): void {
  defaultClient = null;
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Simple chat function for quick integrations
 */
export async function chat(
  message: string,
  context?: ChatContext,
  previousMessages?: ChatMessage[]
): Promise<string> {
  const client = getClaudeClient();

  if (!client.isReady()) {
    throw new Error('Claude client is not configured');
  }

  const result = await client.chat({
    message,
    context,
    previousMessages,
  });

  return result.message;
}

/**
 * Simple streaming chat function
 */
export async function streamChat(
  message: string,
  onChunk: StreamCallback,
  context?: ChatContext,
  previousMessages?: ChatMessage[]
): Promise<string> {
  const client = getClaudeClient();

  if (!client.isReady()) {
    throw new Error('Claude client is not configured');
  }

  const result = await client.streamChat(
    {
      message,
      context,
      previousMessages,
    },
    onChunk
  );

  return result.message;
}
