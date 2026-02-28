create table public.social_posts (
  id uuid default gen_random_uuid() primary key,
  business_id uuid references public.businesses(id) on delete cascade not null,
  image_url text,
  caption text,
  hashtags text[] default '{}',
  tone text,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'posted')),
  scheduled_at timestamptz,
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.social_posts enable row level security;

create policy "Users can view posts for own businesses"
  on public.social_posts for select
  using (
    exists (
      select 1 from public.businesses
      where businesses.id = social_posts.business_id
      and businesses.user_id = auth.uid()
    )
  );

create policy "Users can insert posts for own businesses"
  on public.social_posts for insert
  with check (
    exists (
      select 1 from public.businesses
      where businesses.id = social_posts.business_id
      and businesses.user_id = auth.uid()
    )
  );

create policy "Users can update posts for own businesses"
  on public.social_posts for update
  using (
    exists (
      select 1 from public.businesses
      where businesses.id = social_posts.business_id
      and businesses.user_id = auth.uid()
    )
  );

create policy "Users can delete posts for own businesses"
  on public.social_posts for delete
  using (
    exists (
      select 1 from public.businesses
      where businesses.id = social_posts.business_id
      and businesses.user_id = auth.uid()
    )
  );
