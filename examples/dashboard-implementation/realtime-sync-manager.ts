/**
 * Real-time Sync Manager
 * Handles WebSocket connections, optimistic updates, conflict resolution
 */

import { io, Socket } from "socket.io-client";
import { EventEmitter } from "events";

// Entity types
type EntityType = "contact" | "conversation" | "message" | "pipeline";

// Sync event types
interface SyncEvent {
  type: "create" | "update" | "delete";
  entityType: EntityType;
  entityId: string;
  data: any;
  timestamp: number;
  source: "local" | "remote" | "ghl";
  version?: number;
}

// Optimistic update with rollback
interface OptimisticUpdate {
  id: string;
  event: SyncEvent;
  rollback: () => void;
  timestamp: number;
  confirmed: boolean;
}

// Conflict resolution strategy
type ConflictStrategy = "local-wins" | "remote-wins" | "latest-wins" | "merge";

/**
 * Real-time Sync Manager
 * Manages WebSocket connections and data synchronization
 */
export class RealtimeSyncManager extends EventEmitter {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private optimisticUpdates = new Map<string, OptimisticUpdate>();
  private syncQueue: SyncEvent[] = [];
  private isOnline = true;

  constructor(
    private serverUrl: string,
    private conflictStrategy: ConflictStrategy = "latest-wins"
  ) {
    super();
    this.connect();
    this.setupOfflineDetection();
  }

  /**
   * Connect to WebSocket server
   */
  private connect() {
    this.socket = io(this.serverUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.socket.on("connect", () => {
      console.log("✅ WebSocket connected");
      this.reconnectAttempts = 0;
      this.emit("connected");
      this.flushSyncQueue();
    });

    this.socket.on("disconnect", () => {
      console.log("❌ WebSocket disconnected");
      this.emit("disconnected");
    });

    this.socket.on("reconnect_attempt", (attempt) => {
      console.log(`🔄 Reconnection attempt ${attempt}`);
      this.reconnectAttempts = attempt;
    });

    // Entity update events
    this.socket.on("entity:created", (event: SyncEvent) => {
      this.handleRemoteEvent({ ...event, type: "create" });
    });

    this.socket.on("entity:updated", (event: SyncEvent) => {
      this.handleRemoteEvent({ ...event, type: "update" });
    });

    this.socket.on("entity:deleted", (event: SyncEvent) => {
      this.handleRemoteEvent({ ...event, type: "delete" });
    });

    // Confirmation of optimistic updates
    this.socket.on("update:confirmed", (updateId: string) => {
      this.confirmOptimisticUpdate(updateId);
    });

    // Conflict detected
    this.socket.on("conflict:detected", (conflict: any) => {
      this.resolveConflict(conflict);
    });

    // Sync status
    this.socket.on("sync:status", (status: any) => {
      this.emit("sync:status", status);
    });
  }

  /**
   * Setup offline detection
   */
  private setupOfflineDetection() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        this.isOnline = true;
        this.emit("online");
        this.flushSyncQueue();
      });

      window.addEventListener("offline", () => {
        this.isOnline = false;
        this.emit("offline");
      });
    }
  }

  /**
   * Create entity with optimistic update
   */
  async create(
    entityType: EntityType,
    data: any,
    optimistic = true
  ): Promise<{ id: string; optimisticId?: string }> {
    const optimisticId = `optimistic_${Date.now()}_${Math.random()}`;
    const event: SyncEvent = {
      type: "create",
      entityType,
      entityId: optimisticId,
      data,
      timestamp: Date.now(),
      source: "local",
    };

    if (optimistic) {
      // Apply optimistically
      this.applyOptimisticUpdate(optimisticId, event);
    }

    // Queue for server sync
    if (this.isOnline && this.socket?.connected) {
      return this.sendToServer(event);
    } else {
      this.syncQueue.push(event);
      return { id: optimisticId, optimisticId };
    }
  }

  /**
   * Update entity with optimistic update
   */
  async update(
    entityType: EntityType,
    entityId: string,
    updates: Partial<any>,
    optimistic = true
  ): Promise<void> {
    const event: SyncEvent = {
      type: "update",
      entityType,
      entityId,
      data: updates,
      timestamp: Date.now(),
      source: "local",
    };

    if (optimistic) {
      this.applyOptimisticUpdate(`update_${entityId}_${Date.now()}`, event);
    }

    if (this.isOnline && this.socket?.connected) {
      await this.sendToServer(event);
    } else {
      this.syncQueue.push(event);
    }
  }

  /**
   * Delete entity with optimistic update
   */
  async delete(
    entityType: EntityType,
    entityId: string,
    optimistic = true
  ): Promise<void> {
    const event: SyncEvent = {
      type: "delete",
      entityType,
      entityId,
      data: null,
      timestamp: Date.now(),
      source: "local",
    };

    if (optimistic) {
      this.applyOptimisticUpdate(`delete_${entityId}_${Date.now()}`, event);
    }

    if (this.isOnline && this.socket?.connected) {
      await this.sendToServer(event);
    } else {
      this.syncQueue.push(event);
    }
  }

  /**
   * Apply optimistic update
   */
  private applyOptimisticUpdate(updateId: string, event: SyncEvent) {
    const rollback = () => {
      this.emit("rollback", event);
    };

    const update: OptimisticUpdate = {
      id: updateId,
      event,
      rollback,
      timestamp: Date.now(),
      confirmed: false,
    };

    this.optimisticUpdates.set(updateId, update);

    // Emit event for UI to handle
    this.emit("optimistic:update", event);

    // Auto-rollback after timeout if not confirmed
    setTimeout(() => {
      if (!this.optimisticUpdates.get(updateId)?.confirmed) {
        console.warn(`Optimistic update ${updateId} not confirmed, rolling back`);
        this.rollbackOptimisticUpdate(updateId);
      }
    }, 30000); // 30 second timeout
  }

  /**
   * Confirm optimistic update
   */
  private confirmOptimisticUpdate(updateId: string) {
    const update = this.optimisticUpdates.get(updateId);
    if (update) {
      update.confirmed = true;
      this.emit("confirmed", update.event);

      // Clean up after a delay
      setTimeout(() => {
        this.optimisticUpdates.delete(updateId);
      }, 5000);
    }
  }

  /**
   * Rollback optimistic update
   */
  private rollbackOptimisticUpdate(updateId: string) {
    const update = this.optimisticUpdates.get(updateId);
    if (update) {
      update.rollback();
      this.optimisticUpdates.delete(updateId);
      this.emit("rollback", update.event);
    }
  }

  /**
   * Handle remote event from server
   */
  private handleRemoteEvent(event: SyncEvent) {
    // Check for conflicts with optimistic updates
    const hasConflict = this.detectConflict(event);

    if (hasConflict) {
      this.resolveConflict({
        remote: event,
        local: hasConflict,
      });
    } else {
      // Apply remote update
      this.emit("remote:update", event);
    }
  }

  /**
   * Detect conflict with optimistic updates
   */
  private detectConflict(remoteEvent: SyncEvent): OptimisticUpdate | null {
    for (const [id, update] of this.optimisticUpdates) {
      if (
        update.event.entityId === remoteEvent.entityId &&
        update.event.entityType === remoteEvent.entityType &&
        !update.confirmed
      ) {
        return update;
      }
    }
    return null;
  }

  /**
   * Resolve conflict based on strategy
   */
  private resolveConflict(conflict: { remote: SyncEvent; local: OptimisticUpdate }) {
    const { remote, local } = conflict;

    switch (this.conflictStrategy) {
      case "local-wins":
        // Keep local, reject remote
        console.log("Conflict: Local wins");
        break;

      case "remote-wins":
        // Rollback local, apply remote
        console.log("Conflict: Remote wins");
        this.rollbackOptimisticUpdate(local.id);
        this.emit("remote:update", remote);
        break;

      case "latest-wins":
        // Compare timestamps
        if (remote.timestamp > local.timestamp) {
          console.log("Conflict: Remote is newer");
          this.rollbackOptimisticUpdate(local.id);
          this.emit("remote:update", remote);
        } else {
          console.log("Conflict: Local is newer");
        }
        break;

      case "merge":
        // Attempt to merge changes
        console.log("Conflict: Merging changes");
        const merged = this.mergeChanges(local.event.data, remote.data);
        this.emit("remote:update", { ...remote, data: merged });
        this.confirmOptimisticUpdate(local.id);
        break;
    }

    this.emit("conflict:resolved", { remote, local, strategy: this.conflictStrategy });
  }

  /**
   * Merge changes (simple deep merge)
   */
  private mergeChanges(local: any, remote: any): any {
    return { ...remote, ...local };
  }

  /**
   * Send event to server
   */
  private async sendToServer(event: SyncEvent): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        this.syncQueue.push(event);
        reject(new Error("Not connected"));
        return;
      }

      this.socket.emit("entity:sync", event, (response: any) => {
        if (response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  /**
   * Flush sync queue when coming back online
   */
  private async flushSyncQueue() {
    if (!this.isOnline || !this.socket?.connected) return;

    console.log(`📤 Flushing ${this.syncQueue.length} queued events`);

    const queue = [...this.syncQueue];
    this.syncQueue = [];

    for (const event of queue) {
      try {
        await this.sendToServer(event);
      } catch (error) {
        console.error("Failed to sync queued event:", error);
        this.syncQueue.push(event); // Re-queue
      }
    }
  }

  /**
   * Subscribe to entity updates
   */
  subscribe(entityType: EntityType, entityId?: string) {
    if (!this.socket) return;

    const channel = entityId ? `${entityType}:${entityId}` : entityType;
    this.socket.emit("subscribe", channel);

    return () => {
      this.socket?.emit("unsubscribe", channel);
    };
  }

  /**
   * Get connection status
   */
  get isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Disconnect
   */
  disconnect() {
    this.socket?.disconnect();
  }
}
