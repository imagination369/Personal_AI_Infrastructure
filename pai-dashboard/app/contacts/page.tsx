'use client';

import { useState, useMemo } from 'react';
import { useContactsStore, Contact } from '@/lib/stores/contacts-store';
import ContactsTable from '@/components/contacts/contacts-table';
import ContactCard from '@/components/contacts/contact-card';
import AddContactModal from '@/components/contacts/add-contact-modal';
import {
  Search,
  Plus,
  Filter,
  Download,
  Upload,
  Users,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const ITEMS_PER_PAGE = 10;

export default function ContactsPage() {
  const {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    tagFilter,
    setTagFilter,
    getFilteredContacts,
  } = useContactsStore();

  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const filteredContacts = getFilteredContacts();

  // Pagination
  const totalPages = Math.ceil(filteredContacts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedContacts = useMemo(() => {
    return filteredContacts.slice(startIndex, endIndex);
  }, [filteredContacts, startIndex, endIndex]);

  // Reset to page 1 when filters change
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (status: typeof statusFilter) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleTagFilterChange = (tags: string[]) => {
    setTagFilter(tags);
    setCurrentPage(1);
  };

  // Get unique tags from all contacts
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    filteredContacts.forEach((contact) => {
      contact.tags.forEach((tag) => tagsSet.add(tag));
    });
    return Array.from(tagsSet).sort();
  }, [filteredContacts]);

  const toggleTagFilter = (tag: string) => {
    const newTags = tagFilter.includes(tag)
      ? tagFilter.filter((t) => t !== tag)
      : [...tagFilter, tag];
    handleTagFilterChange(newTags);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setTagFilter([]);
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || tagFilter.length > 0;

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Contacts</h1>
                <p className="text-gray-400 mt-1">
                  Manage your contacts and relationships
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-gray-300 hover:bg-gray-800 border border-gray-800 rounded-lg transition-colors"
              title="Import Contacts"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Import</span>
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-gray-300 hover:bg-gray-800 border border-gray-800 rounded-lg transition-colors"
              title="Export Contacts"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-lg transition-colors font-medium shadow-lg shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" />
              Add Contact
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Contacts</p>
                <p className="text-2xl font-bold text-white mt-1">{filteredContacts.length}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Active</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {filteredContacts.filter((c) => c.status === 'active').length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Leads</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {filteredContacts.filter((c) => c.status === 'lead').length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Customers</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {filteredContacts.filter((c) => c.status === 'customer').length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search contacts by name, email, phone, or company..."
                className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-3 border rounded-lg transition-colors font-medium ${
                showFilters || hasActiveFilters
                  ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                  : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-gray-300'
              }`}
            >
              <Filter className="w-5 h-5" />
              Filters
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-blue-500" />
              )}
            </button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Filters</h3>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Status</label>
                <div className="flex flex-wrap gap-2">
                  {(['all', 'active', 'inactive', 'lead', 'customer', 'partner'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusFilterChange(status)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        statusFilter === status
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-gray-800 text-gray-300 border border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tag Filter */}
              {allTags.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {allTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleTagFilter(tag)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                          tagFilter.includes(tag)
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-gray-800 text-gray-300 border border-gray-700 hover:border-gray-600'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Contacts Table */}
        <ContactsTable
          onContactClick={setSelectedContact}
          onEditContact={setSelectedContact}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg px-6 py-4">
            <div className="text-sm text-gray-400">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredContacts.length)} of{' '}
              {filteredContacts.length} contacts
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  // Show first, last, current, and pages around current
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === page
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return (
                      <span key={page} className="text-gray-600 px-1">
                        ...
                      </span>
                    );
                  }
                  return null;
                })}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Contact Detail Card */}
      {selectedContact && (
        <ContactCard contact={selectedContact} onClose={() => setSelectedContact(null)} />
      )}

      {/* Add Contact Modal */}
      <AddContactModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </div>
  );
}
