'use client';

import { useEffect, useRef, useState } from 'react';
import { useConversationsStore } from '@/lib/stores/conversations-store';
import { MessageBubble } from './message-bubble';
import {
  Send,
  Paperclip,
  Sparkles,
  Phone,
  Video,
  MoreVertical,
  Loader2,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export function ChatView() {
  const {
    activeConversationId,
    conversations,
    messages,
    isTyping,
    sendMessage,
  } = useConversationsStore();

  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeConversation = conversations.find(
    c => c.id === activeConversationId
  );
  const conversationMessages = activeConversationId
    ? messages[activeConversationId] || []
    : [];

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationMessages, isTyping]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [messageInput]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !activeConversationId) return;

    sendMessage(activeConversationId, messageInput.trim());
    setMessageInput('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Empty state when no conversation selected
  if (!activeConversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-950 border-l border-zinc-800">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-zinc-900 flex items-center justify-center">
            <Sparkles className="w-12 h-12 text-zinc-600" />
          </div>
          <h3 className="text-xl font-semibold text-zinc-100 mb-2">
            No Conversation Selected
          </h3>
          <p className="text-zinc-500 max-w-sm">
            Select a conversation from the list to start messaging, or use AI
            assist to help manage your communications.
          </p>
        </div>
      </div>
    );
  }

  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-zinc-600',
    away: 'bg-yellow-500',
  };

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 border-l border-zinc-800">
      {/* Contact Header */}
      <div className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="w-10 h-10">
              <AvatarImage src={activeConversation.contactAvatar} />
              <AvatarFallback>
                {activeConversation.contactName
                  .split(' ')
                  .map(n => n[0])
                  .join('')}
              </AvatarFallback>
            </Avatar>
            <div
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-zinc-900 ${
                statusColors[activeConversation.status]
              }`}
            />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">
              {activeConversation.contactName}
            </h3>
            <p className="text-xs text-zinc-500 capitalize">
              {activeConversation.status}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
          >
            <Phone className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
          >
            <Video className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 scroll-smooth">
        {conversationMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-zinc-500">
                No messages yet. Start the conversation!
              </p>
            </div>
          </div>
        ) : (
          <>
            {conversationMessages.map(message => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-center gap-2 mb-4">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={activeConversation.contactAvatar} />
                  <AvatarFallback>
                    {activeConversation.contactName
                      .split(' ')
                      .map(n => n[0])
                      .join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="bg-zinc-800 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <div className="border-t border-zinc-800 p-4 bg-zinc-900/50 backdrop-blur-sm">
        <div className="flex items-end gap-2">
          {/* Attachment Button */}
          <Button
            variant="ghost"
            size="icon"
            className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 shrink-0"
          >
            <Paperclip className="w-5 h-5" />
          </Button>

          {/* Text Input */}
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={messageInput}
              onChange={e => setMessageInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="min-h-[44px] max-h-[200px] resize-none bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:ring-blue-500 focus:border-blue-500 pr-12 rounded-2xl"
              rows={1}
            />
          </div>

          {/* AI Assist Button */}
          <Button
            variant="ghost"
            size="icon"
            className="text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 shrink-0"
            title="AI Assist"
          >
            <Sparkles className="w-5 h-5" />
          </Button>

          {/* Send Button */}
          <Button
            onClick={handleSendMessage}
            disabled={!messageInput.trim()}
            size="icon"
            className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {isTyping ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>

        {/* Helper text */}
        <p className="text-xs text-zinc-600 mt-2 text-center">
          Press Enter to send, Shift + Enter for new line
        </p>
      </div>
    </div>
  );
}
