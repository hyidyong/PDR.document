-- Read-only security inventory to run BEFORE 003_modit_rls_and_backend_role.sql.
-- This file changes no roles, grants, policies, application rows, or objects.

-- 1. Current execution identity and relevant role attributes.
select session_user, current_user;

select
  rolname,
  rolcanlogin,
  rolsuper,
  rolinherit,
  rolcreaterole,
  rolcreatedb,
  rolbypassrls
from pg_roles
where rolname in (
  'postgres',
  'modit_backend',
  'anon',
  'authenticated',
  'service_role'
)
order by rolname;

-- 2. Existing role memberships. Before 003, a missing postgres ->
-- modit_backend membership is expected if modit_backend is new.
select
  granted.rolname as granted_role,
  member.rolname as member_role,
  grantor.rolname as grantor_role,
  membership.admin_option
from pg_auth_members membership
join pg_roles granted on granted.oid = membership.roleid
join pg_roles member on member.oid = membership.member
join pg_roles grantor on grantor.oid = membership.grantor
where granted.rolname = 'modit_backend'
   or member.rolname in ('postgres', 'modit_backend')
order by granted_role, member_role;

-- 3. Existing table owners and RLS flags.
select
  c.relname as table_name,
  owner_role.rolname as owner,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
join pg_roles owner_role on owner_role.oid = c.relowner
where n.nspname = 'public'
  and c.relname in (
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
order by c.relname;

-- 4. Every explicit table grant, including unexpected custom roles.
select
  table_name,
  grantee,
  privilege_type,
  is_grantable
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
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
order by table_name, grantee, privilege_type;

-- 5. Every existing RLS policy. Any policy other than the intended backend
-- policy must be reviewed before 003 is run; 003 deliberately does not delete it.
select
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
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

-- 6. Effective CRUD privileges for the roles relevant to MODIT. This catches
-- privileges inherited through another role, not only explicit grants.
select
  target.table_name,
  role_name,
  has_table_privilege(role_name, format('public.%I', target.table_name), 'SELECT') as can_select,
  has_table_privilege(role_name, format('public.%I', target.table_name), 'INSERT') as can_insert,
  has_table_privilege(role_name, format('public.%I', target.table_name), 'UPDATE') as can_update,
  has_table_privilege(role_name, format('public.%I', target.table_name), 'DELETE') as can_delete
from (values
  ('modit_projects'),
  ('modit_requirements'),
  ('modit_applicants'),
  ('modit_submission_cases'),
  ('modit_document_versions'),
  ('modit_inspections'),
  ('modit_submission_events'),
  ('modit_feedback'),
  ('modit_approvals'),
  ('modit_activity_logs')
) as target(table_name)
cross join (values
  ('anon'),
  ('authenticated'),
  ('service_role'),
  ('postgres'),
  ('modit_backend')
) as relevant(role_name)
join pg_roles existing_role on existing_role.rolname = relevant.role_name
order by target.table_name, role_name;

-- 7. Read-only inventory of Auth/Storage policies. 003 must not change any of
-- these rows; capture this output and compare it after 003 if desired.
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname in ('auth', 'storage')
order by schemaname, tablename, policyname;
