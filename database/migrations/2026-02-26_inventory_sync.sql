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

create index if not exists idx_inventory_stock_tenant on inventory_stock(tenant_id);
create index if not exists idx_inventory_movement_tenant_created on inventory_movement(tenant_id, created_at desc);

alter table inventory_stock enable row level security;
alter table inventory_movement enable row level security;

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
