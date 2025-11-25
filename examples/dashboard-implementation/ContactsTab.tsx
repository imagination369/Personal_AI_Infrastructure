/**
 * Contacts Tab Component
 * Demonstrates real-time updates, filtering, and hot reloading
 */

import React, { useEffect, useState, useMemo } from "react";
import {
  useDashboardStore,
  useContacts,
  useCreateContact,
  useUpdateContact,
  useDeleteContact,
  selectFilters,
  selectSearchQuery,
  selectSelectedItems,
  selectSyncStatus,
} from "./dashboard-store";
import { useRealtimeSync } from "./useRealtimeSync";

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

export function ContactsTab() {
  // Store state
  const filters = useDashboardStore(selectFilters);
  const searchQuery = useDashboardStore(selectSearchQuery);
  const selectedItems = useDashboardStore(selectSelectedItems);
  const syncStatus = useDashboardStore(selectSyncStatus);

  const {
    setFilter,
    clearFilters,
    setSearchQuery,
    selectItem,
    deselectItem,
    clearSelection,
    openModal,
  } = useDashboardStore();

  // Server state with React Query
  const { data: serverContacts, isLoading } = useContacts(filters);

  // Real-time sync
  const {
    data: realtimeContacts,
    isConnected,
    create,
    update,
    delete: deleteContact,
  } = useRealtimeSync<Contact>({
    entityType: "contact",
    initialData: serverContacts || [],
    optimistic: true,
  });

  // Use real-time data if available, fallback to server data
  const contacts = realtimeContacts.length > 0 ? realtimeContacts : serverContacts || [];

  // Filter contacts based on search query
  const filteredContacts = useMemo(() => {
    if (!searchQuery) return contacts;

    const query = searchQuery.toLowerCase();
    return contacts.filter(
      (contact) =>
        contact.firstName.toLowerCase().includes(query) ||
        contact.lastName.toLowerCase().includes(query) ||
        contact.email.toLowerCase().includes(query)
    );
  }, [contacts, searchQuery]);

  // Update sync status in store
  useEffect(() => {
    useDashboardStore.getState().setConnected(isConnected);
  }, [isConnected]);

  // Handlers
  const handleSelectContact = (id: string, event: React.MouseEvent) => {
    if (event.shiftKey || event.ctrlKey || event.metaKey) {
      if (selectedItems.includes(id)) {
        deselectItem(id);
      } else {
        selectItem(id, true);
      }
    } else {
      selectItem(id, false);
    }
  };

  const handleCreateContact = () => {
    openModal("create-contact");
  };

  const handleEditContact = (contact: Contact) => {
    openModal("edit-contact", contact);
  };

  const handleDeleteContact = async (id: string) => {
    if (confirm("Are you sure you want to delete this contact?")) {
      await deleteContact(id);
    }
  };

  const handleBulkDelete = async () => {
    if (confirm(`Delete ${selectedItems.length} contacts?`)) {
      for (const id of selectedItems) {
        await deleteContact(id);
      }
      clearSelection();
    }
  };

  const handleBulkTag = async () => {
    openModal("bulk-tag", { contactIds: selectedItems });
  };

  return (
    <div className="contacts-tab">
      {/* Header */}
      <div className="contacts-header">
        <h1>Contacts</h1>

        {/* Sync Status */}
        <div className="sync-status">
          {isConnected ? (
            <span className="status-connected">🟢 Live</span>
          ) : (
            <span className="status-disconnected">🔴 Offline</span>
          )}
          {syncStatus.isSyncing && <span className="syncing">⏳ Syncing...</span>}
          {syncStatus.syncQueue > 0 && <span className="queue">📦 {syncStatus.syncQueue} queued</span>}
          {syncStatus.conflicts > 0 && (
            <span className="conflicts">⚠️ {syncStatus.conflicts} conflicts</span>
          )}
        </div>

        {/* Actions */}
        <div className="actions">
          <button onClick={handleCreateContact} className="btn-primary">
            + New Contact
          </button>

          {selectedItems.length > 0 && (
            <div className="bulk-actions">
              <span>{selectedItems.length} selected</span>
              <button onClick={handleBulkTag}>Add Tag</button>
              <button onClick={handleBulkDelete} className="btn-danger">
                Delete
              </button>
              <button onClick={clearSelection}>Clear</button>
            </div>
          )}
        </div>
      </div>

      {/* Filters & Search */}
      <div className="contacts-filters">
        <input
          type="search"
          placeholder="Search contacts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />

        <select
          value={filters.status || ""}
          onChange={(e) => setFilter("status", e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="lead">Lead</option>
        </select>

        <select
          value={filters.tags || ""}
          onChange={(e) => setFilter("tags", e.target.value)}
        >
          <option value="">All Tags</option>
          <option value="hot-lead">Hot Lead</option>
          <option value="customer">Customer</option>
          <option value="prospect">Prospect</option>
        </select>

        {Object.keys(filters).length > 0 && (
          <button onClick={clearFilters} className="btn-secondary">
            Clear Filters
          </button>
        )}
      </div>

      {/* Contacts Table */}
      <div className="contacts-table-container">
        {isLoading ? (
          <div className="loading">Loading contacts...</div>
        ) : filteredContacts.length === 0 ? (
          <div className="empty-state">
            <p>No contacts found</p>
            <button onClick={handleCreateContact}>Create your first contact</button>
          </div>
        ) : (
          <table className="contacts-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={selectedItems.length === filteredContacts.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        filteredContacts.forEach((c) => selectItem(c.id, true));
                      } else {
                        clearSelection();
                      }
                    }}
                  />
                </th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Tags</th>
                <th>Status</th>
                <th>Last Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredContacts.map((contact) => (
                <ContactRow
                  key={contact.id}
                  contact={contact}
                  selected={selectedItems.includes(contact.id)}
                  onSelect={(e) => handleSelectContact(contact.id, e)}
                  onEdit={() => handleEditContact(contact)}
                  onDelete={() => handleDeleteContact(contact.id)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/**
 * Contact Row Component
 * Memoized for performance with large lists
 */
const ContactRow = React.memo(
  ({
    contact,
    selected,
    onSelect,
    onEdit,
    onDelete,
  }: {
    contact: Contact;
    selected: boolean;
    onSelect: (e: React.MouseEvent) => void;
    onEdit: () => void;
    onDelete: () => void;
  }) => {
    return (
      <tr className={`contact-row ${selected ? "selected" : ""}`}>
        <td>
          <input type="checkbox" checked={selected} onChange={(e) => onSelect(e as any)} />
        </td>
        <td>
          {contact.firstName} {contact.lastName}
        </td>
        <td>{contact.email}</td>
        <td>{contact.phone || "-"}</td>
        <td>
          <div className="tags">
            {contact.tags.map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </div>
        </td>
        <td>
          <span className={`status status-${contact.status}`}>{contact.status}</span>
        </td>
        <td>{new Date(contact.updatedAt).toLocaleDateString()}</td>
        <td>
          <button onClick={onEdit} className="btn-icon">
            ✏️
          </button>
          <button onClick={onDelete} className="btn-icon">
            🗑️
          </button>
        </td>
      </tr>
    );
  }
);

/**
 * Create/Edit Contact Modal
 */
export function ContactModal() {
  const { modalState, closeModal } = useDashboardStore();
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();

  const [formData, setFormData] = useState<Partial<Contact>>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    tags: [],
    status: "lead",
  });

  useEffect(() => {
    if (modalState.isOpen && modalState.type === "edit-contact" && modalState.data) {
      setFormData(modalState.data);
    }
  }, [modalState]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (modalState.type === "create-contact") {
        await createContact.mutateAsync(formData);
      } else if (modalState.type === "edit-contact" && modalState.data?.id) {
        await updateContact.mutateAsync({
          id: modalState.data.id,
          updates: formData,
        });
      }

      closeModal();
    } catch (error) {
      console.error("Failed to save contact:", error);
      alert("Failed to save contact. Please try again.");
    }
  };

  if (!modalState.isOpen || !modalState.type?.includes("contact")) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{modalState.type === "create-contact" ? "Create Contact" : "Edit Contact"}</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>First Name *</label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Last Name</label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="lead">Lead</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="form-actions">
            <button type="button" onClick={closeModal} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={createContact.isPending || updateContact.isPending}
            >
              {createContact.isPending || updateContact.isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
