// Enhanced Bill Tracking Database Types with Advanced Features

// Vendor/Service Provider Types
export interface BillVendor {
  id: string;
  user_id: string;
  
  // Basic Info
  name: string;
  display_name?: string;
  category?: string; // 'utility', 'subscription', 'insurance', etc.
  
  // Contact Info
  website?: string;
  phone?: string;
  email?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  
  // Business Info
  business_number?: string;
  industry_type?: string;
  
  // AI Recognition Data
  known_aliases: string[];
  email_domains: string[];
  keywords: string[];
  
  // Metadata
  logo_url?: string;
  color_scheme?: string;
  is_verified: boolean;
  auto_detected: boolean;
  
  // AI Learning
  ai_confidence_score: number;
  ai_metadata: Record<string, any>;
  
  created_at: string;
  updated_at: string;
}

// Payment Method Types
export type PaymentMethodType = 'checking' | 'savings' | 'credit_card' | 'debit_card' | 'cash' | 'crypto' | 'other';

export interface PaymentMethod {
  id: string;
  user_id: string;
  
  // Method Info
  name: string;
  type: PaymentMethodType;
  
  // Details (masked for security)
  last_four_digits?: string;
  bank_name?: string;
  account_nickname?: string;
  
  // Preferences
  is_default: boolean;
  is_active: boolean;
  auto_pay_enabled: boolean;
  
  // Limits & Tracking
  monthly_limit?: number;
  current_month_usage: number;
  
  // AI Insights
  preferred_categories: string[];
  avg_transaction_amount?: number;
  
  created_at: string;
  updated_at: string;
}

// Usage History Types
export interface BillUsageHistory {
  id: string;
  user_id: string;
  bill_instance_id: string;
  template_id?: string;
  
  // Usage Data
  usage_amount: number;
  usage_unit: string;
  usage_period_start: string;
  usage_period_end: string;
  
  // Context Data
  weather_data?: {
    temperature_high?: number;
    temperature_low?: number;
    temperature_avg?: number;
    humidity?: number;
    conditions?: string;
  };
  occupancy_data?: {
    people_count?: number;
    travel_days?: number;
    work_from_home_days?: number;
  };
  
  // Calculations
  cost_per_unit?: number;
  efficiency_score?: number;
  
  created_at: string;
}

// Smart Notifications
export type NotificationType = 
  | 'payment_due' 
  | 'amount_anomaly' 
  | 'usage_spike' 
  | 'contract_renewal'
  | 'early_payment_discount' 
  | 'seasonal_prediction' 
  | 'optimization_suggestion'
  | 'price_change_detected' 
  | 'vendor_issue_alert';

export type NotificationSeverity = 'info' | 'warning' | 'urgent';

export interface SmartNotification {
  id: string;
  user_id: string;
  bill_instance_id?: string;
  template_id?: string;
  
  // Notification Info
  type: NotificationType;
  title: string;
  message: string;
  severity: NotificationSeverity;
  
  // Scheduling
  scheduled_for: string;
  sent_at?: string;
  
  // Status
  is_read: boolean;
  is_dismissed: boolean;
  action_taken?: string;
  
  // AI Context
  ai_reasoning?: string;
  confidence_score: number;
  
  created_at: string;
}

// Quick Actions
export type QuickActionType = 
  | 'mark_paid' 
  | 'snooze_bill' 
  | 'split_payment' 
  | 'apply_discount'
  | 'change_due_date' 
  | 'add_note' 
  | 'change_amount' 
  | 'bulk_action';

export interface QuickAction {
  id: string;
  user_id: string;
  
  // Action Info
  name: string;
  action_type: QuickActionType;
  
  // Configuration
  default_values: Record<string, any>;
  keyboard_shortcut?: string;
  is_enabled: boolean;
  usage_count: number;
  
  created_at: string;
  updated_at: string;
}

// Environmental Data
export interface EnvironmentalData {
  id: string;
  user_id: string;
  
  // Date and Location
  date: string;
  location: {
    city: string;
    state: string;
    zip: string;
  };
  
  // Weather Data
  temperature_high?: number;
  temperature_low?: number;
  temperature_avg?: number;
  humidity?: number;
  conditions?: string;
  
  // Other Factors
  is_holiday: boolean;
  is_weekend: boolean;
  daylight_hours?: number;
  
  // AI Correlation Scores
  utility_impact_score?: number;
  
  created_at: string;
}

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

export type BillSource = 'manual' | 'email_import' | 'photo_scan' | 'api_import' | 'bulk_upload';

export interface BillTemplate {
  id: string;
  user_id: string;
  
  // Basic Info
  title: string;
  description?: string;
  amount?: number;
  currency: string;
  
  // Vendor & Payment
  vendor_id?: string;
  vendor?: BillVendor;
  payment_method_id?: string;
  payment_method?: PaymentMethod;
  
  // Location
  location?: {
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  
  // Categorization
  category_id?: string;
  category?: BillCategory;
  
  // Recurrence (RRULE/iCal)
  is_recurring: boolean;
  rrule?: string;
  dtstart?: string;
  dtend?: string;
  timezone: string;
  
  // Contract Info
  contract_start_date?: string;
  contract_end_date?: string;
  contract_terms?: Record<string, any>;
  auto_renewal: boolean;
  
  // Financial Terms
  early_payment_discount_percentage?: number;
  early_payment_discount_days?: number;
  late_fee_amount?: number;
  late_fee_days?: number;
  
  // Tax Info
  is_tax_deductible: boolean;
  tax_category?: string;
  
  // Usage Tracking
  usage_unit?: string;
  rate_per_unit?: number;
  base_charge?: number;
  
  // Template Settings
  is_active: boolean;
  auto_generate_days_ahead: number;
  bill_source?: BillSource;
  
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
  
  // Vendor & Payment
  vendor_id?: string;
  vendor?: BillVendor;
  payment_method_id?: string;
  payment_method?: PaymentMethod;
  
  // Location
  location?: {
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  
  // Usage Information
  usage_amount?: number;
  usage_unit?: string;
  rate_per_unit?: number;
  base_charge?: number;
  
  // Dates
  due_date: string;
  scheduled_date?: string;
  paid_date?: string;
  created_date: string;
  
  // Status
  status: BillStatus;
  is_recurring: boolean;
  
  // Categorization
  category_id?: string;
  category?: BillCategory;
  tags?: BillTag[];
  
  // Financial Details
  discount_applied: number;
  discount_reason?: string;
  late_fee_applied: number;
  confirmation_number?: string;
  payment_reference?: string;
  
  // Split Payments
  is_split_payment: boolean;
  split_details?: {
    participants: Array<{
      user_id: string;
      name: string;
      amount: number;
      paid: boolean;
    }>;
  };
  
  // Tax Info
  is_tax_deductible: boolean;
  tax_category?: string;
  
  // Source & Processing
  bill_source?: BillSource;
  extracted_text?: string;
  
  // Anomaly Detection
  anomaly_detected: boolean;
  anomaly_reason?: string;
  seasonal_adjustment_factor: number;
  
  // Metadata
  notes?: string;
  priority: 1 | 2 | 3 | 4 | 5;
  
  // Immutability Control
  is_historical: boolean;
  can_edit: boolean;
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
  analysis_period_start: string;
  analysis_period_end: string;
  
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

// Create/Update Types
export type CreateBillVendor = Omit<BillVendor, 'id' | 'created_at' | 'updated_at'>;
export type UpdateBillVendor = Partial<CreateBillVendor>;

export type CreatePaymentMethod = Omit<PaymentMethod, 'id' | 'created_at' | 'updated_at'>;
export type UpdatePaymentMethod = Partial<CreatePaymentMethod>;

export type CreateBillCategory = Omit<BillCategory, 'id' | 'created_at' | 'updated_at'>;
export type UpdateBillCategory = Partial<CreateBillCategory>;

export type CreateBillTag = Omit<BillTag, 'id' | 'usage_count' | 'created_at' | 'updated_at'>;
export type UpdateBillTag = Partial<CreateBillTag>;

export type CreateBillTemplate = Omit<BillTemplate, 'id' | 'created_at' | 'updated_at' | 'category' | 'vendor' | 'payment_method'>;
export type UpdateBillTemplate = Partial<CreateBillTemplate>;

export type CreateBillInstance = Omit<BillInstance, 'id' | 'can_edit' | 'created_at' | 'updated_at' | 'category' | 'tags' | 'template' | 'vendor' | 'payment_method'>;
export type UpdateBillInstance = Partial<CreateBillInstance>;

export type CreateBillAttachment = Omit<BillAttachment, 'id' | 'created_at'>;
export type CreateSmartNotification = Omit<SmartNotification, 'id' | 'created_at'>;
export type CreateQuickAction = Omit<QuickAction, 'id' | 'created_at' | 'updated_at'>;

// RRULE Helper Types
export interface RRuleConfig {
  freq: 'YEARLY' | 'MONTHLY' | 'WEEKLY' | 'DAILY';
  interval?: number;
  count?: number;
  until?: string;
  byweekday?: string[];
  bymonth?: number[];
  bymonthday?: number[];
}

// Enhanced API Response Types
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
  
  // Enhanced stats
  bills_with_discounts: number;
  total_savings: number;
  average_bill_amount: number;
  most_expensive_category: string;
  payment_method_usage: Record<string, number>;
  vendor_count: number;
  contract_renewals_upcoming: number;
}

export interface BillWithDetails extends Omit<BillInstance, 'category' | 'tags' | 'template' | 'vendor' | 'payment_method'> {
  category: BillCategory | null;
  tags: BillTag[];
  attachments: BillAttachment[];
  template: BillTemplate | null;
  vendor: BillVendor | null;
  payment_method: PaymentMethod | null;
  usage_history: BillUsageHistory[];
  smart_notifications: SmartNotification[];
}

export interface TemplateWithDetails extends Omit<BillTemplate, 'category' | 'vendor' | 'payment_method'> {
  category: BillCategory | null;
  vendor: BillVendor | null;
  payment_method: PaymentMethod | null;
  attachments: BillAttachment[];
  upcoming_instances: BillInstance[];
  usage_patterns: BillUsageHistory[];
}

// Enhanced Search and Filter Types
export interface BillFilters {
  status?: BillStatus | BillStatus[];
  category_id?: string | string[];
  tag_id?: string | string[];
  vendor_id?: string | string[];
  payment_method_id?: string | string[];
  date_from?: string;
  date_to?: string;
  amount_min?: number;
  amount_max?: number;
  is_recurring?: boolean;
  priority?: number | number[];
  has_anomaly?: boolean;
  is_tax_deductible?: boolean;
  has_discount?: boolean;
  bill_source?: BillSource | BillSource[];
  contract_expiring?: boolean;
  search?: string;
}

export interface SortOptions {
  field: 'due_date' | 'amount' | 'title' | 'status' | 'priority' | 'created_at' | 'usage_amount' | 'discount_applied';
  direction: 'asc' | 'desc';
}

// Enhanced AI Analytics Types
export interface SpendingAnalytics {
  monthly_trends: {
    month: string;
    total: number;
    count: number;
    average: number;
    usage_total?: number;
    seasonal_factor: number;
  }[];
  category_breakdown: {
    category: BillCategory;
    total: number;
    count: number;
    percentage: number;
    avg_amount: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  }[];
  vendor_analysis: {
    vendor: BillVendor;
    total_spent: number;
    bill_count: number;
    avg_amount: number;
    price_trend: 'increasing' | 'decreasing' | 'stable';
  }[];
  payment_patterns: {
    on_time_percentage: number;
    average_days_late: number;
    most_common_payment_day: number;
    preferred_payment_methods: {
      method: PaymentMethod;
      usage_count: number;
      total_amount: number;
    }[];
  };
  usage_insights: {
    highest_usage_months: string[];
    efficiency_trends: {
      period: string;
      efficiency_score: number;
    }[];
    cost_per_unit_trends: {
      vendor: string;
      periods: {
        month: string;
        cost_per_unit: number;
      }[];
    }[];
  };
  savings_opportunities: {
    early_payment_savings: number;
    contract_optimization_potential: number;
    seasonal_adjustment_savings: number;
    payment_method_rewards: number;
  };
  predictions: {
    next_month_estimate: number;
    confidence: number;
    trends: 'increasing' | 'decreasing' | 'stable';
    seasonal_adjustments: {
      month: string;
      adjustment_factor: number;
    }[];
    anomaly_likelihood: {
      bill_id: string;
      probability: number;
      reason: string;
    }[];
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
  payment_method_id?: string;
  confirmation_number?: string;
  notes?: string;
}

// Enhanced Template Generation
export interface GenerateInstancesRequest {
  template_id: string;
  generate_until: string;
  force_regenerate?: boolean;
  apply_seasonal_adjustments?: boolean;
  use_ai_predictions?: boolean;
}

export interface GeneratedInstance {
  due_date: string;
  amount: number;
  title: string;
  description?: string;
  predicted_usage?: number;
  seasonal_factor?: number;
  ai_confidence?: number;
}

// OCR and AI Processing
export interface OCRProcessingResult {
  extracted_text: string;
  structured_data: {
    vendor_name?: string;
    amount?: number;
    due_date?: string;
    account_number?: string;
    usage_amount?: number;
    usage_unit?: string;
  };
  confidence_scores: Record<string, number>;
  processing_time_ms: number;
}

export interface AIBillSuggestion {
  confidence: number;
  suggested_category_id?: string;
  suggested_vendor_id?: string;
  suggested_amount?: number;
  reasoning: string;
  similar_bills: string[];
}

// Voice Input Types
export interface VoiceInputResult {
  transcript: string;
  confidence: number;
  structured_data: Partial<CreateBillInstance>;
  needs_clarification: string[];
}

// Error Types
export interface BillError {
  code: string;
  message: string;
  field?: string;
  context?: Record<string, any>;
}

// Webhook Types for AI Integration
export interface BillWebhookPayload {
  event_type: BillEventType;
  bill_instance?: BillInstance;
  bill_template?: BillTemplate;
  user_id: string;
  timestamp: string;
  metadata?: Record<string, any>;
} 