'use client';

import { ConversationList } from '@/components/conversations/conversation-list';
import { ChatView } from '@/components/conversations/chat-view';

export default function ConversationsPage() {
  return (
    <div className="h-[calc(100vh-4rem)] flex bg-zinc-950">
      {/* Left Panel - Conversation List */}
      <ConversationList />

      {/* Right Panel - Active Chat */}
      <ChatView />
    </div>
  );
}
