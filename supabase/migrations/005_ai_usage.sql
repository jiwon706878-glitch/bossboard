create table public.ai_usage (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  business_id uuid references public.businesses(id) on delete cascade not null,
  feature text not null,
  credits_used integer not null default 1,
  created_at timestamptz not null default now()
);

alter table public.ai_usage enable row level security;

create policy "Users can view own usage"
  on public.ai_usage for select
  using (auth.uid() = user_id);

create policy "Users can insert own usage"
  on public.ai_usage for insert
  with check (auth.uid() = user_id);

-- Helper function for monthly usage
create or replace function public.get_monthly_usage(p_user_id uuid)
returns integer as $$
  select coalesce(sum(credits_used), 0)::integer
  from public.ai_usage
  where user_id = p_user_id
  and created_at >= date_trunc('month', now());
$$ language sql security definer;
