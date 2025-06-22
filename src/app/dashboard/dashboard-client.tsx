'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MonthSelector } from '@/components/ui/month-selector';
import { Modal } from '@/components/ui/modal';
import { BillForm } from '@/components/bills/bill-form';
import { WeeklyBillList } from '@/components/bills/weekly-bill-list';
import { Button } from '@/components/ui/button';
import { 
  PlusIcon, 
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import type { BillWithDetails } from '@/types/bill-database';

interface DashboardStats {
  totalBills: number;
  paidBills: number;
  pendingBills: number;
  overdueBills: number;
  totalAmount: number;
  paidAmount: number;
}

interface DashboardClientProps {
  initialStats: DashboardStats;
  initialBills: BillWithDetails[];
  initialMonth: string;
}

export default function DashboardClient({ 
  initialStats, 
  initialBills, 
  initialMonth 
}: DashboardClientProps) {
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date(initialMonth + '-01'));
  const [stats, setStats] = useState(initialStats);
  const [bills, setBills] = useState(initialBills);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'bill' | 'income'>('bill');
  const [editingBill, setEditingBill] = useState<BillWithDetails | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  const fetchData = useCallback(async (month: Date) => {
    setLoading(true);
    try {
      // First check authentication
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('Authentication error:', userError);
        return;
      }
      if (!user) {
        console.error('No authenticated user found');
        return;
      }

      console.log('🔍 Fetching bills for user:', user.id);

      const year = month.getFullYear();
      const monthNum = month.getMonth() + 1;
      const startDate = new Date(year, monthNum - 1, 1);
      const endDate = new Date(year, monthNum, 0);

      console.log('📅 Date range:', {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        month: month.toISOString().split('T')[0],
        year,
        monthNum
      });

      // Fetch bills for the month
      const { data: billsData, error: billsError } = await supabase
        .from('bill_instances')
        .select(`
          *,
          attachments:bill_attachments(*)
        `)
        .gte('due_date', startDate.toISOString().split('T')[0])
        .lte('due_date', endDate.toISOString().split('T')[0])
        .order('due_date', { ascending: true });

      if (billsError) {
        console.error('Error fetching bills:', billsError);
        throw billsError;
      }

      console.log('📋 Raw bills data:', billsData);
      console.log('📊 Bills count:', billsData?.length || 0);
      
      // Also fetch ALL bills for this user to see what's in the database
      const { data: allBills, error: allBillsError } = await supabase
        .from('bill_instances')
        .select('id, title, amount, due_date, status, created_date')
        .order('created_date', { ascending: false })
        .limit(10);
        
      if (!allBillsError) {
        console.log('🗂️ ALL user bills (last 10):', allBills);
      }

      // Transform data to match BillWithDetails interface
      const transformedBills: BillWithDetails[] = (billsData || []).map(bill => ({
        ...bill,
        attachments: bill.attachments || []
      }));

      // Calculate stats
      const totalBills = transformedBills.length;
      const paidBills = transformedBills.filter(bill => bill.status === 'paid').length;
      const pendingBills = transformedBills.filter(bill => bill.status === 'pending').length;
      const overdueBills = transformedBills.filter(bill => 
        bill.status === 'pending' && new Date(bill.due_date) < new Date()
      ).length;
      
      const totalAmount = transformedBills.reduce((sum, bill) => sum + (bill.amount || 0), 0);
      const paidAmount = transformedBills.filter(bill => bill.status === 'paid')
        .reduce((sum, bill) => sum + (bill.amount || 0), 0);

      const newStats = {
        totalBills,
        paidBills,
        pendingBills,
        overdueBills,
        totalAmount,
        paidAmount
      };

      console.log('📈 Calculated stats:', newStats);

      setStats(newStats);
      setBills(transformedBills);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData(selectedMonth);
  }, [selectedMonth, fetchData]);

  const handleMonthChange = (month: Date) => {
    setSelectedMonth(month);
  };

  const handleAddBill = () => {
    setModalType('bill');
    setEditingBill(null);
    setIsModalOpen(true);
  };

  const handleAddIncome = () => {
    setModalType('income');
    setEditingBill(null);
    setIsModalOpen(true);
  };

  const handleEditBill = (bill: BillWithDetails) => {
    setModalType('bill');
    setEditingBill(bill);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBill(null);
  };

  const handleBillSaved = () => {
    fetchData(selectedMonth);
    handleCloseModal();
  };

  const handleMarkAsPaid = async (billId: string) => {
    try {
      const { error } = await supabase
        .from('bill_instances')
        .update({ 
          status: 'paid',
          paid_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', billId);

      if (error) throw error;
      
      fetchData(selectedMonth);
    } catch (error) {
      console.error('Error marking bill as paid:', error);
    }
  };

  const handleBillFormSubmit = async (data: Record<string, unknown>) => {
    console.log('💾 Starting bill form submission...', data);
    
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Error getting user:', userError);
        alert('Authentication error. Please refresh and try again.');
        return;
      }

      console.log('👤 Authenticated user:', user.id);

      // Import BillService for proper RRULE handling
      const { BillService } = await import('@/lib/bills/bill-service');
      const billService = new BillService();

      if (editingBill) {
        console.log('✏️ Updating existing bill:', editingBill.id);
        
        // Update existing bill instance - strip out form-only fields
        const { 
          dtstart: _dtstart, 
          rrule: _rrule, 
          attachments: _attachments, 
          category: _category, 
          template: _template, 
          tags: _tags,
          can_edit: _can_edit,
          id: _id,
          created_at: _created_at,
          updated_at: _updated_at,
          ...updateData 
        } = data;

        // Clean up UUID fields
        const sanitizedData = {
          ...updateData,
          user_id: user.id,
          amount: parseFloat(updateData.amount as string) || 0,
          description: (updateData.description as string) || undefined,
          notes: (updateData.notes as string) || undefined,
          category_id: (updateData.category_id as string) || undefined,
        };
        
        console.log('📝 Update data:', sanitizedData);
        
        await billService.updateBill(editingBill.id, sanitizedData);
        console.log('✅ Bill updated successfully');
        
      } else {
        console.log('➕ Creating new bill...');
        
        const isRecurring = data.is_recurring as boolean;
        
        if (isRecurring && data.rrule && data.dtstart) {
          console.log('🔄 Creating recurring bill template...');
          
          // Create bill template for recurring bills using BillService
          const templateData = {
            user_id: user.id,
            title: data.title as string,
            description: (data.description as string) || undefined,
            amount: parseFloat(data.amount as string) || 0,
            currency: (data.currency as string) || 'USD',
            category_id: (data.category_id as string) || undefined,
            priority: ((data.priority as number) || 3) as 1 | 2 | 3 | 4 | 5,
            is_recurring: true,
            rrule: data.rrule as string,
            dtstart: data.dtstart as string,
            timezone: 'America/New_York',
            auto_generate_days_ahead: 90,
            notes: (data.notes as string) || undefined,
            is_active: true,
            ai_confidence_score: 0.0,
            ai_metadata: {}
          };

          console.log('📋 Creating template with BillService:', templateData);
          
          // BillService will handle template creation AND instance generation
          const createdTemplate = await billService.createTemplate(templateData);
          console.log('✅ Recurring bill template created successfully:', createdTemplate.id);
          
        } else {
          console.log('📝 Creating one-time bill...');
          
          // Create single bill instance for one-time bills
          const billData = {
            user_id: user.id,
            template_id: undefined,
            title: data.title as string,
            description: (data.description as string) || undefined,
            amount: parseFloat(data.amount as string) || 0,
            currency: (data.currency as string) || 'USD',
            due_date: data.due_date as string,
            status: 'pending' as const,
            is_recurring: false,
            category_id: (data.category_id as string) || undefined,
            notes: (data.notes as string) || undefined,
            priority: ((data.priority as number) || 3) as 1 | 2 | 3 | 4 | 5,
            ai_confidence_score: 0.0,
            ai_risk_score: 0.0,
            ai_metadata: {},
            created_date: new Date().toISOString(),
            is_historical: false
          };

          console.log('📋 Creating one-time bill with BillService:', billData);
          
          const createdBill = await billService.createBill(billData);
          console.log('✅ One-time bill created successfully:', createdBill.id);
        }
      }

      console.log('🔄 Refreshing data...');
      handleBillSaved();
      
    } catch (error) {
      console.error('💥 Error saving bill:', error);
      
      // More specific error messages
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      alert(`Error saving bill: ${errorMessage}`);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const statsCards = [
    {
      title: 'Total Bills',
      value: stats.totalBills,
      icon: ChartBarIcon,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700'
    },
    {
      title: 'Paid',
      value: stats.paidBills,
      icon: CheckCircleIcon,
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-700'
    },
    {
      title: 'Pending',
      value: stats.pendingBills,
      icon: ClockIcon,
      color: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-700'
    },
    {
      title: 'Overdue',
      value: stats.overdueBills,
      icon: ExclamationTriangleIcon,
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-white/20 sticky top-0 z-30 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <SparklesIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">Dashboard</h1>
                <p className="text-sm text-gray-600 mt-1">Manage your bills and finances</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAddIncome}
                className="hidden sm:flex shadow-sm"
              >
                <PlusIcon className="h-4 w-4" />
                Add Income
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddBill}
                className="shadow-sm"
              >
                <PlusIcon className="h-4 w-4" />
                Add Bill
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Month Selector */}
        <div className="mb-10">
          <MonthSelector
            selectedMonth={selectedMonth}
            onMonthChange={handleMonthChange}
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {statsCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-soft hover:shadow-medium hover:-translate-y-1 transition-all duration-300 group cursor-pointer animate-slide-up relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-primary-500 before:to-accent-500 before:opacity-0 hover:before:opacity-100 before:transition-opacity" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      {stat.title}
                    </p>
                    <p className="text-4xl font-bold text-gray-900 leading-none">
                      {stat.value}
                    </p>
                    <div className="mt-3 flex items-center">
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div className={`bg-gradient-to-r ${stat.color} h-1.5 rounded-full transition-all duration-1000`} style={{ width: `${Math.min(stat.value * 10, 100)}%` }}></div>
                      </div>
                    </div>
                  </div>
                  <div className={`w-16 h-16 bg-gradient-to-br ${stat.color} rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg`}>
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-soft hover:shadow-medium hover:-translate-y-1 transition-all duration-300 animate-scale-in">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">Total Amount</h3>
                <p className="text-sm text-gray-500">All bills for this month</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <CurrencyDollarIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-gray-900">
                {formatCurrency(stats.totalAmount)}
              </span>
              <span className="text-sm text-gray-500">this month</span>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-gray-500">Progress</span>
              <span className="font-medium text-blue-600">{stats.paidBills}/{stats.totalBills} paid</span>
            </div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-1000" style={{ width: `${stats.totalBills > 0 ? (stats.paidBills / stats.totalBills) * 100 : 0}%` }}></div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-soft hover:shadow-medium hover:-translate-y-1 transition-all duration-300 animate-scale-in" style={{ animationDelay: '200ms' }}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">Paid Amount</h3>
                <p className="text-sm text-gray-500">Successfully paid bills</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <CheckCircleIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-gray-900">
                {formatCurrency(stats.paidAmount)}
              </span>
              <span className="text-sm text-gray-500">completed</span>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-gray-500">Remaining</span>
              <span className="font-medium text-emerald-600">{formatCurrency(stats.totalAmount - stats.paidAmount)}</span>
            </div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full transition-all duration-1000" style={{ width: `${stats.totalAmount > 0 ? (stats.paidAmount / stats.totalAmount) * 100 : 0}%` }}></div>
            </div>
          </div>
        </div>

        {/* Bills List */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-soft hover:shadow-medium transition-all duration-300 animate-slide-up" style={{ animationDelay: '400ms' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">Bills This Month</h3>
              <p className="text-sm text-gray-500">Organized by week for better tracking</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-xs text-gray-500 mr-3">Paid</span>
              <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
              <span className="text-xs text-gray-500 mr-3">Pending</span>
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-xs text-gray-500">Overdue</span>
            </div>
          </div>
          <WeeklyBillList
            bills={bills}
            selectedMonth={selectedMonth}
            onBillClick={handleEditBill}
            onMarkPaid={handleMarkAsPaid}
          />
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingBill ? 'Edit Bill' : modalType === 'bill' ? 'Add New Bill' : 'Add Income'}
        maxWidth="lg"
      >
        <BillForm
          mode={editingBill ? 'edit' : 'create'}
          type={modalType}
          selectedMonth={selectedMonth}
          initialData={editingBill ? {
            ...editingBill,
            category: editingBill.category || undefined,
            template: editingBill.template || undefined,
            tags: editingBill.tags || undefined
          } : undefined}
          onSubmit={handleBillFormSubmit}
          onCancel={handleCloseModal}
          isLoading={loading}
        />
      </Modal>
    </div>
  );
} 