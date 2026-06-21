create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text not null,
  name text,
  target_role text,
  job_description text,
  extra_context text,
  resume_text text,
  parsed_resume jsonb,
  parser_status text,
  parser_provider text,
  parser_error text,
  parsed_at timestamptz,
  resume_file_name text,
  resume_path text,
  preview jsonb,
  final_status text,
  final_output jsonb,
  final_error text,
  final_generated_at timestamptz,
  email_status text,
  email_sent_at timestamptz,
  email_error text,
  stripe_session_id text,
  stripe_payment_intent text,
  paid_at timestamptz,
  checkout_url text,
  payment_status text default 'previewed'
);

alter table public.submissions
add column if not exists stripe_session_id text;

alter table public.submissions
add column if not exists checkout_url text;

alter table public.submissions
add column if not exists stripe_payment_intent text;

alter table public.submissions
add column if not exists paid_at timestamptz;

alter table public.submissions
add column if not exists resume_text text;

alter table public.submissions
add column if not exists parsed_resume jsonb;

alter table public.submissions
add column if not exists parser_status text;

alter table public.submissions
add column if not exists parser_provider text;

alter table public.submissions
add column if not exists parser_error text;

alter table public.submissions
add column if not exists parsed_at timestamptz;

alter table public.submissions
add column if not exists final_status text;

alter table public.submissions
add column if not exists final_output jsonb;

alter table public.submissions
add column if not exists final_error text;

alter table public.submissions
add column if not exists final_generated_at timestamptz;

alter table public.submissions
add column if not exists email_status text;

alter table public.submissions
add column if not exists email_sent_at timestamptz;

alter table public.submissions
add column if not exists email_error text;

create index if not exists submissions_created_at_idx on public.submissions (created_at desc);
create index if not exists submissions_email_idx on public.submissions (email);

insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;
