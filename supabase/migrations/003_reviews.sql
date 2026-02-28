create table public.reviews (
  id uuid default gen_random_uuid() primary key,
  business_id uuid references public.businesses(id) on delete cascade not null,
  reviewer_name text not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  review_text text not null,
  sentiment text check (sentiment in ('positive', 'neutral', 'negative')),
  source text default 'manual',
  review_date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.reviews enable row level security;

create policy "Users can view reviews for own businesses"
  on public.reviews for select
  using (
    exists (
      select 1 from public.businesses
      where businesses.id = reviews.business_id
      and businesses.user_id = auth.uid()
    )
  );

create policy "Users can insert reviews for own businesses"
  on public.reviews for insert
  with check (
    exists (
      select 1 from public.businesses
      where businesses.id = reviews.business_id
      and businesses.user_id = auth.uid()
    )
  );

create policy "Users can update reviews for own businesses"
  on public.reviews for update
  using (
    exists (
      select 1 from public.businesses
      where businesses.id = reviews.business_id
      and businesses.user_id = auth.uid()
    )
  );

create policy "Users can delete reviews for own businesses"
  on public.reviews for delete
  using (
    exists (
      select 1 from public.businesses
      where businesses.id = reviews.business_id
      and businesses.user_id = auth.uid()
    )
  );
