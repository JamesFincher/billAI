'use client';

import { useState } from 'react';
import { 
  PlusIcon, 
  CurrencyDollarIcon,
  ChartBarIcon,
  BellIcon,
  BoltIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import type { BillWithDetails } from '@/types/bill-database';

interface AIInsight {
  type: 'prediction' | 'anomaly' | 'recommendation' | 'pattern';
  title: string;
  message: string;
  confidence: number;
  actionable: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface SmartQuickActionsProps {
  bills: BillWithDetails[];
  insights: AIInsight[];
  expanded: boolean;
  onAddBill: () => void;
  onBulkPay: (billIds: string[]) => void;
  className?: string;
}

export function SmartQuickActions({ 
  bills, 
  insights, 
  expanded, 
  onAddBill, 
  onBulkPay, 
  className = '' 
}: SmartQuickActionsProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  // Calculate smart actions based on current state
  const overdueBills = bills.filter(b => b.status === 'pending' && new Date(b.due_date) < new Date());
  const dueSoonBills = bills.filter(b => {
    const dueDate = new Date(b.due_date);
    const today = new Date();
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 3 && diffDays >= 0 && b.status === 'pending';
  });
  const highPriorityBills = bills.filter(b => b.priority <= 2 && b.status === 'pending');

  const smartActions = [
    {
      id: 'add-bill',
      label: 'Add Bill',
      icon: PlusIcon,
      color: 'bg-blue-500 hover:bg-blue-600',
      onClick: onAddBill,
      priority: 1
    },
    ...(overdueBills.length > 0 ? [{
      id: 'pay-overdue',
      label: `Pay ${overdueBills.length} Overdue`,
      icon: BellIcon,
      color: 'bg-red-500 hover:bg-red-600',
      onClick: () => onBulkPay(overdueBills.map(b => b.id)),
      priority: 0,
      urgent: true
    }] : []),
    ...(dueSoonBills.length > 0 ? [{
      id: 'pay-due-soon',
      label: `Pay ${dueSoonBills.length} Due Soon`,
      icon: ClockIcon,
      color: 'bg-amber-500 hover:bg-amber-600',
      onClick: () => onBulkPay(dueSoonBills.map(b => b.id)),
      priority: 1
    }] : []),
    ...(highPriorityBills.length > 0 ? [{
      id: 'pay-high-priority',
      label: `${highPriorityBills.length} High Priority`,
      icon: BoltIcon,
      color: 'bg-purple-500 hover:bg-purple-600',
      onClick: () => onBulkPay(highPriorityBills.map(b => b.id)),
      priority: 2
    }] : []),
    {
      id: 'analytics',
      label: 'View Analytics',
      icon: ChartBarIcon,
      color: 'bg-green-500 hover:bg-green-600',
      onClick: () => console.log('Open analytics'),
      priority: 3
    }
  ].sort((a, b) => a.priority - b.priority);

  const visibleActions = expanded ? smartActions : smartActions.slice(0, 3);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (!expanded && smartActions.length <= 3) {
    return null;
  }

  return (
    <div className={`${className}`}>
      {expanded && (
        <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-soft animate-slide-down">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Smart Actions</h3>
              <p className="text-sm text-gray-600">Context-aware recommendations</p>
            </div>
            <div className="flex items-center gap-2">
              {insights.filter(i => i.actionable).length > 0 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {insights.filter(i => i.actionable).length} actionable
                </span>
              )}
            </div>
          </div>

          {/* Priority Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {visibleActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={action.onClick}
                  className={`relative p-4 rounded-xl text-white font-medium text-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${action.color} animate-slide-up`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {action.urgent && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-400 rounded-full animate-ping"></div>
                  )}
                  <div className="flex items-center justify-center mb-2">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="text-center">{action.label}</div>
                </button>
              );
            })}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(overdueBills.reduce((sum, b) => sum + b.amount, 0))}
              </div>
              <div className="text-xs text-gray-500">Overdue Amount</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{dueSoonBills.length}</div>
              <div className="text-xs text-gray-500">Due This Week</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{highPriorityBills.length}</div>
              <div className="text-xs text-gray-500">High Priority</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {Math.round((bills.filter(b => b.status === 'paid').length / bills.length) * 100)}%
              </div>
              <div className="text-xs text-gray-500">Completion Rate</div>
            </div>
          </div>

          {/* AI Insights Preview */}
          {insights.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-900">Recent Insights</h4>
                <span className="text-xs text-gray-500">{insights.length} total</span>
              </div>
              <div className="space-y-2">
                {insights.slice(0, 2).map((insight, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className={`w-2 h-2 rounded-full ${
                      insight.type === 'recommendation' ? 'bg-green-500' :
                      insight.type === 'anomaly' ? 'bg-orange-500' :
                      insight.type === 'prediction' ? 'bg-blue-500' : 'bg-purple-500'
                    }`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">{insight.title}</p>
                      <p className="text-xs text-gray-600 truncate">{insight.message}</p>
                    </div>
                    <div className="text-xs text-gray-500">
                      {Math.round(insight.confidence * 100)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}