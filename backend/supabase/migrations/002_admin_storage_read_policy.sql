-- Adds read-only admin access to existing PDF objects.
-- Existing owner policies remain unchanged. No INSERT, UPDATE, or DELETE policy is added.

do $$
begin
  create policy "expense documents admin pdf read only"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'expense-documents'
    and lower(storage.extension(name)) = 'pdf'
    and (select auth.jwt()->'app_metadata'->>'role') = 'admin'
  );
exception
  when duplicate_object then null;
end $$;
