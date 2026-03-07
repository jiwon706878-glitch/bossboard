create table public.waitlist (
  id uuid default gen_random_uuid() primary key,
  email text not null unique,
  business_type text not null,
  interested_features text[] default '{}',
  feature_request text,
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;

-- Allow anonymous inserts (public signup form)
create policy "Anyone can join waitlist"
  on public.waitlist for insert
  with check (true);
