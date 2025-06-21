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
  TrendingUpIcon,
  TrendingDownIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';

interface IncomeWithDetails {
  id: string;
  title: string;
  expected_amount: number;
  actual_amount?: number;
  currency: string;
  expected_date: string;
  received_date?: string;
  status: 'expected' | 'received' | 'late' | 'cancelled' | 'partial' | 'scheduled';
  source_type: string;
  is_recurring: boolean;
  category?: {
    id: string;
    name: string;
    color: string;
    icon?: string;
  };
  priority: number;
  variance_percentage?: number;
  amount_variance?: number;
  is_historical: boolean;
  payer_name?: string;
  description?: string;
}

interface WeeklyIncomeListProps {
  income: IncomeWithDetails[];
  selectedMonth: Date;
  onIncomeClick: (income: IncomeWithDetails) => void;
  onMarkReceived: (incomeId: string) => void;
}

interface WeekData {
  weekStart: Date;
  weekEnd: Date;
  income: IncomeWithDetails[];
  totalExpected: number;
  totalReceived: number;
  pendingCount: number;
  lateCount: number;
  totalVariance: number;
  reliabilityScore: number;
}

export function WeeklyIncomeList({ income, selectedMonth, onIncomeClick, onMarkReceived }: WeeklyIncomeListProps) {
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());

  // Group income by week
  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);
  const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd });

  const weekData: WeekData[] = weeks.map(weekStart => {
    const weekEnd = endOfWeek(weekStart);
    const weekIncome = income.filter(incomeItem => 
      isWithinInterval(new Date(incomeItem.expected_date), { start: weekStart, end: weekEnd })
    );

    const totalExpected = weekIncome.reduce((sum, item) => sum + (item.expected_amount || 0), 0);
    const totalReceived = weekIncome
      .filter(item => item.status === 'received')
      .reduce((sum, item) => sum + (item.actual_amount || item.expected_amount || 0), 0);
    
    const pendingCount = weekIncome.filter(item => item.status === 'expected').length;
    const lateCount = weekIncome.filter(item => 
      item.status === 'expected' && new Date(item.expected_date) < new Date()
    ).length;

    const totalVariance = weekIncome.reduce((sum, item) => sum + (item.amount_variance || 0), 0);
    const receivedCount = weekIncome.filter(item => item.status === 'received').length;
    const reliabilityScore = weekIncome.length > 0 ? (receivedCount / weekIncome.length) * 100 : 0;

    return {
      weekStart,
      weekEnd,
      income: weekIncome,
      totalExpected,
      totalReceived,
      pendingCount,
      lateCount,
      totalVariance,
      reliabilityScore
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

  const getIncomeStatusColor = (incomeItem: IncomeWithDetails) => {
    if (incomeItem.status === 'received') return 'border-emerald-500 bg-emerald-50';
    if (incomeItem.status === 'expected' && new Date(incomeItem.expected_date) < new Date()) {
      return 'border-red-500 bg-red-50';
    }
    return 'border-blue-500 bg-blue-50';
  };

  const getIncomeStatusIcon = (incomeItem: IncomeWithDetails) => {
    if (incomeItem.status === 'received') {
      return <CheckCircleIcon className="h-5 w-5 text-emerald-600" />;
    }
    if (incomeItem.status === 'expected' && new Date(incomeItem.expected_date) < new Date()) {
      return <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />;
    }
    return <ClockIcon className="h-5 w-5 text-blue-600" />;
  };

  const getVarianceIcon = (variancePercentage?: number) => {
    if (!variancePercentage || Math.abs(variancePercentage) < 2) return null;
    
    if (variancePercentage > 0) {
      return <TrendingUpIcon className="h-4 w-4 text-green-600" />;
    } else {
      return <TrendingDownIcon className="h-4 w-4 text-red-600" />;
    }
  };

  const getSourceTypeEmoji = (sourceType: string) => {
    const emojis: Record<string, string> = {
      salary: '💼',
      freelance: '🔧',
      business: '🏢',
      investment: '📈',
      rental: '🏠',
      pension: '🏛️',
      benefits: '🤝',
      other: '💰'
    };
    return emojis[sourceType] || '💰';
  };

  const getPriorityBorder = (priority: number) => {
    const colors = {
      1: 'border-l-red-500',
      2: 'border-l-orange-500',
      3: 'border-l-green-500',
      4: 'border-l-blue-500',
      5: 'border-l-gray-400'
    };
    return colors[priority as keyof typeof colors] || colors[3];
  };

  const isCurrentWeek = (weekStart: Date) => {
    return isSameWeek(new Date(), weekStart);
  };

  if (income.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
          <CurrencyDollarIcon className="h-10 w-10 text-white" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-3">No income this month</h3>
        <p className="text-gray-500 text-base max-w-md mx-auto">
          Start by adding your first income source to track your earnings and analyze your income patterns.
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

        if (week.income.length === 0) return null;

        return (
          <div key={weekKey} className={`bg-white border border-gray-200 rounded-2xl shadow-soft hover:shadow-medium transition-all duration-300 ${hasCurrentWeek ? 'ring-2 ring-green-500 ring-opacity-50 shadow-lg' : ''}`}>
            {/* Week Header */}
            <button
              onClick={() => toggleWeek(weekKey)}
              className="w-full flex items-center justify-between p-6 hover:bg-gradient-to-r hover:from-gray-50 hover:to-green-50/30 transition-all duration-200 rounded-lg"
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
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          This Week
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {week.income.length} income sources • Expected: {formatCurrency(week.totalExpected)}
                      {week.totalVariance !== 0 && (
                        <span className={`ml-2 ${week.totalVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ({week.totalVariance >= 0 ? '+' : ''}{formatCurrency(week.totalVariance)} variance)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Status indicators */}
                <div className="flex items-center gap-3">
                  {week.lateCount > 0 && (
                    <div className="flex items-center gap-1 text-red-600">
                      <ExclamationTriangleIcon className="h-4 w-4" />
                      <span className="text-sm font-medium">{week.lateCount}</span>
                    </div>
                  )}
                  {week.pendingCount > 0 && (
                    <div className="flex items-center gap-1 text-blue-600">
                      <ClockIcon className="h-4 w-4" />
                      <span className="text-sm font-medium">{week.pendingCount}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-emerald-600">
                    <CheckCircleIcon className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {week.income.filter(i => i.status === 'received').length}
                    </span>
                  </div>
                </div>

                {/* Reliability score */}
                <div className="text-right">
                  <div className="text-xs text-gray-500">Reliability</div>
                  <div className={`text-sm font-medium ${
                    week.reliabilityScore >= 90 ? 'text-green-600' : 
                    week.reliabilityScore >= 70 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {week.reliabilityScore.toFixed(0)}%
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all duration-300"
                    style={{
                      width: `${week.totalExpected > 0 ? (week.totalReceived / week.totalExpected) * 100 : 0}%`
                    }}
                  />
                </div>
              </div>
            </button>

            {/* Week Income */}
            {isExpanded && (
              <div className="border-t border-gray-200 p-6 space-y-4">
                {week.income.map((incomeItem, index) => (
                  <div
                    key={incomeItem.id}
                    className={`p-4 rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-md hover:-translate-y-0.5 ${getIncomeStatusColor(incomeItem)} ${getPriorityBorder(incomeItem.priority)} border-l-4 animate-slide-up`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => onIncomeClick(incomeItem)}
                      >
                        <div className="flex items-center gap-3">
                          {getIncomeStatusIcon(incomeItem)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{getSourceTypeEmoji(incomeItem.source_type)}</span>
                              <h4 className="font-medium text-gray-900">{incomeItem.title}</h4>
                              {incomeItem.is_recurring && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                  Recurring
                                </span>
                              )}
                              {getVarianceIcon(incomeItem.variance_percentage)}
                            </div>
                            <div className="flex items-center gap-4 mt-1">
                              <p className="text-sm text-gray-600">
                                Expected: {format(new Date(incomeItem.expected_date), 'MMM d')}
                              </p>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-gray-900">
                                  {formatCurrency(incomeItem.expected_amount)}
                                </p>
                                {incomeItem.actual_amount && incomeItem.actual_amount !== incomeItem.expected_amount && (
                                  <p className={`text-sm font-medium ${
                                    incomeItem.actual_amount > incomeItem.expected_amount ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    → {formatCurrency(incomeItem.actual_amount)}
                                  </p>
                                )}
                              </div>
                              {incomeItem.category && (
                                <span 
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                                  style={{ 
                                    backgroundColor: incomeItem.category.color + '20',
                                    color: incomeItem.category.color 
                                  }}
                                >
                                  {incomeItem.category.icon} {incomeItem.category.name}
                                </span>
                              )}
                              {incomeItem.payer_name && (
                                <span className="text-xs text-gray-500">
                                  from {incomeItem.payer_name}
                                </span>
                              )}
                            </div>
                            {incomeItem.description && (
                              <p className="text-sm text-gray-500 mt-1">{incomeItem.description}</p>
                            )}
                            {incomeItem.variance_percentage && Math.abs(incomeItem.variance_percentage) >= 2 && (
                              <p className={`text-xs mt-1 ${
                                incomeItem.variance_percentage > 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {incomeItem.variance_percentage > 0 ? '+' : ''}{incomeItem.variance_percentage.toFixed(1)}% variance
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action button */}
                      {incomeItem.status === 'expected' && !incomeItem.is_historical && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkReceived(incomeItem.id);
                          }}
                          variant="success"
                          size="sm"
                          className="ml-4 shadow-sm"
                        >
                          Mark Received
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