'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    label: 'Contacts',
    href: '/contacts',
    icon: Users,
  },
  {
    label: 'Conversations',
    href: '/conversations',
    icon: MessageSquare,
  },
  {
    label: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'relative flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 ease-in-out h-full',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-center h-16 border-b border-slate-800">
        {collapsed ? (
          <Sparkles className="w-6 h-6 text-blue-500" />
        ) : (
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-blue-500" />
            <span className="text-lg font-semibold text-slate-100">PAI Dashboard</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                    'hover:bg-slate-800/60',
                    isActive
                      ? 'bg-blue-600 text-white hover:bg-blue-600'
                      : 'text-slate-400 hover:text-slate-100'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className={cn('w-5 h-5 flex-shrink-0', isActive && 'text-white')} />
                  {!collapsed && (
                    <span className="text-sm font-medium truncate">{item.label}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Toggle Button */}
      <div className="p-2 border-t border-slate-800">
        <button
          onClick={onToggle}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all duration-200',
            'hover:bg-slate-800/60 text-slate-400 hover:text-slate-100'
          )}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5 flex-shrink-0" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
