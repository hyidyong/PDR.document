-- Run only after 004 returns no integrity violations.
-- Adds constraints without deleting or rewriting application rows.

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'modit_document_identity_unique') then
    alter table public.modit_document_versions
      add constraint modit_document_identity_unique
      unique (id, project_id, applicant_id, requirement_id, version);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'modit_inspection_document_identity_fk') then
    alter table public.modit_inspections
      add constraint modit_inspection_document_identity_fk
      foreign key (document_id, project_id, applicant_id, requirement_id, version)
      references public.modit_document_versions(id, project_id, applicant_id, requirement_id, version)
      on delete restrict not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'modit_submission_event_status_check') then
    alter table public.modit_submission_events
      add constraint modit_submission_event_status_check
      check (status in ('DRAFT','SUBMITTED','SUBMITTED_INCOMPLETE','NEEDS_REVISION','REVIEW_PENDING'))
      not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'modit_approval_decision_check') then
    alter table public.modit_approvals
      add constraint modit_approval_decision_check
      check (
        (status = 'PENDING' and decided_at is null)
        or
        (status in ('APPROVED','REJECTED') and reviewer_user_id is not null and decided_at is not null)
      ) not valid;
  end if;
end $$;

-- Validation scans existing rows but does not modify them.
alter table public.modit_inspections validate constraint modit_inspection_document_identity_fk;
alter table public.modit_submission_events validate constraint modit_submission_event_status_check;
alter table public.modit_approvals validate constraint modit_approval_decision_check;
