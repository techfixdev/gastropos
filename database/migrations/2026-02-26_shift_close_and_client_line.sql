alter table if exists order_item
add column if not exists client_line_id text;

update order_item
set client_line_id = id::text
where client_line_id is null;

alter table if exists order_item
alter column client_line_id set not null;

create unique index if not exists idx_order_item_client_line on order_item(order_id, client_line_id);

create table if not exists cash_shift_close (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenant(id) on delete cascade,
  cashier_user_id uuid not null references app_user(id) on delete restrict,
  ticket_count int not null check (ticket_count >= 0),
  total_amount numeric(12,2) not null check (total_amount >= 0),
  synced_count int not null check (synced_count >= 0),
  pending_count int not null check (pending_count >= 0),
  closed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_shift_close_tenant_closed on cash_shift_close(tenant_id, closed_at desc);

alter table cash_shift_close enable row level security;

create policy if not exists cash_shift_close_tenant_policy on cash_shift_close
for all using (tenant_id = current_tenant_id())
with check (tenant_id = current_tenant_id());
