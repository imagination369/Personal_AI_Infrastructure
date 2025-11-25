/**
 * Sync Orchestrator
 * Coordinates data sync between local DB, GHL API, and real-time updates
 */

import { EventEmitter } from "events";
import { GoHighLevelAPI } from "./ghl-api-wrapper";
import { RealtimeSyncManager } from "./realtime-sync-manager";

interface SyncConfig {
  entityType: "contact" | "conversation" | "message" | "opportunity";
  direction: "ghl-to-local" | "local-to-ghl" | "bidirectional";
  interval?: number; // milliseconds
  conflictResolution: "ghl-wins" | "local-wins" | "newest-wins" | "manual";
}

interface SyncEntity {
  id: string;
  localVersion?: number;
  ghlVersion?: number;
  lastSyncedAt?: number;
  data: any;
}

interface ConflictRecord {
  entityType: string;
  entityId: string;
  local: SyncEntity;
  remote: SyncEntity;
  timestamp: number;
  resolved: boolean;
}

/**
 * Sync Orchestrator
 * Manages bidirectional sync between local DB and GoHighLevel
 */
export class SyncOrchestrator extends EventEmitter {
  private syncIntervals = new Map<string, NodeJS.Timeout>();
  private syncLocks = new Map<string, boolean>();
  private conflicts: ConflictRecord[] = [];

  constructor(
    private ghlAPI: GoHighLevelAPI,
    private realtimeSync: RealtimeSyncManager,
    private localDB: any // Your local database client (e.g., Prisma, Knex)
  ) {
    super();
    this.setupWebhookHandlers();
    this.setupRealtimeHandlers();
  }

  /**
   * Setup GHL webhook handlers
   */
  private setupWebhookHandlers() {
    // Contact webhooks
    this.ghlAPI.registerWebhookHandler("ContactCreate", async (payload) => {
      await this.handleGHLContactCreate(payload);
    });

    this.ghlAPI.registerWebhookHandler("ContactUpdate", async (payload) => {
      await this.handleGHLContactUpdate(payload);
    });

    this.ghlAPI.registerWebhookHandler("ContactDelete", async (payload) => {
      await this.handleGHLContactDelete(payload);
    });

    // Conversation webhooks
    this.ghlAPI.registerWebhookHandler("MessageReceived", async (payload) => {
      await this.handleGHLMessageReceived(payload);
    });
  }

  /**
   * Setup real-time sync handlers
   */
  private setupRealtimeHandlers() {
    // Listen for local changes to sync to GHL
    this.realtimeSync.on("optimistic:update", async (event) => {
      if (event.source === "local") {
        await this.syncLocalToGHL(event);
      }
    });
  }

  /**
   * Start periodic sync for entity type
   */
  startPeriodicSync(config: SyncConfig) {
    const key = `${config.entityType}_${config.direction}`;

    if (this.syncIntervals.has(key)) {
      console.log(`Sync already running for ${key}`);
      return;
    }

    const interval = config.interval || 300000; // Default 5 minutes

    console.log(`🔄 Starting periodic sync for ${key} every ${interval}ms`);

    const syncInterval = setInterval(async () => {
      await this.executeSync(config);
    }, interval);

    this.syncIntervals.set(key, syncInterval);

    // Run initial sync immediately
    this.executeSync(config);
  }

  /**
   * Stop periodic sync
   */
  stopPeriodicSync(entityType: string, direction?: string) {
    const keys = Array.from(this.syncIntervals.keys()).filter((key) =>
      key.startsWith(entityType)
    );

    for (const key of keys) {
      if (!direction || key.includes(direction)) {
        const interval = this.syncIntervals.get(key);
        if (interval) {
          clearInterval(interval);
          this.syncIntervals.delete(key);
          console.log(`⏹️ Stopped periodic sync for ${key}`);
        }
      }
    }
  }

  /**
   * Execute sync based on config
   */
  private async executeSync(config: SyncConfig) {
    const lockKey = `${config.entityType}_${config.direction}`;

    // Prevent concurrent syncs
    if (this.syncLocks.get(lockKey)) {
      console.log(`Sync already in progress for ${lockKey}`);
      return;
    }

    this.syncLocks.set(lockKey, true);
    this.emit("sync:start", config);

    try {
      switch (config.direction) {
        case "ghl-to-local":
          await this.syncGHLToLocal(config);
          break;
        case "local-to-ghl":
          await this.syncLocalToGHLBulk(config);
          break;
        case "bidirectional":
          await this.syncBidirectional(config);
          break;
      }

      this.emit("sync:complete", config);
    } catch (error) {
      this.emit("sync:error", { config, error });
      console.error(`Sync error for ${lockKey}:`, error);
    } finally {
      this.syncLocks.set(lockKey, false);
    }
  }

  /**
   * Sync from GHL to local DB
   */
  private async syncGHLToLocal(config: SyncConfig) {
    const { entityType } = config;

    console.log(`📥 Syncing ${entityType} from GHL to local`);

    // Fetch all entities from GHL
    let ghlEntities: any[] = [];

    switch (entityType) {
      case "contact":
        ghlEntities = await this.ghlAPI.bulkSync("contacts");
        break;
      case "conversation":
        ghlEntities = await this.ghlAPI.bulkSync("conversations");
        break;
      case "opportunity":
        ghlEntities = await this.ghlAPI.bulkSync("opportunities");
        break;
    }

    // Fetch existing local entities
    const localEntities = await this.localDB[entityType].findMany();
    const localMap = new Map(localEntities.map((e: any) => [e.ghlId, e]));

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const ghlEntity of ghlEntities) {
      const localEntity = localMap.get(ghlEntity.id);

      if (!localEntity) {
        // Create new local entity
        await this.localDB[entityType].create({
          data: {
            ghlId: ghlEntity.id,
            ...this.mapGHLToLocal(entityType, ghlEntity),
            lastSyncedAt: new Date(),
            ghlVersion: ghlEntity.version || 1,
          },
        });
        created++;
      } else {
        // Check for conflicts
        const hasLocalChanges = localEntity.updatedAt > localEntity.lastSyncedAt;
        const hasRemoteChanges =
          new Date(ghlEntity.dateUpdated) > new Date(localEntity.lastSyncedAt);

        if (hasLocalChanges && hasRemoteChanges) {
          // Conflict detected
          await this.handleConflict(
            {
              entityType,
              entityId: ghlEntity.id,
              local: { id: localEntity.id, data: localEntity },
              remote: { id: ghlEntity.id, data: ghlEntity },
              timestamp: Date.now(),
              resolved: false,
            },
            config.conflictResolution
          );
          skipped++;
        } else if (hasRemoteChanges) {
          // Update local entity
          await this.localDB[entityType].update({
            where: { id: localEntity.id },
            data: {
              ...this.mapGHLToLocal(entityType, ghlEntity),
              lastSyncedAt: new Date(),
              ghlVersion: ghlEntity.version || localEntity.ghlVersion + 1,
            },
          });
          updated++;
        } else {
          skipped++;
        }
      }
    }

    console.log(
      `✅ GHL → Local sync complete: ${created} created, ${updated} updated, ${skipped} skipped`
    );

    this.emit("sync:stats", { entityType, created, updated, skipped });
  }

  /**
   * Sync from local DB to GHL (bulk)
   */
  private async syncLocalToGHLBulk(config: SyncConfig) {
    const { entityType } = config;

    console.log(`📤 Syncing ${entityType} from local to GHL`);

    // Find local entities that need syncing
    const unsyncedEntities = await this.localDB[entityType].findMany({
      where: {
        OR: [
          { ghlId: null }, // Never synced
          { updatedAt: { gt: this.localDB.raw("last_synced_at") } }, // Modified since last sync
        ],
      },
    });

    let created = 0;
    let updated = 0;
    let failed = 0;

    for (const localEntity of unsyncedEntities) {
      try {
        if (!localEntity.ghlId) {
          // Create in GHL
          const ghlEntity = await this.createInGHL(entityType, localEntity);

          // Update local with GHL ID
          await this.localDB[entityType].update({
            where: { id: localEntity.id },
            data: {
              ghlId: ghlEntity.id,
              lastSyncedAt: new Date(),
              ghlVersion: 1,
            },
          });

          created++;
        } else {
          // Update in GHL
          await this.updateInGHL(entityType, localEntity.ghlId, localEntity);

          // Update sync timestamp
          await this.localDB[entityType].update({
            where: { id: localEntity.id },
            data: {
              lastSyncedAt: new Date(),
              ghlVersion: localEntity.ghlVersion + 1,
            },
          });

          updated++;
        }
      } catch (error) {
        console.error(`Failed to sync ${entityType} ${localEntity.id}:`, error);
        failed++;
      }
    }

    console.log(
      `✅ Local → GHL sync complete: ${created} created, ${updated} updated, ${failed} failed`
    );
  }

  /**
   * Bidirectional sync
   */
  private async syncBidirectional(config: SyncConfig) {
    // First sync GHL → Local to get latest remote changes
    await this.syncGHLToLocal(config);

    // Then sync Local → GHL to push local changes
    await this.syncLocalToGHLBulk(config);
  }

  /**
   * Sync single local change to GHL
   */
  private async syncLocalToGHL(event: any) {
    const { entityType, entityId, data, type } = event;

    try {
      switch (type) {
        case "create":
          const created = await this.createInGHL(entityType, data);
          // Update local with GHL ID
          await this.localDB[entityType].update({
            where: { id: entityId },
            data: { ghlId: created.id },
          });
          break;

        case "update":
          const localEntity = await this.localDB[entityType].findUnique({
            where: { id: entityId },
          });
          if (localEntity?.ghlId) {
            await this.updateInGHL(entityType, localEntity.ghlId, data);
          }
          break;

        case "delete":
          const toDelete = await this.localDB[entityType].findUnique({
            where: { id: entityId },
          });
          if (toDelete?.ghlId) {
            await this.deleteInGHL(entityType, toDelete.ghlId);
          }
          break;
      }
    } catch (error) {
      console.error(`Failed to sync local change to GHL:`, error);
      this.emit("sync:error", { event, error });
    }
  }

  /**
   * Handle conflict between local and remote data
   */
  private async handleConflict(conflict: ConflictRecord, strategy: string) {
    this.conflicts.push(conflict);
    this.emit("conflict:detected", conflict);

    switch (strategy) {
      case "ghl-wins":
        // Update local with remote data
        await this.localDB[conflict.entityType].update({
          where: { ghlId: conflict.entityId },
          data: {
            ...this.mapGHLToLocal(conflict.entityType, conflict.remote.data),
            lastSyncedAt: new Date(),
          },
        });
        break;

      case "local-wins":
        // Update remote with local data
        await this.updateInGHL(
          conflict.entityType,
          conflict.entityId,
          conflict.local.data
        );
        break;

      case "newest-wins":
        // Compare timestamps
        const localTime = new Date(conflict.local.data.updatedAt).getTime();
        const remoteTime = new Date(conflict.remote.data.dateUpdated).getTime();

        if (remoteTime > localTime) {
          await this.localDB[conflict.entityType].update({
            where: { ghlId: conflict.entityId },
            data: {
              ...this.mapGHLToLocal(conflict.entityType, conflict.remote.data),
              lastSyncedAt: new Date(),
            },
          });
        } else {
          await this.updateInGHL(
            conflict.entityType,
            conflict.entityId,
            conflict.local.data
          );
        }
        break;

      case "manual":
        // Emit event for manual resolution
        this.emit("conflict:manual", conflict);
        return; // Don't mark as resolved
    }

    conflict.resolved = true;
    this.emit("conflict:resolved", conflict);
  }

  /**
   * GHL webhook handlers
   */
  private async handleGHLContactCreate(payload: any) {
    console.log("📩 GHL Contact Created:", payload.id);

    // Create in local DB
    await this.localDB.contact.create({
      data: {
        ghlId: payload.id,
        ...this.mapGHLToLocal("contact", payload),
        lastSyncedAt: new Date(),
      },
    });

    // Broadcast to real-time clients
    this.realtimeSync.emit("remote:update", {
      type: "create",
      entityType: "contact",
      entityId: payload.id,
      data: payload,
      source: "ghl",
    });
  }

  private async handleGHLContactUpdate(payload: any) {
    console.log("📩 GHL Contact Updated:", payload.id);

    const localContact = await this.localDB.contact.findUnique({
      where: { ghlId: payload.id },
    });

    if (localContact) {
      await this.localDB.contact.update({
        where: { id: localContact.id },
        data: {
          ...this.mapGHLToLocal("contact", payload),
          lastSyncedAt: new Date(),
        },
      });

      this.realtimeSync.emit("remote:update", {
        type: "update",
        entityType: "contact",
        entityId: localContact.id,
        data: payload,
        source: "ghl",
      });
    }
  }

  private async handleGHLContactDelete(payload: any) {
    console.log("📩 GHL Contact Deleted:", payload.id);

    await this.localDB.contact.delete({
      where: { ghlId: payload.id },
    });

    this.realtimeSync.emit("remote:update", {
      type: "delete",
      entityType: "contact",
      entityId: payload.id,
      data: null,
      source: "ghl",
    });
  }

  private async handleGHLMessageReceived(payload: any) {
    console.log("📩 GHL Message Received:", payload);

    // Store message
    await this.localDB.message.create({
      data: {
        ghlId: payload.id,
        conversationId: payload.conversationId,
        content: payload.body,
        direction: "inbound",
        createdAt: new Date(payload.dateAdded),
      },
    });

    // Broadcast to real-time clients
    this.realtimeSync.emit("remote:update", {
      type: "create",
      entityType: "message",
      entityId: payload.id,
      data: payload,
      source: "ghl",
    });
  }

  /**
   * Helper methods
   */
  private async createInGHL(entityType: string, data: any): Promise<any> {
    switch (entityType) {
      case "contact":
        return await this.ghlAPI.createContact(this.mapLocalToGHL("contact", data));
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }
  }

  private async updateInGHL(entityType: string, ghlId: string, data: any): Promise<any> {
    switch (entityType) {
      case "contact":
        return await this.ghlAPI.updateContact(ghlId, this.mapLocalToGHL("contact", data));
      case "opportunity":
        return await this.ghlAPI.updateOpportunity(ghlId, this.mapLocalToGHL("opportunity", data));
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }
  }

  private async deleteInGHL(entityType: string, ghlId: string): Promise<void> {
    switch (entityType) {
      case "contact":
        return await this.ghlAPI.deleteContact(ghlId);
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }
  }

  private mapGHLToLocal(entityType: string, ghlData: any): any {
    // Map GHL field names to local schema
    switch (entityType) {
      case "contact":
        return {
          firstName: ghlData.firstName,
          lastName: ghlData.lastName,
          email: ghlData.email,
          phone: ghlData.phone,
          tags: ghlData.tags || [],
          customFields: ghlData.customFields || {},
        };
      default:
        return ghlData;
    }
  }

  private mapLocalToGHL(entityType: string, localData: any): any {
    // Map local field names to GHL API format
    switch (entityType) {
      case "contact":
        return {
          firstName: localData.firstName,
          lastName: localData.lastName,
          email: localData.email,
          phone: localData.phone,
          tags: localData.tags || [],
          customField: localData.customFields || {},
        };
      default:
        return localData;
    }
  }

  /**
   * Get unresolved conflicts
   */
  getUnresolvedConflicts(): ConflictRecord[] {
    return this.conflicts.filter((c) => !c.resolved);
  }

  /**
   * Manually resolve conflict
   */
  async resolveConflictManually(conflictIndex: number, resolution: "local" | "remote") {
    const conflict = this.conflicts[conflictIndex];
    if (!conflict) return;

    await this.handleConflict(
      conflict,
      resolution === "local" ? "local-wins" : "ghl-wins"
    );
  }
}
