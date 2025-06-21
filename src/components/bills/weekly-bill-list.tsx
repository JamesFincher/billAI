'use client';

import { useState } from 'react';
import { format, startOfWeek, endOfWeek, eachWeekOfInterval, startOfMonth, endOfMonth, isWithinInterval, isSameWeek } from 'date-fns';
import { 
  ChevronDownIcon, 
  ChevronRightIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import type { BillWithDetails } from '@/types/bill-database';

interface WeeklyBillListProps {
  bills: BillWithDetails[];
  selectedMonth: Date;
  onBillClick: (bill: BillWithDetails) => void;
  onMarkPaid: (billId: string) => void;
}

interface WeekData {
  weekStart: Date;
  weekEnd: Date;
  bills: BillWithDetails[];
  totalAmount: number;
  paidAmount: number;
  pendingCount: number;
  overdueCount: number;
}

export function WeeklyBillList({ bills, selectedMonth, onBillClick, onMarkPaid }: WeeklyBillListProps) {
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());

  // Group bills by week
  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);
  const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd });

  const weekData: WeekData[] = weeks.map(weekStart => {
    const weekEnd = endOfWeek(weekStart);
    const weekBills = bills.filter(bill => 
      isWithinInterval(new Date(bill.due_date), { start: weekStart, end: weekEnd })
    );

    const totalAmount = weekBills.reduce((sum, bill) => sum + (bill.amount || 0), 0);
    const paidAmount = weekBills.filter(bill => bill.status === 'paid')
      .reduce((sum, bill) => sum + (bill.amount || 0), 0);
    const pendingCount = weekBills.filter(bill => bill.status === 'pending').length;
    const overdueCount = weekBills.filter(bill => 
      bill.status === 'pending' && new Date(bill.due_date) < new Date()
    ).length;

    return {
      weekStart,
      weekEnd,
      bills: weekBills,
      totalAmount,
      paidAmount,
      pendingCount,
      overdueCount
    };
  });

  const toggleWeek = (weekKey: string) => {
    setExpandedWeeks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(weekKey)) {
        newSet.delete(weekKey);
      } else {
        newSet.add(weekKey);
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

  const isCurrentWeek = (weekStart: Date) => {
    return isSameWeek(new Date(), weekStart);
  };

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
    <div className="space-y-4">
      {weekData.map((week) => {
        const weekKey = format(week.weekStart, 'yyyy-MM-dd');
        const isExpanded = expandedWeeks.has(weekKey);
        const hasCurrentWeek = isCurrentWeek(week.weekStart);

        if (week.bills.length === 0) return null;

        return (
          <div key={weekKey} className={`bg-white border border-gray-200 rounded-2xl shadow-soft hover:shadow-medium transition-all duration-300 ${hasCurrentWeek ? 'ring-2 ring-primary-500 ring-opacity-50 shadow-lg' : ''}`}>
            {/* Week Header */}
            <button
              onClick={() => toggleWeek(weekKey)}
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
                    <h3 className="text-lg font-semibold text-gray-900">
                      {format(week.weekStart, 'MMM d')} - {format(week.weekEnd, 'MMM d')}
                      {hasCurrentWeek && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          This Week
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {week.bills.length} bills • {formatCurrency(week.totalAmount)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Status indicators */}
                <div className="flex items-center gap-3">
                  {week.overdueCount > 0 && (
                    <div className="flex items-center gap-1 text-red-600">
                      <ExclamationTriangleIcon className="h-4 w-4" />
                      <span className="text-sm font-medium">{week.overdueCount}</span>
                    </div>
                  )}
                  {week.pendingCount > 0 && (
                    <div className="flex items-center gap-1 text-amber-600">
                      <ClockIcon className="h-4 w-4" />
                      <span className="text-sm font-medium">{week.pendingCount}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-emerald-600">
                    <CheckCircleIcon className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {week.bills.filter(b => b.status === 'paid').length}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-300"
                    style={{
                      width: `${week.totalAmount > 0 ? (week.paidAmount / week.totalAmount) * 100 : 0}%`
                    }}
                  />
                </div>
              </div>
            </button>

            {/* Week Bills */}
            {isExpanded && (
              <div className="border-t border-gray-200 p-6 space-y-4">
                {week.bills.map((bill, index) => (
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