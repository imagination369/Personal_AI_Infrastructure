"use client";

import React, { useEffect, useState, useRef } from 'react';
import { usePaiStore } from '@/lib/stores/pai-store';
import { PaiChat } from './pai-chat';
import { PaiActions } from './pai-actions';
import { PaiContext } from './pai-context';
import {
  X,
  Minimize2,
  MessageSquare,
  Zap,
  Eye,
  Sparkles,
  GripVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function PaiCommandCenter() {
  const { isOpen, activeTab, panelWidth, togglePanel, setActiveTab, setPanelWidth } = usePaiStore();
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

  // Handle panel resize
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeRef.current = {
      startX: e.clientX,
      startWidth: panelWidth,
    };
  };

  useEffect(() => {
    if (!isResizing || !resizeRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;

      const diff = resizeRef.current.startX - e.clientX;
      const newWidth = resizeRef.current.startWidth + diff;
      setPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      resizeRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, setPanelWidth]);

  const tabs = [
    {
      value: 'chat',
      label: 'Chat',
      icon: <MessageSquare className="w-4 h-4" />,
      component: <PaiChat />,
    },
    {
      value: 'actions',
      label: 'Actions',
      icon: <Zap className="w-4 h-4" />,
      component: <PaiActions />,
    },
    {
      value: 'context',
      label: 'Context',
      icon: <Eye className="w-4 h-4" />,
      component: <PaiContext />,
    },
  ];

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={togglePanel}
        />
      )}

      {/* Panel */}
      <div
        className={cn(
          "fixed right-0 top-0 h-screen bg-zinc-950 border-l border-zinc-800 z-50",
          "flex flex-col shadow-2xl transition-transform duration-300 ease-in-out",
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        style={{ width: `${panelWidth}px` }}
      >
        {/* Resize Handle */}
        <div
          className={cn(
            "absolute left-0 top-0 bottom-0 w-1 cursor-col-resize group",
            "hover:bg-violet-500/50 transition-colors",
            isResizing && "bg-violet-500"
          )}
          onMouseDown={handleResizeStart}
        >
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-16 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="w-4 h-4 text-zinc-600" />
          </div>
        </div>

        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-zinc-100">PAI Assistant</h2>
                <p className="text-xs text-zinc-500">Your intelligent co-pilot</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePanel}
                className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
              >
                <Minimize2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePanel}
                className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 w-fit">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            <span className="text-xs font-medium text-violet-300">Online & Ready</span>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as any)}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="w-full justify-start rounded-none border-b border-zinc-800 bg-zinc-950 p-0 h-auto flex-shrink-0">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  "flex-1 rounded-none border-b-2 border-transparent py-3 gap-2",
                  "data-[state=active]:border-violet-500 data-[state=active]:bg-violet-500/5",
                  "data-[state=active]:text-violet-300 text-zinc-500",
                  "hover:text-zinc-300 hover:bg-zinc-900/50",
                  "transition-all duration-200"
                )}
              >
                {tab.icon}
                <span className="text-sm font-medium">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {tabs.map((tab) => (
            <TabsContent
              key={tab.value}
              value={tab.value}
              className="flex-1 m-0 overflow-hidden"
            >
              {tab.component}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </>
  );
}
