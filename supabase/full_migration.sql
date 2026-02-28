-- Profiles table (auto-created on signup)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  avatar_url text,
  plan_id text not null default 'free',
  paddle_customer_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
create table public.businesses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  type text not null,
  address text,
  google_place_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.businesses enable row level security;

create policy "Users can view own businesses"
  on public.businesses for select
  using (auth.uid() = user_id);

create policy "Users can insert own businesses"
  on public.businesses for insert
  with check (auth.uid() = user_id);

create policy "Users can update own businesses"
  on public.businesses for update
  using (auth.uid() = user_id);

create policy "Users can delete own businesses"
  on public.businesses for delete
  using (auth.uid() = user_id);
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
create table public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  paddle_subscription_id text unique,
  paddle_price_id text,
  plan_id text not null default 'free',
  status text not null default 'active' check (status in ('active', 'canceled', 'past_due', 'trialing')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "Users can view own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);
