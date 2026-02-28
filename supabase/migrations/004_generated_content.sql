create table public.generated_content (
  id uuid default gen_random_uuid() primary key,
  business_id uuid references public.businesses(id) on delete cascade not null,
  review_id uuid references public.reviews(id) on delete set null,
  content_type text not null check (content_type in ('review_reply', 'caption', 'script')),
  prompt text,
  result text not null,
  tone text,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

alter table public.generated_content enable row level security;

create policy "Users can view content for own businesses"
  on public.generated_content for select
  using (
    exists (
      select 1 from public.businesses
      where businesses.id = generated_content.business_id
      and businesses.user_id = auth.uid()
    )
  );

create policy "Users can insert content for own businesses"
  on public.generated_content for insert
  with check (
    exists (
      select 1 from public.businesses
      where businesses.id = generated_content.business_id
      and businesses.user_id = auth.uid()
    )
  );
