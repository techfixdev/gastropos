-- Fix: current_tenant_id() fallback for anonymous auth (no tenant_id in JWT)
-- When JWT lacks tenant_id claim, look up the user's tenant from app_user table
create or replace function current_tenant_id()
returns uuid
language sql
stable
as $$
  select coalesce(
    nullif(auth.jwt() ->> 'tenant_id', '')::uuid,
    (select tenant_id from public.app_user where id = auth.uid())
  );
$$;
