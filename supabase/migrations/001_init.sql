-- Posts table
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text,
  caption text,
  hashtags text[] default '{}',
  video_path text not null,
  platforms text[] not null,
  status text default 'pending',
  platform_results jsonb,
  scheduled_for timestamptz,
  published_at timestamptz,
  created_at timestamptz default now()
);

alter table posts enable row level security;

create policy "Users see own posts"
  on posts for all
  using (auth.uid() = user_id);

-- Platform sessions (encrypted cookies)
create table if not exists platform_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  platform text not null,
  encrypted_cookies text not null,
  is_active boolean default true,
  updated_at timestamptz default now(),
  unique(user_id, platform)
);

alter table platform_sessions enable row level security;

create policy "Users see own sessions"
  on platform_sessions for all
  using (auth.uid() = user_id);

-- Create storage bucket for videos
insert into storage.buckets (id, name, public)
values ('videos', 'videos', false)
on conflict do nothing;

-- Storage policy: users can upload to their own folder
create policy "Users upload own videos"
  on storage.objects for insert
  with check (
    bucket_id = 'videos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policy: users can read their own videos
create policy "Users read own videos"
  on storage.objects for select
  using (
    bucket_id = 'videos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
