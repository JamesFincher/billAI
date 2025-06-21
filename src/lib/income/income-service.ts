import { createClient } from '@/lib/supabase/client';
import { addDays, parseISO, format, isPast, isFuture, startOfDay } from 'date-fns';
import type {
  IncomeCategory,
  IncomeTag,
  IncomeTemplate,
  IncomeInstance,
  IncomeAttachment,
  IncomeHistory,
  CreateIncomeCategory,
  CreateIncomeTag,
  CreateIncomeTemplate,
  CreateIncomeInstance,
  UpdateIncomeTemplate,
  UpdateIncomeInstance,
  IncomeFilters,
  IncomeSortOptions,
  IncomeStats,
  IncomeWithDetails,
  IncomeTemplateWithDetails,
  GenerateIncomeInstancesRequest,
  BulkIncomeUpdateRequest,
  BulkIncomeReceivedRequest,
  IncomeAnalytics,
  VarianceAnalysis,
  IncomeHealthMetrics,
} from '@/types/income-database';
import { 
  generateBillInstances, 
  getNextOccurrence, 
  validateRRule,
  getRRuleDescription 
} from '@/lib/bills/rrule-utils';

export class IncomeService {
  private supabase = createClient();

  // ============= CATEGORIES =============
  async getCategories(): Promise<IncomeCategory[]> {
    const { data, error } = await this.supabase
      .from('income_categories')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  }

  async createCategory(category: CreateIncomeCategory): Promise<IncomeCategory> {
    const { data, error } = await this.supabase
      .from('income_categories')
      .insert(category)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateCategory(id: string, updates: Partial<CreateIncomeCategory>): Promise<IncomeCategory> {
    const { data, error } = await this.supabase
      .from('income_categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteCategory(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('income_categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ============= TAGS =============
  async getTags(): Promise<IncomeTag[]> {
    const { data, error } = await this.supabase
      .from('income_tags')
      .select('*')
      .order('usage_count', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async createTag(tag: CreateIncomeTag): Promise<IncomeTag> {
    const { data, error } = await this.supabase
      .from('income_tags')
      .insert(tag)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateTag(id: string, updates: Partial<CreateIncomeTag>): Promise<IncomeTag> {
    const { data, error } = await this.supabase
      .from('income_tags')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteTag(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('income_tags')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ============= TEMPLATES =============
  async getTemplates(): Promise<IncomeTemplateWithDetails[]> {
    const { data, error } = await this.supabase
      .from('income_templates')
      .select(`
        *,
        category:income_categories(*),
        attachments:income_attachments(*),
        upcoming_instances:income_instances(
          id, title, expected_date, expected_amount, actual_amount, status
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getTemplate(id: string): Promise<IncomeTemplateWithDetails> {
    const { data, error } = await this.supabase
      .from('income_templates')
      .select(`
        *,
        category:income_categories(*),
        attachments:income_attachments(*),
        upcoming_instances:income_instances(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async createTemplate(template: CreateIncomeTemplate): Promise<IncomeTemplate> {
    // Validate RRULE if provided
    if (template.rrule) {
      const validation = validateRRule(template.rrule);
      if (!validation.valid) {
        throw new Error(`Invalid RRULE: ${validation.error}`);
      }
    }

    const { data, error } = await this.supabase
      .from('income_templates')
      .insert(template)
      .select()
      .single();

    if (error) throw error;

    // Auto-generate instances if recurring
    if (data.is_recurring && data.rrule && data.dtstart) {
      await this.generateInstancesFromTemplate(data.id);
    }

    return data;
  }

  async updateTemplate(id: string, updates: UpdateIncomeTemplate): Promise<IncomeTemplate> {
    // Validate RRULE if provided
    if (updates.rrule) {
      const validation = validateRRule(updates.rrule);
      if (!validation.valid) {
        throw new Error(`Invalid RRULE: ${validation.error}`);
      }
    }

    const { data, error } = await this.supabase
      .from('income_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Regenerate future instances if recurrence changed
    if (updates.rrule || updates.is_recurring !== undefined || updates.expected_amount !== undefined) {
      await this.regenerateFutureInstances(id);
    }

    return data;
  }

  async deleteTemplate(id: string): Promise<void> {
    // First, check if there are future instances
    const { data: futureInstances } = await this.supabase
      .from('income_instances')
      .select('id')
      .eq('template_id', id)
      .gte('expected_date', format(new Date(), 'yyyy-MM-dd'));

    if (futureInstances && futureInstances.length > 0) {
      // Delete future instances
      await this.supabase
        .from('income_instances')
        .delete()
        .eq('template_id', id)
        .gte('expected_date', format(new Date(), 'yyyy-MM-dd'));
    }

    // Delete template
    const { error } = await this.supabase
      .from('income_templates')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ============= INSTANCES =============
  async getIncome(filters?: IncomeFilters, sort?: IncomeSortOptions): Promise<IncomeWithDetails[]> {
    let query = this.supabase
      .from('income_instances')
      .select(`
        *,
        category:income_categories(*),
        template:income_templates(*),
        tags:income_instance_tags(
          tag:income_tags(*)
        ),
        attachments:income_attachments(*)
      `);

    // Apply filters
    if (filters) {
      if (filters.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status);
        } else {
          query = query.eq('status', filters.status);
        }
      }

      if (filters.source_type) {
        if (Array.isArray(filters.source_type)) {
          query = query.in('source_type', filters.source_type);
        } else {
          query = query.eq('source_type', filters.source_type);
        }
      }

      if (filters.category_id) {
        if (Array.isArray(filters.category_id)) {
          query = query.in('category_id', filters.category_id);
        } else {
          query = query.eq('category_id', filters.category_id);
        }
      }

      if (filters.date_from) {
        query = query.gte('expected_date', filters.date_from);
      }

      if (filters.date_to) {
        query = query.lte('expected_date', filters.date_to);
      }

      if (filters.amount_min) {
        query = query.gte('expected_amount', filters.amount_min);
      }

      if (filters.amount_max) {
        query = query.lte('expected_amount', filters.amount_max);
      }

      if (filters.is_recurring !== undefined) {
        query = query.eq('is_recurring', filters.is_recurring);
      }

      if (filters.priority) {
        if (Array.isArray(filters.priority)) {
          query = query.in('priority', filters.priority);
        } else {
          query = query.eq('priority', filters.priority);
        }
      }

      if (filters.variance_threshold !== undefined) {
        query = query.or(`variance_percentage.gte.${filters.variance_threshold},variance_percentage.lte.${-filters.variance_threshold}`);
      }

      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,payer_name.ilike.%${filters.search}%`);
      }
    }

    // Apply sorting
    if (sort) {
      query = query.order(sort.field, { ascending: sort.direction === 'asc' });
    } else {
      query = query.order('expected_date', { ascending: true });
    }

    const { data, error } = await query;

    if (error) throw error;

    // Transform the nested tags structure
    return (data || []).map(income => ({
      ...income,
      tags: income.tags?.map((t: any) => t.tag) || []
    }));
  }

  async getIncomeInstance(id: string): Promise<IncomeWithDetails> {
    const { data, error } = await this.supabase
      .from('income_instances')
      .select(`
        *,
        category:income_categories(*),
        template:income_templates(*),
        tags:income_instance_tags(
          tag:income_tags(*)
        ),
        attachments:income_attachments(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    // Transform the nested tags structure
    return {
      ...data,
      tags: data.tags?.map((t: any) => t.tag) || []
    };
  }

  async createIncome(income: CreateIncomeInstance): Promise<IncomeInstance> {
    // Sanitize UUID fields - convert empty strings to null
    const sanitizedIncome = { ...income };
    
    if (sanitizedIncome.category_id === '') {
      sanitizedIncome.category_id = undefined;
    }
    if (sanitizedIncome.template_id === '') {
      sanitizedIncome.template_id = undefined;
    }

    const { data, error } = await this.supabase
      .from('income_instances')
      .insert(sanitizedIncome)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateIncome(id: string, updates: UpdateIncomeInstance): Promise<IncomeInstance> {
    // Check if income is historical (past and therefore read-only)
    const existing = await this.getIncomeInstance(id);
    if (existing.is_historical) {
      throw new Error('Cannot edit historical income');
    }

    // Sanitize UUID fields - convert empty strings to null
    const sanitizedUpdates = { ...updates };
    
    if (sanitizedUpdates.category_id === '') {
      sanitizedUpdates.category_id = undefined;
    }
    if (sanitizedUpdates.template_id === '') {
      sanitizedUpdates.template_id = undefined;
    }

    const { data, error } = await this.supabase
      .from('income_instances')
      .update(sanitizedUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteIncome(id: string): Promise<void> {
    // Check if income is historical
    const existing = await this.getIncomeInstance(id);
    if (existing.is_historical) {
      throw new Error('Cannot delete historical income');
    }

    const { error } = await this.supabase
      .from('income_instances')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async markIncomeReceived(id: string, receivedDate: string, actualAmount?: number, notes?: string): Promise<IncomeInstance> {
    const updates: UpdateIncomeInstance = {
      status: 'received',
      received_date: receivedDate,
    };

    if (actualAmount !== undefined) {
      updates.actual_amount = actualAmount;
    }

    if (notes) {
      updates.notes = notes;
    }

    return this.updateIncome(id, updates);
  }

  async bulkUpdateIncome(request: BulkIncomeUpdateRequest): Promise<void> {
    const { error } = await this.supabase
      .from('income_instances')
      .update(request.updates)
      .in('id', request.income_ids)
      .eq('is_historical', false); // Only update non-historical income

    if (error) throw error;
  }

  async bulkMarkReceived(request: BulkIncomeReceivedRequest): Promise<void> {
    // If specific amounts provided, update each individually
    if (request.actual_amounts) {
      for (const [incomeId, actualAmount] of Object.entries(request.actual_amounts)) {
        await this.markIncomeReceived(incomeId, request.received_date, actualAmount, request.notes);
      }
    } else {
      // Bulk update without specific amounts
      const updates = {
        status: 'received' as const,
        received_date: request.received_date,
        notes: request.notes,
      };

      await this.bulkUpdateIncome({
        income_ids: request.income_ids,
        updates,
      });
    }
  }

  // ============= INCOME TAGS =============
  async addTagToIncome(incomeId: string, tagId: string): Promise<void> {
    const { error } = await this.supabase
      .from('income_instance_tags')
      .insert({
        income_instance_id: incomeId,
        tag_id: tagId,
      });

    if (error) throw error;

    // Increment tag usage count
    await this.supabase.rpc('increment_income_tag_usage', { tag_id: tagId });
  }

  async removeTagFromIncome(incomeId: string, tagId: string): Promise<void> {
    const { error } = await this.supabase
      .from('income_instance_tags')
      .delete()
      .eq('income_instance_id', incomeId)
      .eq('tag_id', tagId);

    if (error) throw error;

    // Decrement tag usage count
    await this.supabase.rpc('decrement_income_tag_usage', { tag_id: tagId });
  }

  // ============= INSTANCE GENERATION =============
  async generateInstancesFromTemplate(templateId: string): Promise<IncomeInstance[]> {
    const template = await this.getTemplate(templateId);
    
    if (!template.is_recurring || !template.rrule || !template.dtstart) {
      throw new Error('Template is not configured for recurring income');
    }

    const generateUntil = addDays(new Date(), template.auto_generate_days_ahead);
    const dtstart = parseISO(template.dtstart);
    
    const instances = generateBillInstances(
      template.rrule,
      dtstart,
      generateUntil,
      {
        title: template.title,
        amount: template.expected_amount,
        description: template.description,
      }
    );

    // Insert instances that don't already exist
    const existingDates = await this.getExistingInstanceDates(templateId);
    const newInstances = instances.filter(
      instance => !existingDates.includes(instance.due_date)
    );

    if (newInstances.length === 0) return [];

    const incomeToInsert: CreateIncomeInstance[] = newInstances.map(instance => ({
      user_id: template.user_id,
      template_id: templateId,
      title: instance.title,
      description: instance.description,
      expected_amount: instance.amount,
      currency: template.currency,
      expected_date: instance.due_date,
      created_date: new Date().toISOString(),
      status: 'expected',
      is_recurring: true,
      source_type: template.source_type,
      tax_category: template.tax_category,
      is_gross_amount: template.is_gross_amount,
      payer_name: template.payer_name,
      payer_reference: template.payer_reference,
      payment_method: template.payment_method,
      category_id: template.category_id,
      priority: template.priority,
      notes: template.notes,
      is_historical: false,
      ai_confidence_score: template.ai_confidence_score,
      ai_punctuality_score: 0.0,
      ai_variance_risk_score: 0.0,
      ai_metadata: template.ai_metadata,
    }));

    const { data, error } = await this.supabase
      .from('income_instances')
      .insert(incomeToInsert)
      .select();

    if (error) throw error;
    return data || [];
  }

  async regenerateFutureInstances(templateId: string): Promise<void> {
    // Delete future instances for this template
    await this.supabase
      .from('income_instances')
      .delete()
      .eq('template_id', templateId)
      .gte('expected_date', format(new Date(), 'yyyy-MM-dd'));

    // Generate new instances
    await this.generateInstancesFromTemplate(templateId);
  }

  private async getExistingInstanceDates(templateId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('income_instances')
      .select('expected_date')
      .eq('template_id', templateId);

    if (error) throw error;
    return data?.map(instance => instance.expected_date) || [];
  }

  // ============= STATISTICS & ANALYTICS =============
  async getIncomeStats(): Promise<IncomeStats> {
    const { data, error } = await this.supabase
      .from('income_instances')
      .select('*');

    if (error) throw error;

    const instances = data || [];
    const totalExpected = instances.reduce((sum, instance) => sum + (instance.expected_amount || 0), 0);
    const totalReceived = instances
      .filter(instance => instance.status === 'received')
      .reduce((sum, instance) => sum + (instance.actual_amount || instance.expected_amount || 0), 0);
    
    const expectedInstances = instances.filter(instance => instance.status === 'expected').length;
    const receivedInstances = instances.filter(instance => instance.status === 'received').length;
    const lateInstances = instances.filter(instance => 
      instance.status === 'expected' && new Date(instance.expected_date) < new Date()
    ).length;
    const pendingInstances = instances.filter(instance => 
      instance.status === 'expected' && new Date(instance.expected_date) >= new Date()
    ).length;

    const varianceData = instances
      .filter(instance => instance.variance_percentage !== null)
      .map(instance => instance.variance_percentage || 0);
    
    const totalVariance = instances.reduce((sum, instance) => sum + (instance.amount_variance || 0), 0);
    const averageVariancePercentage = varianceData.length > 0 
      ? varianceData.reduce((sum, variance) => sum + variance, 0) / varianceData.length 
      : 0;

    // Calculate reliability score (simple heuristic)
    const reliabilityScore = instances.length > 0 
      ? (receivedInstances / instances.length) * 100 * (1 - Math.abs(averageVariancePercentage) / 100)
      : 0;

    return {
      total_expected: totalExpected,
      total_received: totalReceived,
      expected_instances: expectedInstances,
      received_instances: receivedInstances,
      late_instances: lateInstances,
      pending_instances: pendingInstances,
      total_variance: totalVariance,
      average_variance_percentage: averageVariancePercentage,
      reliability_score: Math.max(0, Math.min(100, reliabilityScore))
    };
  }

  async getIncomeAnalytics(dateFrom?: string, dateTo?: string): Promise<IncomeAnalytics> {
    let query = this.supabase
      .from('income_instances')
      .select(`
        *,
        category:income_categories(*)
      `);

    if (dateFrom) {
      query = query.gte('expected_date', dateFrom);
    }
    if (dateTo) {
      query = query.lte('expected_date', dateTo);
    }

    const { data, error } = await query;
    if (error) throw error;

    const instances = data || [];

    // Monthly trends
    const monthlyData = new Map<string, any>();
    instances.forEach((instance: any) => {
      const month = format(new Date(instance.expected_date), 'yyyy-MM');
      if (!monthlyData.has(month)) {
        monthlyData.set(month, {
          month,
          expected_total: 0,
          actual_total: 0,
          count: 0,
          variance: 0,
          reliability_score: 0
        });
      }
      const monthData = monthlyData.get(month);
      monthData.expected_total += instance.expected_amount || 0;
      monthData.actual_total += instance.actual_amount || instance.expected_amount || 0;
      monthData.count += 1;
      monthData.variance += instance.amount_variance || 0;
    });

    const monthlyTrends = Array.from(monthlyData.values()).map((data: any) => ({
      ...data,
      reliability_score: data.expected_total > 0 ? (data.actual_total / data.expected_total) * 100 : 0
    }));

    // Source breakdown
    const sourceData = new Map<string, any>();
    instances.forEach((instance: any) => {
      const source = instance.source_type;
      if (!sourceData.has(source)) {
        sourceData.set(source, {
          source_type: source,
          expected_total: 0,
          actual_total: 0,
          count: 0,
          variance_percentage: 0,
          reliability_score: 0
        });
      }
      const sourceInfo = sourceData.get(source);
      sourceInfo.expected_total += instance.expected_amount || 0;
      sourceInfo.actual_total += instance.actual_amount || instance.expected_amount || 0;
      sourceInfo.count += 1;
      if (instance.variance_percentage) {
        sourceInfo.variance_percentage += instance.variance_percentage;
      }
    });

    const sourceBreakdown = Array.from(sourceData.values()).map((data: any) => ({
      ...data,
      variance_percentage: data.count > 0 ? data.variance_percentage / data.count : 0,
      reliability_score: data.expected_total > 0 ? (data.actual_total / data.expected_total) * 100 : 0
    }));

    // Category breakdown
    const categoryData = new Map<string, any>();
    instances.forEach((instance: any) => {
      const categoryKey = instance.category?.name || 'Uncategorized';
      if (!categoryData.has(categoryKey)) {
        categoryData.set(categoryKey, {
          category: instance.category || { name: 'Uncategorized', color: '#6B7280' },
          expected_total: 0,
          actual_total: 0,
          count: 0,
          variance_percentage: 0
        });
      }
      const categoryInfo = categoryData.get(categoryKey);
      categoryInfo.expected_total += instance.expected_amount || 0;
      categoryInfo.actual_total += instance.actual_amount || instance.expected_amount || 0;
      categoryInfo.count += 1;
      if (instance.variance_percentage) {
        categoryInfo.variance_percentage += instance.variance_percentage;
      }
    });

    const categoryBreakdown = Array.from(categoryData.values()).map((data: any) => ({
      ...data,
      variance_percentage: data.count > 0 ? data.variance_percentage / data.count : 0
    }));

    // Punctuality patterns
    const punctualityData = instances.filter((i: any) => i.days_early_late !== null);
    const onTimeInstances = punctualityData.filter((i: any) => Math.abs(i.days_early_late || 0) <= 1);
    const earlyInstances = punctualityData.filter((i: any) => (i.days_early_late || 0) > 1);
    const lateInstances = punctualityData.filter((i: any) => (i.days_early_late || 0) < -1);

    const punctualityPatterns = {
      average_days_early_late: punctualityData.length > 0 
        ? punctualityData.reduce((sum: number, i: any) => sum + (i.days_early_late || 0), 0) / punctualityData.length 
        : 0,
      on_time_percentage: punctualityData.length > 0 ? (onTimeInstances.length / punctualityData.length) * 100 : 0,
      early_percentage: punctualityData.length > 0 ? (earlyInstances.length / punctualityData.length) * 100 : 0,
      late_percentage: punctualityData.length > 0 ? (lateInstances.length / punctualityData.length) * 100 : 0,
      most_reliable_source: sourceBreakdown.sort((a: any, b: any) => b.reliability_score - a.reliability_score)[0]?.source_type || 'none',
      least_reliable_source: sourceBreakdown.sort((a: any, b: any) => a.reliability_score - b.reliability_score)[0]?.source_type || 'none'
    };

    // Simple predictions (would be enhanced with ML)
    const recentMonths = monthlyTrends.slice(-3);
    const nextMonthEstimate = recentMonths.length > 0 
      ? recentMonths.reduce((sum: number, month: any) => sum + month.actual_total, 0) / recentMonths.length 
      : 0;

    const predictions = {
      next_month_estimate: nextMonthEstimate,
      confidence: recentMonths.length >= 3 ? 0.8 : 0.5,
      expected_variance: instances.length > 0 
        ? instances.reduce((sum: number, i: any) => sum + Math.abs(i.variance_percentage || 0), 0) / instances.length 
        : 0,
      growth_trend: 'stable' as const, // Would calculate based on trend analysis
      seasonal_factors: {} as Record<string, number>
    };

    // Tax insights
    const preTaxInstances = instances.filter((i: any) => i.tax_category === 'pre_tax');
    const postTaxInstances = instances.filter((i: any) => i.tax_category === 'post_tax');
    const taxFreeInstances = instances.filter((i: any) => i.tax_category === 'tax_free');

    const taxInsights = {
      total_pre_tax: preTaxInstances.reduce((sum: number, i: any) => sum + (i.actual_amount || i.expected_amount || 0), 0),
      total_post_tax: postTaxInstances.reduce((sum: number, i: any) => sum + (i.actual_amount || i.expected_amount || 0), 0),
      total_tax_free: taxFreeInstances.reduce((sum: number, i: any) => sum + (i.actual_amount || i.expected_amount || 0), 0),
      estimated_tax_liability: 0, // Would calculate based on tax rules
      deduction_opportunities: [] as string[]
    };

    return {
      monthly_trends: monthlyTrends,
      source_breakdown: sourceBreakdown,
      category_breakdown: categoryBreakdown,
      punctuality_patterns: punctualityPatterns,
      predictions: predictions,
      tax_insights: taxInsights
    };
  }

  async analyzeVariance(incomeId: string): Promise<VarianceAnalysis> {
    const income = await this.getIncomeInstance(incomeId);
    
    if (!income.actual_amount) {
      throw new Error('Cannot analyze variance without actual amount');
    }

    const variance = income.amount_variance || 0;
    const variancePercentage = income.variance_percentage || 0;
    
    let varianceCategory: 'within_expected' | 'minor_variance' | 'major_variance' | 'significant_variance';
    let impactScore = 0;
    let suggestions: string[] = [];

    const absVariancePercentage = Math.abs(variancePercentage);
    
    if (absVariancePercentage <= 2) {
      varianceCategory = 'within_expected';
      impactScore = 10;
      suggestions.push('Variance is within expected range');
    } else if (absVariancePercentage <= 10) {
      varianceCategory = 'minor_variance';
      impactScore = 30;
      suggestions.push('Minor variance detected - consider updating expected amount');
    } else if (absVariancePercentage <= 25) {
      varianceCategory = 'major_variance';
      impactScore = 60;
      suggestions.push('Major variance detected - review income source reliability');
      if (variance > 0) {
        suggestions.push('Consider if this increase is sustainable');
      } else {
        suggestions.push('Investigate reasons for income decrease');
      }
    } else {
      varianceCategory = 'significant_variance';
      impactScore = 90;
      suggestions.push('Significant variance detected - immediate attention required');
      suggestions.push('Update income template with new information');
      if (variance > 0) {
        suggestions.push('Consider tax implications of increased income');
      } else {
        suggestions.push('Review budget and expenses due to income reduction');
      }
    }

    return {
      income_id: incomeId,
      expected_amount: income.expected_amount,
      actual_amount: income.actual_amount,
      variance: variance,
      variance_percentage: variancePercentage,
      variance_category: varianceCategory,
      impact_score: impactScore,
      suggestions: suggestions
    };
  }

  async getIncomeHealthMetrics(): Promise<IncomeHealthMetrics> {
    const { data, error } = await this.supabase
      .from('income_instances')
      .select('*')
      .order('expected_date', { ascending: true });

    if (error) throw error;

    const instances = data || [];
    
    if (instances.length === 0) {
      return {
        consistency_score: 0,
        growth_rate: 0,
        diversification_score: 0,
        predictability_score: 0,
        volatility_index: 0,
        seasonal_stability: 0
      };
    }

    // Consistency Score: Based on variance consistency
    const varianceData = instances.filter(i => i.variance_percentage !== null);
    const avgVariance = varianceData.length > 0 
      ? varianceData.reduce((sum, i) => sum + Math.abs(i.variance_percentage || 0), 0) / varianceData.length 
      : 0;
    const consistencyScore = Math.max(0, 100 - avgVariance * 2);

    // Growth Rate: Month-over-month growth
    const monthlyTotals = new Map<string, number>();
    instances.forEach(instance => {
      const month = format(new Date(instance.expected_date), 'yyyy-MM');
      monthlyTotals.set(month, (monthlyTotals.get(month) || 0) + (instance.actual_amount || instance.expected_amount || 0));
    });
    
    const months = Array.from(monthlyTotals.entries()).sort();
    const growthRate = months.length >= 2 ? ((months[months.length - 1][1] - months[0][1]) / months[0][1]) * 100 : 0;

    // Diversification Score: Based on source type distribution
    const sources = new Set(instances.map(i => i.source_type));
    const diversificationScore = Math.min(100, sources.size * 20);

    // Predictability Score: Based on AI confidence and variance
    const avgConfidence = instances.reduce((sum, i) => sum + (i.ai_confidence_score || 0), 0) / instances.length;
    const predictabilityScore = (avgConfidence * 100 + consistencyScore) / 2;

    // Volatility Index: Standard deviation of amounts
    const amounts = instances.map(i => i.actual_amount || i.expected_amount || 0);
    const avgAmount = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
    const variance = amounts.reduce((sum, amount) => sum + Math.pow(amount - avgAmount, 2), 0) / amounts.length;
    const volatilityIndex = avgAmount > 0 ? (Math.sqrt(variance) / avgAmount) * 100 : 0;

    // Seasonal Stability: Variance across seasons (simplified)
    const seasonalStability = Math.max(0, 100 - volatilityIndex);

    return {
      consistency_score: consistencyScore,
      growth_rate: growthRate,
      diversification_score: diversificationScore,
      predictability_score: predictabilityScore,
      volatility_index: volatilityIndex,
      seasonal_stability: seasonalStability
    };
  }

  // ============= MAINTENANCE FUNCTIONS =============
  async markOverdueIncome(): Promise<void> {
    const { error } = await this.supabase
      .from('income_instances')
      .update({ status: 'late' })
      .eq('status', 'expected')
      .lt('expected_date', format(new Date(), 'yyyy-MM-dd'));

    if (error) throw error;
  }

  async markHistoricalIncome(): Promise<void> {
    await this.supabase.rpc('mark_past_income_historical');
  }

  // ============= FILE ATTACHMENTS =============
  async uploadAttachment(
    file: File,
    incomeId?: string,
    templateId?: string,
    description?: string
  ): Promise<IncomeAttachment> {
    // Get current user
    const { data: { user }, error: userError } = await this.supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `income-attachments/${user.id}/${fileName}`;

    // Upload file to Supabase Storage
    const { error: uploadError } = await this.supabase.storage
      .from('attachments')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Create attachment record
    const attachment: CreateIncomeAttachment = {
      user_id: user.id,
      income_instance_id: incomeId,
      income_template_id: templateId,
      filename: file.name,
      file_size: file.size,
      mime_type: file.type,
      storage_path: filePath,
      description: description,
      is_paystub: file.name.toLowerCase().includes('paystub') || file.name.toLowerCase().includes('payslip'),
      is_tax_document: file.name.toLowerCase().includes('tax') || file.name.toLowerCase().includes('w2') || file.name.toLowerCase().includes('1099'),
      ai_extracted_data: {},
      ai_confidence_score: 0.0,
    };

    const { data, error } = await this.supabase
      .from('income_attachments')
      .insert(attachment)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteAttachment(id: string): Promise<void> {
    // Get attachment info for file deletion
    const { data: attachment, error: fetchError } = await this.supabase
      .from('income_attachments')
      .select('storage_path')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Delete file from storage
    const { error: storageError } = await this.supabase.storage
      .from('attachments')
      .remove([attachment.storage_path]);

    if (storageError) throw storageError;

    // Delete attachment record
    const { error } = await this.supabase
      .from('income_attachments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ============= HISTORY =============
  async getIncomeHistory(incomeId: string): Promise<IncomeHistory[]> {
    const { data, error } = await this.supabase
      .from('income_history')
      .select('*')
      .eq('income_instance_id', incomeId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}