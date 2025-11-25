import { create } from 'zustand';

export type ChannelType = 'sms' | 'email' | 'whatsapp' | 'slack';

export interface Message {
  id: string;
  conversationId: string;
  content: string;
  timestamp: Date;
  senderId: string;
  senderName: string;
  isOutgoing: boolean;
  isRead: boolean;
  channel: ChannelType;
}

export interface Conversation {
  id: string;
  contactName: string;
  contactAvatar: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  channel: ChannelType;
  status: 'online' | 'offline' | 'away';
}

interface ConversationsState {
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  activeConversationId: string | null;
  searchQuery: string;
  filterTab: 'all' | 'unread' | 'sms' | 'email';
  isTyping: boolean;

  // Actions
  selectConversation: (id: string) => void;
  sendMessage: (conversationId: string, content: string) => void;
  markAsRead: (conversationId: string) => void;
  setSearchQuery: (query: string) => void;
  setFilterTab: (tab: 'all' | 'unread' | 'sms' | 'email') => void;
  setIsTyping: (typing: boolean) => void;
}

// Mock data
const mockConversations: Conversation[] = [
  {
    id: '1',
    contactName: 'Sarah Johnson',
    contactAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    lastMessage: 'Thanks for the update! I\'ll review the proposal and get back to you by EOD.',
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
    unreadCount: 2,
    channel: 'sms',
    status: 'online',
  },
  {
    id: '2',
    contactName: 'Michael Chen',
    contactAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael',
    lastMessage: 'Perfect! See you at the meeting tomorrow at 2 PM.',
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    unreadCount: 0,
    channel: 'email',
    status: 'online',
  },
  {
    id: '3',
    contactName: 'Emily Rodriguez',
    contactAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily',
    lastMessage: 'Can you send me the latest analytics report?',
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
    unreadCount: 1,
    channel: 'sms',
    status: 'away',
  },
  {
    id: '4',
    contactName: 'James Wilson',
    contactAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=James',
    lastMessage: 'The deployment was successful. All systems are running smoothly.',
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    unreadCount: 0,
    channel: 'slack',
    status: 'online',
  },
  {
    id: '5',
    contactName: 'Olivia Martinez',
    contactAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Olivia',
    lastMessage: 'I have a few questions about the new feature specifications.',
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
    unreadCount: 3,
    channel: 'email',
    status: 'offline',
  },
  {
    id: '6',
    contactName: 'David Kim',
    contactAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
    lastMessage: 'Sounds good! Let\'s catch up later this week.',
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
    unreadCount: 0,
    channel: 'sms',
    status: 'offline',
  },
  {
    id: '7',
    contactName: 'Jessica Brown',
    contactAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jessica',
    lastMessage: 'Thanks for your help with the integration!',
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    unreadCount: 0,
    channel: 'email',
    status: 'away',
  },
];

const mockMessages: Record<string, Message[]> = {
  '1': [
    {
      id: 'm1',
      conversationId: '1',
      content: 'Hi Sarah! I wanted to share the updated proposal with you.',
      timestamp: new Date(Date.now() - 1000 * 60 * 20),
      senderId: 'me',
      senderName: 'You',
      isOutgoing: true,
      isRead: true,
      channel: 'sms',
    },
    {
      id: 'm2',
      conversationId: '1',
      content: 'Great! I\'ve been waiting for this. Let me take a look.',
      timestamp: new Date(Date.now() - 1000 * 60 * 15),
      senderId: 'sarah',
      senderName: 'Sarah Johnson',
      isOutgoing: false,
      isRead: true,
      channel: 'sms',
    },
    {
      id: 'm3',
      conversationId: '1',
      content: 'I\'ve attached all the details including timeline and budget breakdown.',
      timestamp: new Date(Date.now() - 1000 * 60 * 10),
      senderId: 'me',
      senderName: 'You',
      isOutgoing: true,
      isRead: true,
      channel: 'sms',
    },
    {
      id: 'm4',
      conversationId: '1',
      content: 'Thanks for the update! I\'ll review the proposal and get back to you by EOD.',
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      senderId: 'sarah',
      senderName: 'Sarah Johnson',
      isOutgoing: false,
      isRead: false,
      channel: 'sms',
    },
  ],
  '2': [
    {
      id: 'm5',
      conversationId: '2',
      content: 'Hey Michael, are we still on for tomorrow\'s planning meeting?',
      timestamp: new Date(Date.now() - 1000 * 60 * 45),
      senderId: 'me',
      senderName: 'You',
      isOutgoing: true,
      isRead: true,
      channel: 'email',
    },
    {
      id: 'm6',
      conversationId: '2',
      content: 'Absolutely! I\'ve already prepared the agenda and metrics report.',
      timestamp: new Date(Date.now() - 1000 * 60 * 40),
      senderId: 'michael',
      senderName: 'Michael Chen',
      isOutgoing: false,
      isRead: true,
      channel: 'email',
    },
    {
      id: 'm7',
      conversationId: '2',
      content: 'Perfect! See you at the meeting tomorrow at 2 PM.',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      senderId: 'michael',
      senderName: 'Michael Chen',
      isOutgoing: false,
      isRead: true,
      channel: 'email',
    },
  ],
  '3': [
    {
      id: 'm8',
      conversationId: '3',
      content: 'Hey Emily! Hope you\'re having a great day.',
      timestamp: new Date(Date.now() - 1000 * 60 * 90),
      senderId: 'me',
      senderName: 'You',
      isOutgoing: true,
      isRead: true,
      channel: 'sms',
    },
    {
      id: 'm9',
      conversationId: '3',
      content: 'Thanks! You too. Quick question...',
      timestamp: new Date(Date.now() - 1000 * 60 * 70),
      senderId: 'emily',
      senderName: 'Emily Rodriguez',
      isOutgoing: false,
      isRead: true,
      channel: 'sms',
    },
    {
      id: 'm10',
      conversationId: '3',
      content: 'Can you send me the latest analytics report?',
      timestamp: new Date(Date.now() - 1000 * 60 * 60),
      senderId: 'emily',
      senderName: 'Emily Rodriguez',
      isOutgoing: false,
      isRead: false,
      channel: 'sms',
    },
  ],
};

export const useConversationsStore = create<ConversationsState>((set, get) => ({
  conversations: mockConversations,
  messages: mockMessages,
  activeConversationId: null,
  searchQuery: '',
  filterTab: 'all',
  isTyping: false,

  selectConversation: (id: string) => {
    set({ activeConversationId: id, isTyping: false });
    get().markAsRead(id);
  },

  sendMessage: (conversationId: string, content: string) => {
    const newMessage: Message = {
      id: `m${Date.now()}`,
      conversationId,
      content,
      timestamp: new Date(),
      senderId: 'me',
      senderName: 'You',
      isOutgoing: true,
      isRead: true,
      channel: get().conversations.find(c => c.id === conversationId)?.channel || 'sms',
    };

    set(state => ({
      messages: {
        ...state.messages,
        [conversationId]: [...(state.messages[conversationId] || []), newMessage],
      },
      conversations: state.conversations.map(conv =>
        conv.id === conversationId
          ? {
              ...conv,
              lastMessage: content,
              lastMessageTime: new Date(),
            }
          : conv
      ),
    }));

    // Sort conversations by most recent
    set(state => ({
      conversations: [...state.conversations].sort(
        (a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime()
      ),
    }));

    // Simulate typing indicator and response
    setTimeout(() => {
      set({ isTyping: true });

      setTimeout(() => {
        const responses = [
          'Thanks for the message! I\'ll get back to you shortly.',
          'Got it! Working on this now.',
          'Perfect timing! I was just about to reach out.',
          'Received! I\'ll review and respond soon.',
        ];

        const responseMessage: Message = {
          id: `m${Date.now()}`,
          conversationId,
          content: responses[Math.floor(Math.random() * responses.length)],
          timestamp: new Date(),
          senderId: 'other',
          senderName: get().conversations.find(c => c.id === conversationId)?.contactName || 'Contact',
          isOutgoing: false,
          isRead: false,
          channel: get().conversations.find(c => c.id === conversationId)?.channel || 'sms',
        };

        set(state => ({
          messages: {
            ...state.messages,
            [conversationId]: [...(state.messages[conversationId] || []), responseMessage],
          },
          conversations: state.conversations.map(conv =>
            conv.id === conversationId
              ? {
                  ...conv,
                  lastMessage: responseMessage.content,
                  lastMessageTime: new Date(),
                  unreadCount: conv.id === state.activeConversationId ? 0 : conv.unreadCount + 1,
                }
              : conv
          ),
          isTyping: false,
        }));

        // Sort conversations again
        set(state => ({
          conversations: [...state.conversations].sort(
            (a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime()
          ),
        }));
      }, 2000);
    }, 500);
  },

  markAsRead: (conversationId: string) => {
    set(state => ({
      conversations: state.conversations.map(conv =>
        conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
      ),
      messages: {
        ...state.messages,
        [conversationId]: state.messages[conversationId]?.map(msg => ({
          ...msg,
          isRead: true,
        })),
      },
    }));
  },

  setSearchQuery: (query: string) => set({ searchQuery: query }),

  setFilterTab: (tab: 'all' | 'unread' | 'sms' | 'email') => set({ filterTab: tab }),

  setIsTyping: (typing: boolean) => set({ isTyping: typing }),
}));
