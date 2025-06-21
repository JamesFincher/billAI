import { createClient } from '@/lib/supabase/client';
import { addDays, parseISO, format, isPast, isFuture, startOfDay } from 'date-fns';
import type {
  BillCategory,
  BillTag,
  BillTemplate,
  BillInstance,
  BillAttachment,
  BillHistory,
  CreateBillCategory,
  CreateBillTag,
  CreateBillTemplate,
  CreateBillInstance,
  UpdateBillTemplate,
  UpdateBillInstance,
  BillFilters,
  SortOptions,
  BillStats,
  BillWithDetails,
  TemplateWithDetails,
  GenerateInstancesRequest,
  BulkUpdateRequest,
  BulkPaymentRequest,
} from '@/types/bill-database';
import { 
  generateBillInstances, 
  getNextOccurrence, 
  validateRRule,
  getRRuleDescription 
} from './rrule-utils';

export class BillService {
  private supabase = createClient();

  // ============= CATEGORIES =============
  async getCategories(): Promise<BillCategory[]> {
    const { data, error } = await this.supabase
      .from('bill_categories')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  }

  async createCategory(category: CreateBillCategory): Promise<BillCategory> {
    const { data, error } = await this.supabase
      .from('bill_categories')
      .insert(category)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateCategory(id: string, updates: Partial<CreateBillCategory>): Promise<BillCategory> {
    const { data, error } = await this.supabase
      .from('bill_categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteCategory(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('bill_categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ============= TAGS =============
  async getTags(): Promise<BillTag[]> {
    const { data, error } = await this.supabase
      .from('bill_tags')
      .select('*')
      .order('usage_count', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async createTag(tag: CreateBillTag): Promise<BillTag> {
    const { data, error } = await this.supabase
      .from('bill_tags')
      .insert(tag)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateTag(id: string, updates: Partial<CreateBillTag>): Promise<BillTag> {
    const { data, error } = await this.supabase
      .from('bill_tags')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteTag(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('bill_tags')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ============= TEMPLATES =============
  async getTemplates(): Promise<TemplateWithDetails[]> {
    const { data, error } = await this.supabase
      .from('bill_templates')
      .select(`
        *,
        category:bill_categories(*),
        attachments:bill_attachments(*),
        upcoming_instances:bill_instances(
          id, title, due_date, amount, status
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getTemplate(id: string): Promise<TemplateWithDetails> {
    const { data, error } = await this.supabase
      .from('bill_templates')
      .select(`
        *,
        category:bill_categories(*),
        attachments:bill_attachments(*),
        upcoming_instances:bill_instances(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async createTemplate(template: CreateBillTemplate): Promise<BillTemplate> {
    // Validate RRULE if provided
    if (template.rrule) {
      const validation = validateRRule(template.rrule);
      if (!validation.valid) {
        throw new Error(`Invalid RRULE: ${validation.error}`);
      }
    }

    const { data, error } = await this.supabase
      .from('bill_templates')
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

  async updateTemplate(id: string, updates: UpdateBillTemplate): Promise<BillTemplate> {
    // Validate RRULE if provided
    if (updates.rrule) {
      const validation = validateRRule(updates.rrule);
      if (!validation.valid) {
        throw new Error(`Invalid RRULE: ${validation.error}`);
      }
    }

    const { data, error } = await this.supabase
      .from('bill_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Regenerate future instances if recurrence changed
    if (updates.rrule || updates.is_recurring !== undefined || updates.amount !== undefined) {
      await this.regenerateFutureInstances(id);
    }

    return data;
  }

  async deleteTemplate(id: string): Promise<void> {
    // First, check if there are future instances
    const { data: futureInstances } = await this.supabase
      .from('bill_instances')
      .select('id')
      .eq('template_id', id)
      .gte('due_date', format(new Date(), 'yyyy-MM-dd'));

    if (futureInstances && futureInstances.length > 0) {
      // Delete future instances
      await this.supabase
        .from('bill_instances')
        .delete()
        .eq('template_id', id)
        .gte('due_date', format(new Date(), 'yyyy-MM-dd'));
    }

    // Delete template
    const { error } = await this.supabase
      .from('bill_templates')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ============= INSTANCES =============
  async getBills(filters?: BillFilters, sort?: SortOptions): Promise<BillWithDetails[]> {
    let query = this.supabase
      .from('bill_instances')
      .select(`
        *,
        category:bill_categories(*),
        template:bill_templates(*),
        tags:bill_instance_tags(
          tag:bill_tags(*)
        ),
        attachments:bill_attachments(*)
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

      if (filters.category_id) {
        if (Array.isArray(filters.category_id)) {
          query = query.in('category_id', filters.category_id);
        } else {
          query = query.eq('category_id', filters.category_id);
        }
      }

      if (filters.date_from) {
        query = query.gte('due_date', filters.date_from);
      }

      if (filters.date_to) {
        query = query.lte('due_date', filters.date_to);
      }

      if (filters.amount_min) {
        query = query.gte('amount', filters.amount_min);
      }

      if (filters.amount_max) {
        query = query.lte('amount', filters.amount_max);
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

      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }
    }

    // Apply sorting
    if (sort) {
      query = query.order(sort.field, { ascending: sort.direction === 'asc' });
    } else {
      query = query.order('due_date', { ascending: true });
    }

    const { data, error } = await query;

    if (error) throw error;

    // Transform the nested tags structure
    return (data || []).map(bill => ({
      ...bill,
      tags: bill.tags?.map((t: any) => t.tag) || []
    }));
  }

  async getBill(id: string): Promise<BillWithDetails> {
    const { data, error } = await this.supabase
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
      .eq('id', id)
      .single();

    if (error) throw error;

    // Transform the nested tags structure
    return {
      ...data,
      tags: data.tags?.map((t: any) => t.tag) || []
    };
  }

  async createBill(bill: CreateBillInstance): Promise<BillInstance> {
    const { data, error } = await this.supabase
      .from('bill_instances')
      .insert(bill)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateBill(id: string, updates: UpdateBillInstance): Promise<BillInstance> {
    // Check if bill is historical (past and therefore read-only)
    const existing = await this.getBill(id);
    if (existing.is_historical) {
      throw new Error('Cannot edit historical bills');
    }

    const { data, error } = await this.supabase
      .from('bill_instances')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteBill(id: string): Promise<void> {
    // Check if bill is historical
    const existing = await this.getBill(id);
    if (existing.is_historical) {
      throw new Error('Cannot delete historical bills');
    }

    const { error } = await this.supabase
      .from('bill_instances')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async markBillPaid(id: string, paidDate: string, notes?: string): Promise<BillInstance> {
    const updates: UpdateBillInstance = {
      status: 'paid',
      paid_date: paidDate,
    };

    if (notes) {
      updates.notes = notes;
    }

    return this.updateBill(id, updates);
  }

  async bulkUpdateBills(request: BulkUpdateRequest): Promise<void> {
    const { error } = await this.supabase
      .from('bill_instances')
      .update(request.updates)
      .in('id', request.bill_ids)
      .eq('is_historical', false); // Only update non-historical bills

    if (error) throw error;
  }

  async bulkMarkPaid(request: BulkPaymentRequest): Promise<void> {
    const updates = {
      status: 'paid' as const,
      paid_date: request.paid_date,
      notes: request.notes,
    };

    await this.bulkUpdateBills({
      bill_ids: request.bill_ids,
      updates,
    });
  }

  // ============= BILL TAGS =============
  async addTagToBill(billId: string, tagId: string): Promise<void> {
    const { error } = await this.supabase
      .from('bill_instance_tags')
      .insert({
        bill_instance_id: billId,
        tag_id: tagId,
      });

    if (error) throw error;

    // Increment tag usage count
    await this.supabase.rpc('increment_tag_usage', { tag_id: tagId });
  }

  async removeTagFromBill(billId: string, tagId: string): Promise<void> {
    const { error } = await this.supabase
      .from('bill_instance_tags')
      .delete()
      .eq('bill_instance_id', billId)
      .eq('tag_id', tagId);

    if (error) throw error;

    // Decrement tag usage count
    await this.supabase.rpc('decrement_tag_usage', { tag_id: tagId });
  }

  // ============= INSTANCE GENERATION =============
  async generateInstancesFromTemplate(templateId: string): Promise<BillInstance[]> {
    const template = await this.getTemplate(templateId);
    
    if (!template.is_recurring || !template.rrule || !template.dtstart) {
      throw new Error('Template is not configured for recurring bills');
    }

    const generateUntil = addDays(new Date(), template.auto_generate_days_ahead);
    const dtstart = parseISO(template.dtstart);
    
    const instances = generateBillInstances(
      template.rrule,
      dtstart,
      generateUntil,
      {
        title: template.title,
        amount: template.amount,
        description: template.description,
      }
    );

    // Insert instances that don't already exist
    const existingDates = await this.getExistingInstanceDates(templateId);
    const newInstances = instances.filter(
      instance => !existingDates.includes(instance.due_date)
    );

    if (newInstances.length === 0) return [];

    const billsToInsert: CreateBillInstance[] = newInstances.map(instance => ({
      user_id: template.user_id,
      template_id: templateId,
      title: instance.title,
      description: instance.description,
      amount: instance.amount,
      currency: template.currency,
      due_date: instance.due_date,
      status: 'scheduled',
      is_recurring: true,
      category_id: template.category_id,
      priority: template.priority,
      ai_confidence_score: template.ai_confidence_score,
      ai_risk_score: 0.0,
      ai_metadata: {},
    }));

    const { data, error } = await this.supabase
      .from('bill_instances')
      .insert(billsToInsert)
      .select();

    if (error) throw error;
    return data || [];
  }

  async regenerateFutureInstances(templateId: string): Promise<void> {
    // Delete future instances
    await this.supabase
      .from('bill_instances')
      .delete()
      .eq('template_id', templateId)
      .gte('due_date', format(new Date(), 'yyyy-MM-dd'))
      .eq('status', 'scheduled');

    // Generate new instances
    await this.generateInstancesFromTemplate(templateId);
  }

  private async getExistingInstanceDates(templateId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('bill_instances')
      .select('due_date')
      .eq('template_id', templateId);

    if (error) throw error;
    return (data || []).map(d => d.due_date);
  }

  // ============= STATISTICS =============
  async getBillStats(): Promise<BillStats> {
    const { data, error } = await this.supabase
      .from('bill_instances')
      .select('status, amount');

    if (error) throw error;

    const bills = data || [];
    
    const stats = bills.reduce(
      (acc, bill) => {
        acc.total_bills++;
        acc.total_amount += bill.amount;

        switch (bill.status) {
          case 'pending':
            acc.pending_bills++;
            acc.pending_amount += bill.amount;
            break;
          case 'overdue':
            acc.overdue_bills++;
            acc.overdue_amount += bill.amount;
            break;
          case 'paid':
            acc.paid_bills++;
            acc.paid_amount += bill.amount;
            break;
        }

        return acc;
      },
      {
        total_bills: 0,
        pending_bills: 0,
        overdue_bills: 0,
        paid_bills: 0,
        total_amount: 0,
        pending_amount: 0,
        overdue_amount: 0,
        paid_amount: 0,
        upcoming_bills: 0,
      }
    );

    // Get upcoming bills count
    const { count } = await this.supabase
      .from('bill_instances')
      .select('*', { count: 'exact', head: true })
      .gte('due_date', format(new Date(), 'yyyy-MM-dd'))
      .in('status', ['pending', 'scheduled']);

    stats.upcoming_bills = count || 0;

    return stats;
  }

  // ============= MAINTENANCE =============
  async markOverdueBills(): Promise<void> {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    await this.supabase
      .from('bill_instances')
      .update({ status: 'overdue' })
      .eq('status', 'pending')
      .lt('due_date', today);
  }

  async markHistoricalBills(): Promise<void> {
    // Mark past bills as historical
    await this.supabase.rpc('mark_past_bills_historical');
  }

  // ============= ATTACHMENTS =============
  async uploadAttachment(
    file: File,
    billId?: string,
    templateId?: string,
    description?: string
  ): Promise<BillAttachment> {
    if (!billId && !templateId) {
      throw new Error('Must specify either billId or templateId');
    }

    // Upload file to Supabase Storage
    const fileName = `${Date.now()}_${file.name}`;
    const { data: uploadData, error: uploadError } = await this.supabase.storage
      .from('bill-attachments')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    // Create attachment record
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const attachment = {
      user_id: user.id,
      bill_instance_id: billId,
      bill_template_id: templateId,
      filename: file.name,
      file_size: file.size,
      mime_type: file.type,
      storage_path: uploadData.path,
      description,
      is_receipt: file.type.includes('image') || file.type.includes('pdf'),
      ai_extracted_data: {},
      ai_confidence_score: 0.0,
    };

    const { data, error } = await this.supabase
      .from('bill_attachments')
      .insert(attachment)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteAttachment(id: string): Promise<void> {
    // Get attachment info
    const { data: attachment, error: getError } = await this.supabase
      .from('bill_attachments')
      .select('storage_path')
      .eq('id', id)
      .single();

    if (getError) throw getError;

    // Delete from storage
    await this.supabase.storage
      .from('bill-attachments')
      .remove([attachment.storage_path]);

    // Delete record
    const { error } = await this.supabase
      .from('bill_attachments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ============= HISTORY =============
  async getBillHistory(billId: string): Promise<BillHistory[]> {
    const { data, error } = await this.supabase
      .from('bill_history')
      .select('*')
      .eq('bill_instance_id', billId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
} 