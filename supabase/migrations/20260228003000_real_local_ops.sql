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
