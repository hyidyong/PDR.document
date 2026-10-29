-- READ-ONLY preflight. Run and review every result before 005.
-- Every query except the first may validly return zero rows.

-- 1. Applicant/Auth mapping review. NULL means the account is not bound yet.
select a.id, a.project_id, a.name, a.student_id, a.auth_user_id,
       u.email as auth_email
from public.modit_applicants a
left join auth.users u on u.id = a.auth_user_id
order by a.project_id, a.id;

-- 2. Duplicate Auth user bindings (should return zero rows; UNIQUE already protects new writes).
select auth_user_id, count(*)
from public.modit_applicants
where auth_user_id is not null
group by auth_user_id
having count(*) > 1;

-- 3. Inspection rows whose duplicated document identity does not match the document row.
select i.id as inspection_id, i.document_id,
       i.project_id as inspection_project, d.project_id as document_project,
       i.applicant_id as inspection_applicant, d.applicant_id as document_applicant,
       i.requirement_id as inspection_requirement, d.requirement_id as document_requirement,
       i.version as inspection_version, d.version as document_version
from public.modit_inspections i
join public.modit_document_versions d on d.id = i.document_id
where (i.project_id, i.applicant_id, i.requirement_id, i.version)
   is distinct from (d.project_id, d.applicant_id, d.requirement_id, d.version);

-- 4. Submission event statuses outside the Java SubmissionStatus enum.
select id, project_id, applicant_id, status
from public.modit_submission_events
where status not in ('DRAFT','SUBMITTED','SUBMITTED_INCOMPLETE','NEEDS_REVISION','REVIEW_PENDING');

-- 5. Approval decision consistency problems.
select *
from public.modit_approvals
where (status = 'PENDING' and decided_at is not null)
   or (status in ('APPROVED','REJECTED') and (reviewer_user_id is null or decided_at is null));

-- 6. A decided approval attached to a case that was never submitted.
select a.project_id, a.applicant_id, a.status as approval_status, c.status as submission_status
from public.modit_approvals a
join public.modit_submission_cases c
  on c.project_id = a.project_id and c.applicant_id = a.applicant_id
where a.status in ('APPROVED','REJECTED')
  and c.status not in ('SUBMITTED','SUBMITTED_INCOMPLETE','REVIEW_PENDING');
