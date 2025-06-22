'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MonthSelector } from '@/components/ui/month-selector';
import { Modal } from '@/components/ui/modal';
import { BillForm } from '@/components/bills/bill-form';
import { EnhancedBillList } from '@/components/bills/enhanced-bill-list';
import { AIInsightPanel } from '@/components/ai/ai-insight-panel';
import { SmartQuickActions } from '@/components/dashboard/smart-quick-actions';
import { FinancialSnapshot } from '@/components/dashboard/financial-snapshot';
import { CategoryManager } from '@/components/categories/category-manager';
import { Button } from '@/components/ui/button';
import { 
  PlusIcon, 
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  SparklesIcon,
  BellIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import type { BillWithDetails, UserSpendingPattern, BillCategory } from '@/types/bill-database';

interface AIInsight {
  type: 'prediction' | 'anomaly' | 'recommendation' | 'pattern';
  title: string;
  message: string;
  confidence: number;
  actionable: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface EnhancedDashboardStats {
  totalBills: number;
  paidBills: number;
  pendingBills: number;
  overdueBills: number;
  totalAmount: number;
  paidAmount: number;
  averageAmount: number;
  onTimePaymentRate: number;
  aiPredictionAccuracy: number;
  upcomingDueSoon: number;
}

interface EnhancedDashboardProps {
  initialStats: EnhancedDashboardStats;
  initialBills: BillWithDetails[];
  initialMonth: string;
  categories?: BillCategory[];
  spendingPatterns?: UserSpendingPattern[];
}

export default function EnhancedDashboard({ 
  initialStats, 
  initialBills, 
  initialMonth,
  categories = [],
  spendingPatterns = []
}: EnhancedDashboardProps) {
  // Fix timezone issue: parse the month string and construct date properly
  const [year, month] = initialMonth.split('-').map(Number);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date(year, month - 1, 1));
  const [stats, setStats] = useState(initialStats);
  const [bills, setBills] = useState(initialBills);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'bill' | 'income' | 'category'>('bill');
  const [editingBill, setEditingBill] = useState<BillWithDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [quickActionsExpanded, setQuickActionsExpanded] = useState(false);

  const supabase = createClient();

  // Enhanced data fetching with AI insights
  const fetchEnhancedData = useCallback(async (month: Date) => {
    setLoading(true);
    try {
      const year = month.getFullYear();
      const monthNum = month.getMonth() + 1;
      const startDate = new Date(year, monthNum - 1, 1);
      const endDate = new Date(year, monthNum, 0);

      // Fetch bills with full AI data and relationships
      const { data: billsData, error: billsError } = await supabase
        .from('bill_instances')
        .select(`
          *,
          category:bill_categories(*),
          template:bill_templates(*),
          tags:bill_instance_tags(
            tag:bill_tags(*)
          ),
          attachments:bill_attachments(*)
        `)
        .gte('due_date', startDate.toISOString().split('T')[0])
        .lte('due_date', endDate.toISOString().split('T')[0])
        .order('ai_risk_score', { ascending: false })
        .order('due_date', { ascending: true });

      if (billsError) throw billsError;

      // Transform and enrich data with AI insights
      const transformedBills: BillWithDetails[] = (billsData || []).map(bill => ({
        ...bill,
        tags: bill.tags?.map((t: any) => t.tag) || [],
        attachments: bill.attachments || [],
        ai_insights: generateAIInsights(bill)
      }));

      // Calculate enhanced stats
      const enhancedStats = calculateEnhancedStats(transformedBills);
      
      // Generate AI insights for the dashboard
      const insights = await generateDashboardInsights(transformedBills, spendingPatterns);

      setStats(enhancedStats);
      setBills(transformedBills);
      setAiInsights(insights);
      
    } catch (error) {
      console.error('Error fetching enhanced data:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase, spendingPatterns]);

  useEffect(() => {
    fetchEnhancedData(selectedMonth);
  }, [selectedMonth, fetchEnhancedData]);

  // AI insight generation
  const generateAIInsights = (bill: any) => {
    const insights = [];
    
    // Risk analysis
    if (bill.ai_risk_score > 0.7) {
      insights.push('High risk of late payment');
    }
    
    // Amount analysis
    if (bill.ai_predicted_amount && bill.amount > bill.ai_predicted_amount * 1.2) {
      insights.push(`${Math.round(((bill.amount - bill.ai_predicted_amount) / bill.ai_predicted_amount) * 100)}% higher than predicted`);
    }
    
    // Confidence analysis
    if (bill.ai_confidence_score > 0.8) {
      insights.push('High prediction confidence');
    }
    
    return insights;
  };

  // Enhanced stats calculation
  const calculateEnhancedStats = (bills: BillWithDetails[]): EnhancedDashboardStats => {
    const totalBills = bills.length;
    const paidBills = bills.filter(bill => bill.status === 'paid').length;
    const pendingBills = bills.filter(bill => bill.status === 'pending').length;
    const overdueBills = bills.filter(bill => 
      bill.status === 'pending' && new Date(bill.due_date) < new Date()
    ).length;
    
    const totalAmount = bills.reduce((sum, bill) => sum + (bill.amount || 0), 0);
    const paidAmount = bills.filter(bill => bill.status === 'paid')
      .reduce((sum, bill) => sum + (bill.amount || 0), 0);
    
    const averageAmount = totalBills > 0 ? totalAmount / totalBills : 0;
    const onTimePaymentRate = paidBills > 0 ? (paidBills - overdueBills) / paidBills : 0;
    
    // AI prediction accuracy (mock calculation)
    const billsWithPredictions = bills.filter(b => b.ai_predicted_amount);
    const accuracySum = billsWithPredictions.reduce((sum, bill) => {
      const accuracy = 1 - Math.abs(bill.amount - (bill.ai_predicted_amount || 0)) / bill.amount;
      return sum + Math.max(0, Math.min(1, accuracy));
    }, 0);
    const aiPredictionAccuracy = billsWithPredictions.length > 0 ? accuracySum / billsWithPredictions.length : 0;
    
    const upcomingDueSoon = bills.filter(bill => {
      const dueDate = new Date(bill.due_date);
      const today = new Date();
      const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 7 && diffDays >= 0 && bill.status === 'pending';
    }).length;

    return {
      totalBills,
      paidBills,
      pendingBills,
      overdueBills,
      totalAmount,
      paidAmount,
      averageAmount,
      onTimePaymentRate,
      aiPredictionAccuracy,
      upcomingDueSoon
    };
  };

  // Dashboard AI insights generation
  const generateDashboardInsights = async (bills: BillWithDetails[], patterns: UserSpendingPattern[]): Promise<AIInsight[]> => {
    const insights: AIInsight[] = [];
    
    // Spending pattern insights
    const totalSpending = bills.reduce((sum, bill) => sum + bill.amount, 0);
    const lastMonthSpending = 2847; // Mock data - would come from patterns
    
    if (totalSpending > lastMonthSpending * 1.15) {
      insights.push({
        type: 'anomaly',
        title: 'Higher Spending Detected',
        message: `You're spending 15% more than last month. Consider reviewing your variable expenses.`,
        confidence: 0.85,
        actionable: true,
        action: {
          label: 'View Category Breakdown',
          onClick: () => setModalType('category')
        }
      });
    }
    
    // Overdue bill insights
    const overdueBills = bills.filter(b => b.status === 'pending' && new Date(b.due_date) < new Date());
    if (overdueBills.length > 0) {
      insights.push({
        type: 'recommendation',
        title: 'Overdue Bills Need Attention',
        message: `You have ${overdueBills.length} overdue bills totaling $${overdueBills.reduce((sum, b) => sum + b.amount, 0).toFixed(2)}`,
        confidence: 1.0,
        actionable: true,
        action: {
          label: 'Pay Now',
          onClick: () => handleBulkPayment(overdueBills.map(b => b.id))
        }
      });
    }
    
    // Seasonal pattern insights
    const currentMonth = new Date().getMonth();
    if (currentMonth >= 10 || currentMonth <= 2) { // Winter months
      insights.push({
        type: 'pattern',
        title: 'Winter Utility Increase Expected',
        message: 'Your utility bills typically increase by 23% during winter months. Budget an extra $50-75.',
        confidence: 0.78,
        actionable: false
      });
    }
    
    // AI prediction insights
    const highConfidencePredictions = bills.filter(b => b.ai_confidence_score > 0.8);
    if (highConfidencePredictions.length > 0) {
      insights.push({
        type: 'prediction',
        title: 'Accurate Predictions Available',
        message: `AI has high confidence predictions for ${highConfidencePredictions.length} upcoming bills.`,
        confidence: 0.92,
        actionable: false
      });
    }
    
    return insights;
  };

  // Event handlers
  const handleMonthChange = (month: Date) => {
    setSelectedMonth(month);
  };

  const handleAddBill = () => {
    setModalType('bill');
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
    fetchEnhancedData(selectedMonth);
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
      
      fetchEnhancedData(selectedMonth);
    } catch (error) {
      console.error('Error marking bill as paid:', error);
    }
  };

  const handleBulkPayment = async (billIds: string[]) => {
    // Implementation for bulk payment
    console.log('Bulk payment for bills:', billIds);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* Enhanced Header */}
      <div className="bg-white/90 backdrop-blur-xl border-b border-white/20 sticky top-0 z-40 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg animate-pulse-slow">
                <SparklesIcon className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                  BillAI Dashboard
                </h1>
                <p className="text-sm text-slate-600 mt-1 flex items-center gap-2">
                  <span>Smart financial management</span>
                  {stats.aiPredictionAccuracy > 0.8 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      🤖 {Math.round(stats.aiPredictionAccuracy * 100)}% AI Accuracy
                    </span>
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="relative"
                onClick={() => setQuickActionsExpanded(!quickActionsExpanded)}
              >
                <BellIcon className="h-5 w-5" />
                {aiInsights.filter(i => i.actionable).length > 0 && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-ping"></span>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setModalType('category')}
              >
                <Cog6ToothIcon className="h-5 w-5" />
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddBill}
                className="shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <PlusIcon className="h-4 w-4" />
                Add Bill
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Smart Quick Actions */}
        <SmartQuickActions
          bills={bills}
          insights={aiInsights}
          expanded={quickActionsExpanded}
          onAddBill={handleAddBill}
          onBulkPay={handleBulkPayment}
          className="mb-8"
        />

        {/* Month Selector */}
        <div className="mb-10">
          <MonthSelector
            selectedMonth={selectedMonth}
            onMonthChange={handleMonthChange}
          />
        </div>

        {/* Financial Snapshot */}
        <FinancialSnapshot
          stats={stats}
          bills={bills}
          className="mb-10"
        />

        {/* AI Insights Panel */}
        <AIInsightPanel
          insights={aiInsights}
          className="mb-10"
        />

        {/* Enhanced Bills List */}
        <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-3xl p-8 shadow-soft hover:shadow-medium transition-all duration-300">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Smart Bill Overview</h3>
              <p className="text-slate-600">AI-powered insights and intelligent organization</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Paid</span>
                <div className="w-3 h-3 bg-amber-500 rounded-full ml-3"></div>
                <span>Pending</span>
                <div className="w-3 h-3 bg-red-500 rounded-full ml-3"></div>
                <span>Overdue</span>
              </div>
            </div>
          </div>
          
          <EnhancedBillList
            bills={bills}
            selectedMonth={selectedMonth}
            onBillClick={handleEditBill}
            onMarkPaid={handleMarkAsPaid}
            showAIInsights={true}
            groupBy="smart" // AI-powered grouping
          />
        </div>
      </div>

      {/* Enhanced Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={
          editingBill 
            ? 'Edit Bill' 
            : modalType === 'bill' 
            ? 'Add New Bill' 
            : modalType === 'category'
            ? 'Manage Categories'
            : 'Add Income'
        }
        maxWidth="lg"
      >
        {modalType === 'category' ? (
          <CategoryManager
            categories={categories}
            onClose={handleCloseModal}
          />
        ) : (
          <BillForm
            mode={editingBill ? 'edit' : 'create'}
            type={modalType}
            initialData={editingBill}
            onSubmit={async (data) => {
              // Enhanced form submission with AI integration
              await handleBillSaved();
            }}
            onCancel={handleCloseModal}
            isLoading={loading}
            showAIAssistance={true}
            categories={categories}
          />
        )}
      </Modal>
    </div>
  );
}