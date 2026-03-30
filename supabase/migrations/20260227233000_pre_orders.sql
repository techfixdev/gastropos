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

create index if not exists idx_pre_order_tenant_due on pre_order(tenant_id, due_at desc);

alter table pre_order enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'pre_order' and policyname = 'pre_order_tenant_policy') then
    create policy pre_order_tenant_policy on pre_order
    for all using (tenant_id = current_tenant_id())
    with check (tenant_id = current_tenant_id());
  end if;
end
$$;
