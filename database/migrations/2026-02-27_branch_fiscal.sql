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
