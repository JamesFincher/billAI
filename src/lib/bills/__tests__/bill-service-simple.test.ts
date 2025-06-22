import { BillService } from '../bill-service';

// Mock the entire Supabase client module
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn(),
      then: jest.fn(),
    })),
  })),
}));

describe('BillService - Simple Tests', () => {
  let billService: BillService;
  let mockSupabase: any;

  beforeEach(() => {
    // Get the mocked client
    const { createClient } = require('@/lib/supabase/client');
    mockSupabase = createClient();
    billService = new BillService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('creates BillService instance', () => {
    expect(billService).toBeInstanceOf(BillService);
  });

  test('getCategories calls correct Supabase methods', async () => {
    const mockCategories = [
      { id: '1', name: 'Utilities', user_id: 'user1' },
      { id: '2', name: 'Housing', user_id: 'user1' },
    ];

    // Mock the chain of calls
    const mockQueryBuilder = mockSupabase.from();
    mockQueryBuilder.then.mockResolvedValue({
      data: mockCategories,
      error: null,
    });

    const result = await billService.getCategories();

    expect(mockSupabase.from).toHaveBeenCalledWith('bill_categories');
    expect(mockQueryBuilder.select).toHaveBeenCalledWith('*');
    expect(mockQueryBuilder.order).toHaveBeenCalledWith('name');
    expect(result).toEqual(mockCategories);
  });

  test('createCategory calls correct Supabase methods', async () => {
    const newCategory = {
      name: 'Test Category',
      color: '#FF0000',
      user_id: 'user1',
      is_system: false,
    };

    const mockCreatedCategory = {
      id: '123',
      ...newCategory,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    const mockQueryBuilder = mockSupabase.from();
    mockQueryBuilder.single.mockResolvedValue({
      data: mockCreatedCategory,
      error: null,
    });

    const result = await billService.createCategory(newCategory);

    expect(mockSupabase.from).toHaveBeenCalledWith('bill_categories');
    expect(mockQueryBuilder.insert).toHaveBeenCalledWith(newCategory);
    expect(mockQueryBuilder.select).toHaveBeenCalled();
    expect(result).toEqual(mockCreatedCategory);
  });

  test('handles Supabase errors correctly', async () => {
    const mockError = { message: 'Database error', code: '23505' };
    
    const mockQueryBuilder = mockSupabase.from();
    mockQueryBuilder.single.mockResolvedValue({
      data: null,
      error: mockError,
    });

    await expect(billService.createCategory({
      name: 'Test',
      color: '#FF0000',
      user_id: 'user1',
      is_system: false,
    })).rejects.toThrow('Database error');
  });

  test('getBills calls correct Supabase methods', async () => {
    const mockBills = [
      { id: '1', title: 'Electric Bill', amount: 150 },
      { id: '2', title: 'Water Bill', amount: 75 },
    ];

    const mockQueryBuilder = mockSupabase.from();
    mockQueryBuilder.then.mockResolvedValue({
      data: mockBills,
      error: null,
    });

    const result = await billService.getBills();

    expect(mockSupabase.from).toHaveBeenCalledWith('bill_instances');
    expect(result).toEqual(mockBills);
  });

  test('markBillPaid calls correct Supabase methods', async () => {
    const billId = 'bill123';
    const paidDate = '2024-01-15T10:00:00Z';
    
    const mockUpdatedBill = {
      id: billId,
      status: 'paid',
      paid_date: paidDate,
    };

    const mockQueryBuilder = mockSupabase.from();
    mockQueryBuilder.single.mockResolvedValue({
      data: mockUpdatedBill,
      error: null,
    });

    const result = await billService.markBillPaid(billId, paidDate);

    expect(mockSupabase.from).toHaveBeenCalledWith('bill_instances');
    expect(mockQueryBuilder.update).toHaveBeenCalledWith({
      status: 'paid',
      paid_date: paidDate,
    });
    expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', billId);
    expect(result).toEqual(mockUpdatedBill);
  });
}); 