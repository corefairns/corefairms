-- CoreFair Supabase schema
-- Run in Supabase Dashboard -> SQL Editor.
-- Designed for Supabase Auth + Row Level Security.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  username text not null unique,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[A-Za-z0-9_]{3,30}$')
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  body text not null check (char_length(trim(body)) between 1 and 3000),
  category text not null default 'Business'
    check (category in ('Business','Products','Services','Offers','Tips','Updates')),
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1500),
  created_at timestamptz not null default now()
);

create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists posts_user_id_created_at_idx on public.posts (user_id, created_at desc);
create index if not exists posts_category_created_at_idx on public.posts (category, created_at desc);
create index if not exists post_likes_user_id_idx on public.post_likes (user_id);
create index if not exists comments_post_id_created_at_idx on public.comments (post_id, created_at asc);
create index if not exists comments_user_id_idx on public.comments (user_id);

-- Ensure updated_at changes on profile updates.
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at before update on public.posts
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.comments enable row level security;

-- Profiles are public to signed-in users; each user controls their own row.
drop policy if exists "Profiles are readable by everyone" on public.profiles;
create policy "Profiles are readable by everyone"
on public.profiles for select
to anon, authenticated
using (true);

drop policy if exists "Users insert their own profile" on public.profiles;
create policy "Users insert their own profile"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Users update their own profile" on public.profiles;
create policy "Users update their own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Public posts are readable by visitors; only the author can create/update/delete.
drop policy if exists "Posts are publicly readable" on public.posts;
create policy "Posts are publicly readable"
on public.posts for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated users create their own posts" on public.posts;
create policy "Authenticated users create their own posts"
on public.posts for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Authors update their own posts" on public.posts;
create policy "Authors update their own posts"
on public.posts for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Authors delete their own posts" on public.posts;
create policy "Authors delete their own posts"
on public.posts for delete
to authenticated
using (auth.uid() = user_id);

-- Users may read likes so the public like counts can be computed.
drop policy if exists "Likes are publicly readable" on public.post_likes;
create policy "Likes are publicly readable"
on public.post_likes for select
to anon, authenticated
using (true);

drop policy if exists "Users like as themselves" on public.post_likes;
create policy "Users like as themselves"
on public.post_likes for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users remove their own likes" on public.post_likes;
create policy "Users remove their own likes"
on public.post_likes for delete
to authenticated
using (auth.uid() = user_id);

-- Comments are public; authors may add and remove their own comments.
drop policy if exists "Comments are publicly readable" on public.comments;
create policy "Comments are publicly readable"
on public.comments for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated users add their own comments" on public.comments;
create policy "Authenticated users add their own comments"
on public.comments for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users delete their own comments" on public.comments;
create policy "Users delete their own comments"
on public.comments for delete
to authenticated
using (auth.uid() = user_id);

-- A profile row is created automatically on signup. Username conflicts fall back to
-- a unique suffix, so duplicate email-prefix usernames do not block registration.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_username text;
  final_username text;
begin
  base_username := coalesce(
    nullif(new.raw_user_meta_data ->> 'username', ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'member'
  );
  base_username := regexp_replace(base_username, '[^A-Za-z0-9_]', '_', 'g');
  base_username := left(base_username, 22);
  if char_length(base_username) < 3 then
    base_username := 'user_' || left(replace(new.id::text, '-', ''), 8);
  end if;
  final_username := base_username;
  if exists (select 1 from public.profiles p where lower(p.username) = lower(final_username)) then
    final_username := left(base_username, 21) || '_' || left(replace(new.id::text, '-', ''), 8);
  end if;
  insert into public.profiles (id, full_name, username)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(coalesce(new.email, ''), '@', 1), 'CoreFair User'),
    final_username
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Keep Supabase API schema cache fresh after applying this script.
notify pgrst, 'reload schema';
