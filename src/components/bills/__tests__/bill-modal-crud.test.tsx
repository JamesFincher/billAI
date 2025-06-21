import React, { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from '@/components/ui/modal';
import { BillForm } from '../bill-form';
import { BillInstance } from '@/types/bill-database';

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'yyyy-MM-dd') {
      return '2024-01-15';
    }
    return '2024-01-15T00:00:00Z';
  })
}));

// Mock Heroicons
jest.mock('@heroicons/react/24/outline', () => ({
  XMarkIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="x-mark-icon">
      <title>Close</title>
    </svg>
  )
}));

// Simple test component that mimics the dashboard behavior
const CRUDTestComponent = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [modalType, setModalType] = useState<'bill' | 'income'>('bill');
  const [editingBill, setEditingBill] = useState<Partial<BillInstance> | null>(null);
  const [bills, setBills] = useState<BillInstance[]>([]);

  const openCreateModal = (type: 'bill' | 'income') => {
    setModalMode('create');
    setModalType(type);
    setEditingBill(null);
    setIsModalOpen(true);
  };

  const openEditModal = (bill: BillInstance) => {
    setModalMode('edit');
    setModalType('bill');
    setEditingBill(bill);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBill(null);
  };

  const handleFormSubmit = async (data: Record<string, any>) => {
    if (modalMode === 'create') {
      const newBill: BillInstance = {
        id: `bill-${Date.now()}`,
        user_id: 'test-user',
        template_id: undefined,
        title: data.title,
        description: data.description || '',
        amount: data.amount,
        currency: data.currency || 'USD',
        due_date: data.due_date,
        created_date: new Date().toISOString(),
        status: 'pending',
        is_recurring: data.is_recurring || false,
        priority: data.priority || 3,
        is_historical: false,
        can_edit: true,
        ai_confidence_score: 0,
        ai_risk_score: 0,
        ai_metadata: {},
        notes: data.notes || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setBills(prev => [...prev, newBill]);
    } else {
      setBills(prev => prev.map(bill => 
        bill.id === editingBill?.id 
          ? { ...bill, ...data, updated_at: new Date().toISOString() }
          : bill
      ));
    }
    closeModal();
  };

  const deleteBill = (billId: string) => {
    setBills(prev => prev.filter(bill => bill.id !== billId));
  };

  return (
    <div>
      <div className="actions">
        <button onClick={() => openCreateModal('bill')} data-testid="create-bill">
          Create Bill
        </button>
        <button onClick={() => openCreateModal('income')} data-testid="create-income">
          Create Income
        </button>
      </div>

      <div data-testid="bills-list">
        {bills.length === 0 ? (
          <p data-testid="empty-state">No bills</p>
        ) : (
          bills.map(bill => (
            <div key={bill.id} data-testid={`bill-${bill.id}`}>
              <h3>{bill.title}</h3>
              <p>Amount: ${bill.amount}</p>
              <p>Status: {bill.status}</p>
              {bill.description && <p>Description: {bill.description}</p>}
              <button 
                onClick={() => openEditModal(bill)}
                data-testid={`edit-${bill.id}`}
              >
                Edit
              </button>
              <button 
                onClick={() => deleteBill(bill.id)}
                data-testid={`delete-${bill.id}`}
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={`${modalMode === 'create' ? 'Create' : 'Edit'} ${modalType === 'bill' ? 'Bill' : 'Income'}`}
      >
        <BillForm
          mode={modalMode}
          type={modalType}
          initialData={editingBill || undefined}
          onSubmit={handleFormSubmit}
          onCancel={closeModal}
        />
      </Modal>
    </div>
  );
};

describe('Modal CRUD Operations', () => {
  beforeEach(() => {
    document.body.style.overflow = 'unset';
  });

  afterEach(() => {
    document.body.style.overflow = 'unset';
  });

  describe('Create (C in CRUD)', () => {
    test('should create a new bill through modal', async () => {
      const user = userEvent.setup();
      render(<CRUDTestComponent />);

      // Initial state - no bills
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();

      // Open create modal
      await user.click(screen.getByTestId('create-bill'));

      // Modal should be open - check by modal content instead of dialog role
      expect(document.querySelector('.modal-overlay')).toBeInTheDocument();
      expect(document.querySelector('.modal-title')).toHaveTextContent('Create Bill');

      // Fill required fields
      await user.type(screen.getByLabelText(/title/i), 'Test Bill');
      await user.type(screen.getByLabelText(/amount/i), '100.50');

      // Submit form
      await user.click(screen.getByRole('button', { name: /add bill/i }));

      // Wait for modal to close
      await waitFor(() => {
        expect(document.querySelector('.modal-overlay')).not.toBeInTheDocument();
      });

      // Verify bill was created
      expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
      expect(screen.getByText('Test Bill')).toBeInTheDocument();
      expect(screen.getByText('Amount: $100.5')).toBeInTheDocument();
    });

    test('should create income through modal', async () => {
      const user = userEvent.setup();
      render(<CRUDTestComponent />);

      // Open create income modal
      await user.click(screen.getByTestId('create-income'));

      expect(document.querySelector('.modal-title')).toHaveTextContent('Create Income');

      // Fill form
      await user.type(screen.getByLabelText(/title/i), 'Salary');
      await user.type(screen.getByLabelText(/amount/i), '5000');

      // Submit
      await user.click(screen.getByRole('button', { name: /add income/i }));

      await waitFor(() => {
        expect(document.querySelector('.modal-overlay')).not.toBeInTheDocument();
      });

      expect(screen.getByText('Salary')).toBeInTheDocument();
      expect(screen.getByText('Amount: $5000')).toBeInTheDocument();
    });
  });

  describe('Update (U in CRUD)', () => {
    test('should update existing bill through modal', async () => {
      const user = userEvent.setup();
      render(<CRUDTestComponent />);

      // First create a bill
      await user.click(screen.getByTestId('create-bill'));
      await user.type(screen.getByLabelText(/title/i), 'Original Bill');
      await user.type(screen.getByLabelText(/amount/i), '200');
      await user.click(screen.getByRole('button', { name: /add bill/i }));

      await waitFor(() => {
        expect(document.querySelector('.modal-overlay')).not.toBeInTheDocument();
      });

      // Now edit the bill
      const editButton = screen.getByTestId(/edit-bill-/);
      await user.click(editButton);

      // Modal should open in edit mode
      expect(document.querySelector('.modal-title')).toHaveTextContent('Edit Bill');
      expect(screen.getByDisplayValue('Original Bill')).toBeInTheDocument();
      expect(screen.getByDisplayValue('200')).toBeInTheDocument();

      // Update the bill
      const titleInput = screen.getByLabelText(/title/i);
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Bill');

      const amountInput = screen.getByLabelText(/amount/i);
      await user.clear(amountInput);
      await user.type(amountInput, '300');

      // Submit update
      await user.click(screen.getByRole('button', { name: /update bill/i }));

      await waitFor(() => {
        expect(document.querySelector('.modal-overlay')).not.toBeInTheDocument();
      });

      // Verify updates
      expect(screen.getByText('Updated Bill')).toBeInTheDocument();
      expect(screen.getByText('Amount: $300')).toBeInTheDocument();
      expect(screen.queryByText('Original Bill')).not.toBeInTheDocument();
    });
  });

  describe('Delete (D in CRUD)', () => {
    test('should delete bill', async () => {
      const user = userEvent.setup();
      render(<CRUDTestComponent />);

      // Create a bill
      await user.click(screen.getByTestId('create-bill'));
      await user.type(screen.getByLabelText(/title/i), 'Delete Me');
      await user.type(screen.getByLabelText(/amount/i), '50');
      await user.click(screen.getByRole('button', { name: /add bill/i }));

      await waitFor(() => {
        expect(document.querySelector('.modal-overlay')).not.toBeInTheDocument();
      });

      // Verify bill exists
      expect(screen.getByText('Delete Me')).toBeInTheDocument();

      // Delete the bill
      const deleteButton = screen.getByTestId(/delete-bill-/);
      await user.click(deleteButton);

      // Verify bill is gone
      expect(screen.queryByText('Delete Me')).not.toBeInTheDocument();
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });
  });

  describe('Modal Behavior', () => {
    test('should close modal on cancel', async () => {
      const user = userEvent.setup();
      render(<CRUDTestComponent />);

      await user.click(screen.getByTestId('create-bill'));
      expect(document.querySelector('.modal-overlay')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      await waitFor(() => {
        expect(document.querySelector('.modal-overlay')).not.toBeInTheDocument();
      });
    });

    test('should close modal on escape key', async () => {
      const user = userEvent.setup();
      render(<CRUDTestComponent />);

      await user.click(screen.getByTestId('create-bill'));
      expect(document.querySelector('.modal-overlay')).toBeInTheDocument();

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(document.querySelector('.modal-overlay')).not.toBeInTheDocument();
      });
    });

    test('should handle form with description and notes', async () => {
      const user = userEvent.setup();
      render(<CRUDTestComponent />);

      await user.click(screen.getByTestId('create-bill'));
      
      await user.type(screen.getByLabelText(/title/i), 'Detailed Bill');
      await user.type(screen.getByLabelText(/amount/i), '150');
      await user.type(screen.getByLabelText(/description/i), 'This is a description');
      await user.type(screen.getByLabelText(/notes/i), 'Some notes here');

      await user.click(screen.getByRole('button', { name: /add bill/i }));

      await waitFor(() => {
        expect(document.querySelector('.modal-overlay')).not.toBeInTheDocument();
      });

      expect(screen.getByText('Detailed Bill')).toBeInTheDocument();
      expect(screen.getByText('Description: This is a description')).toBeInTheDocument();
    });
  });
}); 