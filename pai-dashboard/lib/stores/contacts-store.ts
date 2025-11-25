import { create } from 'zustand';

export type ContactStatus = 'active' | 'inactive' | 'lead' | 'customer' | 'partner';

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: ContactStatus;
  tags: string[];
  company?: string;
  position?: string;
  avatar?: string;
  lastContact?: Date;
  createdAt: Date;
  notes?: string;
  customFields?: Record<string, string>;
  activities?: ContactActivity[];
}

export interface ContactActivity {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'sms';
  title: string;
  description?: string;
  timestamp: Date;
}

interface ContactsState {
  contacts: Contact[];
  selectedContacts: string[];
  searchQuery: string;
  statusFilter: ContactStatus | 'all';
  tagFilter: string[];
  isLoading: boolean;

  // Actions
  setContacts: (contacts: Contact[]) => void;
  addContact: (contact: Omit<Contact, 'id' | 'createdAt'>) => void;
  updateContact: (id: string, contact: Partial<Contact>) => void;
  deleteContact: (id: string) => void;
  deleteMultipleContacts: (ids: string[]) => void;
  toggleSelectContact: (id: string) => void;
  selectAllContacts: () => void;
  clearSelection: () => void;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (status: ContactStatus | 'all') => void;
  setTagFilter: (tags: string[]) => void;
  getFilteredContacts: () => Contact[];
}

// Mock data for demo
const mockContacts: Contact[] = [
  {
    id: '1',
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@example.com',
    phone: '+1 (555) 123-4567',
    status: 'customer',
    tags: ['VIP', 'Enterprise'],
    company: 'Tech Solutions Inc',
    position: 'CTO',
    lastContact: new Date('2025-11-20'),
    createdAt: new Date('2025-01-15'),
    notes: 'Key decision maker for enterprise solutions',
    activities: [
      {
        id: 'a1',
        type: 'meeting',
        title: 'Product Demo',
        description: 'Presented new features for Q1',
        timestamp: new Date('2025-11-20'),
      },
      {
        id: 'a2',
        type: 'email',
        title: 'Follow-up email sent',
        timestamp: new Date('2025-11-18'),
      },
    ],
  },
  {
    id: '2',
    firstName: 'Michael',
    lastName: 'Chen',
    email: 'michael.chen@startup.io',
    phone: '+1 (555) 234-5678',
    status: 'lead',
    tags: ['Startup', 'Hot Lead'],
    company: 'StartupXYZ',
    position: 'Founder & CEO',
    lastContact: new Date('2025-11-22'),
    createdAt: new Date('2025-11-10'),
    activities: [
      {
        id: 'a3',
        type: 'call',
        title: 'Discovery Call',
        description: 'Discussed pain points and requirements',
        timestamp: new Date('2025-11-22'),
      },
    ],
  },
  {
    id: '3',
    firstName: 'Emily',
    lastName: 'Rodriguez',
    email: 'emily.r@agency.com',
    phone: '+1 (555) 345-6789',
    status: 'active',
    tags: ['Agency', 'Marketing'],
    company: 'Creative Agency Co',
    position: 'Marketing Director',
    lastContact: new Date('2025-11-19'),
    createdAt: new Date('2025-03-20'),
    activities: [
      {
        id: 'a4',
        type: 'email',
        title: 'Campaign results shared',
        timestamp: new Date('2025-11-19'),
      },
    ],
  },
  {
    id: '4',
    firstName: 'David',
    lastName: 'Kim',
    email: 'david.kim@enterprise.com',
    phone: '+1 (555) 456-7890',
    status: 'customer',
    tags: ['Enterprise', 'Long-term'],
    company: 'Enterprise Corp',
    position: 'VP of Operations',
    lastContact: new Date('2025-11-15'),
    createdAt: new Date('2024-08-10'),
    activities: [
      {
        id: 'a5',
        type: 'meeting',
        title: 'Quarterly Business Review',
        timestamp: new Date('2025-11-15'),
      },
    ],
  },
  {
    id: '5',
    firstName: 'Jessica',
    lastName: 'Taylor',
    email: 'jessica.taylor@consulting.com',
    phone: '+1 (555) 567-8901',
    status: 'partner',
    tags: ['Partner', 'Strategic'],
    company: 'Taylor Consulting',
    position: 'Principal Consultant',
    lastContact: new Date('2025-11-23'),
    createdAt: new Date('2024-05-12'),
    activities: [
      {
        id: 'a6',
        type: 'call',
        title: 'Partnership discussion',
        description: 'Exploring co-marketing opportunities',
        timestamp: new Date('2025-11-23'),
      },
    ],
  },
  {
    id: '6',
    firstName: 'Robert',
    lastName: 'Anderson',
    email: 'robert.a@techcorp.com',
    phone: '+1 (555) 678-9012',
    status: 'inactive',
    tags: ['Churned'],
    company: 'TechCorp Ltd',
    position: 'IT Manager',
    lastContact: new Date('2025-09-10'),
    createdAt: new Date('2024-02-20'),
  },
  {
    id: '7',
    firstName: 'Amanda',
    lastName: 'White',
    email: 'amanda.white@finance.com',
    phone: '+1 (555) 789-0123',
    status: 'lead',
    tags: ['Finance', 'Qualified'],
    company: 'Finance Solutions',
    position: 'CFO',
    lastContact: new Date('2025-11-24'),
    createdAt: new Date('2025-11-20'),
    activities: [
      {
        id: 'a7',
        type: 'email',
        title: 'Initial outreach',
        timestamp: new Date('2025-11-24'),
      },
    ],
  },
  {
    id: '8',
    firstName: 'Chris',
    lastName: 'Martinez',
    email: 'chris.m@retail.com',
    phone: '+1 (555) 890-1234',
    status: 'customer',
    tags: ['Retail', 'Mid-market'],
    company: 'Retail Group',
    position: 'Store Manager',
    lastContact: new Date('2025-11-21'),
    createdAt: new Date('2025-06-15'),
  },
];

export const useContactsStore = create<ContactsState>((set, get) => ({
  contacts: mockContacts,
  selectedContacts: [],
  searchQuery: '',
  statusFilter: 'all',
  tagFilter: [],
  isLoading: false,

  setContacts: (contacts) => set({ contacts }),

  addContact: (contactData) => {
    const newContact: Contact = {
      ...contactData,
      id: Date.now().toString(),
      createdAt: new Date(),
      activities: [],
    };
    set((state) => ({
      contacts: [newContact, ...state.contacts],
    }));
  },

  updateContact: (id, updates) => {
    set((state) => ({
      contacts: state.contacts.map((contact) =>
        contact.id === id ? { ...contact, ...updates } : contact
      ),
    }));
  },

  deleteContact: (id) => {
    set((state) => ({
      contacts: state.contacts.filter((contact) => contact.id !== id),
      selectedContacts: state.selectedContacts.filter((selectedId) => selectedId !== id),
    }));
  },

  deleteMultipleContacts: (ids) => {
    set((state) => ({
      contacts: state.contacts.filter((contact) => !ids.includes(contact.id)),
      selectedContacts: [],
    }));
  },

  toggleSelectContact: (id) => {
    set((state) => ({
      selectedContacts: state.selectedContacts.includes(id)
        ? state.selectedContacts.filter((selectedId) => selectedId !== id)
        : [...state.selectedContacts, id],
    }));
  },

  selectAllContacts: () => {
    const filteredContacts = get().getFilteredContacts();
    set({ selectedContacts: filteredContacts.map((c) => c.id) });
  },

  clearSelection: () => set({ selectedContacts: [] }),

  setSearchQuery: (query) => set({ searchQuery: query, selectedContacts: [] }),

  setStatusFilter: (status) => set({ statusFilter: status, selectedContacts: [] }),

  setTagFilter: (tags) => set({ tagFilter: tags, selectedContacts: [] }),

  getFilteredContacts: () => {
    const { contacts, searchQuery, statusFilter, tagFilter } = get();

    return contacts.filter((contact) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        contact.firstName.toLowerCase().includes(searchLower) ||
        contact.lastName.toLowerCase().includes(searchLower) ||
        contact.email.toLowerCase().includes(searchLower) ||
        contact.phone.includes(searchQuery) ||
        contact.company?.toLowerCase().includes(searchLower);

      // Status filter
      const matchesStatus = statusFilter === 'all' || contact.status === statusFilter;

      // Tag filter
      const matchesTags =
        tagFilter.length === 0 ||
        tagFilter.some((tag) => contact.tags.includes(tag));

      return matchesSearch && matchesStatus && matchesTags;
    });
  },
}));
