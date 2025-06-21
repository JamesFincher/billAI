-- Enhanced Bill Features Migration
-- Adding vendor, payment, usage, and contract tracking capabilities

-- Vendors/Service Providers Table
create table if not exists public.bill_vendors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  
  -- Basic Info
  name text not null,
  display_name text,
  category text, -- 'utility', 'subscription', 'insurance', etc.
  
  -- Contact Info
  website text,
  phone text,
  email text,
  address jsonb, -- {street, city, state, zip, country}
  
  -- Business Info
  business_number text, -- Tax ID, registration number
  industry_type text,
  
  -- AI Recognition Data
  known_aliases text[], -- Alternative names for AI recognition
  email_domains text[], -- Email domains for auto-detection
  keywords text[], -- Keywords for AI classification
  
  -- Metadata
  logo_url text,
  color_scheme text,
  is_verified boolean default false, -- Manually verified by user
  auto_detected boolean default false, -- Found by AI
  
  -- AI Learning
  ai_confidence_score decimal(3,2) default 0.0,
  ai_metadata jsonb default '{}',
  
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  
  unique(user_id, name)
);

-- Payment Methods Table
create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  
  -- Method Info
  name text not null, -- 'Chase Checking', 'Amex Card', etc.
  type text not null check (type in ('checking', 'savings', 'credit_card', 'debit_card', 'cash', 'crypto', 'other')),
  
  -- Details (masked for security)
  last_four_digits text,
  bank_name text,
  account_nickname text,
  
  -- Preferences
  is_default boolean default false,
  is_active boolean default true,
  auto_pay_enabled boolean default false,
  
  -- Limits & Tracking
  monthly_limit decimal(12,2),
  current_month_usage decimal(12,2) default 0,
  
  -- AI Insights
  preferred_categories text[], -- Categories this method is typically used for
  avg_transaction_amount decimal(12,2),
  
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Enhanced Bill Templates with new features
alter table public.bill_templates add column if not exists vendor_id uuid references public.bill_vendors(id) on delete set null;
alter table public.bill_templates add column if not exists payment_method_id uuid references public.payment_methods(id) on delete set null;
alter table public.bill_templates add column if not exists location jsonb; -- {address, city, state, zip, coordinates}
alter table public.bill_templates add column if not exists contract_start_date date;
alter table public.bill_templates add column if not exists contract_end_date date;
alter table public.bill_templates add column if not exists contract_terms jsonb; -- Contract details
alter table public.bill_templates add column if not exists auto_renewal boolean default false;
alter table public.bill_templates add column if not exists early_payment_discount_percentage decimal(5,2);
alter table public.bill_templates add column if not exists early_payment_discount_days integer;
alter table public.bill_templates add column if not exists late_fee_amount decimal(12,2);
alter table public.bill_templates add column if not exists late_fee_days integer;
alter table public.bill_templates add column if not exists is_tax_deductible boolean default false;
alter table public.bill_templates add column if not exists tax_category text; -- 'business_expense', 'medical', 'charity', etc.
alter table public.bill_templates add column if not exists usage_unit text; -- 'kwh', 'gb', 'minutes', etc.
alter table public.bill_templates add column if not exists rate_per_unit decimal(12,4);
alter table public.bill_templates add column if not exists base_charge decimal(12,2); -- Fixed monthly charge
alter table public.bill_templates add column if not exists bill_source text check (bill_source in ('manual', 'email_import', 'photo_scan', 'api_import', 'bulk_upload'));

-- Enhanced Bill Instances with new features
alter table public.bill_instances add column if not exists vendor_id uuid references public.bill_vendors(id) on delete set null;
alter table public.bill_instances add column if not exists payment_method_id uuid references public.payment_methods(id) on delete set null;
alter table public.bill_instances add column if not exists location jsonb;
alter table public.bill_instances add column if not exists usage_amount decimal(12,4); -- Actual usage (kwh, gb, etc.)
alter table public.bill_instances add column if not exists usage_unit text;
alter table public.bill_instances add column if not exists rate_per_unit decimal(12,4);
alter table public.bill_instances add column if not exists base_charge decimal(12,2);
alter table public.bill_instances add column if not exists discount_applied decimal(12,2) default 0;
alter table public.bill_instances add column if not exists discount_reason text;
alter table public.bill_instances add column if not exists late_fee_applied decimal(12,2) default 0;
alter table public.bill_instances add column if not exists confirmation_number text; -- Payment confirmation
alter table public.bill_instances add column if not exists payment_reference text; -- Bank reference
alter table public.bill_instances add column if not exists is_split_payment boolean default false;
alter table public.bill_instances add column if not exists split_details jsonb; -- Who pays what
alter table public.bill_instances add column if not exists is_tax_deductible boolean default false;
alter table public.bill_instances add column if not exists tax_category text;
alter table public.bill_instances add column if not exists bill_source text check (bill_source in ('manual', 'email_import', 'photo_scan', 'api_import', 'bulk_upload'));
alter table public.bill_instances add column if not exists extracted_text text; -- OCR extracted text
alter table public.bill_instances add column if not exists anomaly_detected boolean default false;
alter table public.bill_instances add column if not exists anomaly_reason text;
alter table public.bill_instances add column if not exists seasonal_adjustment_factor decimal(5,4) default 1.0;

-- Bill Usage History (for tracking usage patterns over time)
create table if not exists public.bill_usage_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  bill_instance_id uuid references public.bill_instances(id) on delete cascade not null,
  template_id uuid references public.bill_templates(id) on delete set null,
  
  -- Usage Data
  usage_amount decimal(12,4) not null,
  usage_unit text not null,
  usage_period_start date not null,
  usage_period_end date not null,
  
  -- Context Data
  weather_data jsonb, -- Temperature, conditions during usage period
  occupancy_data jsonb, -- People in home, travel days, etc.
  
  -- Calculations
  cost_per_unit decimal(12,4),
  efficiency_score decimal(3,2), -- Compared to similar periods
  
  created_at timestamp with time zone default now() not null
);

-- Smart Notifications Table
create table if not exists public.smart_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  bill_instance_id uuid references public.bill_instances(id) on delete cascade,
  template_id uuid references public.bill_templates(id) on delete cascade,
  
  -- Notification Info
  type text not null check (type in (
    'payment_due', 'amount_anomaly', 'usage_spike', 'contract_renewal', 
    'early_payment_discount', 'seasonal_prediction', 'optimization_suggestion',
    'price_change_detected', 'vendor_issue_alert'
  )),
  title text not null,
  message text not null,
  severity text default 'info' check (severity in ('info', 'warning', 'urgent')),
  
  -- Scheduling
  scheduled_for timestamp with time zone not null,
  sent_at timestamp with time zone,
  
  -- Status
  is_read boolean default false,
  is_dismissed boolean default false,
  action_taken text, -- What action user took if any
  
  -- AI Context
  ai_reasoning text, -- Why this notification was generated
  confidence_score decimal(3,2) default 0.0,
  
  created_at timestamp with time zone default now() not null
);

-- Quick Actions Table (for user shortcuts)
create table if not exists public.quick_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  
  -- Action Info
  name text not null,
  action_type text not null check (action_type in (
    'mark_paid', 'snooze_bill', 'split_payment', 'apply_discount', 
    'change_due_date', 'add_note', 'change_amount', 'bulk_action'
  )),
  
  -- Configuration
  default_values jsonb default '{}',
  keyboard_shortcut text,
  is_enabled boolean default true,
  usage_count integer default 0,
  
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Environmental Data (for usage correlation)
create table if not exists public.environmental_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  
  -- Date and Location
  date date not null,
  location jsonb not null, -- {city, state, zip}
  
  -- Weather Data
  temperature_high decimal(5,2),
  temperature_low decimal(5,2),
  temperature_avg decimal(5,2),
  humidity decimal(5,2),
  conditions text, -- 'sunny', 'rainy', 'snow', etc.
  
  -- Other Factors
  is_holiday boolean default false,
  is_weekend boolean default false,
  daylight_hours decimal(4,2),
  
  -- AI Correlation Scores
  utility_impact_score decimal(3,2), -- How much this affects utility bills
  
  created_at timestamp with time zone default now() not null,
  
  unique(user_id, date, location)
);

-- RLS Policies for new tables
alter table public.bill_vendors enable row level security;
alter table public.payment_methods enable row level security;
alter table public.bill_usage_history enable row level security;
alter table public.smart_notifications enable row level security;
alter table public.quick_actions enable row level security;
alter table public.environmental_data enable row level security;

-- Vendor policies
create policy "Users can manage their own vendors" on public.bill_vendors
  for all using (auth.uid() = user_id);

-- Payment method policies
create policy "Users can manage their own payment methods" on public.payment_methods
  for all using (auth.uid() = user_id);

-- Usage history policies
create policy "Users can view their own usage history" on public.bill_usage_history
  for all using (auth.uid() = user_id);

-- Smart notifications policies
create policy "Users can manage their own notifications" on public.smart_notifications
  for all using (auth.uid() = user_id);

-- Quick actions policies
create policy "Users can manage their own quick actions" on public.quick_actions
  for all using (auth.uid() = user_id);

-- Environmental data policies
create policy "Users can view environmental data for their location" on public.environmental_data
  for select using (auth.uid() = user_id);

-- Updated_at triggers for new tables
create trigger handle_bill_vendors_updated_at
  before update on public.bill_vendors
  for each row execute function public.handle_updated_at();

create trigger handle_payment_methods_updated_at
  before update on public.payment_methods
  for each row execute function public.handle_updated_at();

create trigger handle_quick_actions_updated_at
  before update on public.quick_actions
  for each row execute function public.handle_updated_at();

-- Indexes for performance
create index bill_vendors_user_id_idx on public.bill_vendors(user_id);
create index payment_methods_user_id_idx on public.payment_methods(user_id);
create index bill_usage_history_user_id_idx on public.bill_usage_history(user_id);
create index bill_usage_history_bill_idx on public.bill_usage_history(bill_instance_id);
create index smart_notifications_user_id_idx on public.smart_notifications(user_id);
create index smart_notifications_scheduled_idx on public.smart_notifications(scheduled_for);
create index quick_actions_user_id_idx on public.quick_actions(user_id);
create index environmental_data_user_date_idx on public.environmental_data(user_id, date);

-- Functions for enhanced bill features

-- Function to detect bill anomalies
create or replace function public.detect_bill_anomalies()
returns void as $$
declare
  bill_record record;
  avg_amount decimal;
  std_dev decimal;
  threshold decimal;
begin
  -- Check for amount anomalies in recent bills
  for bill_record in 
    select b.*, t.title as template_title
    from public.bill_instances b
    left join public.bill_templates t on b.template_id = t.id
    where b.created_at > now() - interval '7 days'
    and not b.anomaly_detected
  loop
    -- Calculate average and standard deviation for similar bills
    select 
      avg(amount), 
      stddev(amount)
    into avg_amount, std_dev
    from public.bill_instances
    where template_id = bill_record.template_id
    and id != bill_record.id
    and created_at > now() - interval '1 year';
    
    -- Set threshold (2 standard deviations)
    threshold := coalesce(std_dev * 2, avg_amount * 0.5);
    
    -- Check if current bill exceeds threshold
    if abs(bill_record.amount - coalesce(avg_amount, bill_record.amount)) > threshold then
      update public.bill_instances
      set 
        anomaly_detected = true,
        anomaly_reason = case 
          when bill_record.amount > avg_amount + threshold then 'Amount significantly higher than usual'
          else 'Amount significantly lower than usual'
        end
      where id = bill_record.id;
    end if;
  end loop;
end;
$$ language plpgsql security definer;

-- Function to calculate seasonal adjustments
create or replace function public.calculate_seasonal_adjustment(
  p_user_id uuid,
  p_template_id uuid,
  p_due_date date
)
returns decimal as $$
declare
  same_month_avg decimal;
  yearly_avg decimal;
  adjustment_factor decimal;
begin
  -- Get average for same month in previous years
  select avg(amount)
  into same_month_avg
  from public.bill_instances
  where user_id = p_user_id
  and template_id = p_template_id
  and extract(month from due_date) = extract(month from p_due_date)
  and extract(year from due_date) < extract(year from p_due_date);
  
  -- Get overall yearly average
  select avg(amount)
  into yearly_avg
  from public.bill_instances
  where user_id = p_user_id
  and template_id = p_template_id
  and due_date > p_due_date - interval '1 year';
  
  -- Calculate adjustment factor
  if same_month_avg is not null and yearly_avg is not null and yearly_avg > 0 then
    adjustment_factor := same_month_avg / yearly_avg;
  else
    adjustment_factor := 1.0;
  end if;
  
  return adjustment_factor;
end;
$$ language plpgsql security definer;

-- Function to generate smart notifications
create or replace function public.generate_smart_notifications()
returns void as $$
declare
  bill_record record;
  discount_deadline date;
begin
  -- Early payment discount notifications
  for bill_record in
    select b.*, t.early_payment_discount_days, t.early_payment_discount_percentage
    from public.bill_instances b
    join public.bill_templates t on b.template_id = t.id
    where b.status = 'pending'
    and t.early_payment_discount_days is not null
    and t.early_payment_discount_percentage is not null
    and b.due_date > current_date
  loop
    discount_deadline := bill_record.due_date - interval '1 day' * bill_record.early_payment_discount_days;
    
    if discount_deadline = current_date + interval '3 days' then
      insert into public.smart_notifications (
        user_id, bill_instance_id, type, title, message, scheduled_for, severity
      ) values (
        bill_record.user_id,
        bill_record.id,
        'early_payment_discount',
        'Early Payment Discount Available',
        format('Pay %s by %s to save %s%% (%s)', 
          bill_record.title, 
          discount_deadline::text, 
          bill_record.early_payment_discount_percentage::text,
          (bill_record.amount * bill_record.early_payment_discount_percentage / 100)::text
        ),
        current_timestamp,
        'info'
      );
    end if;
  end loop;
  
  -- Contract renewal notifications
  for bill_record in
    select t.*, u.email
    from public.bill_templates t
    join auth.users u on t.user_id = u.id
    where t.contract_end_date is not null
    and t.contract_end_date between current_date + interval '30 days' and current_date + interval '31 days'
    and t.is_active = true
  loop
    insert into public.smart_notifications (
      user_id, template_id, type, title, message, scheduled_for, severity
    ) values (
      bill_record.user_id,
      bill_record.id,
      'contract_renewal',
      'Contract Renewal Reminder',
      format('Your %s contract expires on %s. Consider reviewing terms or shopping for alternatives.',
        bill_record.title,
        bill_record.contract_end_date::text
      ),
      current_timestamp,
      'warning'
    );
  end loop;
end;
$$ language plpgsql security definer;