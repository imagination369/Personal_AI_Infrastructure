'use client';

import { useState } from 'react';
import { Contact, useContactsStore } from '@/lib/stores/contacts-store';
import {
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Mail,
  Phone,
  Trash2,
  Edit,
  MessageSquare,
  Users,
} from 'lucide-react';

type SortField = 'name' | 'email' | 'status' | 'lastContact';
type SortDirection = 'asc' | 'desc';

interface ContactsTableProps {
  onContactClick?: (contact: Contact) => void;
  onEditContact?: (contact: Contact) => void;
}

export default function ContactsTable({ onContactClick, onEditContact }: ContactsTableProps) {
  const {
    selectedContacts,
    toggleSelectContact,
    selectAllContacts,
    clearSelection,
    deleteContact,
    deleteMultipleContacts,
    getFilteredContacts,
  } = useContactsStore();

  const contacts = getFilteredContacts();
  const [sortField, setSortField] = useState<SortField>('lastContact');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedContacts = [...contacts].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case 'name':
        comparison = `${a.firstName} ${a.lastName}`.localeCompare(
          `${b.firstName} ${b.lastName}`
        );
        break;
      case 'email':
        comparison = a.email.localeCompare(b.email);
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
      case 'lastContact':
        const dateA = a.lastContact?.getTime() || 0;
        const dateB = b.lastContact?.getTime() || 0;
        comparison = dateA - dateB;
        break;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const allSelected = contacts.length > 0 && selectedContacts.length === contacts.length;
  const someSelected = selectedContacts.length > 0 && !allSelected;

  const handleSelectAll = () => {
    if (allSelected) {
      clearSelection();
    } else {
      selectAllContacts();
    }
  };

  const getStatusColor = (status: Contact['status']) => {
    const colors = {
      active: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      inactive: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
      lead: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      customer: 'bg-green-500/10 text-green-400 border-green-500/20',
      partner: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    };
    return colors[status] || colors.active;
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
      {/* Bulk Actions Bar */}
      {selectedContacts.length > 0 && (
        <div className="bg-blue-500/10 border-b border-blue-500/20 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-medium text-blue-400">
              {selectedContacts.length} contact{selectedContacts.length > 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => deleteMultipleContacts(selectedContacts)}
              className="px-3 py-1.5 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-md transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
            <button
              onClick={clearSelection}
              className="px-3 py-1.5 text-sm font-medium text-gray-400 hover:bg-gray-800 rounded-md transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-800/50 border-b border-gray-800">
              <th className="px-6 py-4 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={handleSelectAll}
                  className="w-4 h-4 bg-gray-800 border-gray-700 rounded text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                />
              </th>
              <th className="px-6 py-4 text-left">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-300 transition-colors"
                >
                  Contact
                  <SortIcon field="name" />
                </button>
              </th>
              <th className="px-6 py-4 text-left">
                <button
                  onClick={() => handleSort('email')}
                  className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-300 transition-colors"
                >
                  Email
                  <SortIcon field="email" />
                </button>
              </th>
              <th className="px-6 py-4 text-left">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Phone
                </span>
              </th>
              <th className="px-6 py-4 text-left">
                <button
                  onClick={() => handleSort('status')}
                  className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-300 transition-colors"
                >
                  Status
                  <SortIcon field="status" />
                </button>
              </th>
              <th className="px-6 py-4 text-left">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Tags
                </span>
              </th>
              <th className="px-6 py-4 text-left">
                <button
                  onClick={() => handleSort('lastContact')}
                  className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-300 transition-colors"
                >
                  Last Contact
                  <SortIcon field="lastContact" />
                </button>
              </th>
              <th className="px-6 py-4 text-left">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Actions
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {sortedContacts.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Users className="w-12 h-12 text-gray-700" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-400">No contacts found</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Try adjusting your search or filters
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              sortedContacts.map((contact) => (
                <tr
                  key={contact.id}
                  className="hover:bg-gray-800/50 transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedContacts.includes(contact.id)}
                      onChange={() => toggleSelectContact(contact.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 bg-gray-800 border-gray-700 rounded text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                    />
                  </td>
                  <td
                    className="px-6 py-4"
                    onClick={() => onContactClick?.(contact)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                        {getInitials(contact.firstName, contact.lastName)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-200">
                          {contact.firstName} {contact.lastName}
                        </div>
                        {contact.company && (
                          <div className="text-sm text-gray-500">{contact.company}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <a
                      href={`mailto:${contact.email}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-gray-400 hover:text-blue-400 transition-colors flex items-center gap-2 group/email"
                    >
                      <Mail className="w-4 h-4 opacity-0 group-hover/email:opacity-100 transition-opacity" />
                      {contact.email}
                    </a>
                  </td>
                  <td className="px-6 py-4">
                    <a
                      href={`tel:${contact.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-gray-400 hover:text-blue-400 transition-colors flex items-center gap-2 group/phone"
                    >
                      <Phone className="w-4 h-4 opacity-0 group-hover/phone:opacity-100 transition-opacity" />
                      {contact.phone}
                    </a>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                        contact.status
                      )}`}
                    >
                      {contact.status.charAt(0).toUpperCase() + contact.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {contact.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-800 text-gray-300 border border-gray-700"
                        >
                          {tag}
                        </span>
                      ))}
                      {contact.tags.length > 2 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-gray-500">
                          +{contact.tags.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {formatDate(contact.lastContact)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdown(openDropdown === contact.id ? null : contact.id);
                        }}
                        className="p-2 hover:bg-gray-800 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                      </button>

                      {openDropdown === contact.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setOpenDropdown(null)}
                          />
                          <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 overflow-hidden">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditContact?.(contact);
                                setOpenDropdown(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2 transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                              Edit Contact
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = `mailto:${contact.email}`;
                                setOpenDropdown(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2 transition-colors"
                            >
                              <Mail className="w-4 h-4" />
                              Send Email
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = `sms:${contact.phone}`;
                                setOpenDropdown(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2 transition-colors"
                            >
                              <MessageSquare className="w-4 h-4" />
                              Send SMS
                            </button>
                            <div className="border-t border-gray-700">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('Are you sure you want to delete this contact?')) {
                                    deleteContact(contact.id);
                                  }
                                  setOpenDropdown(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete Contact
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
