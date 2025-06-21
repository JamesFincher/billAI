// Bill Tracking Database Types

export interface BillCategory {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon?: string;
  description?: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface BillTag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface BillTemplate {
  id: string;
  user_id: string;
  
  // Basic Info
  title: string;
  description?: string;
  amount?: number;
  currency: string;
  
  // Categorization
  category_id?: string;
  category?: BillCategory;
  
  // Recurrence (RRULE/iCal)
  is_recurring: boolean;
  rrule?: string; // RFC 5545 RRULE string
  dtstart?: string; // ISO timestamp
  dtend?: string; // ISO timestamp
  timezone: string;
  
  // Template Settings
  is_active: boolean;
  auto_generate_days_ahead: number;
  
  // Metadata
  notes?: string;
  priority: 1 | 2 | 3 | 4 | 5;
  
  // AI Learning Data
  ai_confidence_score: number;
  ai_suggested_category_id?: string;
  ai_metadata: Record<string, any>;
  
  created_at: string;
  updated_at: string;
}

export type BillStatus = 'pending' | 'paid' | 'overdue' | 'cancelled' | 'scheduled';

export interface BillInstance {
  id: string;
  user_id: string;
  template_id?: string;
  template?: BillTemplate;
  
  // Instance Info
  title: string;
  description?: string;
  amount: number;
  currency: string;
  
  // Dates
  due_date: string; // ISO date
  scheduled_date?: string; // ISO timestamp
  paid_date?: string; // ISO timestamp
  created_date: string; // ISO timestamp
  
  // Status
  status: BillStatus;
  is_recurring: boolean;
  
  // Categorization
  category_id?: string;
  category?: BillCategory;
  tags?: BillTag[];
  
  // Metadata
  notes?: string;
  priority: 1 | 2 | 3 | 4 | 5;
  
  // Immutability Control
  is_historical: boolean;
  can_edit: boolean; // Generated column
  original_amount?: number;
  
  // AI Data
  ai_predicted_amount?: number;
  ai_confidence_score: number;
  ai_risk_score: number;
  ai_metadata: Record<string, any>;
  
  created_at: string;
  updated_at: string;
}

export interface BillInstanceTag {
  id: string;
  bill_instance_id: string;
  tag_id: string;
  created_at: string;
}

export interface BillAttachment {
  id: string;
  user_id: string;
  bill_instance_id?: string;
  bill_template_id?: string;
  
  // File Info
  filename: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  
  // Metadata
  description?: string;
  is_receipt: boolean;
  
  // AI Analysis
  ai_extracted_data: Record<string, any>;
  ai_confidence_score: number;
  
  created_at: string;
}

export type BillEventType = 
  | 'created' 
  | 'updated' 
  | 'paid' 
  | 'cancelled' 
  | 'overdue'
  | 'amount_changed' 
  | 'date_changed' 
  | 'category_changed' 
  | 'status_changed';

export interface BillHistory {
  id: string;
  user_id: string;
  bill_instance_id?: string;
  bill_template_id?: string;
  
  // Event Info
  event_type: BillEventType;
  
  // Change Data
  old_values: Record<string, any>;
  new_values: Record<string, any>;
  changed_fields: string[];
  
  // Context
  change_reason?: string;
  ip_address?: string;
  user_agent?: string;
  
  created_at: string;
}

export type PatternType = 
  | 'monthly_average'
  | 'category_trend'
  | 'seasonal_pattern'
  | 'payment_behavior'
  | 'amount_prediction'
  | 'due_date_pattern';

export interface UserSpendingPattern {
  id: string;
  user_id: string;
  
  // Pattern Data
  pattern_type: PatternType;
  category_id?: string;
  category?: BillCategory;
  
  // Analysis Results
  pattern_data: Record<string, any>;
  confidence_score: number;
  
  // Time Period
  analysis_period_start: string; // ISO date
  analysis_period_end: string; // ISO date
  
  created_at: string;
  updated_at: string;
}

export interface UserPreference {
  id: string;
  user_id: string;
  
  // Preference Data
  preference_type: string;
  preference_value: Record<string, any>;
  
  // Learning Data
  confidence_score: number;
  last_updated_by: 'user' | 'ai' | 'system';
  
  created_at: string;
  updated_at: string;
}

// Create/Update Types (without generated fields and timestamps)
export type CreateBillCategory = Omit<BillCategory, 'id' | 'created_at' | 'updated_at'>;
export type UpdateBillCategory = Partial<CreateBillCategory>;

export type CreateBillTag = Omit<BillTag, 'id' | 'usage_count' | 'created_at' | 'updated_at'>;
export type UpdateBillTag = Partial<CreateBillTag>;

export type CreateBillTemplate = Omit<BillTemplate, 'id' | 'created_at' | 'updated_at' | 'category'>;
export type UpdateBillTemplate = Partial<CreateBillTemplate>;

export type CreateBillInstance = Omit<BillInstance, 'id' | 'can_edit' | 'created_at' | 'updated_at' | 'category' | 'tags' | 'template'>;
export type UpdateBillInstance = Partial<CreateBillInstance>;

export type CreateBillAttachment = Omit<BillAttachment, 'id' | 'created_at'>;

// RRULE Helper Types
export interface RRuleConfig {
  freq: 'YEARLY' | 'MONTHLY' | 'WEEKLY' | 'DAILY';
  interval?: number;
  count?: number;
  until?: string; // ISO date
  byweekday?: string[];
  bymonth?: number[];
  bymonthday?: number[];
}

// API Response Types
export interface BillStats {
  total_bills: number;
  pending_bills: number;
  overdue_bills: number;
  paid_bills: number;
  total_amount: number;
  pending_amount: number;
  overdue_amount: number;
  paid_amount: number;
  upcoming_bills: number;
}

export interface BillWithDetails extends Omit<BillInstance, 'category' | 'tags' | 'template'> {
  category: BillCategory | null;
  tags: BillTag[];
  attachments: BillAttachment[];
  template: BillTemplate | null;
}

export interface TemplateWithDetails extends Omit<BillTemplate, 'category'> {
  category: BillCategory | null;
  attachments: BillAttachment[];
  upcoming_instances: BillInstance[];
}

// Search and Filter Types
export interface BillFilters {
  status?: BillStatus | BillStatus[];
  category_id?: string | string[];
  tag_id?: string | string[];
  date_from?: string;
  date_to?: string;
  amount_min?: number;
  amount_max?: number;
  is_recurring?: boolean;
  priority?: number | number[];
  search?: string;
}

export interface SortOptions {
  field: 'due_date' | 'amount' | 'title' | 'status' | 'priority' | 'created_at';
  direction: 'asc' | 'desc';
}

// AI Analytics Types
export interface SpendingAnalytics {
  monthly_trends: {
    month: string;
    total: number;
    count: number;
    average: number;
  }[];
  category_breakdown: {
    category: BillCategory;
    total: number;
    count: number;
    percentage: number;
  }[];
  payment_patterns: {
    on_time_percentage: number;
    average_days_late: number;
    most_common_payment_day: number;
  };
  predictions: {
    next_month_estimate: number;
    confidence: number;
    trends: 'increasing' | 'decreasing' | 'stable';
  };
}

// Bulk Operations
export interface BulkUpdateRequest {
  bill_ids: string[];
  updates: Partial<UpdateBillInstance>;
}

export interface BulkPaymentRequest {
  bill_ids: string[];
  paid_date: string;
  notes?: string;
}

// Template Generation
export interface GenerateInstancesRequest {
  template_id: string;
  generate_until: string; // ISO date
  force_regenerate?: boolean;
}

export interface GeneratedInstance {
  due_date: string;
  amount: number;
  title: string;
  description?: string;
}

// Error Types
export interface BillError {
  code: string;
  message: string;
  field?: string;
}

// Webhook Types for AI Integration
export interface BillWebhookPayload {
  event_type: BillEventType;
  bill_instance?: BillInstance;
  bill_template?: BillTemplate;
  user_id: string;
  timestamp: string;
} 