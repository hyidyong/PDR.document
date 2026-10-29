-- MODIT initial relational schema for Supabase PostgreSQL.
-- Non-destructive: this migration contains no DROP, TRUNCATE, or DELETE.

create table if not exists public.modit_projects (
  id text primary key,
  title text not null,
  deadline_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.modit_requirements (
  project_id text not null references public.modit_projects(id) on delete restrict,
  id text not null,
  name text not null,
  required boolean not null default true,
  display_order integer not null default 0,
  primary key (project_id, id)
);

create table if not exists public.modit_applicants (
  id text primary key,
  project_id text not null references public.modit_projects(id) on delete restrict,
  auth_user_id uuid unique references auth.users(id) on delete restrict,
  name text not null,
  student_id text not null,
  created_at timestamptz not null default now(),
  unique (project_id, student_id)
);

create table if not exists public.modit_submission_cases (
  project_id text not null references public.modit_projects(id) on delete restrict,
  applicant_id text not null references public.modit_applicants(id) on delete restrict,
  status text not null default 'DRAFT' check (status in ('DRAFT','SUBMITTED','SUBMITTED_INCOMPLETE','NEEDS_REVISION','REVIEW_PENDING')),
  updated_at timestamptz not null default now(),
  primary key (project_id, applicant_id)
);

create table if not exists public.modit_document_versions (
  id uuid primary key,
  project_id text not null,
  applicant_id text not null,
  requirement_id text not null,
  version integer not null check (version > 0),
  file_name text not null,
  content_type text not null check (content_type = 'application/pdf'),
  size_bytes bigint not null check (size_bytes >= 0),
  storage_key text not null unique,
  uploaded_at timestamptz not null,
  foreign key (project_id, applicant_id) references public.modit_submission_cases(project_id, applicant_id) on delete restrict,
  foreign key (project_id, requirement_id) references public.modit_requirements(project_id, id) on delete restrict,
  unique (project_id, applicant_id, requirement_id, version)
);

create table if not exists public.modit_inspections (
  id uuid primary key,
  document_id uuid not null references public.modit_document_versions(id) on delete restrict,
  project_id text not null,
  applicant_id text not null,
  requirement_id text not null,
  version integer not null,
  status text not null check (status in ('PASS','RECOMMEND','UNVERIFIABLE')),
  source text not null,
  findings jsonb not null default '[]'::jsonb,
  checked_at timestamptz not null,
  foreign key (project_id, applicant_id) references public.modit_submission_cases(project_id, applicant_id) on delete restrict
);

create table if not exists public.modit_submission_events (
  id uuid primary key,
  project_id text not null,
  applicant_id text not null,
  round integer not null check (round > 0),
  status text not null,
  document_versions jsonb not null,
  submitted_at timestamptz not null,
  foreign key (project_id, applicant_id) references public.modit_submission_cases(project_id, applicant_id) on delete restrict,
  unique (project_id, applicant_id, round)
);

create table if not exists public.modit_feedback (
  id uuid primary key,
  project_id text not null,
  applicant_id text not null,
  author_user_id uuid references auth.users(id) on delete restrict,
  author_name text not null,
  comment text not null,
  target_requirement_ids text[] not null,
  original_versions jsonb not null,
  created_at timestamptz not null,
  foreign key (project_id, applicant_id) references public.modit_submission_cases(project_id, applicant_id) on delete restrict
);

create table if not exists public.modit_approvals (
  id uuid primary key,
  project_id text not null,
  applicant_id text not null,
  status text not null check (status in ('PENDING','APPROVED','REJECTED')),
  reviewer_user_id uuid references auth.users(id) on delete restrict,
  reviewer_name text,
  comment text,
  decided_at timestamptz,
  foreign key (project_id, applicant_id) references public.modit_submission_cases(project_id, applicant_id) on delete restrict,
  unique (project_id, applicant_id)
);

create table if not exists public.modit_activity_logs (
  id uuid primary key,
  project_id text not null,
  applicant_id text not null,
  actor_user_id uuid references auth.users(id) on delete restrict,
  event text not null,
  detail text not null,
  occurred_at timestamptz not null,
  foreign key (project_id, applicant_id) references public.modit_submission_cases(project_id, applicant_id) on delete restrict
);

create index if not exists modit_applicants_project_idx on public.modit_applicants(project_id);
create index if not exists modit_documents_case_idx on public.modit_document_versions(project_id, applicant_id, requirement_id, version desc);
create index if not exists modit_inspections_case_idx on public.modit_inspections(project_id, applicant_id, checked_at desc);
create index if not exists modit_feedback_case_idx on public.modit_feedback(project_id, applicant_id, created_at desc);
create index if not exists modit_activity_case_idx on public.modit_activity_logs(project_id, applicant_id, occurred_at desc);

insert into public.modit_projects (id, title, deadline_at)
values ('modit-2026', '2026 창업동아리 지원사업 정산', '2026-10-31 23:59:59+09')
on conflict (id) do nothing;

insert into public.modit_requirements (project_id, id, name, required, display_order) values
  ('modit-2026', 'plan', '사업계획서', true, 1),
  ('modit-2026', 'contract', '계약서', true, 2),
  ('modit-2026', 'receipts', '지출 증빙', true, 3)
on conflict (project_id, id) do nothing;

insert into public.modit_applicants (id, project_id, name, student_id)
values ('applicant-001', 'modit-2026', '김청년', '20231234')
on conflict (id) do nothing;

insert into public.modit_submission_cases (project_id, applicant_id, status)
values ('modit-2026', 'applicant-001', 'DRAFT')
on conflict (project_id, applicant_id) do nothing;

insert into public.modit_approvals (id, project_id, applicant_id, status)
values (gen_random_uuid(), 'modit-2026', 'applicant-001', 'PENDING')
on conflict (project_id, applicant_id) do nothing;
