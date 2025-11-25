# PAI Command Center Integration Guide

## Overview
The PAI Command Center is an intelligent assistant interface that slides in from the right side of your dashboard. It features three modes: Chat, Actions, and Context.

## Files Created

### 1. Store (State Management)
- **`lib/stores/pai-store.ts`** - Zustand store managing all PAI state
  - Panel visibility and dimensions
  - Chat messages and thinking state
  - Current context and recent actions
  - Mock AI responses for demo

### 2. Components

#### Main Panel
- **`components/pai/pai-command-center.tsx`** - Main container
  - Collapsible panel with smooth animations
  - Resizable width (300px - 800px)
  - Three-tab interface (Chat, Actions, Context)
  - Beautiful violet/purple gradient theme

#### Chat Interface
- **`components/pai/pai-chat.tsx`** - Interactive chat
  - Message history with markdown support
  - Animated typing indicator
  - Suggested action chips
  - Auto-scroll to latest messages
  - Natural conversation flow

#### Quick Actions
- **`components/pai/pai-actions.tsx`** - Action cards
  - 6 pre-configured quick actions
  - One-click task triggers
  - Visual feedback on hover
  - Automatically switches to chat after triggering

#### Context Awareness
- **`components/pai/pai-context.tsx`** - Context display
  - Shows current page/location
  - Selected contacts
  - Active filters
  - Recent user actions
  - Real-time context tracking

## Integration Steps

### 1. Install Dependencies

Ensure you have these packages installed:

\`\`\`bash
npm install zustand lucide-react react-markdown
# or
pnpm add zustand lucide-react react-markdown
# or
yarn add zustand lucide-react react-markdown
\`\`\`

### 2. Add to Your Layout

Import and add the PAI Command Center to your main layout:

\`\`\`tsx
// app/layout.tsx or app/dashboard/layout.tsx
import { PaiCommandCenter } from '@/components/pai/pai-command-center';

export default function DashboardLayout({ children }) {
  return (
    <div className="relative">
      {children}
      <PaiCommandCenter />
    </div>
  );
}
\`\`\`

### 3. Add Toggle Button

Create a button to open the PAI panel:

\`\`\`tsx
"use client";

import { usePaiStore } from '@/lib/stores/pai-store';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PaiToggleButton() {
  const { togglePanel } = usePaiStore();

  return (
    <Button
      onClick={togglePanel}
      className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 z-30"
    >
      <Sparkles className="w-6 h-6 text-white" />
    </Button>
  );
}
\`\`\`

### 4. Update Context (Optional)

Update PAI's context awareness based on your app state:

\`\`\`tsx
"use client";

import { useEffect } from 'react';
import { usePaiStore } from '@/lib/stores/pai-store';
import { usePathname } from 'next/navigation';

export function PaiContextProvider({ children }) {
  const { setContext } = usePaiStore();
  const pathname = usePathname();

  useEffect(() => {
    // Update current page
    const page = pathname.split('/').pop() || 'dashboard';
    setContext({ currentPage: page });
  }, [pathname, setContext]);

  return <>{children}</>;
}
\`\`\`

Then wrap your app:

\`\`\`tsx
// app/layout.tsx
import { PaiContextProvider } from '@/components/pai/pai-context-provider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <PaiContextProvider>
          {children}
        </PaiContextProvider>
      </body>
    </html>
  );
}
\`\`\`

### 5. Update Context with User Actions

Update context when users interact with your app:

\`\`\`tsx
import { usePaiStore } from '@/lib/stores/pai-store';

function ContactsPage() {
  const { setContext, addRecentAction } = usePaiStore();
  const [selectedContacts, setSelectedContacts] = useState([]);

  useEffect(() => {
    // Update selected contacts in PAI context
    setContext({ selectedContacts });
  }, [selectedContacts, setContext]);

  const handleExport = () => {
    // Track action in PAI
    addRecentAction('Exported contacts to CSV');
  };

  // ... rest of component
}
\`\`\`

## Features

### 🎨 Visual Design
- **Purple/Violet Theme** (#8B5CF6) - Distinct from main UI
- **Dark Mode** - Optimized for dark interfaces
- **Smooth Animations** - 300ms transitions
- **Glassmorphism** - Backdrop blur effects
- **Gradient Accents** - Beautiful visual hierarchy

### 💬 Chat Features
- **Markdown Support** - Rich text formatting in responses
- **Smart Responses** - Context-aware mock AI responses
- **Suggested Actions** - Dynamic action chips based on context
- **Typing Indicator** - Animated dots while "thinking"
- **Auto-scroll** - Smooth scroll to latest messages
- **Message History** - Persistent conversation

### ⚡ Quick Actions
1. **Send Follow-ups** - Bulk message contacts
2. **Generate Report** - Create analytics
3. **Find Contacts** - Natural language search
4. **Schedule Messages** - Bulk scheduling
5. **Sync with GHL** - Manual sync trigger
6. **Analyze Conversations** - Sentiment analysis

### 👁️ Context Tracking
- **Current Page** - Know where user is
- **Selected Items** - Track selections
- **Active Filters** - Monitor applied filters
- **Recent Actions** - Show action history
- **Real-time Updates** - Live context changes

### 🎯 Panel Behavior
- **Collapsible** - Slides from right
- **Resizable** - Drag to adjust width (300-800px)
- **Keyboard Friendly** - Auto-focus on input
- **Overlay** - Backdrop blur when open
- **Persistent State** - Zustand manages all state

## Customization

### Change Theme Color

Edit the store to use different accent color:

\`\`\`tsx
// lib/stores/pai-store.ts
// Replace #8B5CF6 (violet) with your color
// Update all className props with "violet" to your color name
\`\`\`

### Add Custom Actions

Extend the actions array in `pai-actions.tsx`:

\`\`\`tsx
const actions: ActionCard[] = [
  // ... existing actions
  {
    id: 'custom-action',
    icon: <YourIcon className="w-5 h-5" />,
    title: 'Custom Action',
    description: 'Your custom action description',
    action: 'trigger custom action',
  },
];
\`\`\`

### Add Real AI Integration

Replace mock responses in `pai-store.ts`:

\`\`\`tsx
sendMessage: async (content) => {
  // ... add user message

  // Call your AI API
  const response = await fetch('/api/pai/chat', {
    method: 'POST',
    body: JSON.stringify({ message: content, context: get().currentContext }),
  });

  const data = await response.json();

  // ... add assistant message with data.response
},
\`\`\`

## Keyboard Shortcuts (Future Enhancement)

Consider adding shortcuts:
- `Cmd/Ctrl + K` - Toggle PAI panel
- `Esc` - Close panel
- `/` - Focus chat input

## Dependencies

This component uses:
- **Zustand** - State management
- **Lucide React** - Icons
- **React Markdown** - Message formatting
- **shadcn/ui** - Base components (Button, Input, ScrollArea, Tabs)
- **Tailwind CSS** - Styling

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (responsive design)

## Performance Notes

- **Lazy Loading** - Consider code-splitting for large apps
- **Memo Components** - Already optimized with React best practices
- **Zustand** - Lightweight state (< 1KB)
- **Smooth Animations** - GPU-accelerated transforms

## Troubleshooting

### Panel not showing?
- Check `isOpen` state in Zustand dev tools
- Verify z-index doesn't conflict with other modals

### Chat input not working?
- Ensure form submit handler is bound correctly
- Check for console errors

### Context not updating?
- Verify `setContext()` is called with correct data
- Check Zustand state in React dev tools

### Styles not applying?
- Ensure Tailwind config includes component paths
- Verify shadcn/ui components are installed

## Next Steps

1. **Connect Real AI** - Integrate OpenAI, Anthropic, or custom AI
2. **Voice Input** - Add speech-to-text
3. **Action Execution** - Implement actual action handlers
4. **Analytics** - Track PAI usage metrics
5. **Keyboard Shortcuts** - Add hotkey support
6. **Mobile Optimization** - Full-screen on mobile
7. **Notifications** - Toast messages for completed actions
8. **Streaming Responses** - Real-time AI streaming

## Example Usage

\`\`\`tsx
// Complete example in a page
"use client";

import { PaiCommandCenter } from '@/components/pai/pai-command-center';
import { usePaiStore } from '@/lib/stores/pai-store';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { togglePanel, setContext } = usePaiStore();

  useEffect(() => {
    setContext({
      currentPage: 'dashboard',
      selectedContacts: [],
      activeFilters: {}
    });
  }, [setContext]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="container mx-auto p-8">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

        {/* Your dashboard content */}

        {/* PAI Toggle Button */}
        <Button
          onClick={togglePanel}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg z-30"
        >
          <Sparkles className="w-6 h-6" />
        </Button>
      </div>

      {/* PAI Command Center */}
      <PaiCommandCenter />
    </div>
  );
}
\`\`\`

---

Built with ❤️ for intelligent dashboard experiences.
