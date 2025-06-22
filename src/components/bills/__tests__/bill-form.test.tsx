import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BillForm } from '../bill-form';
import { BillInstance } from '@/types/bill-database';

// Mock date-fns format function
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'yyyy-MM-dd') {
      return date.toISOString().split('T')[0];
    }
    return date.toISOString();
  }),
}));

describe('BillForm', () => {
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

  describe('Form Rendering', () => {
    it('renders all required form fields', () => {
      render(<BillForm {...defaultProps} />);

      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/due date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/recurring bill/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
    });

    it('renders with correct placeholders', () => {
      render(<BillForm {...defaultProps} />);

      expect(screen.getByPlaceholderText(/electric bill, rent, etc/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/0.00/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/additional details/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/additional notes/i)).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('submits form with correct data for one-time bill', async () => {
      const user = userEvent.setup();
      render(<BillForm {...defaultProps} />);

      const titleInput = screen.getByLabelText(/title/i);
      const amountInput = screen.getByLabelText(/amount/i);
      const dueDateInput = screen.getByLabelText(/due date/i);

      await user.type(titleInput, 'Electric Bill');
      await user.type(amountInput, '150.75');
      await user.type(dueDateInput, '2024-01-15');

      const submitButton = screen.getByRole('button', { name: /add bill/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Electric Bill',
            amount: 150.75,
            due_date: '2024-01-15',
            is_recurring: false,
          })
        );
      });
    });

    it('submits form with correct data for recurring bill', async () => {
      const user = userEvent.setup();
      render(<BillForm {...defaultProps} />);

      const titleInput = screen.getByLabelText(/title/i);
      const amountInput = screen.getByLabelText(/amount/i);
      const dueDateInput = screen.getByLabelText(/due date/i);
      const recurringCheckbox = screen.getByLabelText(/recurring bill/i);

      await user.type(titleInput, 'Monthly Rent');
      await user.type(amountInput, '1200');
      await user.type(dueDateInput, '2024-01-01');
      await user.click(recurringCheckbox);

      // Wait for recurrence options to appear
      await waitFor(() => {
        expect(screen.getByText(/recurrence pattern/i)).toBeInTheDocument();
      });

      // Select weekly pattern
      const weeklyButton = screen.getByRole('button', { name: /weekly/i });
      await user.click(weeklyButton);

      const submitButton = screen.getByRole('button', { name: /add bill/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Monthly Rent',
            amount: 1200,
            is_recurring: true,
            rrule: 'FREQ=WEEKLY;INTERVAL=1',
          })
        );
      });
    });
  });

  describe('Edit Mode', () => {
    const mockBillData: Partial<BillInstance> = {
      id: '123',
      title: 'Existing Bill',
      description: 'Existing description',
      amount: 250.50,
      currency: 'USD',
      due_date: '2024-01-15',
      priority: 2,
      notes: 'Existing notes',
      is_recurring: true,
    };

    it('loads initial data in edit mode', () => {
      render(
        <BillForm
          {...defaultProps}
          mode="edit"
          initialData={mockBillData}
        />
      );

      expect(screen.getByDisplayValue('Existing Bill')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Existing description')).toBeInTheDocument();
      expect(screen.getByDisplayValue('250.5')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2024-01-15')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Existing notes')).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /recurring bill/i })).toBeChecked();
    });

    it('handles null description and notes gracefully', () => {
      const dataWithNulls = {
        ...mockBillData,
        description: undefined,
        notes: undefined,
      };

      render(
        <BillForm
          {...defaultProps}
          mode="edit"
          initialData={dataWithNulls}
        />
      );

      // Should not crash and textareas should have empty string values
      expect(screen.getByLabelText(/description/i)).toHaveValue('');
      expect(screen.getByLabelText(/notes/i)).toHaveValue('');
    });
  });

  describe('Cancel Functionality', () => {
    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<BillForm {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });
}); 