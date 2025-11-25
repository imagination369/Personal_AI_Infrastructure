/**
 * Dashboard State Management
 * Using Zustand for client state + React Query for server state
 */

import { create } from "zustand";
import { devtools, persist, subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

// Types
interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  tags: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface Conversation {
  id: string;
  contactId: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  status: "active" | "closed";
}

interface Message {
  id: string;
  conversationId: string;
  content: string;
  direction: "inbound" | "outbound";
  status: "sent" | "delivered" | "read" | "failed";
  createdAt: string;
}

interface UIState {
  activeTab: "contacts" | "conversations" | "pipelines";
  selectedItems: Set<string>;
  filters: Record<string, any>;
  searchQuery: string;
  sortBy: { field: string; direction: "asc" | "desc" };
  modalState: {
    isOpen: boolean;
    type?: string;
    data?: any;
  };
  sidebarCollapsed: boolean;
  viewMode: "list" | "grid" | "kanban";
}

interface SyncState {
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncAt?: number;
  syncQueue: number;
  conflicts: number;
}

interface DashboardState {
  // UI State
  ui: UIState;

  // Sync State
  sync: SyncState;

  // UI Actions
  setActiveTab: (tab: UIState["activeTab"]) => void;
  selectItem: (id: string, multi?: boolean) => void;
  deselectItem: (id: string) => void;
  clearSelection: () => void;
  setFilter: (key: string, value: any) => void;
  clearFilters: () => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (field: string, direction: "asc" | "desc") => void;
  openModal: (type: string, data?: any) => void;
  closeModal: () => void;
  toggleSidebar: () => void;
  setViewMode: (mode: UIState["viewMode"]) => void;

  // Sync Actions
  setConnected: (connected: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  updateLastSync: () => void;
  incrementSyncQueue: () => void;
  decrementSyncQueue: () => void;
  setConflicts: (count: number) => void;

  // Reset
  reset: () => void;
}

const initialUIState: UIState = {
  activeTab: "contacts",
  selectedItems: new Set(),
  filters: {},
  searchQuery: "",
  sortBy: { field: "createdAt", direction: "desc" },
  modalState: { isOpen: false },
  sidebarCollapsed: false,
  viewMode: "list",
};

const initialSyncState: SyncState = {
  isConnected: false,
  isSyncing: false,
  syncQueue: 0,
  conflicts: 0,
};

/**
 * Dashboard Store
 * Manages UI state and sync status
 */
export const useDashboardStore = create<DashboardState>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          // Initial state
          ui: initialUIState,
          sync: initialSyncState,

          // UI Actions
          setActiveTab: (tab) =>
            set((state) => {
              state.ui.activeTab = tab;
              state.ui.selectedItems.clear();
            }),

          selectItem: (id, multi = false) =>
            set((state) => {
              if (!multi) {
                state.ui.selectedItems.clear();
              }
              state.ui.selectedItems.add(id);
            }),

          deselectItem: (id) =>
            set((state) => {
              state.ui.selectedItems.delete(id);
            }),

          clearSelection: () =>
            set((state) => {
              state.ui.selectedItems.clear();
            }),

          setFilter: (key, value) =>
            set((state) => {
              if (value === null || value === undefined || value === "") {
                delete state.ui.filters[key];
              } else {
                state.ui.filters[key] = value;
              }
            }),

          clearFilters: () =>
            set((state) => {
              state.ui.filters = {};
            }),

          setSearchQuery: (query) =>
            set((state) => {
              state.ui.searchQuery = query;
            }),

          setSortBy: (field, direction) =>
            set((state) => {
              state.ui.sortBy = { field, direction };
            }),

          openModal: (type, data) =>
            set((state) => {
              state.ui.modalState = { isOpen: true, type, data };
            }),

          closeModal: () =>
            set((state) => {
              state.ui.modalState = { isOpen: false };
            }),

          toggleSidebar: () =>
            set((state) => {
              state.ui.sidebarCollapsed = !state.ui.sidebarCollapsed;
            }),

          setViewMode: (mode) =>
            set((state) => {
              state.ui.viewMode = mode;
            }),

          // Sync Actions
          setConnected: (connected) =>
            set((state) => {
              state.sync.isConnected = connected;
            }),

          setSyncing: (syncing) =>
            set((state) => {
              state.sync.isSyncing = syncing;
            }),

          updateLastSync: () =>
            set((state) => {
              state.sync.lastSyncAt = Date.now();
            }),

          incrementSyncQueue: () =>
            set((state) => {
              state.sync.syncQueue += 1;
            }),

          decrementSyncQueue: () =>
            set((state) => {
              state.sync.syncQueue = Math.max(0, state.sync.syncQueue - 1);
            }),

          setConflicts: (count) =>
            set((state) => {
              state.sync.conflicts = count;
            }),

          // Reset
          reset: () =>
            set((state) => {
              state.ui = initialUIState;
              state.sync = initialSyncState;
            }),
        }))
      ),
      {
        name: "dashboard-storage",
        partialize: (state) => ({
          ui: {
            sidebarCollapsed: state.ui.sidebarCollapsed,
            viewMode: state.ui.viewMode,
          },
        }),
      }
    )
  )
);

/**
 * Selectors for optimized re-renders
 */
export const selectActiveTab = (state: DashboardState) => state.ui.activeTab;
export const selectSelectedItems = (state: DashboardState) => Array.from(state.ui.selectedItems);
export const selectFilters = (state: DashboardState) => state.ui.filters;
export const selectSearchQuery = (state: DashboardState) => state.ui.searchQuery;
export const selectModalState = (state: DashboardState) => state.ui.modalState;
export const selectSyncStatus = (state: DashboardState) => state.sync;

/**
 * React Query configuration for server state
 */
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds
      cacheTime: 300000, // 5 minutes
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

/**
 * React Query hooks for server data
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Contacts
export function useContacts(filters?: Record<string, any>) {
  return useQuery({
    queryKey: ["contacts", filters],
    queryFn: async () => {
      const params = new URLSearchParams(filters);
      const response = await fetch(`/api/contacts?${params}`);
      if (!response.ok) throw new Error("Failed to fetch contacts");
      return response.json();
    },
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Contact>) => {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create contact");
      return response.json();
    },
    onMutate: async (newContact) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["contacts"] });

      // Snapshot previous value
      const previousContacts = queryClient.getQueryData(["contacts"]);

      // Optimistically update
      queryClient.setQueryData(["contacts"], (old: any) => {
        return [...(old || []), { ...newContact, id: `temp_${Date.now()}` }];
      });

      return { previousContacts };
    },
    onError: (err, newContact, context) => {
      // Rollback on error
      queryClient.setQueryData(["contacts"], context?.previousContacts);
    },
    onSettled: () => {
      // Refetch after success or error
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Contact> }) => {
      const response = await fetch(`/api/contacts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error("Failed to update contact");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["contacts", data.id], data);
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete contact");
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

// Conversations
export function useConversations(contactId?: string) {
  return useQuery({
    queryKey: ["conversations", contactId],
    queryFn: async () => {
      const url = contactId ? `/api/conversations?contactId=${contactId}` : "/api/conversations";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch conversations");
      return response.json();
    },
  });
}

export function useMessages(conversationId: string) {
  return useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      const response = await fetch(`/api/conversations/${conversationId}/messages`);
      if (!response.ok) throw new Error("Failed to fetch messages");
      return response.json();
    },
    enabled: !!conversationId,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      content,
    }: {
      conversationId: string;
      content: string;
    }) => {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) throw new Error("Failed to send message");
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["messages", variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
