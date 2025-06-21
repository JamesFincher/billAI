-- Income Categories Table
create table if not exists public.income_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  color text default '#10B981',
  icon text,
  description text,
  is_system boolean default false, -- For AI-suggested categories
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  unique(user_id, name)
);

-- Income Tags Table (flexible labeling)
create table if not exists public.income_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  color text default '#059669',
  usage_count integer default 0,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  unique(user_id, name)
);

-- Income Templates (Master templates for recurring income)
create table if not exists public.income_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  
  -- Basic Info
  title text not null,
  description text,
  expected_amount decimal(12,2) not null,
  currency text default 'USD',
  
  -- Income Source Details
  source_type text default 'other' check (source_type in (
    'salary', 'freelance', 'business', 'investment', 'rental', 'pension', 'benefits', 'other'
  )),
  tax_category text default 'post_tax' check (tax_category in ('pre_tax', 'post_tax', 'tax_free')),
  is_gross_amount boolean default true,
  
  -- Categorization
  category_id uuid references public.income_categories(id) on delete set null,
  
  -- Payer Information
  payer_name text,
  payer_reference text, -- Account number, employee ID, etc.
  payment_method text default 'direct_deposit' check (payment_method in (
    'direct_deposit', 'check', 'cash', 'wire_transfer', 'other'
  )),
  
  -- Recurrence (RRULE/iCal)
  is_recurring boolean default false,
  rrule text, -- RFC 5545 RRULE string
  dtstart timestamp with time zone, -- Start date for recurrence
  dtend timestamp with time zone, -- End date for recurrence (optional)
  timezone text default 'UTC',
  
  -- Template Settings
  is_active boolean default true,
  auto_generate_days_ahead integer default 30, -- How many days ahead to generate instances
  
  -- Variance Tracking
  allow_amount_variance boolean default true,
  expected_variance_percentage decimal(5,2) default 5.0, -- Expected +/- variance percentage
  
  -- Metadata
  notes text,
  priority integer default 3 check (priority between 1 and 5), -- 1=low, 5=urgent
  
  -- AI Learning Data
  ai_confidence_score decimal(3,2) default 0.0, -- How confident AI is about predictions
  ai_suggested_category_id uuid references public.income_categories(id),
  ai_predicted_next_amount decimal(12,2),
  ai_variance_prediction decimal(5,2),
  ai_metadata jsonb default '{}', -- Store AI insights
  
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Income Instances (Individual occurrences - both recurring and one-time)
create table if not exists public.income_instances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  template_id uuid references public.income_templates(id) on delete set null, -- null for one-time income
  
  -- Instance Info
  title text not null,
  description text,
  expected_amount decimal(12,2) not null,
  actual_amount decimal(12,2), -- Actual received amount
  currency text default 'USD',
  
  -- Dates
  expected_date date not null,
  received_date timestamp with time zone, -- When actually received
  scheduled_date timestamp with time zone, -- When this instance was scheduled (for recurring income)
  created_date timestamp with time zone default now() not null,
  
  -- Status
  status text default 'expected' check (status in ('expected', 'received', 'late', 'cancelled', 'partial', 'scheduled')),
  is_recurring boolean default false,
  
  -- Income Source Details
  source_type text default 'other' check (source_type in (
    'salary', 'freelance', 'business', 'investment', 'rental', 'pension', 'benefits', 'other'
  )),
  tax_category text default 'post_tax' check (tax_category in ('pre_tax', 'post_tax', 'tax_free')),
  is_gross_amount boolean default true,
  
  -- Payer Information
  payer_name text,
  payer_reference text,
  payment_method text default 'direct_deposit' check (payment_method in (
    'direct_deposit', 'check', 'cash', 'wire_transfer', 'other'
  )),
  
  -- Variance Analysis
  amount_variance decimal(12,2), -- Difference between expected and actual
  variance_percentage decimal(5,2),
  variance_reason text,
  
  -- Categorization
  category_id uuid references public.income_categories(id) on delete set null,
  
  -- Tax & Deduction Tracking
  tax_withheld decimal(12,2),
  deductions decimal(12,2),
  net_amount decimal(12,2),
  
  -- Metadata
  notes text,
  priority integer default 3 check (priority between 1 and 5),
  
  -- Performance Tracking
  days_early_late integer, -- Positive for early, negative for late
  
  -- Immutability Control
  is_historical boolean default false, -- Past income becomes historical (read-only)
  can_edit boolean generated always as (not is_historical) stored,
  original_expected_amount decimal(12,2), -- Track original amount for edit history
  
  -- AI Data
  ai_predicted_amount decimal(12,2),
  ai_confidence_score decimal(3,2) default 0.0,
  ai_punctuality_score decimal(3,2) default 0.0, -- How reliable this income source is
  ai_variance_risk_score decimal(3,2) default 0.0, -- Risk of amount variance
  ai_metadata jsonb default '{}',
  
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Income Instance Tags (Many-to-Many)
create table if not exists public.income_instance_tags (
  id uuid primary key default gen_random_uuid(),
  income_instance_id uuid references public.income_instances(id) on delete cascade not null,
  tag_id uuid references public.income_tags(id) on delete cascade not null,
  created_at timestamp with time zone default now() not null,
  unique(income_instance_id, tag_id)
);

-- Income Attachments (File uploads)
create table if not exists public.income_attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  income_instance_id uuid references public.income_instances(id) on delete cascade,
  income_template_id uuid references public.income_templates(id) on delete cascade,
  
  -- File Info
  filename text not null,
  file_size bigint not null,
  mime_type text not null,
  storage_path text not null, -- Path in Supabase Storage
  
  -- Metadata
  description text,
  is_paystub boolean default false,
  is_tax_document boolean default false,
  
  -- AI Analysis
  ai_extracted_data jsonb default '{}', -- OCR/AI extracted data
  ai_confidence_score decimal(3,2) default 0.0,
  
  created_at timestamp with time zone default now() not null,
  
  -- Ensure attachment belongs to either instance or template, not both
  check ((income_instance_id is not null and income_template_id is null) or 
         (income_instance_id is null and income_template_id is not null))
);

-- Income History (Event sourcing for AI learning)
create table if not exists public.income_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  income_instance_id uuid references public.income_instances(id) on delete cascade,
  income_template_id uuid references public.income_templates(id) on delete cascade,
  
  -- Event Info
  event_type text not null check (event_type in (
    'created', 'updated', 'received', 'cancelled', 'late', 
    'amount_changed', 'date_changed', 'category_changed', 'status_changed', 'variance_detected'
  )),
  
  -- Change Data
  old_values jsonb default '{}',
  new_values jsonb default '{}',
  changed_fields text[], -- Array of field names that changed
  
  -- Context
  change_reason text,
  ip_address inet,
  user_agent text,
  
  created_at timestamp with time zone default now() not null
);

-- User Income Patterns (AI Analysis Results)
create table if not exists public.user_income_patterns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  
  -- Pattern Data
  pattern_type text not null check (pattern_type in (
    'monthly_average', 'seasonal_pattern', 'source_reliability', 
    'amount_prediction', 'variance_analysis', 'growth_trend', 'tax_optimization'
  )),
  category_id uuid references public.income_categories(id) on delete cascade,
  source_type text,
  
  -- Analysis Results
  pattern_data jsonb not null default '{}',
  confidence_score decimal(3,2) not null default 0.0,
  
  -- Time Period
  analysis_period_start date not null,
  analysis_period_end date not null,
  
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- RLS Policies
alter table public.income_categories enable row level security;
alter table public.income_tags enable row level security;
alter table public.income_templates enable row level security;
alter table public.income_instances enable row level security;
alter table public.income_instance_tags enable row level security;
alter table public.income_attachments enable row level security;
alter table public.income_history enable row level security;
alter table public.user_income_patterns enable row level security;

-- Categories Policies
create policy "Users can manage their own income categories" on public.income_categories
  for all using (auth.uid() = user_id);

-- Tags Policies  
create policy "Users can manage their own income tags" on public.income_tags
  for all using (auth.uid() = user_id);

-- Templates Policies
create policy "Users can manage their own income templates" on public.income_templates
  for all using (auth.uid() = user_id);

-- Instances Policies (with edit restrictions for historical income)
create policy "Users can view their own income instances" on public.income_instances
  for select using (auth.uid() = user_id);

create policy "Users can create their own income instances" on public.income_instances
  for insert with check (auth.uid() = user_id);

create policy "Users can update non-historical income instances" on public.income_instances
  for update using (auth.uid() = user_id and not is_historical);

create policy "Users can delete non-historical income instances" on public.income_instances
  for delete using (auth.uid() = user_id and not is_historical);

-- Instance Tags Policies
create policy "Users can manage tags for their income instances" on public.income_instance_tags
  for all using (
    exists (
      select 1 from public.income_instances 
      where income_instances.id = income_instance_tags.income_instance_id 
      and income_instances.user_id = auth.uid()
    )
  );

-- Attachments Policies
create policy "Users can manage attachments for their income" on public.income_attachments
  for all using (auth.uid() = user_id);

-- History Policies (read-only for users)
create policy "Users can view their own income history" on public.income_history
  for select using (auth.uid() = user_id);

-- Income Patterns Policies
create policy "Users can view their own income patterns" on public.user_income_patterns
  for select using (auth.uid() = user_id);

-- Triggers for updated_at
create trigger handle_income_categories_updated_at
  before update on public.income_categories
  for each row execute function public.handle_updated_at();

create trigger handle_income_tags_updated_at
  before update on public.income_tags
  for each row execute function public.handle_updated_at();

create trigger handle_income_templates_updated_at
  before update on public.income_templates
  for each row execute function public.handle_updated_at();

create trigger handle_income_instances_updated_at
  before update on public.income_instances
  for each row execute function public.handle_updated_at();

create trigger handle_user_income_patterns_updated_at
  before update on public.user_income_patterns
  for each row execute function public.handle_updated_at();

-- Function to mark income as historical
create or replace function public.mark_past_income_historical()
returns void as $$
begin
  update public.income_instances 
  set is_historical = true 
  where expected_date < current_date 
  and not is_historical;
end;
$$ language plpgsql security definer;

-- Function to calculate variance
create or replace function public.calculate_income_variance()
returns trigger as $$
begin
  if NEW.actual_amount is not null and NEW.expected_amount is not null then
    NEW.amount_variance = NEW.actual_amount - NEW.expected_amount;
    if NEW.expected_amount != 0 then
      NEW.variance_percentage = (NEW.amount_variance / NEW.expected_amount) * 100;
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger calculate_income_variance_trigger
  before insert or update on public.income_instances
  for each row execute function public.calculate_income_variance();

-- Function to calculate punctuality
create or replace function public.calculate_income_punctuality()
returns trigger as $$
begin
  if NEW.received_date is not null and NEW.expected_date is not null then
    NEW.days_early_late = extract(days from date(NEW.received_date) - NEW.expected_date);
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger calculate_income_punctuality_trigger
  before insert or update on public.income_instances
  for each row execute function public.calculate_income_punctuality();

-- Function to create income history entry
create or replace function public.create_income_history_entry()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    insert into public.income_history (
      user_id, income_instance_id, income_template_id, event_type, new_values
    ) values (
      coalesce(NEW.user_id),
      case when TG_TABLE_NAME = 'income_instances' then NEW.id else null end,
      case when TG_TABLE_NAME = 'income_templates' then NEW.id else null end,
      'created',
      to_jsonb(NEW)
    );
    return NEW;
  elsif TG_OP = 'UPDATE' then
    insert into public.income_history (
      user_id, income_instance_id, income_template_id, event_type, old_values, new_values, changed_fields
    ) values (
      coalesce(NEW.user_id),
      case when TG_TABLE_NAME = 'income_instances' then NEW.id else null end,
      case when TG_TABLE_NAME = 'income_templates' then NEW.id else null end,
      'updated',
      to_jsonb(OLD),
      to_jsonb(NEW),
      array(select key from jsonb_each(to_jsonb(NEW)) where to_jsonb(NEW)->>key != to_jsonb(OLD)->>key)
    );
    return NEW;
  end if;
  return null;
end;
$$ language plpgsql security definer;

-- History triggers
create trigger income_instances_history_trigger
  after insert or update on public.income_instances
  for each row execute function public.create_income_history_entry();

create trigger income_templates_history_trigger
  after insert or update on public.income_templates
  for each row execute function public.create_income_history_entry();

-- Helper functions for tag management
create or replace function public.increment_income_tag_usage(tag_id uuid)
returns void as $$
begin
  update public.income_tags 
  set usage_count = usage_count + 1 
  where id = tag_id;
end;
$$ language plpgsql security definer;

create or replace function public.decrement_income_tag_usage(tag_id uuid)
returns void as $$
begin
  update public.income_tags 
  set usage_count = greatest(0, usage_count - 1) 
  where id = tag_id;
end;
$$ language plpgsql security definer;

-- Indexes for performance
create index income_categories_user_id_idx on public.income_categories(user_id);
create index income_tags_user_id_idx on public.income_tags(user_id);
create index income_templates_user_id_idx on public.income_templates(user_id);
create index income_templates_active_idx on public.income_templates(user_id, is_active);
create index income_templates_source_type_idx on public.income_templates(user_id, source_type);
create index income_instances_user_id_idx on public.income_instances(user_id);
create index income_instances_expected_date_idx on public.income_instances(expected_date);
create index income_instances_status_idx on public.income_instances(status);
create index income_instances_historical_idx on public.income_instances(is_historical);
create index income_instances_template_idx on public.income_instances(template_id);
create index income_instances_source_type_idx on public.income_instances(user_id, source_type);
create index income_instances_variance_idx on public.income_instances(variance_percentage) where variance_percentage is not null;
create index income_history_user_id_idx on public.income_history(user_id);
create index income_history_instance_idx on public.income_history(income_instance_id);
create index income_attachments_user_id_idx on public.income_attachments(user_id);
create index user_income_patterns_user_id_idx on public.user_income_patterns(user_id);
create index user_income_patterns_type_idx on public.user_income_patterns(user_id, pattern_type);

-- Insert default income categories
insert into public.income_categories (user_id, name, color, icon, description, is_system) 
select 
  auth.uid(),
  name,
  color,
  icon,
  description,
  true
from (
  values 
    ('Salary', '#10B981', '💼', 'Regular employment income'),
    ('Freelance', '#8B5CF6', '🔧', 'Freelance and contract work'),
    ('Business', '#F59E0B', '🏢', 'Business income and profits'),
    ('Investment', '#3B82F6', '📈', 'Investment returns and dividends'),
    ('Rental', '#EF4444', '🏠', 'Rental property income'),
    ('Pension', '#6B7280', '🏛️', 'Retirement and pension income'),
    ('Benefits', '#14B8A6', '🤝', 'Government benefits and assistance'),
    ('Other', '#8B5CF6', '💰', 'Other sources of income')
) as categories(name, color, icon, description)
where auth.uid() is not null
on conflict (user_id, name) do nothing;