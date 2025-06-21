'use client';

import { ChevronLeftIcon, ChevronRightIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { format, addMonths, subMonths } from 'date-fns';

interface MonthSelectorProps {
  selectedMonth: Date;
  onMonthChange: (month: Date) => void;
}

export function MonthSelector({ selectedMonth, onMonthChange }: MonthSelectorProps) {
  const handlePreviousMonth = () => {
    onMonthChange(subMonths(selectedMonth, 1));
  };

  const handleNextMonth = () => {
    onMonthChange(addMonths(selectedMonth, 1));
  };

  const handleCurrentMonth = () => {
    onMonthChange(new Date());
  };

  const isCurrentMonth = () => {
    const now = new Date();
    return selectedMonth.getMonth() === now.getMonth() && 
           selectedMonth.getFullYear() === now.getFullYear();
  };

  return (
    <div className="flex items-center justify-between bg-white border border-gray-200 rounded-2xl p-6 shadow-soft hover:shadow-medium hover:-translate-y-1 transition-all duration-300">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <CalendarDaysIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {format(selectedMonth, 'MMMM yyyy')}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {isCurrentMonth() ? 'Current month' : 'Viewing historical data'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {!isCurrentMonth() && (
          <button
            onClick={handleCurrentMonth}
            className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200 shadow-sm"
          >
            Current Month
          </button>
        )}
        
        <div className="flex items-center border border-gray-200 rounded-lg shadow-sm bg-white">
          <button
            onClick={handlePreviousMonth}
            className="p-3 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50/30 transition-all duration-200 rounded-l-lg border-r border-gray-200"
            aria-label="Previous month"
          >
            <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
          </button>
          
          <button
            onClick={handleNextMonth}
            className="p-3 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50/30 transition-all duration-200 rounded-r-lg"
            aria-label="Next month"
          >
            <ChevronRightIcon className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
} 