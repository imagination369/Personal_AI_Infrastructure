"use client";

import React, { useEffect, useRef, useState } from 'react';
import { usePaiStore } from '@/lib/stores/pai-store';
import { Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

export function PaiChat() {
  const { messages, isThinking, suggestedActions, sendMessage } = usePaiStore();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isThinking]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isThinking) return;

    const message = input.trim();
    setInput('');
    await sendMessage(message);
  };

  const handleSuggestedAction = async (action: string) => {
    if (isThinking) return;
    await sendMessage(action);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                </div>
              )}

              <div
                className={cn(
                  "rounded-lg px-4 py-2.5 max-w-[80%]",
                  message.role === 'user'
                    ? 'bg-violet-500 text-white'
                    : 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                )}
              >
                {message.role === 'assistant' ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="text-violet-400 font-semibold">{children}</strong>,
                        ul: ({ children }) => <ul className="my-2 space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="my-2 space-y-1">{children}</ol>,
                        li: ({ children }) => <li className="text-sm">{children}</li>,
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm">{message.content}</p>
                )}

                <p className="text-xs opacity-50 mt-1">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium">You</span>
                </div>
              )}
            </div>
          ))}

          {/* Thinking Indicator */}
          {isThinking && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-violet-400" />
              </div>

              <div className="rounded-lg px-4 py-2.5 bg-zinc-800 border border-zinc-700">
                <div className="flex gap-1.5 items-center">
                  <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Suggested Actions */}
      {suggestedActions.length > 0 && !isThinking && (
        <div className="px-4 pb-3 border-t border-zinc-800">
          <div className="pt-3 space-y-2">
            <p className="text-xs text-zinc-500 font-medium">Suggested Actions:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestedAction(action)}
                  className="px-3 py-1.5 text-xs rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20 hover:border-violet-500/30 transition-all duration-200"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-zinc-800">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask PAI anything..."
            disabled={isThinking}
            className="flex-1 bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-violet-500"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isThinking}
            className="bg-violet-500 hover:bg-violet-600 text-white"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
