'use client';

import { useState } from 'react';
import { format, startOfWeek, endOfWeek, eachWeekOfInterval, startOfMonth, endOfMonth, isWithinInterval, isSameWeek } from 'date-fns';
import { 
  ChevronDownIcon, 
  ChevronRightIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import type { BillWithDetails } from '@/types/bill-database';

interface EnhancedBillListProps {
  bills: BillWithDetails[];
  selectedMonth: Date;
  onBillClick: (bill: BillWithDetails) => void;
  onMarkPaid: (billId: string) => void;
  showAIInsights?: boolean;
  groupBy?: 'time' | 'category' | 'priority' | 'smart';
}

export function EnhancedBillList({ 
  bills, 
  selectedMonth, 
  onBillClick, 
  onMarkPaid,
  showAIInsights = true,
  groupBy = 'smart'
}: EnhancedBillListProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getBillStatusColor = (bill: BillWithDetails) => {
    if (bill.status === 'paid') return 'border-emerald-500 bg-emerald-50';
    if (bill.status === 'pending' && new Date(bill.due_date) < new Date()) {
      return 'border-red-500 bg-red-50';
    }
    return 'border-amber-500 bg-amber-50';
  };

  const getBillStatusIcon = (bill: BillWithDetails) => {
    if (bill.status === 'paid') {
      return <CheckCircleIcon className="h-5 w-5 text-emerald-600" />;
    }
    if (bill.status === 'pending' && new Date(bill.due_date) < new Date()) {
      return <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />;
    }
    return <ClockIcon className="h-5 w-5 text-amber-600" />;
  };

  const getPriorityBorder = (priority: number) => {
    const colors = {
      1: 'border-l-red-500',
      2: 'border-l-orange-500',
      3: 'border-l-blue-500',
      4: 'border-l-indigo-500',
      5: 'border-l-gray-400'
    };
    return colors[priority as keyof typeof colors] || colors[3];
  };

  // Smart grouping logic
  const groupBills = () => {
    if (groupBy === 'smart') {
      // AI-powered smart grouping
      const groups = new Map();
      
      // Priority grouping: Overdue -> Due Soon -> Normal -> Paid
      const overdue = bills.filter(b => b.status === 'pending' && new Date(b.due_date) < new Date());
      const dueSoon = bills.filter(b => {
        const dueDate = new Date(b.due_date);
        const today = new Date();
        const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= 3 && diffDays >= 0 && b.status === 'pending';
      });
      const normal = bills.filter(b => {
        const dueDate = new Date(b.due_date);
        const today = new Date();
        const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays > 3 && b.status === 'pending';
      });
      const paid = bills.filter(b => b.status === 'paid');

      if (overdue.length > 0) groups.set('⚠️ Needs Immediate Attention', overdue);
      if (dueSoon.length > 0) groups.set('📅 Due Soon (Next 3 Days)', dueSoon);
      if (normal.length > 0) groups.set('📋 Upcoming Bills', normal);
      if (paid.length > 0) groups.set('✅ Completed This Month', paid);

      return groups;
    }
    
    // Default time-based grouping (weekly)
    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);
    const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd });
    const groups = new Map();

    weeks.forEach(weekStart => {
      const weekEnd = endOfWeek(weekStart);
      const weekBills = bills.filter(bill => 
        isWithinInterval(new Date(bill.due_date), { start: weekStart, end: weekEnd })
      );

      if (weekBills.length > 0) {
        const weekKey = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`;
        groups.set(weekKey, weekBills);
      }
    });

    return groups;
  };

  const billGroups = groupBills();

  if (bills.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
          <CurrencyDollarIcon className="h-10 w-10 text-white" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-3">No bills this month</h3>
        <p className="text-gray-500 text-base max-w-md mx-auto">
          Start by adding your first bill to track your monthly expenses and stay on top of your finances.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Array.from(billGroups.entries()).map(([groupName, groupBills]) => {
        const isExpanded = expandedGroups.has(groupName);
        const totalAmount = groupBills.reduce((sum, bill) => sum + bill.amount, 0);
        const paidAmount = groupBills.filter(b => b.status === 'paid').reduce((sum, bill) => sum + bill.amount, 0);
        const isUrgent = groupName.includes('Immediate Attention') || groupName.includes('Due Soon');

        return (
          <div
            key={groupName}
            className={`bg-white border border-gray-200 rounded-2xl shadow-soft hover:shadow-medium transition-all duration-300 ${isUrgent ? 'ring-2 ring-red-200 ring-opacity-50' : ''}`}
          >
            {/* Group Header */}
            <button
              onClick={() => toggleGroup(groupName)}
              className="w-full flex items-center justify-between p-6 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50/30 transition-all duration-200 rounded-lg"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                  )}
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      {groupName}
                      {isUrgent && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Urgent
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {groupBills.length} bills • {formatCurrency(totalAmount)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* AI Insights Badge */}
                {showAIInsights && groupBills.some(b => (b as any).ai_insights?.length > 0) && (
                  <div className="flex items-center gap-1 text-purple-600">
                    <SparklesIcon className="h-4 w-4" />
                    <span className="text-sm font-medium">AI Insights</span>
                  </div>
                )}

                {/* Progress bar */}
                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-300"
                    style={{
                      width: `${totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0}%`
                    }}
                  />
                </div>
              </div>
            </button>

            {/* Group Bills */}
            {isExpanded && (
              <div className="border-t border-gray-200 p-6 space-y-4">
                {groupBills.map((bill, index) => (
                  <div
                    key={bill.id}
                    className={`p-4 rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-md hover:-translate-y-0.5 ${getBillStatusColor(bill)} ${getPriorityBorder(bill.priority)} border-l-4 animate-slide-up`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => onBillClick(bill)}
                      >
                        <div className="flex items-center gap-3">
                          {getBillStatusIcon(bill)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900">{bill.title}</h4>
                              {bill.is_recurring && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  Recurring
                                </span>
                              )}
                              {showAIInsights && (bill as any).ai_insights?.length > 0 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                  🤖 AI
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-1">
                              <p className="text-sm text-gray-600">
                                Due: {format(new Date(bill.due_date), 'MMM d')}
                              </p>
                              <p className="text-sm font-semibold text-gray-900">
                                {formatCurrency(bill.amount)}
                              </p>
                              {bill.category && (
                                <span 
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                                  style={{ 
                                    backgroundColor: bill.category.color + '20',
                                    color: bill.category.color 
                                  }}
                                >
                                  {bill.category.name}
                                </span>
                              )}
                            </div>
                            {bill.description && (
                              <p className="text-sm text-gray-500 mt-1">{bill.description}</p>
                            )}
                            
                            {/* AI Insights */}
                            {showAIInsights && (bill as any).ai_insights?.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {(bill as any).ai_insights.slice(0, 2).map((insight: string, i: number) => (
                                  <span key={i} className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
                                    🤖 {insight}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {bill.status === 'pending' && (
                        <Button
                          variant="success"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkPaid(bill.id);
                          }}
                          className="ml-4"
                        >
                          Mark Paid
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}