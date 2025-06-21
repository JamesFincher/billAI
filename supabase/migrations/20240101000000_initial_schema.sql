-- Enable Row Level Security
alter table if exists public.customers enable row level security;
alter table if exists public.invoices enable row level security;
alter table if exists public.invoice_items enable row level security;

-- Create customers table
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  email text not null,
  phone text,
  address text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Create invoices table
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  customer_id uuid references public.customers(id) on delete cascade not null,
  invoice_number text not null unique,
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'cancelled')),
  issue_date date not null default current_date,
  due_date date not null,
  subtotal decimal(10,2) not null default 0,
  tax_amount decimal(10,2) not null default 0,
  total_amount decimal(10,2) not null default 0,
  notes text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Create invoice_items table
create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references public.invoices(id) on delete cascade not null,
  description text not null,
  quantity decimal(10,2) not null default 1,
  unit_price decimal(10,2) not null,
  total_price decimal(10,2) not null,
  created_at timestamp with time zone default now() not null
);

-- Create RLS policies
-- Customers policies
create policy "Users can view their own customers" on public.customers
  for select using (auth.uid() = user_id);

create policy "Users can create their own customers" on public.customers
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own customers" on public.customers
  for update using (auth.uid() = user_id);

create policy "Users can delete their own customers" on public.customers
  for delete using (auth.uid() = user_id);

-- Invoices policies
create policy "Users can view their own invoices" on public.invoices
  for select using (auth.uid() = user_id);

create policy "Users can create their own invoices" on public.invoices
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own invoices" on public.invoices
  for update using (auth.uid() = user_id);

create policy "Users can delete their own invoices" on public.invoices
  for delete using (auth.uid() = user_id);

-- Invoice items policies
create policy "Users can view invoice items for their invoices" on public.invoice_items
  for select using (
    exists (
      select 1 from public.invoices
      where invoices.id = invoice_items.invoice_id
      and invoices.user_id = auth.uid()
    )
  );

create policy "Users can create invoice items for their invoices" on public.invoice_items
  for insert with check (
    exists (
      select 1 from public.invoices
      where invoices.id = invoice_items.invoice_id
      and invoices.user_id = auth.uid()
    )
  );

create policy "Users can update invoice items for their invoices" on public.invoice_items
  for update using (
    exists (
      select 1 from public.invoices
      where invoices.id = invoice_items.invoice_id
      and invoices.user_id = auth.uid()
    )
  );

create policy "Users can delete invoice items for their invoices" on public.invoice_items
  for delete using (
    exists (
      select 1 from public.invoices
      where invoices.id = invoice_items.invoice_id
      and invoices.user_id = auth.uid()
    )
  );

-- Create function to update updated_at column
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create triggers for updated_at
create trigger handle_customers_updated_at
  before update on public.customers
  for each row execute function public.handle_updated_at();

create trigger handle_invoices_updated_at
  before update on public.invoices
  for each row execute function public.handle_updated_at();

-- Create indexes for better performance
create index if not exists customers_user_id_idx on public.customers(user_id);
create index if not exists invoices_user_id_idx on public.invoices(user_id);
create index if not exists invoices_customer_id_idx on public.invoices(customer_id);
create index if not exists invoice_items_invoice_id_idx on public.invoice_items(invoice_id);
create index if not exists invoices_invoice_number_idx on public.invoices(invoice_number);
create index if not exists invoices_status_idx on public.invoices(status); 