'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { IncomeInstance, IncomeTemplate, IncomeCategory } from '@/types/income-database';
import { format } from 'date-fns';

interface IncomeFormProps {
  mode: 'create' | 'edit';
  type: 'income' | 'template';
  initialData?: Partial<IncomeInstance | IncomeTemplate>;
  categories?: IncomeCategory[];
  onSubmit: (data: Record<string, any>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function IncomeForm({ mode, type, initialData, categories = [], onSubmit, onCancel, isLoading }: IncomeFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    expected_amount: '',
    actual_amount: '',
    currency: 'USD',
    expected_date: format(new Date(), 'yyyy-MM-dd'),
    received_date: '',
    category_id: '',
    source_type: 'salary',
    tax_category: 'post_tax',
    is_gross_amount: true,
    payer_name: '',
    payer_reference: '',
    payment_method: 'direct_deposit',
    priority: 3,
    is_recurring: false,
    rrule: '',
    dtstart: '',
    allow_amount_variance: true,
    expected_variance_percentage: 5.0,
    notes: '',
    variance_reason: ''
  });

  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState('monthly');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showVarianceFields, setShowVarianceFields] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
        expected_amount: (initialData as any).expected_amount?.toString() || '',
        actual_amount: (initialData as any).actual_amount?.toString() || '',
        expected_date: (initialData as any).expected_date ? format(new Date((initialData as any).expected_date), 'yyyy-MM-dd') : prev.expected_date,
        received_date: (initialData as any).received_date ? format(new Date((initialData as any).received_date), 'yyyy-MM-dd') : '',
        expected_variance_percentage: (initialData as any).expected_variance_percentage?.toString() || '5.0'
      }));
      setIsRecurring(initialData.is_recurring || false);
      
      // Show variance fields if editing and there's variance data
      if (mode === 'edit' && ((initialData as any).amount_variance || (initialData as any).variance_reason)) {
        setShowVarianceFields(true);
      }
    }
  }, [initialData, mode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type: inputType } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: inputType === 'checkbox' ? checked : 
               inputType === 'number' ? parseFloat(value) || '' : 
               value
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
      case 'bi-weekly':
        rrule = 'FREQ=WEEKLY;INTERVAL=2';
        break;
      case 'monthly':
        rrule = 'FREQ=MONTHLY;INTERVAL=1';
        break;
      case 'quarterly':
        rrule = 'FREQ=MONTHLY;INTERVAL=3';
        break;
      case 'semi-annually':
        rrule = 'FREQ=MONTHLY;INTERVAL=6';
        break;
      case 'yearly':
        rrule = 'FREQ=YEARLY;INTERVAL=1';
        break;
    }
    
    setFormData(prev => ({
      ...prev,
      rrule,
      dtstart: prev.expected_date ? new Date(prev.expected_date).toISOString() : new Date().toISOString()
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      expected_amount: parseFloat(formData.expected_amount),
      actual_amount: formData.actual_amount ? parseFloat(formData.actual_amount) : undefined,
      expected_variance_percentage: parseFloat(formData.expected_variance_percentage),
      is_recurring: isRecurring,
      rrule: isRecurring ? formData.rrule : null,
      dtstart: isRecurring ? formData.dtstart : null,
      // Remove empty variance reason if not provided
      variance_reason: formData.variance_reason || undefined
    };

    await onSubmit(submitData);
  };

  const getSourceTypeDisplay = (sourceType: string) => {
    const types = {
      salary: { emoji: '💼', label: 'Salary' },
      freelance: { emoji: '🔧', label: 'Freelance' },
      business: { emoji: '🏢', label: 'Business' },
      investment: { emoji: '📈', label: 'Investment' },
      rental: { emoji: '🏠', label: 'Rental' },
      pension: { emoji: '🏛️', label: 'Pension' },
      benefits: { emoji: '🤝', label: 'Benefits' },
      other: { emoji: '💰', label: 'Other' }
    };
    return types[sourceType as keyof typeof types] || types.other;
  };

  const getTaxCategoryDisplay = (taxCategory: string) => {
    const categories = {
      pre_tax: { emoji: '🔺', label: 'Pre-Tax', description: 'Before taxes' },
      post_tax: { emoji: '🔻', label: 'Post-Tax', description: 'After taxes' },
      tax_free: { emoji: '🆓', label: 'Tax-Free', description: 'Not taxable' }
    };
    return categories[taxCategory as keyof typeof categories] || categories.post_tax;
  };

  const hasVariance = mode === 'edit' && initialData && (initialData as any).actual_amount && (initialData as any).expected_amount;
  const varianceAmount = hasVariance ? ((initialData as any).actual_amount - (initialData as any).expected_amount) : 0;
  const variancePercentage = hasVariance ? (((initialData as any).variance_percentage || 0)) : 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-group">
            <label htmlFor="title" className="form-label">
              Income Source *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              placeholder="Salary from ABC Corp, Freelance Project, etc."
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="source_type" className="form-label">
              Source Type *
            </label>
            <select
              id="source_type"
              name="source_type"
              value={formData.source_type}
              onChange={handleInputChange}
              className="form-input form-select"
            >
              {Object.entries(getSourceTypeDisplay('')).slice(0, 8).map(([key]) => {
                const display = getSourceTypeDisplay(key);
                return (
                  <option key={key} value={key}>
                    {display.emoji} {display.label}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

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
            placeholder="Additional details about this income source..."
            className="form-input form-textarea"
          />
        </div>
      </div>

      {/* Amount and Tax Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Amount & Tax Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-group">
            <label htmlFor="expected_amount" className="form-label">
              Expected Amount *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-500">$</span>
              <input
                type="number"
                id="expected_amount"
                name="expected_amount"
                value={formData.expected_amount}
                onChange={handleInputChange}
                required
                step="0.01"
                min="0"
                placeholder="0.00"
                className="form-input pl-8"
              />
            </div>
          </div>

          {(mode === 'edit' || type === 'income') && (
            <div className="form-group">
              <label htmlFor="actual_amount" className="form-label">
                Actual Amount {mode === 'edit' ? '*' : ''}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500">$</span>
                <input
                  type="number"
                  id="actual_amount"
                  name="actual_amount"
                  value={formData.actual_amount}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="form-input pl-8"
                />
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-group">
            <label htmlFor="tax_category" className="form-label">
              Tax Category *
            </label>
            <select
              id="tax_category"
              name="tax_category"
              value={formData.tax_category}
              onChange={handleInputChange}
              className="form-input form-select"
            >
              {Object.entries(getTaxCategoryDisplay('')).slice(0, 3).map(([key]) => {
                const display = getTaxCategoryDisplay(key);
                return (
                  <option key={key} value={key}>
                    {display.emoji} {display.label} - {display.description}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Amount Type</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="is_gross_amount"
                  value="true"
                  checked={formData.is_gross_amount}
                  onChange={() => setFormData(prev => ({ ...prev, is_gross_amount: true }))}
                  className="mr-2"
                />
                Gross (Before deductions)
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="is_gross_amount"
                  value="false"
                  checked={!formData.is_gross_amount}
                  onChange={() => setFormData(prev => ({ ...prev, is_gross_amount: false }))}
                  className="mr-2"
                />
                Net (After deductions)
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Variance Information (for edits with actual amounts) */}
      {hasVariance && (
        <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold text-gray-900">Variance Analysis</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-sm text-gray-600">Expected</div>
              <div className="text-xl font-semibold">${(initialData as any).expected_amount?.toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">Actual</div>
              <div className="text-xl font-semibold">${(initialData as any).actual_amount?.toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">Variance</div>
              <div className={`text-xl font-semibold ${varianceAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {varianceAmount >= 0 ? '+' : ''}${Math.abs(varianceAmount).toFixed(2)} ({variancePercentage.toFixed(1)}%)
              </div>
            </div>
          </div>

          {showVarianceFields && (
            <div className="form-group">
              <label htmlFor="variance_reason" className="form-label">
                Variance Reason
              </label>
              <textarea
                id="variance_reason"
                name="variance_reason"
                value={formData.variance_reason}
                onChange={handleInputChange}
                rows={2}
                placeholder="Explain why the actual amount differs from expected..."
                className="form-input form-textarea"
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowVarianceFields(!showVarianceFields)}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {showVarianceFields ? 'Hide' : 'Add'} variance explanation
          </button>
        </div>
      )}

      {/* Date and Payer Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Schedule & Source Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-group">
            <label htmlFor="expected_date" className="form-label">
              Expected Date *
            </label>
            <input
              type="date"
              id="expected_date"
              name="expected_date"
              value={formData.expected_date}
              onChange={handleInputChange}
              required
              className="form-input"
            />
          </div>

          {mode === 'edit' && (
            <div className="form-group">
              <label htmlFor="received_date" className="form-label">
                Received Date
              </label>
              <input
                type="date"
                id="received_date"
                name="received_date"
                value={formData.received_date}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-group">
            <label htmlFor="payer_name" className="form-label">
              Payer/Company Name
            </label>
            <input
              type="text"
              id="payer_name"
              name="payer_name"
              value={formData.payer_name}
              onChange={handleInputChange}
              placeholder="Company or individual paying you"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="payment_method" className="form-label">
              Payment Method
            </label>
            <select
              id="payment_method"
              name="payment_method"
              value={formData.payment_method}
              onChange={handleInputChange}
              className="form-input form-select"
            >
              <option value="direct_deposit">💳 Direct Deposit</option>
              <option value="check">📝 Check</option>
              <option value="cash">💵 Cash</option>
              <option value="wire_transfer">🏦 Wire Transfer</option>
              <option value="other">❓ Other</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="payer_reference" className="form-label">
            Reference/Account Number
          </label>
          <input
            type="text"
            id="payer_reference"
            name="payer_reference"
            value={formData.payer_reference}
            onChange={handleInputChange}
            placeholder="Employee ID, account number, contract reference, etc."
            className="form-input"
          />
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
            className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
          />
          <label htmlFor="is_recurring" className="form-label !mb-0">
            Recurring Income
          </label>
        </div>

        {isRecurring && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <label className="form-label">Recurrence Pattern</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              {['weekly', 'bi-weekly', 'monthly', 'quarterly', 'semi-annually', 'yearly'].map((pattern) => (
                <button
                  key={pattern}
                  type="button"
                  onClick={() => handleRecurrenceChange(pattern)}
                  className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                    recurrencePattern === pattern
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {pattern.charAt(0).toUpperCase() + pattern.slice(1).replace('-', ' ')}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">
                  <input
                    type="checkbox"
                    name="allow_amount_variance"
                    checked={formData.allow_amount_variance}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  Allow Amount Variance
                </label>
              </div>

              {formData.allow_amount_variance && (
                <div className="form-group">
                  <label htmlFor="expected_variance_percentage" className="form-label">
                    Expected Variance (%)
                  </label>
                  <input
                    type="number"
                    id="expected_variance_percentage"
                    name="expected_variance_percentage"
                    value={formData.expected_variance_percentage}
                    onChange={handleInputChange}
                    step="0.1"
                    min="0"
                    max="100"
                    className="form-input"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Advanced Options */}
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-700"
        >
          <span>{showAdvanced ? '▼' : '▶'}</span>
          Advanced Options
        </button>

        {showAdvanced && (
          <div className="space-y-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label htmlFor="category_id" className="form-label">
                  Category
                </label>
                <select
                  id="category_id"
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleInputChange}
                  className="form-input form-select"
                >
                  <option value="">Select a category</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="priority" className="form-label">
                  Priority
                </label>
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
          </div>
        )}
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
          variant="success"
          loading={isLoading}
          disabled={isLoading}
        >
          {mode === 'create' ? 'Add' : 'Update'} Income
        </Button>
      </div>
    </form>
  );
}