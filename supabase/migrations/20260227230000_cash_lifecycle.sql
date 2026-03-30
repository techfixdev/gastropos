alter table if exists cash_shift_close
add column if not exists shift_opened_at timestamptz;

alter table if exists cash_shift_close
add column if not exists opening_amount numeric(12,2) not null default 0 check (opening_amount >= 0);

alter table if exists cash_shift_close
add column if not exists cash_sales_total numeric(12,2) not null default 0 check (cash_sales_total >= 0);

alter table if exists cash_shift_close
add column if not exists manual_in_total numeric(12,2) not null default 0 check (manual_in_total >= 0);

alter table if exists cash_shift_close
add column if not exists manual_out_total numeric(12,2) not null default 0 check (manual_out_total >= 0);

alter table if exists cash_shift_close
add column if not exists expected_cash numeric(12,2) not null default 0;

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

create index if not exists idx_cash_movement_tenant_created on cash_movement(tenant_id, created_at desc);

alter table cash_movement enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'cash_movement' and policyname = 'cash_movement_tenant_policy') then
    create policy cash_movement_tenant_policy on cash_movement
    for all using (tenant_id = current_tenant_id())
    with check (tenant_id = current_tenant_id());
  end if;
end
$$;
