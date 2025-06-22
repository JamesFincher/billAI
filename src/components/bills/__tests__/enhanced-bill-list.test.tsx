import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnhancedBillList } from '../enhanced-bill-list';
import { BillWithDetails } from '@/types/bill-database';

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    const d = new Date(date);
    if (formatStr === 'MMM d') return `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}`;
    if (formatStr === 'yyyy-MM-dd') return d.toISOString().split('T')[0];
    return d.toISOString();
  }),
  isToday: jest.fn(() => false),
  isPast: jest.fn(() => false),
  isFuture: jest.fn(() => true),
}));

const mockBills: BillWithDetails[] = [
  {
    id: '1',
    user_id: 'user1',
    template_id: null,
    title: 'Electric Bill',
    description: 'Monthly electric bill',
    amount: 150.75,
    currency: 'USD',
    due_date: '2024-01-15',
    scheduled_date: null,
    paid_date: null,
    created_date: '2024-01-01T00:00:00Z',
    status: 'pending',
    is_recurring: false,
    category_id: 'cat1',
    notes: 'Pay online',
    priority: 3,
    is_historical: false,
    can_edit: true,
    original_amount: null,
    ai_predicted_amount: null,
    ai_confidence_score: 0.0,
    ai_risk_score: 0.0,
    ai_metadata: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    category: {
      id: 'cat1',
      name: 'Utilities',
      color: '#3B82F6',
      icon: '⚡',
    },
    tags: [],
    attachments: [],
    template: null,
  },
  {
    id: '2',
    user_id: 'user1',
    template_id: 'template1',
    title: 'Rent Payment',
    description: 'Monthly rent',
    amount: 1200.00,
    currency: 'USD',
    due_date: '2024-01-01',
    scheduled_date: null,
    paid_date: '2024-01-01T10:00:00Z',
    created_date: '2024-01-01T00:00:00Z',
    status: 'paid',
    is_recurring: true,
    category_id: 'cat2',
    notes: null,
    priority: 1,
    is_historical: false,
    can_edit: true,
    original_amount: null,
    ai_predicted_amount: null,
    ai_confidence_score: 0.0,
    ai_risk_score: 0.0,
    ai_metadata: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    category: {
      id: 'cat2',
      name: 'Housing',
      color: '#10B981',
      icon: '🏠',
    },
    tags: [
      {
        id: 'tag1',
        name: 'Important',
        color: '#EF4444',
      }
    ],
    attachments: [],
    template: {
      id: 'template1',
      title: 'Monthly Rent Template',
      is_recurring: true,
    },
  },
  {
    id: '3',
    user_id: 'user1',
    template_id: null,
    title: 'Overdue Bill',
    description: 'This bill is overdue',
    amount: 75.25,
    currency: 'USD',
    due_date: '2023-12-15',
    scheduled_date: null,
    paid_date: null,
    created_date: '2023-12-01T00:00:00Z',
    status: 'overdue',
    is_recurring: false,
    category_id: null,
    notes: 'Late fee may apply',
    priority: 1,
    is_historical: false,
    can_edit: true,
    original_amount: null,
    ai_predicted_amount: null,
    ai_confidence_score: 0.0,
    ai_risk_score: 0.8,
    ai_metadata: {},
    created_at: '2023-12-01T00:00:00Z',
    updated_at: '2023-12-01T00:00:00Z',
    category: null,
    tags: [],
    attachments: [],
    template: null,
  },
];

describe('EnhancedBillList', () => {
  const mockOnBillClick = jest.fn();
  const mockOnMarkPaid = jest.fn();

  const defaultProps = {
    bills: mockBills,
    onBillClick: mockOnBillClick,
    onMarkPaid: mockOnMarkPaid,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Bill Display', () => {
    it('renders all bills', () => {
      render(<EnhancedBillList {...defaultProps} />);

      expect(screen.getByText('Electric Bill')).toBeInTheDocument();
      expect(screen.getByText('Rent Payment')).toBeInTheDocument();
      expect(screen.getByText('Overdue Bill')).toBeInTheDocument();
    });

    it('displays bill amounts correctly', () => {
      render(<EnhancedBillList {...defaultProps} />);

      expect(screen.getByText('$150.75')).toBeInTheDocument();
      expect(screen.getByText('$1,200.00')).toBeInTheDocument();
      expect(screen.getByText('$75.25')).toBeInTheDocument();
    });

    it('shows bill descriptions', () => {
      render(<EnhancedBillList {...defaultProps} />);

      expect(screen.getByText('Monthly electric bill')).toBeInTheDocument();
      expect(screen.getByText('Monthly rent')).toBeInTheDocument();
      expect(screen.getByText('This bill is overdue')).toBeInTheDocument();
    });

    it('displays due dates', () => {
      render(<EnhancedBillList {...defaultProps} />);

      expect(screen.getByText('Jan 15')).toBeInTheDocument();
      expect(screen.getByText('Jan 1')).toBeInTheDocument();
      expect(screen.getByText('Dec 15')).toBeInTheDocument();
    });

    it('shows categories when available', () => {
      render(<EnhancedBillList {...defaultProps} />);

      expect(screen.getByText('⚡ Utilities')).toBeInTheDocument();
      expect(screen.getByText('🏠 Housing')).toBeInTheDocument();
    });

    it('displays tags when available', () => {
      render(<EnhancedBillList {...defaultProps} />);

      expect(screen.getByText('Important')).toBeInTheDocument();
    });
  });

  describe('Status Indicators', () => {
    it('shows correct status for pending bills', () => {
      render(<EnhancedBillList {...defaultProps} />);

      const pendingBill = screen.getByText('Electric Bill').closest('[data-testid]');
      expect(pendingBill).toHaveClass('border-l-amber-500');
    });

    it('shows correct status for paid bills', () => {
      render(<EnhancedBillList {...defaultProps} />);

      const paidBill = screen.getByText('Rent Payment').closest('[data-testid]');
      expect(paidBill).toHaveClass('border-l-green-500');
    });

    it('shows correct status for overdue bills', () => {
      render(<EnhancedBillList {...defaultProps} />);

      const overdueBill = screen.getByText('Overdue Bill').closest('[data-testid]');
      expect(overdueBill).toHaveClass('border-l-red-500');
    });
  });

  describe('Priority Indicators', () => {
    it('shows high priority indicator', () => {
      render(<EnhancedBillList {...defaultProps} />);

      // Both Rent Payment and Overdue Bill have priority 1 (high)
      const highPriorityIndicators = screen.getAllByText('🔴');
      expect(highPriorityIndicators).toHaveLength(2);
    });

    it('shows medium priority indicator', () => {
      render(<EnhancedBillList {...defaultProps} />);

      // Electric Bill has priority 3 (medium)
      expect(screen.getByText('🟢')).toBeInTheDocument();
    });
  });

  describe('Recurring Bill Indicators', () => {
    it('shows recurring indicator for recurring bills', () => {
      render(<EnhancedBillList {...defaultProps} />);

      // Rent Payment is recurring
      const recurringIndicator = screen.getByTitle('Recurring bill');
      expect(recurringIndicator).toBeInTheDocument();
    });

    it('does not show recurring indicator for one-time bills', () => {
      const oneTimeBills = mockBills.filter(bill => !bill.is_recurring);
      render(<EnhancedBillList {...defaultProps} bills={oneTimeBills} />);

      expect(screen.queryByTitle('Recurring bill')).not.toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls onBillClick when bill is clicked', async () => {
      const user = userEvent.setup();
      render(<EnhancedBillList {...defaultProps} />);

      const billElement = screen.getByText('Electric Bill').closest('div');
      await user.click(billElement!);

      expect(mockOnBillClick).toHaveBeenCalledWith(mockBills[0]);
    });

    it('calls onMarkPaid when mark as paid button is clicked', async () => {
      const user = userEvent.setup();
      render(<EnhancedBillList {...defaultProps} />);

      const markPaidButtons = screen.getAllByTitle('Mark as paid');
      await user.click(markPaidButtons[0]);

      expect(mockOnMarkPaid).toHaveBeenCalledWith('1');
    });

    it('does not show mark as paid button for already paid bills', () => {
      render(<EnhancedBillList {...defaultProps} />);

      const paidBillContainer = screen.getByText('Rent Payment').closest('[data-testid]');
      const markPaidButton = paidBillContainer?.querySelector('[title="Mark as paid"]');
      expect(markPaidButton).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty message when no bills', () => {
      render(<EnhancedBillList {...defaultProps} bills={[]} />);

      expect(screen.getByText(/no bills found/i)).toBeInTheDocument();
    });

    it('shows appropriate empty message with illustration', () => {
      render(<EnhancedBillList {...defaultProps} bills={[]} />);

      expect(screen.getByText(/add your first bill/i)).toBeInTheDocument();
    });
  });

  describe('Filtering and Sorting', () => {
    it('can filter by status', () => {
      const pendingBills = mockBills.filter(bill => bill.status === 'pending');
      render(<EnhancedBillList {...defaultProps} bills={pendingBills} />);

      expect(screen.getByText('Electric Bill')).toBeInTheDocument();
      expect(screen.queryByText('Rent Payment')).not.toBeInTheDocument();
    });

    it('can filter by category', () => {
      const utilityBills = mockBills.filter(bill => bill.category?.name === 'Utilities');
      render(<EnhancedBillList {...defaultProps} bills={utilityBills} />);

      expect(screen.getByText('Electric Bill')).toBeInTheDocument();
      expect(screen.queryByText('Rent Payment')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<EnhancedBillList {...defaultProps} />);

      const billItems = screen.getAllByRole('listitem');
      expect(billItems).toHaveLength(3);

      billItems.forEach(item => {
        expect(item).toHaveAttribute('tabIndex', '0');
      });
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<EnhancedBillList {...defaultProps} />);

      const firstBill = screen.getAllByRole('listitem')[0];
      firstBill.focus();

      await user.keyboard('{Enter}');
      expect(mockOnBillClick).toHaveBeenCalledWith(mockBills[0]);
    });
  });

  describe('Visual States', () => {
    it('applies hover effects', async () => {
      const user = userEvent.setup();
      render(<EnhancedBillList {...defaultProps} />);

      const billElement = screen.getByText('Electric Bill').closest('div');
      await user.hover(billElement!);

      expect(billElement).toHaveClass('hover:shadow-md');
    });

    it('shows loading state when bills are being updated', () => {
      render(<EnhancedBillList {...defaultProps} loading={true} />);

      // Should show skeleton loaders or loading indicators
      expect(screen.getByTestId('bills-loading')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles missing category gracefully', () => {
      const billsWithoutCategory = mockBills.map(bill => ({
        ...bill,
        category: null,
        category_id: null,
      }));

      render(<EnhancedBillList {...defaultProps} bills={billsWithoutCategory} />);

      expect(screen.getByText('Electric Bill')).toBeInTheDocument();
      // Should not crash when category is null
    });

    it('handles missing template gracefully', () => {
      const billsWithoutTemplate = mockBills.map(bill => ({
        ...bill,
        template: null,
        template_id: null,
      }));

      render(<EnhancedBillList {...defaultProps} bills={billsWithoutTemplate} />);

      expect(screen.getByText('Electric Bill')).toBeInTheDocument();
      // Should not crash when template is null
    });
  });
}); 