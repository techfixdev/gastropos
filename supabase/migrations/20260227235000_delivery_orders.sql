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

create index if not exists idx_delivery_order_tenant_created on delivery_order(tenant_id, created_at desc);

alter table delivery_order enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'delivery_order' and policyname = 'delivery_order_tenant_policy') then
    create policy delivery_order_tenant_policy on delivery_order
    for all using (tenant_id = current_tenant_id())
    with check (tenant_id = current_tenant_id());
  end if;
end
$$;
