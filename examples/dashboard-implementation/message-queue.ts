/**
 * Message Queue System
 * Ensures reliable delivery of sync operations and events
 */

import { EventEmitter } from "events";

interface QueuedMessage {
  id: string;
  type: string;
  payload: any;
  priority: number;
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  scheduledFor?: number;
  status: "pending" | "processing" | "completed" | "failed" | "dead";
  error?: string;
}

interface QueueOptions {
  concurrency?: number;
  retryDelay?: number;
  maxRetries?: number;
  persistToStorage?: boolean;
}

/**
 * Persistent Message Queue
 * Features:
 * - Priority-based processing
 * - Automatic retries with exponential backoff
 * - Dead letter queue for failed messages
 * - Persistence to localStorage/IndexedDB
 * - Rate limiting
 */
export class MessageQueue extends EventEmitter {
  private queue: QueuedMessage[] = [];
  private processing = new Set<string>();
  private deadLetterQueue: QueuedMessage[] = [];
  private handlers = new Map<string, (payload: any) => Promise<void>>();
  private isProcessing = false;
  private storageKey = "pai-message-queue";

  constructor(private options: QueueOptions = {}) {
    super();

    this.options = {
      concurrency: 5,
      retryDelay: 1000,
      maxRetries: 3,
      persistToStorage: true,
      ...options,
    };

    // Load persisted queue
    if (this.options.persistToStorage) {
      this.loadFromStorage();
    }

    // Start processing
    this.startProcessing();

    // Persist on change
    this.on("queue:changed", () => {
      if (this.options.persistToStorage) {
        this.saveToStorage();
      }
    });
  }

  /**
   * Register message handler
   */
  registerHandler(type: string, handler: (payload: any) => Promise<void>) {
    this.handlers.set(type, handler);
  }

  /**
   * Add message to queue
   */
  async enqueue(
    type: string,
    payload: any,
    options: {
      priority?: number;
      delay?: number;
      maxAttempts?: number;
    } = {}
  ): Promise<string> {
    const message: QueuedMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      payload,
      priority: options.priority || 0,
      attempts: 0,
      maxAttempts: options.maxAttempts || this.options.maxRetries || 3,
      createdAt: Date.now(),
      scheduledFor: options.delay ? Date.now() + options.delay : undefined,
      status: "pending",
    };

    this.queue.push(message);

    // Sort by priority (higher first) and created time
    this.queue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.createdAt - b.createdAt;
    });

    this.emit("queue:changed");
    this.emit("message:enqueued", message);

    return message.id;
  }

  /**
   * Process queue
   */
  private async startProcessing() {
    this.isProcessing = true;

    while (this.isProcessing) {
      const concurrency = this.options.concurrency || 5;

      // Get messages ready to process
      const available = this.queue.filter(
        (msg) =>
          msg.status === "pending" &&
          !this.processing.has(msg.id) &&
          (!msg.scheduledFor || msg.scheduledFor <= Date.now())
      );

      const toProcess = available.slice(0, concurrency - this.processing.size);

      if (toProcess.length > 0) {
        await Promise.all(toProcess.map((msg) => this.processMessage(msg)));
      } else {
        // Wait before checking again
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }

  /**
   * Process single message
   */
  private async processMessage(message: QueuedMessage) {
    this.processing.add(message.id);
    message.status = "processing";
    message.attempts += 1;

    this.emit("message:processing", message);

    try {
      const handler = this.handlers.get(message.type);

      if (!handler) {
        throw new Error(`No handler registered for message type: ${message.type}`);
      }

      await handler(message.payload);

      // Success
      message.status = "completed";
      this.removeFromQueue(message.id);
      this.emit("message:completed", message);
    } catch (error: any) {
      console.error(`Failed to process message ${message.id}:`, error);

      message.error = error.message;

      if (message.attempts >= message.maxAttempts) {
        // Move to dead letter queue
        message.status = "dead";
        this.deadLetterQueue.push(message);
        this.removeFromQueue(message.id);
        this.emit("message:dead", message);
      } else {
        // Retry with exponential backoff
        message.status = "pending";
        const delay = this.options.retryDelay! * Math.pow(2, message.attempts - 1);
        message.scheduledFor = Date.now() + delay;

        this.emit("message:retry", { message, delay });
      }
    } finally {
      this.processing.delete(message.id);
      this.emit("queue:changed");
    }
  }

  /**
   * Remove message from queue
   */
  private removeFromQueue(messageId: string) {
    const index = this.queue.findIndex((msg) => msg.id === messageId);
    if (index !== -1) {
      this.queue.splice(index, 1);
      this.emit("queue:changed");
    }
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      pending: this.queue.filter((m) => m.status === "pending").length,
      processing: this.processing.size,
      failed: this.queue.filter((m) => m.status === "failed").length,
      dead: this.deadLetterQueue.length,
      total: this.queue.length,
    };
  }

  /**
   * Get dead letter queue
   */
  getDeadLetterQueue(): QueuedMessage[] {
    return [...this.deadLetterQueue];
  }

  /**
   * Retry dead letter message
   */
  async retryDeadLetter(messageId: string) {
    const index = this.deadLetterQueue.findIndex((msg) => msg.id === messageId);
    if (index === -1) return;

    const message = this.deadLetterQueue.splice(index, 1)[0];
    message.status = "pending";
    message.attempts = 0;
    message.error = undefined;

    this.queue.push(message);
    this.emit("queue:changed");
  }

  /**
   * Clear queue
   */
  clear() {
    this.queue = [];
    this.deadLetterQueue = [];
    this.emit("queue:changed");
  }

  /**
   * Persist to storage
   */
  private saveToStorage() {
    try {
      const data = {
        queue: this.queue,
        deadLetterQueue: this.deadLetterQueue,
        timestamp: Date.now(),
      };

      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to persist queue to storage:", error);
    }
  }

  /**
   * Load from storage
   */
  private loadFromStorage() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        const parsed = JSON.parse(data);
        this.queue = parsed.queue || [];
        this.deadLetterQueue = parsed.deadLetterQueue || [];

        console.log(
          `📦 Loaded ${this.queue.length} messages from storage (${this.deadLetterQueue.length} dead)`
        );
      }
    } catch (error) {
      console.error("Failed to load queue from storage:", error);
    }
  }

  /**
   * Stop processing
   */
  stop() {
    this.isProcessing = false;
    if (this.options.persistToStorage) {
      this.saveToStorage();
    }
  }
}

/**
 * Example: Sync Message Queue
 * Handles sync operations reliably
 */
export class SyncMessageQueue extends MessageQueue {
  constructor(
    private ghlAPI: any,
    private localDB: any,
    options?: QueueOptions
  ) {
    super(options);

    // Register handlers
    this.registerHandler("sync:contact:create", async (payload) => {
      const ghlContact = await this.ghlAPI.createContact(payload);
      await this.localDB.contact.update({
        where: { id: payload.localId },
        data: { ghlId: ghlContact.id },
      });
    });

    this.registerHandler("sync:contact:update", async (payload) => {
      await this.ghlAPI.updateContact(payload.ghlId, payload.updates);
      await this.localDB.contact.update({
        where: { id: payload.localId },
        data: { lastSyncedAt: new Date() },
      });
    });

    this.registerHandler("sync:contact:delete", async (payload) => {
      await this.ghlAPI.deleteContact(payload.ghlId);
    });

    this.registerHandler("sync:message:send", async (payload) => {
      await this.ghlAPI.sendMessage(payload.conversationId, payload.message);
    });

    this.registerHandler("webhook:process", async (payload) => {
      // Process webhook payload
      await this.processWebhook(payload);
    });

    // Listen for events
    this.on("message:dead", (message) => {
      console.error(`❌ Message failed permanently:`, message);
      // Could send alert to monitoring system
    });
  }

  private async processWebhook(payload: any) {
    // Handle webhook processing
    const { event, data } = payload;

    switch (event) {
      case "ContactCreate":
        await this.localDB.contact.create({ data: this.mapWebhookData(data) });
        break;
      case "ContactUpdate":
        await this.localDB.contact.update({
          where: { ghlId: data.id },
          data: this.mapWebhookData(data),
        });
        break;
      case "ContactDelete":
        await this.localDB.contact.delete({ where: { ghlId: data.id } });
        break;
    }
  }

  private mapWebhookData(data: any) {
    return {
      ghlId: data.id,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
    };
  }

  /**
   * Enqueue sync operation
   */
  async enqueueSyncOperation(
    operation: "create" | "update" | "delete",
    entityType: "contact" | "message",
    payload: any
  ) {
    const type = `sync:${entityType}:${operation}`;
    const priority = operation === "delete" ? 1 : operation === "create" ? 2 : 0;

    return this.enqueue(type, payload, { priority });
  }
}
