-- expense-documents는 반드시 Private 버킷이어야 합니다.
-- 객체 경로 첫 번째 폴더가 로그인 사용자의 UUID인 경우에만 접근을 허용합니다.

create policy "expense documents insert own folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'expense-documents'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and name ~ ('^' || (select auth.uid()::text) || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$')
);

create policy "expense documents select own folder"
on storage.objects for select to authenticated
using (
  bucket_id = 'expense-documents'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and name ~ ('^' || (select auth.uid()::text) || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$')
  and owner_id = (select auth.uid()::text)
);

-- 현재 앱은 overwrite/upsert 및 삭제를 사용하지 않으므로 UPDATE/DELETE 정책은 만들지 않습니다.
