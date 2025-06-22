import { BillService } from '../bill-service';

// Mock the Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn(() => Promise.resolve({ data: null, error: null })),
    then: jest.fn(() => Promise.resolve({ data: [], error: null })),
  })),
};

// Mock the Supabase client creation
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient,
}));

describe('BillService API Tests', () => {
  let billService: BillService;
  let mockQueryBuilder: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      then: jest.fn(() => Promise.resolve({ data: [], error: null })),
    };

    mockSupabaseClient.from.mockReturnValue(mockQueryBuilder);
    billService = new BillService();
  });

  describe('Category Operations', () => {
    it('creates a category successfully', async () => {
      const mockCategory = {
        id: '123',
        name: 'Utilities',
        color: '#3B82F6',
        icon: '⚡',
        user_id: 'user1',
        is_system: false,
      };

      mockQueryBuilder.single.mockResolvedValue({
        data: mockCategory,
        error: null,
      });

      const result = await billService.createCategory({
        name: 'Utilities',
        color: '#3B82F6',
        icon: '⚡',
        user_id: 'user1',
        is_system: false,
      });

      expect(result).toEqual(mockCategory);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('bill_categories');
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith({
        name: 'Utilities',
        color: '#3B82F6',
        icon: '⚡',
        user_id: 'user1',
        is_system: false,
      });
    });

    it('retrieves categories for user', async () => {
      const mockCategories = [
        { id: '1', name: 'Utilities', user_id: 'user1' },
        { id: '2', name: 'Housing', user_id: 'user1' },
      ];

      mockQueryBuilder.then.mockResolvedValue({
        data: mockCategories,
        error: null,
      });

      const result = await billService.getCategories();

      expect(result).toEqual(mockCategories);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('bill_categories');
    });

    it('handles category creation errors', async () => {
      const mockError = { message: 'Database error', code: '23505' };
      mockQueryBuilder.single.mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(billService.createCategory({
        name: 'Utilities',
        user_id: 'user1',
        color: '#3B82F6',
        is_system: false,
      })).rejects.toThrow('Database error');
    });
  });

  describe('Bill Instance Operations', () => {
    it('creates a bill instance', async () => {
      const mockBill = {
        id: 'bill1',
        title: 'Electric Bill',
        amount: 150.75,
        due_date: '2024-01-15',
        user_id: 'user1',
        status: 'pending',
      };

      mockQueryBuilder.single.mockResolvedValue({
        data: mockBill,
        error: null,
      });

      const result = await billService.createBill({
        title: 'Electric Bill',
        amount: 150.75,
        due_date: '2024-01-15',
        user_id: 'user1',
        status: 'pending',
        is_recurring: false,
        currency: 'USD',
        created_date: new Date().toISOString(),
        is_historical: false,
        priority: 3,
        ai_confidence_score: 0.0,
        ai_risk_score: 0.0,
        ai_metadata: {},
      });

      expect(result).toEqual(mockBill);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('bill_instances');
    });

    it('retrieves bills with filters', async () => {
      const mockBills = [
        { id: '1', title: 'Bill 1', due_date: '2024-01-15' },
        { id: '2', title: 'Bill 2', due_date: '2024-01-25' },
      ];

      mockQueryBuilder.then.mockResolvedValue({
        data: mockBills,
        error: null,
      });

      const result = await billService.getBills();

      expect(result).toEqual(mockBills);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('bill_instances');
    });

    it('marks bill as paid', async () => {
      const mockPaidBill = {
        id: 'bill1',
        status: 'paid',
        paid_date: '2024-01-15T10:00:00Z',
      };

      mockQueryBuilder.single.mockResolvedValue({
        data: mockPaidBill,
        error: null,
      });

      const result = await billService.markBillPaid('bill1', '2024-01-15T10:00:00Z');

      expect(result).toEqual(mockPaidBill);
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'paid',
          paid_date: '2024-01-15T10:00:00Z',
        })
      );
    });
  });

  describe('Template Operations', () => {
    it('generates bill instances from template', async () => {
      const mockTemplate = {
        id: 'template1',
        title: 'Monthly Rent',
        amount: 1200,
        rrule: 'FREQ=MONTHLY;INTERVAL=1',
        dtstart: '2024-01-01T00:00:00Z',
        user_id: 'user1',
        currency: 'USD',
        category_id: null,
        priority: 3,
        ai_confidence_score: 0.0,
      };

      const mockInstances = [
        { id: 'inst1', title: 'Monthly Rent', due_date: '2024-01-01' },
        { id: 'inst2', title: 'Monthly Rent', due_date: '2024-02-01' },
      ];

      // Mock template fetch
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: mockTemplate,
        error: null,
      });

      // Mock existing instances check
      mockQueryBuilder.then.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      // Mock instance insertion
      mockQueryBuilder.then.mockResolvedValueOnce({
        data: mockInstances,
        error: null,
      });

      const result = await billService.generateInstancesFromTemplate('template1');

      expect(result).toEqual(mockInstances);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('bill_templates');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('bill_instances');
    });
  });

  describe('Statistics', () => {
    it('calculates bill statistics', async () => {
      const mockStats = {
        total_bills: 3,
        pending_bills: 1,
        overdue_bills: 1,
        paid_bills: 1,
        total_amount: 325,
        pending_amount: 150,
        overdue_amount: 75,
        paid_amount: 100,
        upcoming_bills: 5,
      };

      // Mock the stats query
      mockQueryBuilder.then.mockResolvedValue({
        data: [mockStats],
        error: null,
      });

      const result = await billService.getBillStats();

      expect(result).toEqual(mockStats);
    });
  });

  describe('Error Handling', () => {
    it('handles network errors', async () => {
      mockQueryBuilder.then.mockRejectedValue(new Error('Network error'));

      await expect(billService.getCategories()).rejects.toThrow('Network error');
    });

    it('handles database errors', async () => {
      const dbError = { message: 'Database constraint violation', code: '23505' };
      mockQueryBuilder.single.mockResolvedValue({
        data: null,
        error: dbError,
      });

      await expect(billService.createCategory({
        name: 'Test',
        user_id: 'user1',
        color: '#3B82F6',
        is_system: false,
      })).rejects.toThrow('Database constraint violation');
    });
  });
}); 