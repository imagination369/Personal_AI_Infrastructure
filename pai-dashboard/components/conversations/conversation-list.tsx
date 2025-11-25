'use client';

import { useState } from 'react';
import { useConversationsStore } from '@/lib/stores/conversations-store';
import { formatDistanceToNow } from 'date-fns';
import {
  Search,
  Mail,
  MessageSquare,
  Hash,
  Filter,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const channelIcons = {
  sms: MessageSquare,
  email: Mail,
  whatsapp: MessageSquare,
  slack: Hash,
};

const filterTabs = [
  { id: 'all', label: 'All', icon: Filter },
  { id: 'unread', label: 'Unread', icon: MessageSquare },
  { id: 'sms', label: 'SMS', icon: MessageSquare },
  { id: 'email', label: 'Email', icon: Mail },
] as const;

export function ConversationList() {
  const {
    conversations,
    activeConversationId,
    searchQuery,
    filterTab,
    selectConversation,
    setSearchQuery,
    setFilterTab,
  } = useConversationsStore();

  // Filter conversations based on search and filter tab
  const filteredConversations = conversations.filter(conv => {
    // Search filter
    const matchesSearch =
      conv.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Tab filter
    switch (filterTab) {
      case 'unread':
        return conv.unreadCount > 0;
      case 'sms':
        return conv.channel === 'sms';
      case 'email':
        return conv.channel === 'email';
      case 'all':
      default:
        return true;
    }
  });

  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-zinc-600',
    away: 'bg-yellow-500',
  };

  return (
    <div className="w-96 border-r border-zinc-800 flex flex-col bg-zinc-950">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-zinc-100">Messages</h2>
          <Badge variant="secondary" className="bg-blue-600/20 text-blue-400">
            {conversations.reduce((sum, conv) => sum + conv.unreadCount, 0)} Unread
          </Badge>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {filterTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = filterTab === tab.id;
            const unreadCount =
              tab.id === 'all'
                ? conversations.reduce((sum, conv) => sum + conv.unreadCount, 0)
                : tab.id === 'unread'
                ? conversations.filter(c => c.unreadCount > 0).length
                : conversations.filter(c => c.channel === tab.id).reduce(
                    (sum, conv) => sum + conv.unreadCount,
                    0
                  );

            return (
              <Button
                key={tab.id}
                variant={isActive ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilterTab(tab.id as any)}
                className={`flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">{tab.label}</span>
                {unreadCount > 0 && (
                  <Badge
                    variant="secondary"
                    className={`ml-1 h-5 px-1.5 text-xs ${
                      isActive
                        ? 'bg-blue-700 text-white'
                        : 'bg-zinc-700 text-zinc-300'
                    }`}
                  >
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center px-4">
              <MessageSquare className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500 text-sm">
                {searchQuery
                  ? 'No conversations found'
                  : 'No conversations yet'}
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {filteredConversations.map(conversation => {
              const isActive = conversation.id === activeConversationId;
              const ChannelIcon = channelIcons[conversation.channel];

              return (
                <button
                  key={conversation.id}
                  onClick={() => selectConversation(conversation.id)}
                  className={`w-full p-4 flex items-start gap-3 hover:bg-zinc-900/50 transition-colors text-left ${
                    isActive ? 'bg-zinc-900 border-l-2 border-blue-500' : ''
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={conversation.contactAvatar} />
                      <AvatarFallback className="bg-zinc-800 text-zinc-300">
                        {conversation.contactName
                          .split(' ')
                          .map(n => n[0])
                          .join('')}
                      </AvatarFallback>
                    </Avatar>
                    {/* Status indicator */}
                    <div
                      className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-zinc-950 ${
                        statusColors[conversation.status]
                      }`}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <h3
                        className={`font-semibold truncate ${
                          conversation.unreadCount > 0
                            ? 'text-zinc-100'
                            : 'text-zinc-300'
                        }`}
                      >
                        {conversation.contactName}
                      </h3>
                      <span className="text-xs text-zinc-500 shrink-0 ml-2">
                        {formatDistanceToNow(conversation.lastMessageTime, {
                          addSuffix: false,
                        })
                          .replace('about ', '')
                          .replace(' ago', '')}
                      </span>
                    </div>

                    {/* Last message preview */}
                    <p
                      className={`text-sm line-clamp-2 mb-1 ${
                        conversation.unreadCount > 0
                          ? 'text-zinc-300 font-medium'
                          : 'text-zinc-500'
                      }`}
                    >
                      {conversation.lastMessage}
                    </p>

                    {/* Bottom row: channel and unread badge */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <ChannelIcon className="w-3.5 h-3.5 text-zinc-600" />
                        <span className="text-xs text-zinc-600 capitalize">
                          {conversation.channel}
                        </span>
                      </div>

                      {conversation.unreadCount > 0 && (
                        <Badge
                          variant="secondary"
                          className="bg-blue-600 text-white h-5 px-2 text-xs font-semibold"
                        >
                          {conversation.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
