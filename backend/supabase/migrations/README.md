# MODIT Supabase PostgreSQL migrations

These files are intentionally not executed by Spring Boot. Review and run them manually in Supabase SQL Editor.

1. `001_modit_schema.sql`: creates additive application tables, indexes, and idempotent seed rows. It contains no `DROP`, `TRUNCATE`, or `DELETE`.
2. Bind the existing Supabase Auth user to the applicant before enabling JDBC:
   `update public.modit_applicants set auth_user_id = '<user uuid>' where id = 'applicant-001' and auth_user_id is null;`
3. `003a_modit_security_preflight.sql`: read-only inventory of existing role memberships, grants, effective privileges, RLS flags, and policies. Review unexpected custom-role grants or policies before continuing.
4. `003_modit_rls_and_backend_role.sql`: enables and forces RLS on all ten `modit_*` tables, revokes PostgREST roles, and grants non-delete access only through the `modit_backend` server role.
5. `004_modit_integrity_preflight.sql`: read-only checks for Auth mappings, document/inspection mismatches, invalid statuses, and inconsistent decisions.
6. Run `005_modit_integrity_constraints.sql` only when all violation queries in 004 return zero rows.
7. `002_admin_storage_read_policy.sql`: adds only `SELECT` access for authenticated JWTs whose `app_metadata.role` is `admin`, only in `expense-documents`, only for PDF objects.

Do not enable the `postgres` Spring profile until `001_modit_schema.sql` has completed successfully and a database backup has been taken.

The backend uses `SET ROLE modit_backend` when each physical JDBC connection is opened. Use the Supabase direct connection or session pooler on port 5432. Do not use the transaction pooler on port 6543 because session state such as `SET ROLE` is not guaranteed to persist.
