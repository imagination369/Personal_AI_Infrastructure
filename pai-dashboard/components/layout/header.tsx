'use client';

import { useState } from 'react';
import { Search, Bell, User, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Header() {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationCount = 3; // This would come from your state/API

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6">
      {/* Global Search */}
      <div className="flex-1 max-w-2xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search anything..."
            className={cn(
              'w-full pl-10 pr-20 py-2 bg-slate-800/50 border border-slate-700',
              'rounded-lg text-sm text-slate-100 placeholder:text-slate-500',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              'transition-all duration-200'
            )}
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-semibold text-slate-400 bg-slate-800 border border-slate-700 rounded">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Section - Notifications & User */}
      <div className="flex items-center gap-4 ml-6">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            className={cn(
              'relative p-2 rounded-lg transition-colors duration-200',
              'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
            )}
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {notificationCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full" />
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
              <div className="p-4 border-b border-slate-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-100">Notifications</h3>
                  <span className="text-xs text-slate-400">{notificationCount} new</span>
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <div className="p-4 hover:bg-slate-700/50 cursor-pointer transition-colors">
                  <p className="text-sm text-slate-100">New contact added</p>
                  <p className="text-xs text-slate-400 mt-1">2 minutes ago</p>
                </div>
                <div className="p-4 hover:bg-slate-700/50 cursor-pointer transition-colors">
                  <p className="text-sm text-slate-100">AI agent completed task</p>
                  <p className="text-xs text-slate-400 mt-1">15 minutes ago</p>
                </div>
                <div className="p-4 hover:bg-slate-700/50 cursor-pointer transition-colors">
                  <p className="text-sm text-slate-100">System update available</p>
                  <p className="text-xs text-slate-400 mt-1">1 hour ago</p>
                </div>
              </div>
              <div className="p-3 border-t border-slate-700">
                <button className="text-xs text-blue-400 hover:text-blue-300 w-full text-center">
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className={cn(
              'flex items-center gap-3 p-2 rounded-lg transition-colors duration-200',
              'hover:bg-slate-800'
            )}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-slate-100">Admin User</p>
              <p className="text-xs text-slate-400">admin@pai.com</p>
            </div>
          </button>

          {/* User Dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
              <div className="p-3 border-b border-slate-700">
                <p className="text-sm font-medium text-slate-100">Admin User</p>
                <p className="text-xs text-slate-400">admin@pai.com</p>
              </div>
              <div className="py-2">
                <button className="flex items-center gap-3 w-full px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/50 transition-colors">
                  <SettingsIcon className="w-4 h-4" />
                  Settings
                </button>
                <button className="flex items-center gap-3 w-full px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/50 transition-colors">
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {(showUserMenu || showNotifications) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowUserMenu(false);
            setShowNotifications(false);
          }}
        />
      )}
    </header>
  );
}
