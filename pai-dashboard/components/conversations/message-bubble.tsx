'use client';

import { Message } from '@/lib/stores/conversations-store';
import { formatDistanceToNow } from 'date-fns';
import { Check, CheckCheck, Mail, MessageSquare, Hash } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
}

const channelIcons = {
  sms: MessageSquare,
  email: Mail,
  whatsapp: MessageSquare,
  slack: Hash,
};

export function MessageBubble({ message }: MessageBubbleProps) {
  const ChannelIcon = channelIcons[message.channel];

  return (
    <div
      className={`flex w-full mb-4 ${
        message.isOutgoing ? 'justify-end' : 'justify-start'
      }`}
    >
      <div
        className={`max-w-[70%] ${
          message.isOutgoing ? 'items-end' : 'items-start'
        } flex flex-col`}
      >
        {/* Message bubble */}
        <div
          className={`rounded-2xl px-4 py-2.5 ${
            message.isOutgoing
              ? 'bg-blue-600 text-white rounded-br-md'
              : 'bg-zinc-800 text-zinc-100 rounded-bl-md'
          } shadow-sm`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </p>
        </div>

        {/* Timestamp and status */}
        <div
          className={`flex items-center gap-1.5 mt-1 px-1 ${
            message.isOutgoing ? 'flex-row-reverse' : 'flex-row'
          }`}
        >
          {/* Channel icon */}
          <ChannelIcon className="w-3 h-3 text-zinc-500" />

          {/* Timestamp */}
          <span className="text-xs text-zinc-500">
            {formatDistanceToNow(message.timestamp, { addSuffix: true })}
          </span>

          {/* Read receipt for outgoing messages */}
          {message.isOutgoing && (
            <div className="flex items-center">
              {message.isRead ? (
                <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
              ) : (
                <Check className="w-3.5 h-3.5 text-zinc-500" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
