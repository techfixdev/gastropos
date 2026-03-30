-- GastroPOS multi-tenant schema (Supabase/PostgreSQL)
-- Enable required extension for UUID generation.
create extension if not exists pgcrypto;

-- Tenants
create table if not exists tenant (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Users (linked to Supabase auth.users)
create table if not exists app_user (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references tenant(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('admin', 'cashier')),
  created_at timestamptz not null default now()
);

-- Catalog
create table if not exists category (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenant(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create table if not exists product (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenant(id) on delete cascade,
  category_id uuid not null references category(id) on delete restrict,
  name text not null,
  base_price numeric(12,2) not null check (base_price >= 0),
  is_weighable boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create table if not exists modifier_group (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenant(id) on delete cascade,
  name text not null,
  min_select int not null default 0,
  max_select int not null default 1 check (max_select >= min_select),
  created_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create table if not exists modifier (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenant(id) on delete cascade,
  modifier_group_id uuid not null references modifier_group(id) on delete cascade,
  name text not null,
  price_delta numeric(12,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, modifier_group_id, name)
);

-- Join table between product and modifier_group
create table if not exists product_modifier_group (
  tenant_id uuid not null references tenant(id) on delete cascade,
  product_id uuid not null references product(id) on delete cascade,
  modifier_group_id uuid not null references modifier_group(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (product_id, modifier_group_id)
);

-- Sales
create table if not exists "order" (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenant(id) on delete cascade,
  cashier_user_id uuid not null references app_user(id) on delete restrict,
  status text not null default 'paid' check (status in ('draft', 'paid', 'cancelled')),
  payment_method text not null check (payment_method in ('cash', 'card', 'qr')),
  subtotal numeric(12,2) not null check (subtotal >= 0),
  tax numeric(12,2) not null check (tax >= 0),
  total numeric(12,2) not null check (total >= 0),
  created_at timestamptz not null default now()
);

create table if not exists order_item (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenant(id) on delete cascade,
  order_id uuid not null references "order"(id) on delete cascade,
  client_line_id text not null,
  product_id uuid references product(id) on delete set null,
  product_name_snapshot text not null,
  unit_price_snapshot numeric(12,2) not null check (unit_price_snapshot >= 0),
  qty numeric(12,3) not null check (qty > 0),
  line_total numeric(12,2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create table if not exists order_item_modifier (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenant(id) on delete cascade,
  order_item_id uuid not null references order_item(id) on delete cascade,
  modifier_name_snapshot text not null,
  price_delta_snapshot numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists cash_shift_close (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenant(id) on delete cascade,
  cashier_user_id uuid not null references app_user(id) on delete restrict,
  ticket_count int not null check (ticket_count >= 0),
  total_amount numeric(12,2) not null check (total_amount >= 0),
  synced_count int not null check (synced_count >= 0),
  pending_count int not null check (pending_count >= 0),
  shift_opened_at timestamptz,
  opening_amount numeric(12,2) not null default 0 check (opening_amount >= 0),
  cash_sales_total numeric(12,2) not null default 0 check (cash_sales_total >= 0),
  manual_in_total numeric(12,2) not null default 0 check (manual_in_total >= 0),
  manual_out_total numeric(12,2) not null default 0 check (manual_out_total >= 0),
  expected_cash numeric(12,2) not null default 0,
  closed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists cash_movement (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenant(id) on delete cascade,
  cashier_user_id uuid not null references app_user(id) on delete restrict,
  shift_id uuid not null,
  movement_type text not null check (movement_type in ('in', 'out')),
  amount numeric(12,2) not null check (amount > 0),
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists pre_order (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenant(id) on delete cascade,
  cashier_user_id uuid not null references app_user(id) on delete restrict,
  customer_name text not null,
  customer_phone text,
  note text,
  due_at timestamptz not null,
  total_amount numeric(12,2) not null check (total_amount >= 0),
  deposit_amount numeric(12,2) not null check (deposit_amount >= 0),
  remaining_amount numeric(12,2) not null check (remaining_amount >= 0),
  status text not null default 'scheduled' check (status in ('scheduled', 'ready', 'delivered', 'cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists delivery_order (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenant(id) on delete cascade,
  cashier_user_id uuid not null references app_user(id) on delete restrict,
  source_channel text not null default 'manual' check (source_channel in ('manual', 'pedidosya', 'rappi', 'ubereats', 'qr')),
  customer_name text not null,
  customer_phone text,
  address text not null,
  note text,
  total_amount numeric(12,2) not null check (total_amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'assigned', 'picked_up', 'delivered', 'cancelled')),
  courier_name text,
  courier_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists inventory_stock (
  tenant_id uuid not null references tenant(id) on delete cascade,
  product_id uuid not null references product(id) on delete cascade,
  current_stock numeric(12,3) not null default 0 check (current_stock >= 0),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (tenant_id, product_id)
);

create table if not exists inventory_movement (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenant(id) on delete cascade,
  product_id uuid not null references product(id) on delete cascade,
  product_name_snapshot text not null,
  delta numeric(12,3) not null,
  reason text not null check (reason in ('manual', 'sale', 'reset')),
  created_at timestamptz not null default now()
);

create index if not exists idx_category_tenant on category(tenant_id);
create index if not exists idx_product_tenant on product(tenant_id);
create index if not exists idx_modifier_group_tenant on modifier_group(tenant_id);
create index if not exists idx_modifier_tenant on modifier(tenant_id);
create index if not exists idx_order_tenant_created on "order"(tenant_id, created_at desc);
create index if not exists idx_order_item_order on order_item(order_id);
create unique index if not exists idx_order_item_client_line on order_item(order_id, client_line_id);
create index if not exists idx_shift_close_tenant_closed on cash_shift_close(tenant_id, closed_at desc);
create index if not exists idx_cash_movement_tenant_created on cash_movement(tenant_id, created_at desc);
create index if not exists idx_pre_order_tenant_due on pre_order(tenant_id, due_at desc);
create index if not exists idx_delivery_order_tenant_created on delivery_order(tenant_id, created_at desc);
create index if not exists idx_inventory_stock_tenant on inventory_stock(tenant_id);
create index if not exists idx_inventory_movement_tenant_created on inventory_movement(tenant_id, created_at desc);

-- Helper function for tenant context from JWT
create or replace function current_tenant_id()
returns uuid
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'tenant_id', '')::uuid;
$$;

alter table tenant enable row level security;
alter table app_user enable row level security;
alter table category enable row level security;
alter table product enable row level security;
alter table modifier_group enable row level security;
alter table modifier enable row level security;
alter table product_modifier_group enable row level security;
alter table "order" enable row level security;
alter table order_item enable row level security;
alter table order_item_modifier enable row level security;
alter table cash_shift_close enable row level security;
alter table cash_movement enable row level security;
alter table pre_order enable row level security;
alter table delivery_order enable row level security;
alter table inventory_stock enable row level security;
alter table inventory_movement enable row level security;

-- Tenant visibility policies
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'tenant' and policyname = 'tenant_select_self') then
    create policy tenant_select_self on tenant
    for select using (id = current_tenant_id());
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'app_user' and policyname = 'app_user_tenant_policy') then
    create policy app_user_tenant_policy on app_user
    for all using (tenant_id = current_tenant_id())
    with check (tenant_id = current_tenant_id());
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'category' and policyname = 'category_tenant_policy') then
    create policy category_tenant_policy on category
    for all using (tenant_id = current_tenant_id())
    with check (tenant_id = current_tenant_id());
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'product' and policyname = 'product_tenant_policy') then
    create policy product_tenant_policy on product
    for all using (tenant_id = current_tenant_id())
    with check (tenant_id = current_tenant_id());
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'modifier_group' and policyname = 'modifier_group_tenant_policy') then
    create policy modifier_group_tenant_policy on modifier_group
    for all using (tenant_id = current_tenant_id())
    with check (tenant_id = current_tenant_id());
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'modifier' and policyname = 'modifier_tenant_policy') then
    create policy modifier_tenant_policy on modifier
    for all using (tenant_id = current_tenant_id())
    with check (tenant_id = current_tenant_id());
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'product_modifier_group' and policyname = 'product_modifier_group_tenant_policy') then
    create policy product_modifier_group_tenant_policy on product_modifier_group
    for all using (tenant_id = current_tenant_id())
    with check (tenant_id = current_tenant_id());
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'order' and policyname = 'order_tenant_policy') then
    create policy order_tenant_policy on "order"
    for all using (tenant_id = current_tenant_id())
    with check (tenant_id = current_tenant_id());
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'order_item' and policyname = 'order_item_tenant_policy') then
    create policy order_item_tenant_policy on order_item
    for all using (tenant_id = current_tenant_id())
    with check (tenant_id = current_tenant_id());
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'order_item_modifier' and policyname = 'order_item_modifier_tenant_policy') then
    create policy order_item_modifier_tenant_policy on order_item_modifier
    for all using (tenant_id = current_tenant_id())
    with check (tenant_id = current_tenant_id());
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'cash_shift_close' and policyname = 'cash_shift_close_tenant_policy') then
    create policy cash_shift_close_tenant_policy on cash_shift_close
    for all using (tenant_id = current_tenant_id())
    with check (tenant_id = current_tenant_id());
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'cash_movement' and policyname = 'cash_movement_tenant_policy') then
    create policy cash_movement_tenant_policy on cash_movement
    for all using (tenant_id = current_tenant_id())
    with check (tenant_id = current_tenant_id());
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'pre_order' and policyname = 'pre_order_tenant_policy') then
    create policy pre_order_tenant_policy on pre_order
    for all using (tenant_id = current_tenant_id())
    with check (tenant_id = current_tenant_id());
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'delivery_order' and policyname = 'delivery_order_tenant_policy') then
    create policy delivery_order_tenant_policy on delivery_order
    for all using (tenant_id = current_tenant_id())
    with check (tenant_id = current_tenant_id());
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'inventory_stock' and policyname = 'inventory_stock_tenant_policy') then
    create policy inventory_stock_tenant_policy on inventory_stock
    for all using (tenant_id = current_tenant_id())
    with check (tenant_id = current_tenant_id());
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'inventory_movement' and policyname = 'inventory_movement_tenant_policy') then
    create policy inventory_movement_tenant_policy on inventory_movement
    for all using (tenant_id = current_tenant_id())
    with check (tenant_id = current_tenant_id());
  end if;
end
$$;

-- Multi-branch + fiscal integrations
create table if not exists branch (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenant(id) on delete cascade,
  name text not null,
  code text not null,
  fiscal_provider text not null default 'none' check (fiscal_provider in ('none', 'afip', 'sii', 'sat')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, code)
);

alter table if exists "order"
add column if not exists branch_id uuid references branch(id) on delete set null;

alter table if exists cash_shift_close
add column if not exists branch_id uuid references branch(id) on delete set null;

alter table if exists pre_order
add column if not exists branch_id uuid references branch(id) on delete set null;

alter table if exists delivery_order
add column if not exists branch_id uuid references branch(id) on delete set null;

create table if not exists fiscal_invoice (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenant(id) on delete cascade,
  branch_id uuid not null references branch(id) on delete restrict,
  order_id uuid not null references "order"(id) on delete cascade,
  provider text not null check (provider in ('afip', 'sii', 'sat')),
  status text not null default 'pending' check (status in ('pending', 'processing', 'issued', 'failed')),
  document_number text,
  response_payload text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, order_id)
);

create index if not exists idx_branch_tenant_created on branch(tenant_id, created_at desc);
create index if not exists idx_order_branch on "order"(tenant_id, branch_id, created_at desc);
create index if not exists idx_shift_close_branch on cash_shift_close(tenant_id, branch_id, closed_at desc);
create index if not exists idx_pre_order_branch on pre_order(tenant_id, branch_id, due_at desc);
create index if not exists idx_delivery_order_branch on delivery_order(tenant_id, branch_id, created_at desc);
create index if not exists idx_fiscal_invoice_tenant_created on fiscal_invoice(tenant_id, created_at desc);
create index if not exists idx_fiscal_invoice_branch on fiscal_invoice(tenant_id, branch_id, created_at desc);

alter table branch enable row level security;
alter table fiscal_invoice enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'branch' and policyname = 'branch_tenant_policy') then
    create policy branch_tenant_policy on branch
    for all using (tenant_id = current_tenant_id())
    with check (tenant_id = current_tenant_id());
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'fiscal_invoice' and policyname = 'fiscal_invoice_tenant_policy') then
    create policy fiscal_invoice_tenant_policy on fiscal_invoice
    for all using (tenant_id = current_tenant_id())
    with check (tenant_id = current_tenant_id());
  end if;
end
$$;

-- Real local operations: tickets, payment split, terminals and ARCA profile
alter table branch drop constraint if exists branch_fiscal_provider_check;
update branch set fiscal_provider = 'arca' where fiscal_provider = 'afip';
alter table branch
add constraint branch_fiscal_provider_check check (fiscal_provider in ('none', 'arca', 'sii', 'sat'));

alter table fiscal_invoice drop constraint if exists fiscal_invoice_provider_check;
update fiscal_invoice set provider = 'arca' where provider = 'afip';
alter table fiscal_invoice
add constraint fiscal_invoice_provider_check check (provider in ('arca', 'sii', 'sat'));

alter table cash_shift_close add column if not exists counted_cash int;
alter table cash_shift_close add column if not exists cash_variance int;
alter table cash_shift_close add column if not exists note text;
alter table "order" add column if not exists customer_name text;
alter table "order" add column if not exists customer_document text;
alter table "order" add column if not exists note text;

create table if not exists sale_payment (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenant(id) on delete cascade,
  branch_id uuid not null references branch(id) on delete restrict,
  order_id uuid not null references "order"(id) on delete cascade,
  method text not null check (method in ('cash', 'card', 'qr', 'transfer')),
  method_label text not null,
  amount int not null check (amount >= 0),
  status text not null default 'manual_confirmed' check (status in ('pending', 'approved', 'manual_confirmed', 'failed')),
  provider_label text,
  reference text,
  card_brand text,
  installments int,
  last4 text,
  terminal_id text,
  created_at timestamptz not null default now()
);

create table if not exists ticket_printer_config (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenant(id) on delete cascade,
  branch_id uuid not null references branch(id) on delete cascade,
  name text not null,
  paper_width_mm int not null check (paper_width_mm in (80, 90)),
  connection_type text not null check (connection_type in ('browser', 'usb', 'network')),
  copies int not null default 1 check (copies >= 1),
  auto_print boolean not null default true,
  ip_address text,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists payment_terminal_config (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenant(id) on delete cascade,
  branch_id uuid not null references branch(id) on delete cascade,
  name text not null,
  provider text not null check (provider in ('manual', 'mercado_pago_qr', 'mercado_pago_point', 'bank_pos')),
  collect_mode text not null check (collect_mode in ('manual', 'qr_dynamic', 'terminal')),
  external_reference text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists arca_config (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenant(id) on delete cascade,
  branch_id uuid not null references branch(id) on delete cascade,
  mode text not null default 'disabled' check (mode in ('disabled', 'test', 'production')),
  point_of_sale int not null check (point_of_sale >= 1),
  invoice_type text not null default 'B' check (invoice_type in ('A', 'B', 'T')),
  cuit text,
  legal_name text,
  gross_income_tax_status text,
  enabled boolean not null default false,
  last_test_at timestamptz,
  last_invoice_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tenant_id, branch_id)
);

create table if not exists ticket_receipt (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenant(id) on delete cascade,
  branch_id uuid not null references branch(id) on delete cascade,
  order_id uuid not null references "order"(id) on delete cascade,
  printer_config_id uuid references ticket_printer_config(id) on delete set null,
  receipt_number text not null,
  paper_width_mm int not null check (paper_width_mm in (80, 90)),
  copies int not null default 1 check (copies >= 1),
  print_status text not null default 'pending' check (print_status in ('pending', 'printed', 'failed')),
  printed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tenant_id, order_id)
);

create index if not exists idx_sale_payment_order on sale_payment(tenant_id, order_id, created_at desc);
create index if not exists idx_ticket_printer_branch on ticket_printer_config(tenant_id, branch_id, created_at desc);
create index if not exists idx_payment_terminal_branch on payment_terminal_config(tenant_id, branch_id, created_at desc);
create index if not exists idx_arca_config_branch on arca_config(tenant_id, branch_id);
create index if not exists idx_ticket_receipt_order on ticket_receipt(tenant_id, order_id, created_at desc);

alter table sale_payment enable row level security;
alter table ticket_printer_config enable row level security;
alter table payment_terminal_config enable row level security;
alter table arca_config enable row level security;
alter table ticket_receipt enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'sale_payment' and policyname = 'sale_payment_tenant_policy') then
    create policy sale_payment_tenant_policy on sale_payment
    for all using (tenant_id = current_tenant_id())
    with check (tenant_id = current_tenant_id());
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'ticket_printer_config' and policyname = 'ticket_printer_config_tenant_policy') then
    create policy ticket_printer_config_tenant_policy on ticket_printer_config
    for all using (tenant_id = current_tenant_id())
    with check (tenant_id = current_tenant_id());
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'payment_terminal_config' and policyname = 'payment_terminal_config_tenant_policy') then
    create policy payment_terminal_config_tenant_policy on payment_terminal_config
    for all using (tenant_id = current_tenant_id())
    with check (tenant_id = current_tenant_id());
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'arca_config' and policyname = 'arca_config_tenant_policy') then
    create policy arca_config_tenant_policy on arca_config
    for all using (tenant_id = current_tenant_id())
    with check (tenant_id = current_tenant_id());
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'ticket_receipt' and policyname = 'ticket_receipt_tenant_policy') then
    create policy ticket_receipt_tenant_policy on ticket_receipt
    for all using (tenant_id = current_tenant_id())
    with check (tenant_id = current_tenant_id());
  end if;
end
$$;
