-- Allow authenticated users to insert their own profile in app_user
-- This is needed for first-time anonymous auth: the user has no tenant_id yet
-- so the normal RLS policy (tenant_id = current_tenant_id()) would block the insert.
create policy app_user_insert_own_profile on public.app_user
for insert
with check (id = auth.uid());
