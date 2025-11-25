/**
 * GoHighLevel API Wrapper
 * Rate-limited, queue-based, retry-enabled API client
 */

import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import PQueue from "p-queue";
import { EventEmitter } from "events";

// Token bucket for rate limiting
class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private capacity: number,
    private refillRate: number // tokens per second
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  async consume(tokens = 1): Promise<void> {
    await this.refill();

    while (this.tokens < tokens) {
      const waitTime = ((tokens - this.tokens) / this.refillRate) * 1000;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      await this.refill();
    }

    this.tokens -= tokens;
  }

  private async refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const tokensToAdd = elapsed * this.refillRate;

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}

// API request with metadata
interface APIRequest<T = any> {
  id: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  endpoint: string;
  data?: any;
  config?: AxiosRequestConfig;
  priority?: number;
  retries?: number;
  resolve: (value: T) => void;
  reject: (error: any) => void;
}

/**
 * GoHighLevel API Client
 * Features:
 * - Rate limiting (100 req/min for standard tier)
 * - Request queuing with priority
 * - Automatic retries with exponential backoff
 * - Webhook handler for real-time updates
 * - Response caching
 */
export class GoHighLevelAPI extends EventEmitter {
  private client: AxiosInstance;
  private queue: PQueue;
  private rateLimiter: TokenBucket;
  private cache = new Map<string, { data: any; expires: number }>();
  private webhookHandlers = new Map<string, Function[]>();

  constructor(
    private apiKey: string,
    private options: {
      baseURL?: string;
      rateLimit?: { capacity: number; refillRate: number };
      concurrency?: number;
      cacheExpiry?: number; // seconds
    } = {}
  ) {
    super();

    // Initialize rate limiter (default: 100 requests/min = ~1.67/sec)
    this.rateLimiter = new TokenBucket(
      options.rateLimit?.capacity || 100,
      options.rateLimit?.refillRate || 1.67
    );

    // Initialize request queue
    this.queue = new PQueue({
      concurrency: options.concurrency || 5,
      interval: 1000,
      intervalCap: 10, // Max 10 requests per second
    });

    // Initialize axios client
    this.client = axios.create({
      baseURL: options.baseURL || "https://rest.gohighlevel.com/v1",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });

    // Setup interceptors
    this.setupInterceptors();
  }

  /**
   * Setup axios interceptors
   */
  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add request ID for tracking
        config.headers["X-Request-ID"] = `req_${Date.now()}_${Math.random()}`;
        this.emit("request:start", config);
        return config;
      },
      (error) => {
        this.emit("request:error", error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        this.emit("request:success", response);

        // Check rate limit headers
        const remaining = response.headers["x-ratelimit-remaining"];
        const reset = response.headers["x-ratelimit-reset"];

        if (remaining && parseInt(remaining) < 10) {
          this.emit("rate-limit:warning", { remaining, reset });
        }

        return response;
      },
      (error) => {
        this.emit("request:error", error);

        // Handle rate limit exceeded
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers["retry-after"];
          this.emit("rate-limit:exceeded", { retryAfter });
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Execute API request with rate limiting and queueing
   */
  private async executeRequest<T>(request: APIRequest<T>): Promise<T> {
    const { method, endpoint, data, config } = request;

    // Check cache first (for GET requests)
    if (method === "GET") {
      const cached = this.getFromCache(endpoint);
      if (cached) {
        return cached as T;
      }
    }

    // Consume rate limit token
    await this.rateLimiter.consume();

    // Execute request
    try {
      const response = await this.client.request({
        method,
        url: endpoint,
        data,
        ...config,
      });

      // Cache GET responses
      if (method === "GET") {
        this.addToCache(endpoint, response.data);
      }

      return response.data;
    } catch (error: any) {
      // Retry logic
      if (this.shouldRetry(error, request.retries || 0)) {
        request.retries = (request.retries || 0) + 1;
        const delay = this.getRetryDelay(request.retries);

        console.log(`Retrying request ${request.id} after ${delay}ms (attempt ${request.retries})`);

        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.executeRequest(request);
      }

      throw error;
    }
  }

  /**
   * Should retry request
   */
  private shouldRetry(error: any, retries: number): boolean {
    const maxRetries = 3;
    if (retries >= maxRetries) return false;

    // Retry on network errors or 5xx errors
    return !error.response || (error.response.status >= 500 && error.response.status < 600);
  }

  /**
   * Get retry delay with exponential backoff
   */
  private getRetryDelay(attempt: number): number {
    return Math.min(1000 * Math.pow(2, attempt), 30000);
  }

  /**
   * Get from cache
   */
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expires) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Add to cache
   */
  private addToCache(key: string, data: any) {
    const expiry = this.options.cacheExpiry || 60; // default 60 seconds
    this.cache.set(key, {
      data,
      expires: Date.now() + expiry * 1000,
    });
  }

  /**
   * Public API methods
   */

  // Contacts
  async getContacts(params?: {
    limit?: number;
    offset?: number;
    query?: string;
  }): Promise<any[]> {
    return this.queue.add(
      () =>
        new Promise((resolve, reject) => {
          this.executeRequest({
            id: `get_contacts_${Date.now()}`,
            method: "GET",
            endpoint: "/contacts",
            config: { params },
            resolve,
            reject,
          });
        })
    );
  }

  async getContact(contactId: string): Promise<any> {
    return this.queue.add(
      () =>
        new Promise((resolve, reject) => {
          this.executeRequest({
            id: `get_contact_${contactId}`,
            method: "GET",
            endpoint: `/contacts/${contactId}`,
            resolve,
            reject,
          });
        })
    );
  }

  async createContact(contactData: any): Promise<any> {
    return this.queue.add(
      () =>
        new Promise((resolve, reject) => {
          this.executeRequest({
            id: `create_contact_${Date.now()}`,
            method: "POST",
            endpoint: "/contacts",
            data: contactData,
            priority: 1, // Higher priority for creates
            resolve,
            reject,
          });
        }),
      { priority: 1 }
    );
  }

  async updateContact(contactId: string, updates: any): Promise<any> {
    return this.queue.add(
      () =>
        new Promise((resolve, reject) => {
          this.executeRequest({
            id: `update_contact_${contactId}`,
            method: "PUT",
            endpoint: `/contacts/${contactId}`,
            data: updates,
            priority: 1,
            resolve,
            reject,
          });
        }),
      { priority: 1 }
    );
  }

  async deleteContact(contactId: string): Promise<void> {
    return this.queue.add(
      () =>
        new Promise((resolve, reject) => {
          this.executeRequest({
            id: `delete_contact_${contactId}`,
            method: "DELETE",
            endpoint: `/contacts/${contactId}`,
            resolve,
            reject,
          });
        })
    );
  }

  // Conversations
  async getConversations(params?: { contactId?: string; limit?: number }): Promise<any[]> {
    return this.queue.add(
      () =>
        new Promise((resolve, reject) => {
          this.executeRequest({
            id: `get_conversations_${Date.now()}`,
            method: "GET",
            endpoint: "/conversations",
            config: { params },
            resolve,
            reject,
          });
        })
    );
  }

  async sendMessage(conversationId: string, message: string, type = "SMS"): Promise<any> {
    return this.queue.add(
      () =>
        new Promise((resolve, reject) => {
          this.executeRequest({
            id: `send_message_${conversationId}`,
            method: "POST",
            endpoint: "/conversations/messages",
            data: { conversationId, message, type },
            priority: 2, // Highest priority for messages
            resolve,
            reject,
          });
        }),
      { priority: 2 }
    );
  }

  // Opportunities (Pipelines)
  async getOpportunities(params?: { pipelineId?: string; status?: string }): Promise<any[]> {
    return this.queue.add(
      () =>
        new Promise((resolve, reject) => {
          this.executeRequest({
            id: `get_opportunities_${Date.now()}`,
            method: "GET",
            endpoint: "/opportunities",
            config: { params },
            resolve,
            reject,
          });
        })
    );
  }

  async updateOpportunity(opportunityId: string, updates: any): Promise<any> {
    return this.queue.add(
      () =>
        new Promise((resolve, reject) => {
          this.executeRequest({
            id: `update_opportunity_${opportunityId}`,
            method: "PUT",
            endpoint: `/opportunities/${opportunityId}`,
            data: updates,
            resolve,
            reject,
          });
        })
    );
  }

  /**
   * Webhook handling
   */
  registerWebhookHandler(event: string, handler: Function) {
    if (!this.webhookHandlers.has(event)) {
      this.webhookHandlers.set(event, []);
    }
    this.webhookHandlers.get(event)!.push(handler);
  }

  async handleWebhook(event: string, payload: any) {
    const handlers = this.webhookHandlers.get(event) || [];

    for (const handler of handlers) {
      try {
        await handler(payload);
      } catch (error) {
        console.error(`Error in webhook handler for ${event}:`, error);
      }
    }

    this.emit("webhook:received", { event, payload });
  }

  /**
   * Bulk sync operations
   */
  async bulkSync(entityType: "contacts" | "conversations" | "opportunities") {
    this.emit("sync:start", { entityType });

    let allData: any[] = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      try {
        let batch: any[] = [];

        switch (entityType) {
          case "contacts":
            batch = await this.getContacts({ limit, offset });
            break;
          case "conversations":
            batch = await this.getConversations({ limit });
            break;
          case "opportunities":
            batch = await this.getOpportunities();
            break;
        }

        allData = [...allData, ...batch];
        this.emit("sync:progress", {
          entityType,
          total: allData.length,
          batch: batch.length,
        });

        hasMore = batch.length === limit;
        offset += limit;
      } catch (error) {
        this.emit("sync:error", { entityType, error });
        throw error;
      }
    }

    this.emit("sync:complete", { entityType, total: allData.length });
    return allData;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    return {
      pending: this.queue.pending,
      size: this.queue.size,
    };
  }
}
