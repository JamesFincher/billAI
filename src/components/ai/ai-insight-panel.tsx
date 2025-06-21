'use client';

import { useState } from 'react';
import { 
  LightBulbIcon, 
  ExclamationTriangleIcon, 
  ChartBarIcon,
  SparklesIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';

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

interface AIInsightPanelProps {
  insights: AIInsight[];
  className?: string;
}

export function AIInsightPanel({ insights, className = '' }: AIInsightPanelProps) {
  const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(new Set());

  const visibleInsights = insights.filter((_, index) => !dismissedInsights.has(index.toString()));

  const handleDismiss = (index: number) => {
    setDismissedInsights(prev => new Set([...prev, index.toString()]));
  };

  const getInsightIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'prediction':
        return <SparklesIcon className="h-5 w-5 text-blue-600" />;
      case 'anomaly':
        return <ExclamationTriangleIcon className="h-5 w-5 text-orange-600" />;
      case 'recommendation':
        return <LightBulbIcon className="h-5 w-5 text-green-600" />;
      case 'pattern':
        return <ChartBarIcon className="h-5 w-5 text-purple-600" />;
      default:
        return <SparklesIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  const getInsightColor = (type: AIInsight['type']) => {
    switch (type) {
      case 'prediction':
        return 'border-blue-200 bg-blue-50';
      case 'anomaly':
        return 'border-orange-200 bg-orange-50';
      case 'recommendation':
        return 'border-green-200 bg-green-50';
      case 'pattern':
        return 'border-purple-200 bg-purple-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  if (visibleInsights.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
            <SparklesIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">AI Insights</h3>
            <p className="text-sm text-gray-600">Personalized recommendations based on your spending patterns</p>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          {visibleInsights.length} insight{visibleInsights.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {visibleInsights.map((insight, index) => (
          <div
            key={index}
            className={`relative p-6 rounded-2xl border-2 transition-all duration-200 hover:shadow-lg ${getInsightColor(insight.type)}`}
          >
            <button
              onClick={() => handleDismiss(index)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/50 transition-colors"
            >
              <XMarkIcon className="h-4 w-4 text-gray-400" />
            </button>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                {getInsightIcon(insight.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold text-gray-900 text-sm">{insight.title}</h4>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getConfidenceColor(insight.confidence)}`}>
                    {Math.round(insight.confidence * 100)}%
                  </span>
                </div>
                
                <p className="text-sm text-gray-700 mb-4">{insight.message}</p>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 capitalize font-medium">
                    {insight.type}
                  </span>
                  
                  {insight.actionable && insight.action && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={insight.action.onClick}
                      className="text-xs"
                    >
                      {insight.action.label}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {visibleInsights.length > 4 && (
        <div className="text-center">
          <Button variant="ghost" size="sm">
            View All Insights ({insights.length})
          </Button>
        </div>
      )}
    </div>
  );
}