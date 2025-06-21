-- Helper functions for the bill tracking system

-- Function to increment tag usage count
create or replace function public.increment_tag_usage(tag_id uuid)
returns void as $$
begin
  update public.bill_tags 
  set usage_count = usage_count + 1 
  where id = tag_id;
end;
$$ language plpgsql security definer;

-- Function to decrement tag usage count
create or replace function public.decrement_tag_usage(tag_id uuid)
returns void as $$
begin
  update public.bill_tags 
  set usage_count = greatest(usage_count - 1, 0) 
  where id = tag_id;
end;
$$ language plpgsql security definer;

-- Function to automatically update bill status based on due dates
create or replace function public.update_bill_statuses()
returns void as $$
begin
  -- Mark bills as overdue
  update public.bill_instances 
  set status = 'overdue' 
  where status = 'pending' 
  and due_date < current_date;

  -- Activate scheduled bills that are due
  update public.bill_instances 
  set status = 'pending' 
  where status = 'scheduled' 
  and due_date <= current_date;
end;
$$ language plpgsql security definer;

-- Function to generate upcoming bill instances from active templates
create or replace function public.generate_upcoming_bills()
returns void as $$
declare
  template_record record;
  next_date date;
  generate_until date;
begin
  generate_until := current_date + interval '30 days';
  
  for template_record in 
    select * from public.bill_templates 
    where is_active = true 
    and is_recurring = true 
    and rrule is not null
  loop
    -- This is a simplified version - in practice, you'd use the RRULE library
    -- to properly generate dates based on the recurrence pattern
    
    -- For now, just create a simple monthly recurrence example
    if template_record.rrule like '%FREQ=MONTHLY%' then
      next_date := current_date + interval '1 month';
      
      -- Check if instance already exists
      if not exists (
        select 1 from public.bill_instances 
        where template_id = template_record.id 
        and due_date = next_date
      ) then
        insert into public.bill_instances (
          user_id, template_id, title, description, amount, currency,
          due_date, status, is_recurring, category_id, priority,
          ai_confidence_score, ai_risk_score, ai_metadata
        ) values (
          template_record.user_id,
          template_record.id,
          template_record.title,
          template_record.description,
          template_record.amount,
          template_record.currency,
          next_date,
          'scheduled',
          true,
          template_record.category_id,
          template_record.priority,
          template_record.ai_confidence_score,
          0.0,
          '{}'::jsonb
        );
      end if;
    end if;
  end loop;
end;
$$ language plpgsql security definer;

-- Function to calculate spending statistics
create or replace function public.get_spending_stats(
  user_uuid uuid,
  start_date date default current_date - interval '30 days',
  end_date date default current_date
)
returns table(
  total_amount decimal,
  total_bills bigint,
  paid_amount decimal,
  paid_bills bigint,
  pending_amount decimal,
  pending_bills bigint,
  overdue_amount decimal,
  overdue_bills bigint
) as $$
begin
  return query
  select 
    coalesce(sum(amount), 0) as total_amount,
    count(*) as total_bills,
    coalesce(sum(case when status = 'paid' then amount else 0 end), 0) as paid_amount,
    count(case when status = 'paid' then 1 end) as paid_bills,
    coalesce(sum(case when status = 'pending' then amount else 0 end), 0) as pending_amount,
    count(case when status = 'pending' then 1 end) as pending_bills,
    coalesce(sum(case when status = 'overdue' then amount else 0 end), 0) as overdue_amount,
    count(case when status = 'overdue' then 1 end) as overdue_bills
  from public.bill_instances
  where user_id = user_uuid
  and due_date between start_date and end_date;
end;
$$ language plpgsql security definer;

-- Function to get bills due soon
create or replace function public.get_upcoming_bills(
  user_uuid uuid,
  days_ahead integer default 7
)
returns table(
  id uuid,
  title text,
  amount decimal,
  due_date date,
  status text,
  days_until_due integer,
  category_name text,
  priority integer
) as $$
begin
  return query
  select 
    bi.id,
    bi.title,
    bi.amount,
    bi.due_date,
    bi.status,
    (bi.due_date - current_date)::integer as days_until_due,
    coalesce(bc.name, 'Uncategorized') as category_name,
    bi.priority
  from public.bill_instances bi
  left join public.bill_categories bc on bi.category_id = bc.id
  where bi.user_id = user_uuid
  and bi.due_date between current_date and current_date + (days_ahead || ' days')::interval
  and bi.status in ('pending', 'scheduled')
  order by bi.due_date asc, bi.priority desc;
end;
$$ language plpgsql security definer;

-- Function to safely delete old historical data (for cleanup)
create or replace function public.cleanup_old_bills(
  months_to_keep integer default 24
)
returns void as $$
begin
  -- Only delete very old paid bills that are historical
  delete from public.bill_instances 
  where status = 'paid' 
  and is_historical = true 
  and due_date < current_date - (months_to_keep || ' months')::interval;
  
  -- Clean up orphaned history entries
  delete from public.bill_history 
  where created_at < current_date - (months_to_keep || ' months')::interval
  and bill_instance_id not in (select id from public.bill_instances);
end;
$$ language plpgsql security definer;

-- Grant execute permissions to authenticated users
grant execute on function public.increment_tag_usage(uuid) to authenticated;
grant execute on function public.decrement_tag_usage(uuid) to authenticated;
grant execute on function public.update_bill_statuses() to authenticated;
grant execute on function public.generate_upcoming_bills() to authenticated;
grant execute on function public.get_spending_stats(uuid, date, date) to authenticated;
grant execute on function public.get_upcoming_bills(uuid, integer) to authenticated;
grant execute on function public.cleanup_old_bills(integer) to service_role; 