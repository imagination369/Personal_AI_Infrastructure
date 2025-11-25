'use client';

import { useState } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { Terminal, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandCenterOpen, setCommandCenterOpen] = useState(false);

  const sidebarWidth = sidebarCollapsed ? 64 : 240;
  const commandCenterWidth = commandCenterOpen ? 384 : 0;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950">
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <Header />

        {/* Content + Command Center */}
        <div className="flex flex-1 overflow-hidden">
          {/* Main Content */}
          <main className="flex-1 overflow-y-auto bg-slate-950">
            <div className="p-6 h-full">
              {children}
            </div>
          </main>

          {/* PAI Command Center Panel */}
          <aside
            className={cn(
              'bg-slate-900 border-l border-slate-800 transition-all duration-300 ease-in-out overflow-hidden',
              commandCenterOpen ? 'w-96' : 'w-0'
            )}
          >
            {commandCenterOpen && (
              <div className="h-full flex flex-col">
                {/* Command Center Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-blue-500" />
                    <h2 className="text-sm font-semibold text-slate-100">PAI Command Center</h2>
                  </div>
                  <button
                    onClick={() => setCommandCenterOpen(false)}
                    className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
                    aria-label="Close command center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Command Center Content */}
                <div className="flex-1 overflow-y-auto p-4">
                  {/* Agent Status */}
                  <div className="mb-4">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                      Active Agents
                    </h3>
                    <div className="space-y-2">
                      <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-slate-100">Architect</span>
                          <span className="text-xs text-green-400">● Active</span>
                        </div>
                        <p className="text-xs text-slate-400">Designing system architecture</p>
                      </div>
                      <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-slate-100">Engineer</span>
                          <span className="text-xs text-yellow-400">● Idle</span>
                        </div>
                        <p className="text-xs text-slate-400">Waiting for tasks</p>
                      </div>
                      <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-slate-100">Reviewer</span>
                          <span className="text-xs text-yellow-400">● Idle</span>
                        </div>
                        <p className="text-xs text-slate-400">Ready for code review</p>
                      </div>
                    </div>
                  </div>

                  {/* Recent Tasks */}
                  <div className="mb-4">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                      Recent Tasks
                    </h3>
                    <div className="space-y-2">
                      <div className="p-3 bg-slate-800/30 rounded-lg">
                        <p className="text-xs text-slate-300">Created dashboard layout</p>
                        <p className="text-xs text-slate-500 mt-1">2 minutes ago</p>
                      </div>
                      <div className="p-3 bg-slate-800/30 rounded-lg">
                        <p className="text-xs text-slate-300">Implemented authentication</p>
                        <p className="text-xs text-slate-500 mt-1">15 minutes ago</p>
                      </div>
                      <div className="p-3 bg-slate-800/30 rounded-lg">
                        <p className="text-xs text-slate-300">Database schema design</p>
                        <p className="text-xs text-slate-500 mt-1">1 hour ago</p>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                      Quick Actions
                    </h3>
                    <div className="space-y-2">
                      <button className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                        New Agent Task
                      </button>
                      <button className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-medium rounded-lg transition-colors border border-slate-700">
                        View All Agents
                      </button>
                      <button className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-medium rounded-lg transition-colors border border-slate-700">
                        System Logs
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* Floating Command Center Toggle */}
      {!commandCenterOpen && (
        <button
          onClick={() => setCommandCenterOpen(true)}
          className={cn(
            'fixed bottom-6 right-6 p-4 bg-blue-600 hover:bg-blue-700',
            'text-white rounded-full shadow-lg transition-all duration-200',
            'hover:shadow-blue-500/50 hover:scale-110',
            'z-50'
          )}
          aria-label="Open PAI Command Center"
        >
          <Terminal className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
