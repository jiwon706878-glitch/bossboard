create table public.scripts (
  id uuid default gen_random_uuid() primary key,
  business_id uuid references public.businesses(id) on delete cascade not null,
  title text not null,
  format text not null check (format in ('tiktok', 'reel', 'youtube_short', 'story', 'testimonial')),
  topic text not null,
  audience text,
  hook text,
  body text,
  cta text,
  filming_guide text,
  full_script text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.scripts enable row level security;

create policy "Users can view scripts for own businesses"
  on public.scripts for select
  using (
    exists (
      select 1 from public.businesses
      where businesses.id = scripts.business_id
      and businesses.user_id = auth.uid()
    )
  );

create policy "Users can insert scripts for own businesses"
  on public.scripts for insert
  with check (
    exists (
      select 1 from public.businesses
      where businesses.id = scripts.business_id
      and businesses.user_id = auth.uid()
    )
  );

create policy "Users can update scripts for own businesses"
  on public.scripts for update
  using (
    exists (
      select 1 from public.businesses
      where businesses.id = scripts.business_id
      and businesses.user_id = auth.uid()
    )
  );

create policy "Users can delete scripts for own businesses"
  on public.scripts for delete
  using (
    exists (
      select 1 from public.businesses
      where businesses.id = scripts.business_id
      and businesses.user_id = auth.uid()
    )
  );
