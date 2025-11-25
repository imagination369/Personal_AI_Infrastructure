import { DashboardLayout } from '@/components/layout/dashboard-layout';
import {
  Users,
  MessageSquare,
  TrendingUp,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Dashboard</h1>
          <p className="text-slate-400">
            Welcome to your PAI Business Dashboard. Monitor your AI-powered operations.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Contacts */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
              <div className="flex items-center gap-1 text-green-400 text-sm">
                <ArrowUpRight className="w-4 h-4" />
                <span>12%</span>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-100 mb-1">2,543</h3>
            <p className="text-sm text-slate-400">Total Contacts</p>
          </div>

          {/* Active Conversations */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <MessageSquare className="w-6 h-6 text-purple-500" />
              </div>
              <div className="flex items-center gap-1 text-green-400 text-sm">
                <ArrowUpRight className="w-4 h-4" />
                <span>8%</span>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-100 mb-1">847</h3>
            <p className="text-sm text-slate-400">Active Conversations</p>
          </div>

          {/* Conversion Rate */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
              <div className="flex items-center gap-1 text-red-400 text-sm">
                <ArrowDownRight className="w-4 h-4" />
                <span>3%</span>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-100 mb-1">23.5%</h3>
            <p className="text-sm text-slate-400">Conversion Rate</p>
          </div>

          {/* AI Agent Activity */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Activity className="w-6 h-6 text-orange-500" />
              </div>
              <div className="flex items-center gap-1 text-green-400 text-sm">
                <ArrowUpRight className="w-4 h-4" />
                <span>15%</span>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-100 mb-1">1,234</h3>
            <p className="text-sm text-slate-400">AI Agent Tasks</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-slate-100 mb-4">Recent Activity</h2>
            <div className="space-y-4">
              {[
                {
                  action: 'New contact added',
                  description: 'John Doe was added to the CRM',
                  time: '5 minutes ago',
                  type: 'contact',
                },
                {
                  action: 'AI agent completed task',
                  description: 'Email campaign sent to 150 contacts',
                  time: '12 minutes ago',
                  type: 'agent',
                },
                {
                  action: 'Conversation started',
                  description: 'New conversation with Sarah Johnson',
                  time: '23 minutes ago',
                  type: 'conversation',
                },
                {
                  action: 'Report generated',
                  description: 'Monthly analytics report is ready',
                  time: '1 hour ago',
                  type: 'report',
                },
              ].map((activity, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-4 bg-slate-800/30 rounded-lg hover:bg-slate-800/50 transition-colors cursor-pointer"
                >
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-100">{activity.action}</p>
                    <p className="text-xs text-slate-400 mt-1">{activity.description}</p>
                    <p className="text-xs text-slate-500 mt-2">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-slate-100 mb-4">Quick Stats</h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">Response Rate</span>
                  <span className="text-sm font-medium text-slate-100">87%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '87%' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">Active Agents</span>
                  <span className="text-sm font-medium text-slate-100">5/8</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: '62.5%' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">Task Completion</span>
                  <span className="text-sm font-medium text-slate-100">92%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '92%' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">System Health</span>
                  <span className="text-sm font-medium text-slate-100">98%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div className="bg-orange-500 h-2 rounded-full" style={{ width: '98%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
