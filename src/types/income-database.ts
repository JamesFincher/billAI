// Income Tracking Database Types

export interface IncomeCategory {
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

export interface IncomeTag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface IncomeTemplate {
  id: string;
  user_id: string;
  
  // Basic Info
  title: string;
  description?: string;
  expected_amount: number; // Expected recurring amount
  currency: string;
  
  // Income Source Details
  source_type: 'salary' | 'freelance' | 'business' | 'investment' | 'rental' | 'pension' | 'benefits' | 'other';
  tax_category: 'pre_tax' | 'post_tax' | 'tax_free';
  is_gross_amount: boolean; // Whether amount is before or after deductions
  
  // Categorization
  category_id?: string;
  category?: IncomeCategory;
  
  // Payer Information
  payer_name?: string;
  payer_reference?: string; // Account number, employee ID, etc.
  payment_method: 'direct_deposit' | 'check' | 'cash' | 'wire_transfer' | 'other';
  
  // Recurrence (RRULE/iCal)
  is_recurring: boolean;
  rrule?: string; // RFC 5545 RRULE string
  dtstart?: string; // ISO timestamp
  dtend?: string; // ISO timestamp
  timezone: string;
  
  // Template Settings
  is_active: boolean;
  auto_generate_days_ahead: number;
  
  // Variance Tracking
  allow_amount_variance: boolean;
  expected_variance_percentage: number; // Expected +/- variance
  
  // Metadata
  notes?: string;
  priority: 1 | 2 | 3 | 4 | 5;
  
  // AI Learning Data
  ai_confidence_score: number;
  ai_suggested_category_id?: string;
  ai_predicted_next_amount?: number;
  ai_variance_prediction?: number;
  ai_metadata: Record<string, any>;
  
  created_at: string;
  updated_at: string;
}

export type IncomeStatus = 'expected' | 'received' | 'late' | 'cancelled' | 'partial' | 'scheduled';

export interface IncomeInstance {
  id: string;
  user_id: string;
  template_id?: string;
  template?: IncomeTemplate;
  
  // Instance Info
  title: string;
  description?: string;
  expected_amount: number;
  actual_amount?: number; // Actual received amount
  currency: string;
  
  // Dates
  expected_date: string; // ISO date
  received_date?: string; // ISO timestamp when actually received
  scheduled_date?: string; // ISO timestamp when scheduled
  created_date: string; // ISO timestamp
  
  // Status
  status: IncomeStatus;
  is_recurring: boolean;
  
  // Income Source Details
  source_type: 'salary' | 'freelance' | 'business' | 'investment' | 'rental' | 'pension' | 'benefits' | 'other';
  tax_category: 'pre_tax' | 'post_tax' | 'tax_free';
  is_gross_amount: boolean;
  
  // Payer Information
  payer_name?: string;
  payer_reference?: string;
  payment_method: 'direct_deposit' | 'check' | 'cash' | 'wire_transfer' | 'other';
  
  // Variance Analysis
  amount_variance?: number; // Difference between expected and actual
  variance_percentage?: number;
  variance_reason?: string;
  
  // Categorization
  category_id?: string;
  category?: IncomeCategory;
  tags?: IncomeTag[];
  
  // Tax & Deduction Tracking
  tax_withheld?: number;
  deductions?: number;
  net_amount?: number;
  
  // Metadata
  notes?: string;
  priority: 1 | 2 | 3 | 4 | 5;
  
  // Performance Tracking
  days_early_late?: number; // Positive for early, negative for late
  
  // Immutability Control
  is_historical: boolean;
  can_edit: boolean; // Generated column
  original_expected_amount?: number;
  
  // AI Data
  ai_predicted_amount?: number;
  ai_confidence_score: number;
  ai_punctuality_score: number; // How reliable this income source is
  ai_variance_risk_score: number; // Risk of amount variance
  ai_metadata: Record<string, any>;
  
  created_at: string;
  updated_at: string;
}

export interface IncomeInstanceTag {
  id: string;
  income_instance_id: string;
  tag_id: string;
  created_at: string;
}

export interface IncomeAttachment {
  id: string;
  user_id: string;
  income_instance_id?: string;
  income_template_id?: string;
  
  // File Info
  filename: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  
  // Metadata
  description?: string;
  is_paystub: boolean;
  is_tax_document: boolean;
  
  // AI Analysis
  ai_extracted_data: Record<string, any>;
  ai_confidence_score: number;
  
  created_at: string;
}

export type IncomeEventType = 
  | 'created' 
  | 'updated' 
  | 'received' 
  | 'cancelled' 
  | 'late'
  | 'amount_changed' 
  | 'date_changed' 
  | 'category_changed' 
  | 'status_changed'
  | 'variance_detected';

export interface IncomeHistory {
  id: string;
  user_id: string;
  income_instance_id?: string;
  income_template_id?: string;
  
  // Event Info
  event_type: IncomeEventType;
  
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

export type IncomePatternType = 
  | 'monthly_average'
  | 'seasonal_pattern'
  | 'source_reliability'
  | 'amount_prediction'
  | 'variance_analysis'
  | 'growth_trend'
  | 'tax_optimization';

export interface UserIncomePattern {
  id: string;
  user_id: string;
  
  // Pattern Data
  pattern_type: IncomePatternType;
  category_id?: string;
  category?: IncomeCategory;
  source_type?: string;
  
  // Analysis Results
  pattern_data: Record<string, any>;
  confidence_score: number;
  
  // Time Period
  analysis_period_start: string; // ISO date
  analysis_period_end: string; // ISO date
  
  created_at: string;
  updated_at: string;
}

// Create/Update Types (without generated fields and timestamps)
export type CreateIncomeCategory = Omit<IncomeCategory, 'id' | 'created_at' | 'updated_at'>;
export type UpdateIncomeCategory = Partial<CreateIncomeCategory>;

export type CreateIncomeTag = Omit<IncomeTag, 'id' | 'usage_count' | 'created_at' | 'updated_at'>;
export type UpdateIncomeTag = Partial<CreateIncomeTag>;

export type CreateIncomeTemplate = Omit<IncomeTemplate, 'id' | 'created_at' | 'updated_at' | 'category'>;
export type UpdateIncomeTemplate = Partial<CreateIncomeTemplate>;

export type CreateIncomeInstance = Omit<IncomeInstance, 'id' | 'can_edit' | 'created_at' | 'updated_at' | 'category' | 'tags' | 'template'>;
export type UpdateIncomeInstance = Partial<CreateIncomeInstance>;

export type CreateIncomeAttachment = Omit<IncomeAttachment, 'id' | 'created_at'>;

// RRULE Helper Types (same as bills)
export interface IncomeRRuleConfig {
  freq: 'YEARLY' | 'MONTHLY' | 'WEEKLY' | 'DAILY';
  interval?: number;
  count?: number;
  until?: string; // ISO date
  byweekday?: string[];
  bymonth?: number[];
  bymonthday?: number[];
}

// API Response Types
export interface IncomeStats {
  total_expected: number;
  total_received: number;
  expected_instances: number;
  received_instances: number;
  late_instances: number;
  pending_instances: number;
  total_variance: number;
  average_variance_percentage: number;
  reliability_score: number;
}

export interface IncomeWithDetails extends Omit<IncomeInstance, 'category' | 'tags' | 'template'> {
  category: IncomeCategory | null;
  tags: IncomeTag[];
  attachments: IncomeAttachment[];
  template: IncomeTemplate | null;
}

export interface IncomeTemplateWithDetails extends Omit<IncomeTemplate, 'category'> {
  category: IncomeCategory | null;
  attachments: IncomeAttachment[];
  upcoming_instances: IncomeInstance[];
}

// Search and Filter Types
export interface IncomeFilters {
  status?: IncomeStatus | IncomeStatus[];
  source_type?: string | string[];
  category_id?: string | string[];
  tag_id?: string | string[];
  date_from?: string;
  date_to?: string;
  amount_min?: number;
  amount_max?: number;
  is_recurring?: boolean;
  priority?: number | number[];
  search?: string;
  variance_threshold?: number; // Filter by variance percentage
}

export interface IncomeSortOptions {
  field: 'expected_date' | 'expected_amount' | 'actual_amount' | 'title' | 'status' | 'priority' | 'created_at' | 'variance_percentage';
  direction: 'asc' | 'desc';
}

// AI Analytics Types
export interface IncomeAnalytics {
  monthly_trends: {
    month: string;
    expected_total: number;
    actual_total: number;
    count: number;
    variance: number;
    reliability_score: number;
  }[];
  source_breakdown: {
    source_type: string;
    expected_total: number;
    actual_total: number;
    count: number;
    variance_percentage: number;
    reliability_score: number;
  }[];
  category_breakdown: {
    category: IncomeCategory;
    expected_total: number;
    actual_total: number;
    count: number;
    variance_percentage: number;
  }[];
  punctuality_patterns: {
    average_days_early_late: number;
    on_time_percentage: number;
    early_percentage: number;
    late_percentage: number;
    most_reliable_source: string;
    least_reliable_source: string;
  };
  predictions: {
    next_month_estimate: number;
    confidence: number;
    expected_variance: number;
    growth_trend: 'increasing' | 'decreasing' | 'stable';
    seasonal_factors: Record<string, number>;
  };
  tax_insights: {
    total_pre_tax: number;
    total_post_tax: number;
    total_tax_free: number;
    estimated_tax_liability: number;
    deduction_opportunities: string[];
  };
}

// Bulk Operations
export interface BulkIncomeUpdateRequest {
  income_ids: string[];
  updates: Partial<UpdateIncomeInstance>;
}

export interface BulkIncomeReceivedRequest {
  income_ids: string[];
  received_date: string;
  actual_amounts?: Record<string, number>; // income_id -> actual_amount
  notes?: string;
}

// Template Generation
export interface GenerateIncomeInstancesRequest {
  template_id: string;
  generate_until: string; // ISO date
  force_regenerate?: boolean;
}

export interface GeneratedIncomeInstance {
  expected_date: string;
  expected_amount: number;
  title: string;
  description?: string;
}

// Variance Analysis
export interface VarianceAnalysis {
  income_id: string;
  expected_amount: number;
  actual_amount: number;
  variance: number;
  variance_percentage: number;
  variance_category: 'within_expected' | 'minor_variance' | 'major_variance' | 'significant_variance';
  impact_score: number; // How much this variance affects overall income reliability
  suggestions: string[];
}

// Financial Health Metrics
export interface IncomeHealthMetrics {
  consistency_score: number; // 0-100, how consistent income is
  growth_rate: number; // Month-over-month growth percentage
  diversification_score: number; // How diversified income sources are
  predictability_score: number; // How predictable future income is
  volatility_index: number; // Income volatility measure
  seasonal_stability: number; // How stable income is across seasons
}

// Tax Optimization
export interface TaxOptimizationSuggestion {
  id: string;
  type: 'deduction' | 'timing' | 'structure' | 'withholding';
  title: string;
  description: string;
  potential_savings: number;
  confidence_score: number;
  applicable_income_ids: string[];
  implementation_complexity: 'low' | 'medium' | 'high';
  deadline?: string;
}

// Error Types
export interface IncomeError {
  code: string;
  message: string;
  field?: string;
}

// Webhook Types for AI Integration
export interface IncomeWebhookPayload {
  event_type: IncomeEventType;
  income_instance?: IncomeInstance;
  income_template?: IncomeTemplate;
  user_id: string;
  timestamp: string;
}

// Integration Types
export interface BankIntegrationData {
  account_id: string;
  transaction_id: string;
  amount: number;
  date: string;
  description: string;
  matched_income_id?: string;
  confidence_score: number;
}