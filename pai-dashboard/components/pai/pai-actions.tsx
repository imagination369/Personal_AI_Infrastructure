"use client";

import React from 'react';
import { usePaiStore } from '@/lib/stores/pai-store';
import {
  Send,
  FileText,
  Search,
  Calendar,
  RefreshCw,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActionCard {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  action: string;
}

const actions: ActionCard[] = [
  {
    id: 'send-followups',
    icon: <Send className="w-5 h-5" />,
    title: 'Send Follow-ups',
    description: 'Send personalized messages to contacts who need a nudge',
    action: 'send follow-up messages',
  },
  {
    id: 'generate-report',
    icon: <FileText className="w-5 h-5" />,
    title: 'Generate Report',
    description: 'Create detailed analytics and performance reports',
    action: 'generate a comprehensive report',
  },
  {
    id: 'find-contacts',
    icon: <Search className="w-5 h-5" />,
    title: 'Find Contacts',
    description: 'Search contacts using natural language queries',
    action: 'find contacts',
  },
  {
    id: 'schedule-messages',
    icon: <Calendar className="w-5 h-5" />,
    title: 'Schedule Messages',
    description: 'Bulk schedule messages for optimal delivery times',
    action: 'schedule bulk messages',
  },
  {
    id: 'sync-ghl',
    icon: <RefreshCw className="w-5 h-5" />,
    title: 'Sync with GHL',
    description: 'Manually trigger GoHighLevel data synchronization',
    action: 'sync with GoHighLevel',
  },
  {
    id: 'analyze-conversations',
    icon: <TrendingUp className="w-5 h-5" />,
    title: 'Analyze Conversations',
    description: 'Get sentiment analysis and insights from conversations',
    action: 'analyze conversations',
  },
];

export function PaiActions() {
  const { sendMessage, setActiveTab, addRecentAction } = usePaiStore();

  const handleActionClick = async (action: ActionCard) => {
    // Switch to chat tab
    setActiveTab('chat');

    // Send the action message
    await sendMessage(action.action);

    // Add to recent actions
    addRecentAction(`Triggered: ${action.title}`);
  };

  return (
    <div className="p-4 h-full overflow-y-auto">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-zinc-300 mb-1">Quick Actions</h3>
        <p className="text-xs text-zinc-500">
          Trigger common tasks with one click
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => handleActionClick(action)}
            className={cn(
              "group relative p-4 rounded-lg border text-left transition-all duration-200",
              "bg-zinc-900 border-zinc-800",
              "hover:bg-zinc-800 hover:border-violet-500/30",
              "focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                "bg-violet-500/10 text-violet-400",
                "group-hover:bg-violet-500/20"
              )}>
                {action.icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-sm text-zinc-100">
                    {action.title}
                  </h4>
                  <Zap className="w-3 h-3 text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-xs text-zinc-500 line-clamp-2">
                  {action.description}
                </p>
              </div>
            </div>

            {/* Hover Effect */}
            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-violet-500/0 via-violet-500/5 to-violet-500/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </button>
        ))}
      </div>

      {/* Bottom Tip */}
      <div className="mt-6 p-3 rounded-lg bg-violet-500/5 border border-violet-500/10">
        <div className="flex gap-2">
          <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
            <Zap className="w-3 h-3 text-violet-400" />
          </div>
          <div>
            <p className="text-xs text-zinc-400">
              <span className="font-medium text-violet-400">Pro Tip:</span> You can also trigger these actions by asking PAI in the chat!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
