import { createBrowserClient } from '@supabase/ssr';
import { addMonths, subMonths, format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import type { 
  SpendingAnalytics, 
  UserSpendingPattern, 
  BillInstance, 
  BillCategory,
  PatternType 
} from '@/types/bill-database';

export class AIAnalyticsService {
  private supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  /**
   * Generate comprehensive spending analytics for the user
   */
  async generateSpendingAnalytics(monthsBack: number = 12): Promise<SpendingAnalytics> {
    const endDate = new Date();
    const startDate = subMonths(endDate, monthsBack);

    const [monthlyTrends, categoryBreakdown, paymentPatterns, predictions] = await Promise.all([
      this.getMonthlyTrends(startDate, endDate),
      this.getCategoryBreakdown(startDate, endDate),
      this.getPaymentPatterns(startDate, endDate),
      this.generatePredictions(startDate, endDate),
    ]);

    return {
      monthly_trends: monthlyTrends,
      category_breakdown: categoryBreakdown,
      payment_patterns: paymentPatterns,
      predictions: predictions,
    };
  }

  /**
   * Analyze monthly spending trends
   */
  private async getMonthlyTrends(startDate: Date, endDate: Date) {
    const { data: bills, error } = await this.supabase
      .from('bill_instances')
      .select('due_date, amount, status')
      .gte('due_date', format(startDate, 'yyyy-MM-dd'))
      .lte('due_date', format(endDate, 'yyyy-MM-dd'))
      .order('due_date');

    if (error) throw error;

    // Group by month
    const monthlyData = new Map<string, { total: number; count: number }>();
    
    bills?.forEach(bill => {
      const month = format(parseISO(bill.due_date), 'yyyy-MM');
      const existing = monthlyData.get(month) || { total: 0, count: 0 };
      monthlyData.set(month, {
        total: existing.total + bill.amount,
        count: existing.count + 1,
      });
    });

    return Array.from(monthlyData.entries()).map(([month, data]) => ({
      month,
      total: data.total,
      count: data.count,
      average: data.count > 0 ? data.total / data.count : 0,
    }));
  }

  /**
   * Analyze spending by category
   */
  // @ts-ignore - Supabase type inference issue
  private async getCategoryBreakdown(startDate: Date, endDate: Date) {
    const { data: bills, error } = await this.supabase
      .from('bill_instances')
      .select(`
        amount,
        category:bill_categories(*)
      `)
      .gte('due_date', format(startDate, 'yyyy-MM-dd'))
      .lte('due_date', format(endDate, 'yyyy-MM-dd'));

    if (error) throw error;

    const categoryData = new Map<string, { category: BillCategory; total: number; count: number }>();
    const totalAmount = bills?.reduce((sum, bill) => sum + bill.amount, 0) || 0;

    bills?.forEach(bill => {
      if (bill.category && typeof bill.category === 'object' && 'id' in bill.category) {
        const category = bill.category as BillCategory;
        const categoryId = category.id;
        const existing = categoryData.get(categoryId) || { 
          category: category, 
          total: 0, 
          count: 0 
        };
        categoryData.set(categoryId, {
          ...existing,
          total: existing.total + bill.amount,
          count: existing.count + 1,
        });
      }
    });

    return Array.from(categoryData.values()).map(data => ({
      category: data.category,
      total: data.total,
      count: data.count,
      percentage: totalAmount > 0 ? (data.total / totalAmount) * 100 : 0,
    }));
  }

  /**
   * Analyze payment behavior patterns
   */
  private async getPaymentPatterns(startDate: Date, endDate: Date) {
    const { data: bills, error } = await this.supabase
      .from('bill_instances')
      .select('due_date, paid_date, status')
      .gte('due_date', format(startDate, 'yyyy-MM-dd'))
      .lte('due_date', format(endDate, 'yyyy-MM-dd'))
      .not('paid_date', 'is', null);

    if (error) throw error;

    if (!bills || bills.length === 0) {
      return {
        on_time_percentage: 0,
        average_days_late: 0,
        most_common_payment_day: 1,
      };
    }

    // Calculate payment timing
    const paymentTimings = bills.map(bill => {
      const dueDate = parseISO(bill.due_date);
      const paidDate = parseISO(bill.paid_date!);
      const daysDiff = Math.floor((paidDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      return {
        daysDiff,
        paymentDay: paidDate.getDate(),
        onTime: daysDiff <= 0,
      };
    });

    const onTimeCount = paymentTimings.filter(p => p.onTime).length;
    const onTimePercentage = (onTimeCount / paymentTimings.length) * 100;

    const latePayments = paymentTimings.filter(p => !p.onTime);
    const averageDaysLate = latePayments.length > 0 
      ? latePayments.reduce((sum, p) => sum + p.daysDiff, 0) / latePayments.length 
      : 0;

    // Find most common payment day
    const paymentDayCounts = new Map<number, number>();
    paymentTimings.forEach(p => {
      paymentDayCounts.set(p.paymentDay, (paymentDayCounts.get(p.paymentDay) || 0) + 1);
    });

    const mostCommonPaymentDay = Array.from(paymentDayCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 1;

    return {
      on_time_percentage: onTimePercentage,
      average_days_late: averageDaysLate,
      most_common_payment_day: mostCommonPaymentDay,
    };
  }

  /**
   * Generate spending predictions using simple trend analysis
   */
  private async generatePredictions(startDate: Date, endDate: Date) {
    const monthlyTrends = await this.getMonthlyTrends(startDate, endDate);
    
    if (monthlyTrends.length < 3) {
      return {
        next_month_estimate: 0,
        confidence: 0.1,
        trends: 'stable' as const,
      };
    }

    // Calculate trend direction
    const recentMonths = monthlyTrends.slice(-3);
    const averageRecent = recentMonths.reduce((sum, month) => sum + month.total, 0) / recentMonths.length;
    const earlierMonths = monthlyTrends.slice(-6, -3);
    const averageEarlier = earlierMonths.length > 0 
      ? earlierMonths.reduce((sum, month) => sum + month.total, 0) / earlierMonths.length 
      : averageRecent;

    const trendDirection: 'increasing' | 'decreasing' | 'stable' = averageRecent > averageEarlier * 1.1 ? 'increasing' 
      : averageRecent < averageEarlier * 0.9 ? 'decreasing' 
      : 'stable';

    // Simple linear regression for next month prediction
    const lastThreeMonths = monthlyTrends.slice(-3);
    const nextMonthEstimate = this.calculateLinearTrend(lastThreeMonths);

    // Confidence based on consistency of data
    const variance = this.calculateVariance(lastThreeMonths.map(m => m.total));
    const confidence = Math.max(0.3, Math.min(0.9, 1 - (variance / (averageRecent * averageRecent))));

    return {
      next_month_estimate: Math.max(0, nextMonthEstimate),
      confidence,
      trends: trendDirection,
    };
  }

  /**
   * Save user spending patterns for AI learning
   */
  async saveSpendingPattern(
    patternType: PatternType,
    patternData: Record<string, any>,
    confidenceScore: number,
    categoryId?: string,
    analysisStart: Date = subMonths(new Date(), 6),
    analysisEnd: Date = new Date()
  ): Promise<void> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const pattern = {
      user_id: user.id,
      pattern_type: patternType,
      category_id: categoryId,
      pattern_data: patternData,
      confidence_score: confidenceScore,
      analysis_period_start: format(analysisStart, 'yyyy-MM-dd'),
      analysis_period_end: format(analysisEnd, 'yyyy-MM-dd'),
    };

    // Upsert pattern (replace if exists for same type and category)
    const { error } = await this.supabase
      .from('user_spending_patterns')
      .upsert(pattern, {
        onConflict: 'user_id,pattern_type,category_id',
      });

    if (error) throw error;
  }

  /**
   * Get stored spending patterns
   */
  async getSpendingPatterns(patternType?: PatternType): Promise<UserSpendingPattern[]> {
    let query = this.supabase
      .from('user_spending_patterns')
      .select(`
        *,
        category:bill_categories(*)
      `)
      .order('created_at', { ascending: false });

    if (patternType) {
      query = query.eq('pattern_type', patternType);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Predict bill amount based on historical data
   */
  async predictBillAmount(templateId: string, categoryId?: string): Promise<{
    predicted_amount: number;
    confidence: number;
    based_on_bills: number;
  }> {
    let query = this.supabase
      .from('bill_instances')
      .select('amount, due_date')
      .order('due_date', { ascending: false })
      .limit(12); // Last 12 instances

    if (templateId) {
      query = query.eq('template_id', templateId);
    } else if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data: bills, error } = await query;
    if (error) throw error;

    if (!bills || bills.length === 0) {
      return { predicted_amount: 0, confidence: 0, based_on_bills: 0 };
    }

    // Simple prediction based on recent trend
    const amounts = bills.map(b => b.amount);
    const predictedAmount = amounts.length > 0 
      ? amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length 
      : 0;

    const variance = this.calculateVariance(amounts);
    const mean = predictedAmount;
    const confidence = Math.max(0.1, Math.min(0.9, 1 - (variance / (mean * mean))));

    return {
      predicted_amount: predictedAmount,
      confidence,
      based_on_bills: bills.length,
    };
  }

  /**
   * Calculate risk score for bill (likelihood of being late)
   */
  async calculateRiskScore(billId: string): Promise<number> {
    const { data: bill, error } = await this.supabase
      .from('bill_instances')
      .select(`
        *,
        template:bill_templates(*)
      `)
      .eq('id', billId)
      .single();

    if (error) throw error;

    // Get historical payment behavior for similar bills
    let historicalQuery = this.supabase
      .from('bill_instances')
      .select('due_date, paid_date, status')
      .neq('id', billId)
      .order('due_date', { ascending: false })
      .limit(20);

    if (bill.template_id) {
      historicalQuery = historicalQuery.eq('template_id', bill.template_id);
    } else if (bill.category_id) {
      historicalQuery = historicalQuery.eq('category_id', bill.category_id);
    }

    const { data: historicalBills } = await historicalQuery;

    if (!historicalBills || historicalBills.length === 0) {
      return 0.5; // Neutral risk for new bills
    }

    // Calculate late payment rate
    const paidBills = historicalBills.filter(b => b.paid_date);
    if (paidBills.length === 0) return 0.5;

    const lateBills = paidBills.filter(b => {
      const dueDate = parseISO(b.due_date);
      const paidDate = parseISO(b.paid_date!);
      return paidDate > dueDate;
    });

    const lateRate = lateBills.length / paidBills.length;
    
    // Adjust based on amount (higher amounts might have different risk)
    const amounts = paidBills.map(b => parseISO(b.due_date));
    const avgHistoricalAmount = amounts.length > 0 ? 
      paidBills.reduce((sum, b) => sum, 0) / paidBills.length : bill.amount;

    const amountFactor = bill.amount > avgHistoricalAmount * 1.5 ? 0.1 : 0;

    return Math.min(0.9, Math.max(0.1, lateRate + amountFactor));
  }

  // Helper functions
  private calculateLinearTrend(data: Array<{ total: number }>): number {
    if (data.length < 2) return data[0]?.total || 0;

    const n = data.length;
    const sumX = (n * (n + 1)) / 2; // Sum of indices
    const sumY = data.reduce((sum, d) => sum + d.total, 0);
    const sumXY = data.reduce((sum, d, i) => sum + (i + 1) * d.total, 0);
    const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6; // Sum of squared indices

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return slope * (n + 1) + intercept; // Predict next period
  }

  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    
    const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
    return squaredDiffs.reduce((sum, d) => sum + d, 0) / numbers.length;
  }
} 