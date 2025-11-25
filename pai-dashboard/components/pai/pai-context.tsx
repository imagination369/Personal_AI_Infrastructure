"use client";

import React from 'react';
import { usePaiStore } from '@/lib/stores/pai-store';
import {
  Eye,
  MapPin,
  Users,
  Filter,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

export function PaiContext() {
  const { currentContext } = usePaiStore();
  const { currentPage, selectedContacts, activeFilters, recentActions } = currentContext;

  const contextSections = [
    {
      id: 'page',
      icon: <MapPin className="w-4 h-4" />,
      title: 'Current Location',
      content: (
        <div className="space-y-2">
          <div className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700">
            <p className="text-sm font-medium text-zinc-300 capitalize">
              {currentPage.replace('-', ' ')}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'contacts',
      icon: <Users className="w-4 h-4" />,
      title: 'Selected Contacts',
      content: (
        <div className="space-y-2">
          {selectedContacts.length === 0 ? (
            <p className="text-xs text-zinc-500 italic">No contacts selected</p>
          ) : (
            <div className="space-y-1">
              {selectedContacts.map((contact, index) => (
                <div
                  key={index}
                  className="px-3 py-1.5 rounded-md bg-zinc-800 border border-zinc-700 text-xs text-zinc-300"
                >
                  {contact}
                </div>
              ))}
            </div>
          )}
          {selectedContacts.length > 0 && (
            <p className="text-xs text-violet-400 font-medium">
              {selectedContacts.length} contact{selectedContacts.length !== 1 ? 's' : ''} selected
            </p>
          )}
        </div>
      ),
    },
    {
      id: 'filters',
      icon: <Filter className="w-4 h-4" />,
      title: 'Active Filters',
      content: (
        <div className="space-y-2">
          {Object.keys(activeFilters).length === 0 ? (
            <p className="text-xs text-zinc-500 italic">No filters applied</p>
          ) : (
            <div className="space-y-1">
              {Object.entries(activeFilters).map(([key, value]) => (
                <div
                  key={key}
                  className="px-3 py-1.5 rounded-md bg-zinc-800 border border-zinc-700"
                >
                  <p className="text-xs text-zinc-400">
                    <span className="font-medium text-zinc-300">{key}:</span>{' '}
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'actions',
      icon: <Clock className="w-4 h-4" />,
      title: 'Recent Actions',
      content: (
        <div className="space-y-2">
          {recentActions.length === 0 ? (
            <p className="text-xs text-zinc-500 italic">No recent actions</p>
          ) : (
            <div className="space-y-1">
              {recentActions.map((action, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700"
                >
                  <CheckCircle2 className="w-3 h-3 text-violet-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-zinc-300 flex-1">{action}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center">
            <Eye className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-300">PAI Context</h3>
            <p className="text-xs text-zinc-500">What PAI can see</p>
          </div>
        </div>

        {/* Context Status Indicator */}
        <div className="mt-3 px-3 py-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
            <p className="text-xs text-violet-300 font-medium">
              Context tracking active
            </p>
          </div>
        </div>
      </div>

      {/* Context Sections */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {contextSections.map((section) => (
            <div key={section.id} className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-zinc-800 flex items-center justify-center text-violet-400">
                  {section.icon}
                </div>
                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                  {section.title}
                </h4>
              </div>
              {section.content}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer Info */}
      <div className="p-4 border-t border-zinc-800">
        <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
          <p className="text-xs text-zinc-500 leading-relaxed">
            PAI uses this context to provide personalized assistance and suggestions based on your current workflow.
          </p>
        </div>
      </div>
    </div>
  );
}
