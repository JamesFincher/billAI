import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BillForm } from '../bill-form';

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'yyyy-MM-dd') {
      return '2024-01-15';
    }
    return date.toISOString();
  }),
}));

describe('BillForm - Simple Tests', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  const defaultProps = {
    mode: 'create' as const,
    type: 'bill' as const,
    onSubmit: mockOnSubmit,
    onCancel: mockOnCancel,
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders form fields correctly', () => {
    render(<BillForm {...defaultProps} />);
    
    // Check that key form fields are present
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/due date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/recurring/i)).toBeInTheDocument();
  });

  test('shows recurrence options when recurring is checked', () => {
    render(<BillForm {...defaultProps} />);
    
    const recurringCheckbox = screen.getByLabelText(/recurring/i);
    fireEvent.click(recurringCheckbox);
    
    // Should show recurrence pattern options
    expect(screen.getByText(/recurrence pattern/i)).toBeInTheDocument();
    expect(screen.getByText(/daily/i)).toBeInTheDocument();
    expect(screen.getByText(/weekly/i)).toBeInTheDocument();
    expect(screen.getByText(/monthly/i)).toBeInTheDocument();
  });

  test('calls onCancel when cancel button is clicked', () => {
    render(<BillForm {...defaultProps} />);
    
    const cancelButton = screen.getByText(/cancel/i);
    fireEvent.click(cancelButton);
    
    expect(mockOnCancel).toHaveBeenCalled();
  });

  test('renders in edit mode with initial data', () => {
    const initialData = {
      id: '1',
      title: 'Test Bill',
      amount: 100,
      due_date: '2024-01-15',
      description: 'Test description',
      notes: 'Test notes',
      is_recurring: false,
      status: 'pending' as const,
      user_id: 'user1',
      currency: 'USD',
      created_date: '2024-01-01T00:00:00Z',
      is_historical: false,
      priority: 3 as 1 | 2 | 3 | 4 | 5,
      ai_confidence_score: 0,
      ai_risk_score: 0,
      ai_metadata: {},
    };

    render(
      <BillForm
        {...defaultProps}
        mode="edit"
        initialData={initialData}
      />
    );
    
    // Check that form is pre-filled
    expect(screen.getByDisplayValue('Test Bill')).toBeInTheDocument();
    expect(screen.getByDisplayValue('100')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test notes')).toBeInTheDocument();
  });

  test('shows loading state', () => {
    render(<BillForm {...defaultProps} isLoading={true} />);
    
    // Submit button should show loading state
    const submitButton = screen.getByRole('button', { name: /add bill/i });
    expect(submitButton).toBeDisabled();
  });
}); 