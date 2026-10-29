-- Enable and force RLS for all MODIT application tables.
-- Non-destructive: no application rows or Storage objects are changed.
-- Frontend PostgREST roles receive no privileges on these tables.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'modit_backend') then
    create role modit_backend
      nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
  end if;
end $$;

-- Normalize an existing role as well as a newly created one. This prevents a
-- pre-existing role with LOGIN, SUPERUSER, or BYPASSRLS from weakening RLS.
alter role modit_backend
  nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'postgres') then
    raise exception 'Required Supabase database role "postgres" does not exist';
  end if;
end $$;

-- SET ROLE is allowed only when the session role is a member of the target.
-- Spring Boot must connect as postgres (direct) or postgres.<project-ref>
-- (session pooler), both of which map to the database role postgres.
grant modit_backend to postgres;
grant usage on schema public to modit_backend;

do $$
begin
  if not pg_has_role('postgres', 'modit_backend', 'MEMBER') then
    raise exception 'postgres is not a member of modit_backend; SET ROLE would fail';
  end if;
end $$;

revoke all privileges on table
  public.modit_projects,
  public.modit_requirements,
  public.modit_applicants,
  public.modit_submission_cases,
  public.modit_document_versions,
  public.modit_inspections,
  public.modit_submission_events,
  public.modit_feedback,
  public.modit_approvals,
  public.modit_activity_logs
from anon, authenticated, public;

grant select, insert, update on table
  public.modit_projects,
  public.modit_requirements,
  public.modit_applicants,
  public.modit_submission_cases,
  public.modit_document_versions,
  public.modit_inspections,
  public.modit_submission_events,
  public.modit_feedback,
  public.modit_approvals,
  public.modit_activity_logs
to modit_backend;

do $$
declare
  table_name text;
  policy_name constant text := 'modit backend server access';
begin
  foreach table_name in array array[
    'modit_projects',
    'modit_requirements',
    'modit_applicants',
    'modit_submission_cases',
    'modit_document_versions',
    'modit_inspections',
    'modit_submission_events',
    'modit_feedback',
    'modit_approvals',
    'modit_activity_logs'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = table_name
        and policyname = policy_name
    ) then
      execute format(
        'create policy %I on public.%I for all to modit_backend using (true) with check (true)',
        policy_name, table_name
      );
    end if;
  end loop;
end $$;

-- Verification: both values must be true for every row.
select c.relname as table_name, c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname like 'modit\_%' escape '\'
  and c.relkind = 'r'
order by c.relname;

-- Verification: exactly one expected backend policy should be present per
-- table. Review any additional policy returned by the preflight separately.
select tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'modit_projects',
    'modit_requirements',
    'modit_applicants',
    'modit_submission_cases',
    'modit_document_versions',
    'modit_inspections',
    'modit_submission_events',
    'modit_feedback',
    'modit_approvals',
    'modit_activity_logs'
  )
order by tablename, policyname;

select
  session_user,
  current_user,
  pg_has_role('postgres', 'modit_backend', 'MEMBER') as postgres_can_set_role;
