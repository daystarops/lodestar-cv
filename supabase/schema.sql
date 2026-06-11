create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text not null,
  name text,
  target_role text,
  job_description text,
  extra_context text,
  resume_file_name text,
  resume_path text,
  preview jsonb,
  stripe_session_id text,
  checkout_url text,
  payment_status text default 'previewed'
);

alter table public.submissions
add column if not exists stripe_session_id text;

alter table public.submissions
add column if not exists checkout_url text;

create index if not exists submissions_created_at_idx on public.submissions (created_at desc);
create index if not exists submissions_email_idx on public.submissions (email);

insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;
