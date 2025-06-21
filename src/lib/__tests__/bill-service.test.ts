import { BillService } from '../bills/bill-service';
import type {
  BillCategory,
  BillTag,
  BillTemplate,
  BillInstance,
  CreateBillCategory,
  CreateBillTag,
  CreateBillTemplate,
  CreateBillInstance,
} from '@/types/bill-database';

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}));

const mockQueryBuilder = {
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  gt: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lt: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  contains: jest.fn().mockReturnThis(),
  ilike: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  range: jest.fn().mockReturnThis(),
  single: jest.fn(),
  maybeSingle: jest.fn(),
  head: jest.fn(),
  count: jest.fn(),
};

const mockSupabaseClient = {
  from: jest.fn(() => mockQueryBuilder),
  storage: { from: jest.fn() },
};

const { createClient } = require('@/lib/supabase/client');
(createClient as jest.Mock).mockReturnValue(mockSupabaseClient);

describe('BillService', () => {
  let billService: BillService;

  beforeEach(() => {
    jest.clearAllMocks();
    billService = new BillService();
    mockSupabaseClient.from.mockReturnValue(mockQueryBuilder);
    
    // Reset all mocks to return this by default
    mockQueryBuilder.select.mockReturnThis();
    mockQueryBuilder.insert.mockReturnThis();
    mockQueryBuilder.update.mockReturnThis();
    mockQueryBuilder.delete.mockReturnThis();
    mockQueryBuilder.eq.mockReturnThis();
    mockQueryBuilder.neq.mockReturnThis();
    mockQueryBuilder.gt.mockReturnThis();
    mockQueryBuilder.gte.mockReturnThis();
    mockQueryBuilder.lt.mockReturnThis();
    mockQueryBuilder.lte.mockReturnThis();
    mockQueryBuilder.in.mockReturnThis();
    mockQueryBuilder.contains.mockReturnThis();
    mockQueryBuilder.ilike.mockReturnThis();
    mockQueryBuilder.order.mockReturnThis();
    mockQueryBuilder.limit.mockReturnThis();
    mockQueryBuilder.range.mockReturnThis();
    mockQueryBuilder.head.mockReturnThis();
    mockQueryBuilder.count.mockReturnThis();
  });

  describe('Categories CRUD', () => {
    const mockCategory: BillCategory = {
      id: 'cat-1',
      user_id: 'test-user-id',
      name: 'Utilities',
      color: '#FF5733',
      icon: 'zap',
      description: 'Monthly utility bills',
      is_system: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    test('getCategories - should fetch all categories', async () => {
      // Mock the final query result - getCategories doesn't use .single()
      mockQueryBuilder.order.mockResolvedValue({ data: [mockCategory], error: null });

      const result = await billService.getCategories();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('bill_categories');
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('*');
      expect(mockQueryBuilder.order).toHaveBeenCalledWith('name');
      expect(result).toEqual([mockCategory]);
    });

    test('createCategory - should create new category', async () => {
      const createData: CreateBillCategory = {
        user_id: 'test-user-id',
        name: 'Utilities',
        color: '#FF5733',
        icon: 'zap',
        description: 'Monthly utility bills',
        is_system: false,
      };

      mockQueryBuilder.single.mockResolvedValue({ data: mockCategory, error: null });

      const result = await billService.createCategory(createData);

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(createData);
      expect(result).toEqual(mockCategory);
    });

    test('updateCategory - should update existing category', async () => {
      const updates = { name: 'Updated Utilities' };
      const updatedCategory = { ...mockCategory, ...updates };
      mockQueryBuilder.single.mockResolvedValue({ data: updatedCategory, error: null });

      const result = await billService.updateCategory('cat-1', updates);

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(updates);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', 'cat-1');
      expect(result).toEqual(updatedCategory);
    });

    test('deleteCategory - should delete category', async () => {
      mockQueryBuilder.eq.mockResolvedValue({ data: null, error: null });

      await billService.deleteCategory('cat-1');

      expect(mockQueryBuilder.delete).toHaveBeenCalled();
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', 'cat-1');
    });

    test('should handle database errors', async () => {
      const error = new Error('Database error');
      mockQueryBuilder.order.mockResolvedValue({ data: null, error });

      await expect(billService.getCategories()).rejects.toThrow('Database error');
    });
  });

  describe('Tags CRUD', () => {
    const mockTag: BillTag = {
      id: 'tag-1',
      user_id: 'test-user-id',
      name: 'urgent',
      color: '#FF0000',
      usage_count: 5,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    test('getTags - should fetch all tags ordered by usage', async () => {
      mockQueryBuilder.order.mockResolvedValue({ data: [mockTag], error: null });

      const result = await billService.getTags();

      expect(mockQueryBuilder.order).toHaveBeenCalledWith('usage_count', { ascending: false });
      expect(result).toEqual([mockTag]);
    });

    test('createTag - should create new tag', async () => {
      const createData: CreateBillTag = {
        user_id: 'test-user-id',
        name: 'urgent',
        color: '#FF0000',
      };

      mockQueryBuilder.single.mockResolvedValue({ data: mockTag, error: null });

      const result = await billService.createTag(createData);

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(createData);
      expect(result).toEqual(mockTag);
    });
  });

  describe('Templates CRUD', () => {
    const mockTemplate: BillTemplate = {
      id: 'tpl-1',
      user_id: 'test-user-id',
      title: 'Monthly Rent',
      description: 'Apartment rent payment',
      amount: 1200.00,
      currency: 'USD',
      category_id: 'cat-1',
      is_recurring: true,
      rrule: 'FREQ=MONTHLY;INTERVAL=1',
      dtstart: '2024-01-01T00:00:00Z',
      dtend: undefined,
      timezone: 'UTC',
      is_active: true,
      auto_generate_days_ahead: 30,
      notes: 'Due on 1st of every month',
      priority: 4,
      ai_confidence_score: 0.95,
      ai_suggested_category_id: undefined,
      ai_metadata: {},
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    test('getTemplates - should fetch templates with details', async () => {
      const mockTemplateWithDetails = {
        ...mockTemplate,
        category: null,
        attachments: [],
        upcoming_instances: [],
      };
      mockQueryBuilder.order.mockResolvedValue({ data: [mockTemplateWithDetails], error: null });

      const result = await billService.getTemplates();

      expect(mockQueryBuilder.select).toHaveBeenCalledWith(expect.stringContaining('category:bill_categories'));
      expect(result).toEqual([mockTemplateWithDetails]);
    });

    test('createTemplate - should validate RRULE and create template', async () => {
      const createData: CreateBillTemplate = {
        user_id: 'test-user-id',
        title: 'Monthly Rent',
        description: 'Apartment rent payment',
        amount: 1200.00,
        currency: 'USD',
        category_id: 'cat-1',
        is_recurring: true,
        rrule: 'FREQ=MONTHLY;INTERVAL=1',
        dtstart: '2024-01-01T00:00:00Z',
        timezone: 'UTC',
        is_active: true,
        auto_generate_days_ahead: 30,
        notes: 'Due on 1st of every month',
        priority: 4,
        ai_confidence_score: 0.95,
        ai_metadata: {},
      };

      // Mock the template creation and instance generation
      mockQueryBuilder.single.mockResolvedValue({ data: mockTemplate, error: null });
      
      // Mock generateInstancesFromTemplate method
      jest.spyOn(billService, 'generateInstancesFromTemplate').mockResolvedValue([]);

      const result = await billService.createTemplate(createData);

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(createData);
      expect(result).toEqual(mockTemplate);
      expect(billService.generateInstancesFromTemplate).toHaveBeenCalledWith('tpl-1');
    });

    test('should reject invalid RRULE', async () => {
      const createData: CreateBillTemplate = {
        user_id: 'test-user-id',
        title: 'Monthly Rent',
        currency: 'USD',
        is_recurring: true,
        rrule: 'INVALID_RRULE',
        timezone: 'UTC',
        is_active: true,
        auto_generate_days_ahead: 30,
        priority: 4,
        ai_confidence_score: 0.95,
        ai_metadata: {},
      };

      await expect(billService.createTemplate(createData)).rejects.toThrow('Invalid RRULE');
    });
  });

  describe('Bill Instances CRUD', () => {
    const mockBillWithDetails = {
      id: 'bill-1',
      user_id: 'test-user-id',
      template_id: 'tpl-1',
      title: 'January Rent',
      description: 'Monthly rent payment',
      amount: 1200,
      currency: 'USD',
      due_date: '2024-01-01',
      scheduled_date: '2024-01-01T00:00:00Z',
      paid_date: undefined,
      created_date: '2024-01-01T00:00:00Z',
      status: 'pending' as const,
      is_recurring: true,
      category_id: 'cat-1',
      notes: undefined,
      priority: 4,
      is_historical: false,
      can_edit: true,
      original_amount: undefined,
      ai_predicted_amount: undefined,
      ai_confidence_score: 0,
      ai_risk_score: 0,
      ai_metadata: {},
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      category: null,
      tags: [],
      attachments: [],
      template: null,
    };

    test('getBills - should fetch bills with filters', async () => {
      // Mock the complex query chain for getBills
      mockQueryBuilder.order.mockResolvedValue({ data: [mockBillWithDetails], error: null });

      const result = await billService.getBills({ status: 'pending' });

      expect(result).toEqual([mockBillWithDetails]);
    });

    test('createBill - should create new bill instance', async () => {
      const createData: CreateBillInstance = {
        user_id: 'test-user-id',
        template_id: 'tpl-1',
        title: 'January Rent',
        amount: 1200,
        currency: 'USD',
        due_date: '2024-01-01',
        created_date: '2024-01-01T00:00:00Z',
        status: 'pending',
        is_recurring: true,
        priority: 4,
        is_historical: false,
        ai_confidence_score: 0,
        ai_risk_score: 0,
        ai_metadata: {},
      };

      const mockBill: BillInstance = {
        id: 'bill-1',
        user_id: 'test-user-id',
        template_id: 'tpl-1',
        title: 'January Rent',
        amount: 1200,
        currency: 'USD',
        due_date: '2024-01-01',
        created_date: '2024-01-01T00:00:00Z',
        status: 'pending',
        is_recurring: true,
        priority: 4,
        is_historical: false,
        can_edit: true,
        ai_confidence_score: 0,
        ai_risk_score: 0,
        ai_metadata: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockQueryBuilder.single.mockResolvedValue({ data: mockBill, error: null });

      const result = await billService.createBill(createData);

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(createData);
      expect(result).toEqual(mockBill);
    });

    test('markBillPaid - should mark bill as paid', async () => {
      const paidBill = {
        ...mockBillWithDetails,
        status: 'paid' as const,
        paid_date: '2024-01-01T12:00:00Z',
      };

      mockQueryBuilder.single.mockResolvedValue({ data: paidBill, error: null });

      const result = await billService.markBillPaid('bill-1', '2024-01-01T12:00:00Z', 'Paid on time');

      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        status: 'paid',
        paid_date: '2024-01-01T12:00:00Z',
        notes: 'Paid on time',
      });
      expect(result.status).toBe('paid');
    });
  });

  describe('Bulk Operations', () => {
    test('bulkUpdateBills - should update multiple bills', async () => {
      mockQueryBuilder.eq.mockResolvedValue({ data: null, error: null });

      await billService.bulkUpdateBills({
        bill_ids: ['bill-1', 'bill-2'],
        updates: { priority: 5 },
      });

      expect(mockQueryBuilder.update).toHaveBeenCalledWith({ priority: 5 });
      expect(mockQueryBuilder.in).toHaveBeenCalledWith('id', ['bill-1', 'bill-2']);
    });

    test('bulkMarkPaid - should mark multiple bills as paid', async () => {
      mockQueryBuilder.eq.mockResolvedValue({ data: null, error: null });

      await billService.bulkMarkPaid({
        bill_ids: ['bill-1', 'bill-2'],
        paid_date: '2024-01-01T12:00:00Z',
        notes: 'Bulk payment',
      });

      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        status: 'paid',
        paid_date: '2024-01-01T12:00:00Z',
        notes: 'Bulk payment',
      });
    });
  });

  describe('Statistics', () => {
    test('getBillStats - should return comprehensive statistics', async () => {
      const mockBillsData = [
        { status: 'pending', amount: 500 },
        { status: 'pending', amount: 1000 },
        { status: 'overdue', amount: 500 },
        { status: 'paid', amount: 1000 },
        { status: 'paid', amount: 2000 },
        { status: 'paid', amount: 0 }, // Zero amount bill
      ];

      const mockStats = {
        total_bills: 6,
        pending_bills: 2,
        overdue_bills: 1,
        paid_bills: 3,
        total_amount: 5000,
        pending_amount: 1500,
        overdue_amount: 500,
        paid_amount: 3000,
        upcoming_bills: 2,
      };

      // Mock the first query for bills with status and amount
      mockQueryBuilder.select.mockReturnValueOnce({
        ...mockQueryBuilder,
        data: mockBillsData,
        error: null,
      });

      // Mock the second query for upcoming bills count
      mockQueryBuilder.select.mockReturnValueOnce({
        ...mockQueryBuilder,
        head: true,
        count: 2,
        error: null,
      });

      const result = await billService.getBillStats();

      expect(result).toEqual(mockStats);
    });
  });

  describe('Error Handling', () => {
    test('should handle Supabase errors gracefully', async () => {
      const supabaseError = new Error('Database connection failed');
      mockQueryBuilder.order.mockResolvedValue({ data: null, error: supabaseError });

      await expect(billService.getCategories()).rejects.toEqual(supabaseError);
    });

    test('should handle network errors', async () => {
      const networkError = new Error('Network error');
      mockQueryBuilder.order.mockRejectedValue(networkError);

      await expect(billService.getCategories()).rejects.toThrow('Network error');
    });
  });
}); 