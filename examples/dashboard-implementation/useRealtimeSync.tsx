/**
 * React Hook: useRealtimeSync
 * Provides real-time data synchronization with optimistic updates
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { RealtimeSyncManager } from "./realtime-sync-manager";

interface UseRealtimeSyncOptions<T> {
  entityType: "contact" | "conversation" | "message" | "pipeline";
  entityId?: string;
  initialData?: T[];
  onUpdate?: (data: T[]) => void;
  optimistic?: boolean;
}

interface RealtimeSyncReturn<T> {
  data: T[];
  isLoading: boolean;
  isConnected: boolean;
  error: Error | null;
  create: (item: Partial<T>) => Promise<T>;
  update: (id: string, updates: Partial<T>) => Promise<void>;
  delete: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook for real-time synchronized data
 */
export function useRealtimeSync<T extends { id: string; updatedAt?: number }>(
  options: UseRealtimeSyncOptions<T>
): RealtimeSyncReturn<T> {
  const { entityType, entityId, initialData = [], onUpdate, optimistic = true } = options;

  const [data, setData] = useState<T[]>(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const syncManagerRef = useRef<RealtimeSyncManager | null>(null);

  // Initialize sync manager
  useEffect(() => {
    const syncManager = new RealtimeSyncManager(
      process.env.REACT_APP_WS_URL || "ws://localhost:3001",
      "latest-wins"
    );

    syncManagerRef.current = syncManager;

    // Connection events
    syncManager.on("connected", () => {
      setIsConnected(true);
      setError(null);
    });

    syncManager.on("disconnected", () => {
      setIsConnected(false);
    });

    syncManager.on("offline", () => {
      setIsConnected(false);
    });

    syncManager.on("online", () => {
      setIsConnected(true);
    });

    // Subscribe to entity updates
    const unsubscribe = syncManager.subscribe(entityType, entityId);

    // Handle optimistic updates
    syncManager.on("optimistic:update", (event) => {
      if (event.entityType !== entityType) return;

      setData((current) => {
        switch (event.type) {
          case "create":
            return [...current, { ...event.data, id: event.entityId } as T];

          case "update":
            return current.map((item) =>
              item.id === event.entityId ? { ...item, ...event.data } : item
            );

          case "delete":
            return current.filter((item) => item.id !== event.entityId);

          default:
            return current;
        }
      });
    });

    // Handle confirmed updates
    syncManager.on("confirmed", (event) => {
      if (event.entityType !== entityType) return;
      console.log("✅ Update confirmed:", event);
    });

    // Handle remote updates
    syncManager.on("remote:update", (event) => {
      if (event.entityType !== entityType) return;

      setData((current) => {
        switch (event.type) {
          case "create":
            // Check if already exists (from optimistic update)
            if (current.some((item) => item.id === event.entityId)) {
              return current;
            }
            return [...current, { ...event.data, id: event.entityId } as T];

          case "update":
            return current.map((item) =>
              item.id === event.entityId ? { ...item, ...event.data } : item
            );

          case "delete":
            return current.filter((item) => item.id !== event.entityId);

          default:
            return current;
        }
      });
    });

    // Handle rollbacks
    syncManager.on("rollback", (event) => {
      if (event.entityType !== entityType) return;

      console.warn("🔄 Rolling back optimistic update:", event);
      // Refetch data to ensure consistency
      refresh();
    });

    // Handle conflicts
    syncManager.on("conflict:resolved", ({ remote, local, strategy }) => {
      console.log(`⚡ Conflict resolved using ${strategy}:`, { remote, local });
    });

    // Initial data fetch
    fetchData();

    return () => {
      unsubscribe();
      syncManager.disconnect();
    };
  }, [entityType, entityId]);

  /**
   * Fetch initial data
   */
  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // API call to fetch data
      const response = await fetch(`/api/${entityType}${entityId ? `/${entityId}` : ""}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch ${entityType}`);
      }

      const result = await response.json();
      setData(Array.isArray(result) ? result : [result]);
      onUpdate?.(Array.isArray(result) ? result : [result]);
    } catch (err) {
      setError(err as Error);
      console.error(`Error fetching ${entityType}:`, err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Create entity
   */
  const create = useCallback(
    async (item: Partial<T>): Promise<T> => {
      if (!syncManagerRef.current) {
        throw new Error("Sync manager not initialized");
      }

      try {
        const result = await syncManagerRef.current.create(entityType, item, optimistic);

        // Return optimistic data immediately
        return { ...item, id: result.id } as T;
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [entityType, optimistic]
  );

  /**
   * Update entity
   */
  const update = useCallback(
    async (id: string, updates: Partial<T>): Promise<void> => {
      if (!syncManagerRef.current) {
        throw new Error("Sync manager not initialized");
      }

      try {
        await syncManagerRef.current.update(entityType, id, updates, optimistic);
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [entityType, optimistic]
  );

  /**
   * Delete entity
   */
  const deleteEntity = useCallback(
    async (id: string): Promise<void> => {
      if (!syncManagerRef.current) {
        throw new Error("Sync manager not initialized");
      }

      try {
        await syncManagerRef.current.delete(entityType, id, optimistic);
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [entityType, optimistic]
  );

  /**
   * Refresh data
   */
  const refresh = useCallback(async () => {
    await fetchData();
  }, [entityType, entityId]);

  return {
    data,
    isLoading,
    isConnected,
    error,
    create,
    update,
    delete: deleteEntity,
    refresh,
  };
}

/**
 * Example usage in a component
 */
export function ContactsListExample() {
  const { data: contacts, isLoading, isConnected, create, update, delete: deleteContact } =
    useRealtimeSync<{
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      updatedAt: number;
    }>({
      entityType: "contact",
      optimistic: true,
    });

  const handleCreateContact = async () => {
    await create({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
    });
  };

  const handleUpdateContact = async (id: string) => {
    await update(id, { firstName: "Jane" });
  };

  const handleDeleteContact = async (id: string) => {
    if (confirm("Delete contact?")) {
      await deleteContact(id);
    }
  };

  return (
    <div>
      <div className="status-bar">
        {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <ul>
          {contacts.map((contact) => (
            <li key={contact.id}>
              {contact.firstName} {contact.lastName} - {contact.email}
              <button onClick={() => handleUpdateContact(contact.id)}>Edit</button>
              <button onClick={() => handleDeleteContact(contact.id)}>Delete</button>
            </li>
          ))}
        </ul>
      )}

      <button onClick={handleCreateContact}>Create Contact</button>
    </div>
  );
}
