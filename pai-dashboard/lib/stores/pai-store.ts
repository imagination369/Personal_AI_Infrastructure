import { create } from 'zustand';

export type PaiTab = 'chat' | 'actions' | 'context';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface PaiContext {
  currentPage: string;
  selectedContacts: string[];
  activeFilters: Record<string, any>;
  recentActions: string[];
}

interface PaiStore {
  // UI State
  isOpen: boolean;
  activeTab: PaiTab;
  panelWidth: number;

  // Chat State
  messages: Message[];
  isThinking: boolean;
  suggestedActions: string[];

  // Context State
  currentContext: PaiContext;

  // Actions
  togglePanel: () => void;
  setActiveTab: (tab: PaiTab) => void;
  setPanelWidth: (width: number) => void;
  sendMessage: (content: string) => Promise<void>;
  setContext: (context: Partial<PaiContext>) => void;
  addRecentAction: (action: string) => void;
  clearMessages: () => void;
}

// Mock PAI responses for demo
const mockResponses: Record<string, string> = {
  default: "I'm PAI, your intelligent assistant. I can help you with:\n\n- **Sending follow-ups** to contacts\n- **Generating reports** on your conversations\n- **Finding contacts** using natural language\n- **Scheduling messages** in bulk\n- **Analyzing conversations** for sentiment\n\nWhat would you like to do?",
  'send follow': "I can help you send follow-up messages! Based on your current context, I see you have several contacts selected. Would you like me to:\n\n1. Draft personalized follow-ups for each contact\n2. Send a bulk message to all selected contacts\n3. Schedule follow-ups for later\n\nWhich option works best for you?",
  'generate report': "I'll generate a comprehensive report for you. What type of report would you like?\n\n- **Conversation Analytics** - Message volume, response rates, engagement\n- **Contact Insights** - New contacts, active conversations, churn risk\n- **Performance Metrics** - Team performance, response times, resolution rates\n\nLet me know and I'll create it!",
  'find contact': "I can search through your contacts using natural language! Try asking me:\n\n- \"Find all contacts who haven't responded in 7 days\"\n- \"Show me contacts interested in premium plans\"\n- \"Who are my most engaged contacts this month?\"\n\nWhat are you looking for?",
  'schedule': "Let's schedule some messages! I can help you:\n\n1. **Bulk schedule** messages to multiple contacts\n2. **Smart timing** - Send messages at optimal times\n3. **Follow-up sequences** - Create automated follow-up chains\n\nHow would you like to proceed?",
  'sync': "I'll trigger a manual sync with GoHighLevel now. This will:\n\n✓ Pull latest contact updates\n✓ Sync conversation history\n✓ Update message statuses\n✓ Refresh webhooks\n\nSync in progress... This usually takes 30-60 seconds.",
  'analyze': "I can analyze your conversations for:\n\n📊 **Sentiment Analysis** - Positive, neutral, or negative tone\n🎯 **Intent Detection** - What customers are asking about\n⚠️ **Risk Indicators** - Dissatisfaction or churn signals\n💡 **Opportunities** - Upsell or cross-sell chances\n\nWhich analysis would you like to see?",
  'help': "I'm here to help! Here are some things you can ask me:\n\n- \"Send a follow-up to all contacts who haven't replied\"\n- \"Show me contacts with high engagement\"\n- \"Generate a weekly performance report\"\n- \"Analyze sentiment in recent conversations\"\n- \"Schedule messages for tomorrow morning\"\n\nI understand natural language, so just ask me anything!",
};

const suggestedActionsByContext: Record<string, string[]> = {
  dashboard: [
    "Generate this week's report",
    "Show me top performing contacts",
    "Analyze recent conversations",
  ],
  conversations: [
    "Draft follow-ups for these contacts",
    "Analyze sentiment in selected threads",
    "Schedule bulk messages",
  ],
  contacts: [
    "Find contacts needing follow-up",
    "Export selected contacts",
    "Send bulk message to selected",
  ],
};

const getPaiResponse = (userMessage: string): string => {
  const lowerMessage = userMessage.toLowerCase();

  // Check for specific keywords
  if (lowerMessage.includes('follow') || lowerMessage.includes('follow-up')) {
    return mockResponses['send follow'];
  }
  if (lowerMessage.includes('report') || lowerMessage.includes('analytics')) {
    return mockResponses['generate report'];
  }
  if (lowerMessage.includes('find') || lowerMessage.includes('search') || lowerMessage.includes('contact')) {
    return mockResponses['find contact'];
  }
  if (lowerMessage.includes('schedule') || lowerMessage.includes('bulk')) {
    return mockResponses['schedule'];
  }
  if (lowerMessage.includes('sync') || lowerMessage.includes('ghl') || lowerMessage.includes('gohighlevel')) {
    return mockResponses['sync'];
  }
  if (lowerMessage.includes('analyz') || lowerMessage.includes('sentiment')) {
    return mockResponses['analyze'];
  }
  if (lowerMessage.includes('help') || lowerMessage.includes('what can')) {
    return mockResponses['help'];
  }

  return mockResponses.default;
};

export const usePaiStore = create<PaiStore>((set, get) => ({
  // Initial State
  isOpen: false,
  activeTab: 'chat',
  panelWidth: 400,
  messages: [
    {
      id: '1',
      role: 'assistant',
      content: "👋 Hi! I'm PAI, your intelligent assistant for managing conversations and contacts.\n\nI can help you automate tasks, analyze data, and work more efficiently. What would you like to do today?",
      timestamp: new Date(),
    },
  ],
  isThinking: false,
  suggestedActions: [
    "Show me today's activity",
    "Find contacts needing follow-up",
    "Generate weekly report",
  ],
  currentContext: {
    currentPage: 'dashboard',
    selectedContacts: [],
    activeFilters: {},
    recentActions: [],
  },

  // Actions
  togglePanel: () => set((state) => ({ isOpen: !state.isOpen })),

  setActiveTab: (tab) => set({ activeTab: tab }),

  setPanelWidth: (width) => set({ panelWidth: Math.max(300, Math.min(800, width)) }),

  sendMessage: async (content) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    set((state) => ({
      messages: [...state.messages, userMessage],
      isThinking: true,
    }));

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000));

    const response = getPaiResponse(content);

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: response,
      timestamp: new Date(),
    };

    // Update suggested actions based on context
    const newSuggestions = suggestedActionsByContext[get().currentContext.currentPage] || [
      "Tell me more",
      "Show me examples",
      "What else can you do?",
    ];

    set((state) => ({
      messages: [...state.messages, assistantMessage],
      isThinking: false,
      suggestedActions: newSuggestions,
    }));

    // Add to recent actions
    get().addRecentAction(`Asked: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`);
  },

  setContext: (context) => set((state) => ({
    currentContext: { ...state.currentContext, ...context },
    suggestedActions: suggestedActionsByContext[context.currentPage || state.currentContext.currentPage] || state.suggestedActions,
  })),

  addRecentAction: (action) => set((state) => ({
    currentContext: {
      ...state.currentContext,
      recentActions: [action, ...state.currentContext.recentActions.slice(0, 4)],
    },
  })),

  clearMessages: () => set({
    messages: [
      {
        id: '1',
        role: 'assistant',
        content: "👋 Hi! I'm PAI, your intelligent assistant for managing conversations and contacts.\n\nI can help you automate tasks, analyze data, and work more efficiently. What would you like to do today?",
        timestamp: new Date(),
      },
    ],
  }),
}));
