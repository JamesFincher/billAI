-- Bill Categories Table
create table if not exists public.bill_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  color text default '#3B82F6',
  icon text,
  description text,
  is_system boolean default false, -- For AI-suggested categories
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Bill Tags Table (flexible labeling)
create table if not exists public.bill_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  color text default '#6B7280',
  usage_count integer default 0,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  unique(user_id, name)
);

-- Bill Templates (Master templates for recurring bills)
create table if not exists public.bill_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  
  -- Basic Info
  title text not null,
  description text,
  amount decimal(12,2),
  currency text default 'USD',
  
  -- Categorization
  category_id uuid references public.bill_categories(id) on delete set null,
  
  -- Recurrence (RRULE/iCal)
  is_recurring boolean default false,
  rrule text, -- RFC 5545 RRULE string
  dtstart timestamp with time zone, -- Start date for recurrence
  dtend timestamp with time zone, -- End date for recurrence (optional)
  timezone text default 'UTC',
  
  -- Template Settings
  is_active boolean default true,
  auto_generate_days_ahead integer default 30, -- How many days ahead to generate instances
  
  -- Metadata
  notes text,
  priority integer default 3 check (priority between 1 and 5), -- 1=low, 5=urgent
  
  -- AI Learning Data
  ai_confidence_score decimal(3,2) default 0.0, -- How confident AI is about predictions
  ai_suggested_category_id uuid references public.bill_categories(id),
  ai_metadata jsonb default '{}', -- Store AI insights
  
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Bill Instances (Individual occurrences - both recurring and one-time)
create table if not exists public.bill_instances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  template_id uuid references public.bill_templates(id) on delete set null, -- null for one-time bills
  
  -- Instance Info
  title text not null,
  description text,
  amount decimal(12,2) not null,
  currency text default 'USD',
  
  -- Dates
  due_date date not null,
  scheduled_date timestamp with time zone, -- When this instance was scheduled (for recurring bills)
  paid_date timestamp with time zone,
  created_date timestamp with time zone default now() not null,
  
  -- Status
  status text default 'pending' check (status in ('pending', 'paid', 'overdue', 'cancelled', 'scheduled')),
  is_recurring boolean default false,
  
  -- Categorization
  category_id uuid references public.bill_categories(id) on delete set null,
  
  -- Metadata
  notes text,
  priority integer default 3 check (priority between 1 and 5),
  
  -- Immutability Control
  is_historical boolean default false, -- Past bills become historical (read-only)
  can_edit boolean generated always as (not is_historical) stored,
  original_amount decimal(12,2), -- Track original amount for edit history
  
  -- AI Data
  ai_predicted_amount decimal(12,2),
  ai_confidence_score decimal(3,2) default 0.0,
  ai_risk_score decimal(3,2) default 0.0, -- Risk of being late/missed
  ai_metadata jsonb default '{}',
  
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Bill Instance Tags (Many-to-Many)
create table if not exists public.bill_instance_tags (
  id uuid primary key default gen_random_uuid(),
  bill_instance_id uuid references public.bill_instances(id) on delete cascade not null,
  tag_id uuid references public.bill_tags(id) on delete cascade not null,
  created_at timestamp with time zone default now() not null,
  unique(bill_instance_id, tag_id)
);

-- Bill Attachments (File uploads)
create table if not exists public.bill_attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  bill_instance_id uuid references public.bill_instances(id) on delete cascade,
  bill_template_id uuid references public.bill_templates(id) on delete cascade,
  
  -- File Info
  filename text not null,
  file_size bigint not null,
  mime_type text not null,
  storage_path text not null, -- Path in Supabase Storage
  
  -- Metadata
  description text,
  is_receipt boolean default false,
  
  -- AI Analysis
  ai_extracted_data jsonb default '{}', -- OCR/AI extracted data
  ai_confidence_score decimal(3,2) default 0.0,
  
  created_at timestamp with time zone default now() not null,
  
  -- Ensure attachment belongs to either instance or template, not both
  check ((bill_instance_id is not null and bill_template_id is null) or 
         (bill_instance_id is null and bill_template_id is not null))
);

-- Bill History (Event sourcing for AI learning)
create table if not exists public.bill_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  bill_instance_id uuid references public.bill_instances(id) on delete cascade,
  bill_template_id uuid references public.bill_templates(id) on delete cascade,
  
  -- Event Info
  event_type text not null check (event_type in (
    'created', 'updated', 'paid', 'cancelled', 'overdue', 
    'amount_changed', 'date_changed', 'category_changed', 'status_changed'
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

-- User Spending Patterns (AI Analysis Results)
create table if not exists public.user_spending_patterns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  
  -- Pattern Data
  pattern_type text not null check (pattern_type in (
    'monthly_average', 'category_trend', 'seasonal_pattern', 
    'payment_behavior', 'amount_prediction', 'due_date_pattern'
  )),
  category_id uuid references public.bill_categories(id) on delete cascade,
  
  -- Analysis Results
  pattern_data jsonb not null default '{}',
  confidence_score decimal(3,2) not null default 0.0,
  
  -- Time Period
  analysis_period_start date not null,
  analysis_period_end date not null,
  
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- User Preferences (AI Learning Storage)
create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  
  -- Preference Data
  preference_type text not null,
  preference_value jsonb not null default '{}',
  
  -- Learning Data
  confidence_score decimal(3,2) default 0.0,
  last_updated_by text check (last_updated_by in ('user', 'ai', 'system')),
  
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  
  unique(user_id, preference_type)
);

-- RLS Policies
alter table public.bill_categories enable row level security;
alter table public.bill_tags enable row level security;
alter table public.bill_templates enable row level security;
alter table public.bill_instances enable row level security;
alter table public.bill_instance_tags enable row level security;
alter table public.bill_attachments enable row level security;
alter table public.bill_history enable row level security;
alter table public.user_spending_patterns enable row level security;
alter table public.user_preferences enable row level security;

-- Categories Policies
create policy "Users can manage their own categories" on public.bill_categories
  for all using (auth.uid() = user_id);

-- Tags Policies  
create policy "Users can manage their own tags" on public.bill_tags
  for all using (auth.uid() = user_id);

-- Templates Policies
create policy "Users can manage their own templates" on public.bill_templates
  for all using (auth.uid() = user_id);

-- Instances Policies (with edit restrictions for historical bills)
create policy "Users can view their own bill instances" on public.bill_instances
  for select using (auth.uid() = user_id);

create policy "Users can create their own bill instances" on public.bill_instances
  for insert with check (auth.uid() = user_id);

create policy "Users can update non-historical bill instances" on public.bill_instances
  for update using (auth.uid() = user_id and not is_historical);

create policy "Users can delete non-historical bill instances" on public.bill_instances
  for delete using (auth.uid() = user_id and not is_historical);

-- Instance Tags Policies
create policy "Users can manage tags for their bill instances" on public.bill_instance_tags
  for all using (
    exists (
      select 1 from public.bill_instances 
      where bill_instances.id = bill_instance_tags.bill_instance_id 
      and bill_instances.user_id = auth.uid()
    )
  );

-- Attachments Policies
create policy "Users can manage attachments for their bills" on public.bill_attachments
  for all using (auth.uid() = user_id);

-- History Policies (read-only for users)
create policy "Users can view their own bill history" on public.bill_history
  for select using (auth.uid() = user_id);

-- Spending Patterns Policies
create policy "Users can view their own spending patterns" on public.user_spending_patterns
  for select using (auth.uid() = user_id);

-- Preferences Policies
create policy "Users can manage their own preferences" on public.user_preferences
  for all using (auth.uid() = user_id);

-- Triggers for updated_at
create trigger handle_bill_categories_updated_at
  before update on public.bill_categories
  for each row execute function public.handle_updated_at();

create trigger handle_bill_tags_updated_at
  before update on public.bill_tags
  for each row execute function public.handle_updated_at();

create trigger handle_bill_templates_updated_at
  before update on public.bill_templates
  for each row execute function public.handle_updated_at();

create trigger handle_bill_instances_updated_at
  before update on public.bill_instances
  for each row execute function public.handle_updated_at();

create trigger handle_user_spending_patterns_updated_at
  before update on public.user_spending_patterns
  for each row execute function public.handle_updated_at();

create trigger handle_user_preferences_updated_at
  before update on public.user_preferences
  for each row execute function public.handle_updated_at();

-- Function to mark bills as historical
create or replace function public.mark_past_bills_historical()
returns void as $$
begin
  update public.bill_instances 
  set is_historical = true 
  where due_date < current_date 
  and not is_historical;
end;
$$ language plpgsql security definer;

-- Function to create history entry
create or replace function public.create_bill_history_entry()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    insert into public.bill_history (
      user_id, bill_instance_id, bill_template_id, event_type, new_values
    ) values (
      coalesce(NEW.user_id),
      case when TG_TABLE_NAME = 'bill_instances' then NEW.id else null end,
      case when TG_TABLE_NAME = 'bill_templates' then NEW.id else null end,
      'created',
      to_jsonb(NEW)
    );
    return NEW;
  elsif TG_OP = 'UPDATE' then
    insert into public.bill_history (
      user_id, bill_instance_id, bill_template_id, event_type, old_values, new_values, changed_fields
    ) values (
      coalesce(NEW.user_id),
      case when TG_TABLE_NAME = 'bill_instances' then NEW.id else null end,
      case when TG_TABLE_NAME = 'bill_templates' then NEW.id else null end,
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
create trigger bill_instances_history_trigger
  after insert or update on public.bill_instances
  for each row execute function public.create_bill_history_entry();

create trigger bill_templates_history_trigger
  after insert or update on public.bill_templates
  for each row execute function public.create_bill_history_entry();

-- Indexes for performance
create index bill_categories_user_id_idx on public.bill_categories(user_id);
create index bill_tags_user_id_idx on public.bill_tags(user_id);
create index bill_templates_user_id_idx on public.bill_templates(user_id);
create index bill_templates_active_idx on public.bill_templates(user_id, is_active);
create index bill_instances_user_id_idx on public.bill_instances(user_id);
create index bill_instances_due_date_idx on public.bill_instances(due_date);
create index bill_instances_status_idx on public.bill_instances(status);
create index bill_instances_historical_idx on public.bill_instances(is_historical);
create index bill_instances_template_idx on public.bill_instances(template_id);
create index bill_history_user_id_idx on public.bill_history(user_id);
create index bill_history_instance_idx on public.bill_history(bill_instance_id);
create index bill_attachments_user_id_idx on public.bill_attachments(user_id);
create index user_spending_patterns_user_id_idx on public.user_spending_patterns(user_id);
create index user_preferences_user_id_idx on public.user_preferences(user_id); 