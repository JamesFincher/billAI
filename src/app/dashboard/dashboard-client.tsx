'use client';

import { useState, useEffect } from 'react';
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
import type { BillInstance, BillWithDetails } from '@/types/bill-database';

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

  const fetchData = async (month: Date) => {
    setLoading(true);
    try {
      const year = month.getFullYear();
      const monthNum = month.getMonth() + 1;
      const startDate = new Date(year, monthNum - 1, 1);
      const endDate = new Date(year, monthNum, 0);

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

      if (billsError) throw billsError;

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

      setStats({
        totalBills,
        paidBills,
        pendingBills,
        overdueBills,
        totalAmount,
        paidAmount
      });
      setBills(transformedBills);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedMonth);
  }, [selectedMonth]);

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

  const handleBillFormSubmit = async (data: any) => {
    try {
      if (editingBill) {
        // Update existing bill - remove fields that don't exist in bill_instances
        const { dtstart, rrule, ...updateData } = data;
        const { error } = await supabase
          .from('bill_instances')
          .update(updateData)
          .eq('id', editingBill.id);

        if (error) throw error;
      } else {
        // Create new bill - remove fields that don't exist in bill_instances
        const { dtstart, rrule, ...insertData } = data;
        const { error } = await supabase
          .from('bill_instances')
          .insert([insertData]);

        if (error) throw error;
      }

      handleBillSaved();
    } catch (error) {
      console.error('Error saving bill:', error);
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