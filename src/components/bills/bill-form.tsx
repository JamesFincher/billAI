'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { BillInstance, BillTemplate } from '@/types/bill-database';
import { format } from 'date-fns';

interface BillFormProps {
  mode: 'create' | 'edit';
  type: 'bill' | 'income' | 'template';
  initialData?: Partial<BillInstance | BillTemplate>;
  onSubmit: (data: Record<string, any>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function BillForm({ mode, type, initialData, onSubmit, onCancel, isLoading }: BillFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    currency: 'USD',
    due_date: format(new Date(), 'yyyy-MM-dd'),
    category_id: '',
    priority: 3,
    is_recurring: false,
    rrule: '',
    dtstart: '',
    notes: ''
  });

  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState('monthly');

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
        amount: initialData.amount?.toString() || '',
        due_date: (initialData as any).due_date ? format(new Date((initialData as any).due_date), 'yyyy-MM-dd') : prev.due_date
      }));
      setIsRecurring(initialData.is_recurring || false);
    }
  }, [initialData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type: inputType } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: inputType === 'number' ? parseFloat(value) || '' : value
    }));
  };

  const handleRecurrenceChange = (pattern: string) => {
    setRecurrencePattern(pattern);
    
    // Generate RRULE based on pattern
    let rrule = '';
    switch (pattern) {
      case 'daily':
        rrule = 'FREQ=DAILY;INTERVAL=1';
        break;
      case 'weekly':
        rrule = 'FREQ=WEEKLY;INTERVAL=1';
        break;
      case 'monthly':
        rrule = 'FREQ=MONTHLY;INTERVAL=1';
        break;
      case 'quarterly':
        rrule = 'FREQ=MONTHLY;INTERVAL=3';
        break;
      case 'yearly':
        rrule = 'FREQ=YEARLY;INTERVAL=1';
        break;
    }
    
    setFormData(prev => ({
      ...prev,
      rrule,
      dtstart: prev.due_date ? new Date(prev.due_date).toISOString() : new Date().toISOString()
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      amount: parseFloat(formData.amount),
      is_recurring: isRecurring,
      rrule: isRecurring ? formData.rrule : null,
      dtstart: isRecurring ? formData.dtstart : null
    };

    await onSubmit(submitData);
  };

  const getPriorityDisplay = (priority: number) => {
    const priorities = {
      1: { emoji: '🔴', label: 'High' },
      2: { emoji: '🟡', label: 'Medium-High' },
      3: { emoji: '🟢', label: 'Medium' },
      4: { emoji: '🔵', label: 'Low-Medium' },
      5: { emoji: '⚪', label: 'Low' }
    };
    return priorities[priority as keyof typeof priorities] || priorities[3];
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="form-group">
          <label htmlFor="title" className="form-label">
            Title *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            required
            placeholder={type === 'income' ? 'Salary, Freelance, etc.' : 'Electric Bill, Rent, etc.'}
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="amount" className="form-label">
            Amount *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-3 text-gray-500">$</span>
            <input
              type="number"
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              required
              step="0.01"
              min="0"
              placeholder="0.00"
              className="form-input pl-8"
            />
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="form-group">
        <label htmlFor="description" className="form-label">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          rows={3}
          placeholder="Additional details..."
          className="form-input form-textarea"
        />
      </div>

      {/* Due Date and Priority */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="form-group">
          <label htmlFor="due_date" className="form-label">
            {type === 'income' ? 'Date' : 'Due Date'} *
          </label>
          <input
            type="date"
            id="due_date"
            name="due_date"
            value={formData.due_date}
            onChange={handleInputChange}
            required
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="priority" className="form-label">
            Priority
          </label>
          <div className="relative">
            <select
              id="priority"
              name="priority"
              value={formData.priority}
              onChange={handleInputChange}
              className="form-input form-select"
            >
              <option value={1}>🔴 High</option>
              <option value={2}>🟡 Medium-High</option>
              <option value={3}>🟢 Medium</option>
              <option value={4}>🔵 Low-Medium</option>
              <option value={5}>⚪ Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Recurring Options */}
      <div className="form-group">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="is_recurring"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="is_recurring" className="form-label !mb-0">
            Recurring {type === 'income' ? 'Income' : 'Bill'}
          </label>
        </div>

        {isRecurring && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <label className="form-label">Recurrence Pattern</label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {['daily', 'weekly', 'monthly', 'quarterly', 'yearly'].map((pattern) => (
                <button
                  key={pattern}
                  type="button"
                  onClick={() => handleRecurrenceChange(pattern)}
                  className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                    recurrencePattern === pattern
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {pattern.charAt(0).toUpperCase() + pattern.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="form-group">
        <label htmlFor="notes" className="form-label">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleInputChange}
          rows={2}
          placeholder="Additional notes or reminders..."
          className="form-input form-textarea"
        />
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant={type === 'income' ? 'success' : 'primary'}
          loading={isLoading}
          disabled={isLoading}
        >
          {mode === 'create' ? 'Add' : 'Update'} {type === 'income' ? 'Income' : 'Bill'}
        </Button>
      </div>
    </form>
  );
} 