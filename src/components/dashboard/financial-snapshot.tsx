'use client';

import { useMemo } from 'react';
import { 
  CurrencyDollarIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  TrendingUpIcon,
  TrendingDownIcon
} from '@heroicons/react/24/outline';
import type { BillWithDetails } from '@/types/bill-database';

interface EnhancedDashboardStats {
  totalBills: number;
  paidBills: number;
  pendingBills: number;
  overdueBills: number;
  totalAmount: number;
  paidAmount: number;
  averageAmount: number;
  onTimePaymentRate: number;
  aiPredictionAccuracy: number;
  upcomingDueSoon: number;
}

interface FinancialSnapshotProps {
  stats: EnhancedDashboardStats;
  bills: BillWithDetails[];
  className?: string;
}

export function FinancialSnapshot({ stats, bills, className = '' }: FinancialSnapshotProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${Math.round(value * 100)}%`;
  };

  // Calculate trends and insights
  const insights = useMemo(() => {
    const remainingAmount = stats.totalAmount - stats.paidAmount;
    const completionRate = stats.totalBills > 0 ? stats.paidBills / stats.totalBills : 0;
    const paymentRate = stats.onTimePaymentRate;
    
    return {
      remainingAmount,
      completionRate, 
      paymentRate,
      isOnTrack: completionRate >= 0.7 && paymentRate >= 0.8,
      urgentCount: stats.overdueBills + stats.upcomingDueSoon
    };
  }, [stats]);

  const snapshotCards = [
    {
      title: 'Total This Month',
      value: formatCurrency(stats.totalAmount),
      subtitle: `${stats.totalBills} bills`,
      icon: CurrencyDollarIcon,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      progress: {
        value: insights.completionRate,
        color: 'bg-blue-500',
        label: `${stats.paidBills}/${stats.totalBills} paid`
      }
    },
    {
      title: 'Amount Paid',
      value: formatCurrency(stats.paidAmount),
      subtitle: `${formatPercentage(insights.completionRate)} complete`,
      icon: CheckCircleIcon,
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50',
      progress: {
        value: stats.totalAmount > 0 ? stats.paidAmount / stats.totalAmount : 0,
        color: 'bg-emerald-500',
        label: formatCurrency(insights.remainingAmount) + ' remaining'
      }
    },
    {
      title: 'On-Time Rate',
      value: formatPercentage(stats.onTimePaymentRate),
      subtitle: insights.paymentRate >= 0.9 ? 'Excellent!' : insights.paymentRate >= 0.7 ? 'Good' : 'Needs improvement',
      icon: insights.paymentRate >= 0.8 ? TrendingUpIcon : TrendingDownIcon,
      color: insights.paymentRate >= 0.8 ? 'from-green-500 to-green-600' : 'from-amber-500 to-amber-600',
      bgColor: insights.paymentRate >= 0.8 ? 'bg-green-50' : 'bg-amber-50',
      progress: {
        value: stats.onTimePaymentRate,
        color: insights.paymentRate >= 0.8 ? 'bg-green-500' : 'bg-amber-500',
        label: `${stats.paidBills} bills paid`
      }
    },
    {
      title: 'Needs Attention',
      value: insights.urgentCount.toString(),
      subtitle: stats.overdueBills > 0 ? `${stats.overdueBills} overdue` : `${stats.upcomingDueSoon} due soon`,
      icon: ExclamationTriangleIcon,
      color: insights.urgentCount > 0 ? 'from-red-500 to-red-600' : 'from-gray-400 to-gray-500',
      bgColor: insights.urgentCount > 0 ? 'bg-red-50' : 'bg-gray-50',
      progress: {
        value: stats.totalBills > 0 ? insights.urgentCount / stats.totalBills : 0,
        color: insights.urgentCount > 0 ? 'bg-red-500' : 'bg-gray-400',
        label: insights.urgentCount === 0 ? 'All caught up!' : 'Requires action'
      }
    }
  ];

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Financial Snapshot</h2>
          <p className="text-gray-600">Your monthly overview at a glance</p>
        </div>
        <div className="flex items-center gap-2">
          {insights.isOnTrack ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              <CheckCircleIcon className="h-4 w-4" />
              On Track
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
              <ClockIcon className="h-4 w-4" />
              Needs Attention
            </div>
          )}
        </div>
      </div>

      {/* Snapshot Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {snapshotCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className="group relative bg-white border border-gray-200 rounded-2xl p-6 shadow-soft hover:shadow-medium hover:-translate-y-1 transition-all duration-300 animate-slide-up overflow-hidden"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              {/* Background gradient overlay */}
              <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
              
              {/* Content */}
              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      {card.title}
                    </p>
                    <p className="text-3xl font-bold text-gray-900 leading-none mb-1">
                      {card.value}
                    </p>
                    <p className="text-sm text-gray-600">{card.subtitle}</p>
                  </div>
                  <div className={`w-14 h-14 bg-gradient-to-br ${card.color} rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg`}>
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Progress</span>
                    <span className="font-medium text-gray-700">{card.progress.label}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`${card.progress.color} h-2 rounded-full transition-all duration-1000 ease-out`}  
                      style={{ width: `${Math.min(Math.max(card.progress.value * 100, 0), 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Hover effect indicator */}
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
          );
        })}
      </div>

      {/* AI Prediction Accuracy */}
      {stats.aiPredictionAccuracy > 0 && (
        <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
                <TrendingUpIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">AI Prediction Accuracy</h4>
                <p className="text-sm text-gray-600">How well our AI predicts your bill amounts</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-600">
                {formatPercentage(stats.aiPredictionAccuracy)}
              </div>
              <div className="text-sm text-gray-500">accuracy rate</div>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="w-full bg-purple-100 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-purple-500 to-blue-600 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${stats.aiPredictionAccuracy * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}