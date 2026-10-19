-- CoreFair marketplace schema starter for Supabase SQL Editor.
-- Run in a fresh Supabase project. Review policies before production.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text,
 avatar_url text,
 bio text,
 role text not null default 'buyer' check (role in ('buyer','creator','admin')),
 preferred_language text not null default 'en' check (preferred_language in ('en','bn')),
 created_at timestamptz not null default now()
);
create table if not exists public.categories (
 id uuid primary key default gen_random_uuid(),
 name text not null unique,
 slug text not null unique,
 created_at timestamptz not null default now()
);
create table if not exists public.assets (
 id uuid primary key default gen_random_uuid(),
 creator_id uuid not null references public.profiles(id) on delete restrict,
 category_id uuid references public.categories(id) on delete set null,
 title text not null,
 description text,
 tags text[] not null default '{}',
 preview_image_path text,
 storage_path text,
 price_bdt integer not null default 0 check(price_bdt >= 0),
 license_type text not null default 'standard',
 file_type text,
 resolution text,
 status text not null default 'draft' check(status in ('draft','pending','published','rejected','removed')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists assets_status_created_idx on public.assets(status, created_at desc);
create index if not exists assets_creator_idx on public.assets(creator_id);
create table if not exists public.orders (
 id uuid primary key default gen_random_uuid(),
 buyer_id uuid not null references public.profiles(id) on delete restrict,
 total_bdt integer not null check(total_bdt >= 0),
 currency text not null default 'BDT',
 status text not null default 'pending' check(status in ('pending','paid','failed','cancelled','refunded')),
 payment_provider text,
 provider_reference text unique,
 created_at timestamptz not null default now()
);
create table if not exists public.order_items (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.orders(id) on delete cascade,
 asset_id uuid not null references public.assets(id) on delete restrict,
 creator_id uuid not null references public.profiles(id) on delete restrict,
 unit_price_bdt integer not null check(unit_price_bdt >= 0),
 unique(order_id, asset_id)
);
create table if not exists public.download_entitlements (
 id uuid primary key default gen_random_uuid(),
 buyer_id uuid not null references public.profiles(id) on delete cascade,
 asset_id uuid not null references public.assets(id) on delete restrict,
 order_item_id uuid references public.order_items(id) on delete set null,
 downloads_count integer not null default 0,
 created_at timestamptz not null default now(),
 unique(buyer_id, asset_id)
);
create table if not exists public.reviews (
 id uuid primary key default gen_random_uuid(),
 asset_id uuid not null references public.assets(id) on delete cascade,
 buyer_id uuid not null references public.profiles(id) on delete cascade,
 order_item_id uuid not null references public.order_items(id) on delete restrict,
 rating smallint not null check(rating between 1 and 5),
 review_text text,
 status text not null default 'visible' check(status in ('visible','hidden','reported')),
 created_at timestamptz not null default now(),
 unique(asset_id, buyer_id, order_item_id)
);
create table if not exists public.subscriptions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 plan_code text not null check(plan_code in ('creator_plus','studio')),
 provider text,
 provider_subscription_id text unique,
 status text not null default 'pending' check(status in ('pending','active','past_due','cancelled','expired')),
 current_period_end timestamptz,
 created_at timestamptz not null default now()
);
create table if not exists public.affiliate_profiles (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 referral_code text not null unique,
 commission_basis_points integer not null default 500 check(commission_basis_points between 0 and 3000),
 status text not null default 'active' check(status in ('active','paused','blocked')),
 created_at timestamptz not null default now()
);
create table if not exists public.affiliate_referrals (
 id uuid primary key default gen_random_uuid(),
 affiliate_user_id uuid not null references public.profiles(id) on delete restrict,
 referred_user_id uuid references public.profiles(id) on delete set null,
 order_id uuid references public.orders(id) on delete set null,
 commission_bdt integer not null default 0 check(commission_bdt >= 0),
 status text not null default 'pending' check(status in ('pending','approved','paid','rejected')),
 created_at timestamptz not null default now()
);
create table if not exists public.asset_reports (
 id uuid primary key default gen_random_uuid(),
 reporter_id uuid not null references public.profiles(id) on delete cascade,
 asset_id uuid not null references public.assets(id) on delete cascade,
 reason text not null,
 status text not null default 'open' check(status in ('open','reviewing','resolved','dismissed')),
 created_at timestamptz not null default now()
);

-- Profile auto-creation on signup; role is always buyer initially.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
 insert into public.profiles(id, display_name)
 values(new.id, coalesce(new.raw_user_meta_data->>'display_name',''))
 on conflict(id) do nothing;
 return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.assets enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.download_entitlements enable row level security;
alter table public.reviews enable row level security;
alter table public.subscriptions enable row level security;
alter table public.affiliate_profiles enable row level security;
alter table public.affiliate_referrals enable row level security;
alter table public.asset_reports enable row level security;

create policy "Public can read categories" on public.categories for select using(true);
create policy "Users read own profile" on public.profiles for select to authenticated using(id = auth.uid());
create policy "Users update own profile" on public.profiles for update to authenticated using(id = auth.uid()) with check(id = auth.uid());
create policy "Public reads published assets" on public.assets for select using(status = 'published' or creator_id = auth.uid());
create policy "Creator creates own assets" on public.assets for insert to authenticated with check(creator_id = auth.uid());
create policy "Creator updates own assets" on public.assets for update to authenticated using(creator_id = auth.uid()) with check(creator_id = auth.uid());
create policy "Creator deletes own draft assets" on public.assets for delete to authenticated using(creator_id = auth.uid() and status in ('draft','rejected'));
create policy "Buyer reads own orders" on public.orders for select to authenticated using(buyer_id = auth.uid());
create policy "Buyer reads own order items" on public.order_items for select to authenticated using(exists(select 1 from public.orders o where o.id = order_id and o.buyer_id = auth.uid()));
create policy "Buyer reads own entitlements" on public.download_entitlements for select to authenticated using(buyer_id = auth.uid());
create policy "Public reads visible reviews" on public.reviews for select using(status = 'visible');
create policy "Reviewer reads own reviews" on public.reviews for select to authenticated using(buyer_id = auth.uid());
create policy "Reviewer adds own review" on public.reviews for insert to authenticated with check(buyer_id = auth.uid() and exists(select 1 from public.order_items oi join public.orders o on o.id=oi.order_id where oi.id=order_item_id and oi.asset_id=asset_id and o.buyer_id=auth.uid() and o.status='paid'));
create policy "Users read own subscriptions" on public.subscriptions for select to authenticated using(user_id = auth.uid());
create policy "Users read own affiliate profile" on public.affiliate_profiles for select to authenticated using(user_id = auth.uid());
create policy "Users read own referral records" on public.affiliate_referrals for select to authenticated using(affiliate_user_id = auth.uid());
create policy "Users report assets" on public.asset_reports for insert to authenticated with check(reporter_id = auth.uid());
create policy "Users read own reports" on public.asset_reports for select to authenticated using(reporter_id = auth.uid());

-- Admin powers must be implemented server-side using trusted JWT claims or secure functions.
-- Do not allow users to update their own role. Promote admins manually via SQL by a trusted operator.
-- Do not create client policies that allow clients to mark orders paid or create download entitlements.

insert into public.categories(name,slug) values
 ('Stock Footage','stock-footage'),('Video Templates','video-templates'),('Photos','photos'),
 ('Audio','audio'),('Graphics','graphics'),('Fonts','fonts'),('UI Kits','ui-kits'),
 ('3D Assets','3d-assets'),('Code','code'),('E-books','e-books')
on conflict(slug) do nothing;

-- Storage setup (Dashboard > Storage):
-- 1. Create a PUBLIC bucket named asset-previews for watermarked/approved previews only.
-- 2. Create a PRIVATE bucket named purchased-assets for original downloadable files.
-- 3. Do not expose private originals through public URLs. Generate short-lived signed URLs
--    from a trusted Edge Function only after checking a paid order and entitlement.


-- CoreFair admin controls + direct messages + WebRTC signaling (migration)
create or replace function public.is_corefair_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='admin'); $$;
revoke all on function public.is_corefair_admin() from public;
grant execute on function public.is_corefair_admin() to authenticated;

create table if not exists public.site_settings (
 key text primary key,
 value text not null default '',
 updated_by uuid references public.profiles(id) on delete set null,
 updated_at timestamptz not null default now()
);
alter table public.site_settings enable row level security;
create policy "Public reads site settings" on public.site_settings for select using(true);
create policy "Admins insert site settings" on public.site_settings for insert to authenticated with check(public.is_corefair_admin());
create policy "Admins update site settings" on public.site_settings for update to authenticated using(public.is_corefair_admin()) with check(public.is_corefair_admin());
create policy "Admins delete site settings" on public.site_settings for delete to authenticated using(public.is_corefair_admin());

create table if not exists public.direct_messages (
 id uuid primary key default gen_random_uuid(),
 sender_id uuid not null references public.profiles(id) on delete cascade,
 recipient_id uuid not null references public.profiles(id) on delete cascade,
 body text not null check(length(body) between 1 and 4000),
 created_at timestamptz not null default now(),
 constraint no_self_message check(sender_id <> recipient_id)
);
create index if not exists direct_messages_pair_time_idx on public.direct_messages(sender_id,recipient_id,created_at desc);
alter table public.direct_messages enable row level security;
create policy "Participants read direct messages" on public.direct_messages for select to authenticated using(auth.uid()=sender_id or auth.uid()=recipient_id);
create policy "Sender sends direct message" on public.direct_messages for insert to authenticated with check(auth.uid()=sender_id and sender_id<>recipient_id);

create table if not exists public.call_signals (
 id uuid primary key default gen_random_uuid(),
 call_id uuid not null,
 sender_id uuid not null references public.profiles(id) on delete cascade,
 recipient_id uuid not null references public.profiles(id) on delete cascade,
 signal_type text not null check(signal_type in ('offer','answer','ice-candidate','hangup')),
 payload jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 constraint no_self_call_signal check(sender_id <> recipient_id)
);
create index if not exists call_signals_recipient_time_idx on public.call_signals(recipient_id,created_at desc);
alter table public.call_signals enable row level security;
create policy "Call participants read signals" on public.call_signals for select to authenticated using(auth.uid()=sender_id or auth.uid()=recipient_id);
create policy "Call sender writes signals" on public.call_signals for insert to authenticated with check(auth.uid()=sender_id and sender_id<>recipient_id);

-- Admin-only moderation policies (permissive RLS policies combine with existing creator policies).
create policy "Admins manage all assets" on public.assets for all to authenticated using(public.is_corefair_admin()) with check(public.is_corefair_admin());
create policy "Admins read all profiles" on public.profiles for select to authenticated using(public.is_corefair_admin());
create policy "Admins manage categories" on public.categories for all to authenticated using(public.is_corefair_admin()) with check(public.is_corefair_admin());

-- Realtime must be enabled for these tables in Supabase Dashboard > Database > Publications.
-- If not already included in supabase_realtime, enable direct_messages and call_signals there.
insert into public.site_settings(key,value) values
 ('site_name','CoreFair'),('hero_title','Make your next idea extraordinary.'),
 ('hero_text','Discover stock footage, templates, audio, graphics and creator-made resources — all in one creative marketplace.'),
 ('navy_color','#071728'),('blue_color','#087bff'),('contact_email','')
on conflict(key) do nothing;

-- Create a PUBLIC bucket named brand-assets for non-sensitive logo files only.
-- Original marketplace downloads must remain in a separate PRIVATE bucket.

-- Prevent a regular user from promoting themselves by updating profiles.role.
create or replace function public.protect_profile_role()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
 if new.role is distinct from old.role and auth.uid() is not null and not public.is_corefair_admin() then
   raise exception 'Only an administrator can change account roles';
 end if;
 return new;
end;
$$;
drop trigger if exists protect_profile_role_trigger on public.profiles;
create trigger protect_profile_role_trigger before update on public.profiles
for each row execute function public.protect_profile_role();

-- Create public bucket for logos and permit only admins to upload/update/delete.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('brand-assets','brand-assets',true,2097152,array['image/png','image/jpeg','image/webp','image/svg+xml'])
on conflict(id) do update set public=true, file_size_limit=2097152,
 allowed_mime_types=array['image/png','image/jpeg','image/webp','image/svg+xml'];
create policy "Public can read CoreFair brand assets" on storage.objects for select using(bucket_id='brand-assets');
create policy "Admins upload CoreFair brand assets" on storage.objects for insert to authenticated
with check(bucket_id='brand-assets' and public.is_corefair_admin() and (storage.foldername(name))[1]=auth.uid()::text);
create policy "Admins update CoreFair brand assets" on storage.objects for update to authenticated
using(bucket_id='brand-assets' and public.is_corefair_admin() and (storage.foldername(name))[1]=auth.uid()::text)
with check(bucket_id='brand-assets' and public.is_corefair_admin() and (storage.foldername(name))[1]=auth.uid()::text);
create policy "Admins delete CoreFair brand assets" on storage.objects for delete to authenticated
using(bucket_id='brand-assets' and public.is_corefair_admin() and (storage.foldername(name))[1]=auth.uid()::text);

-- Add realtime tables idempotently if the Supabase publication exists.
do $$
begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
   if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='direct_messages') then
     alter publication supabase_realtime add table public.direct_messages;
   end if;
   if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='call_signals') then
     alter publication supabase_realtime add table public.call_signals;
   end if;
 end if;
end $$;
