create extension if not exists pgcrypto;

create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '', avatar_url text, bio text,
 created_at timestamptz not null default now()
);
create table if not exists public.products (
 id uuid primary key default gen_random_uuid(),
 seller_id uuid not null references auth.users(id) on delete cascade,
 title text not null, description text not null default '',
 category text not null default 'Other',
 price_bdt numeric(12,2) not null check(price_bdt >= 0),
 image_url text, stock integer not null default 0 check(stock >= 0),
 status text not null default 'active' check(status in ('draft','active','paused')),
 created_at timestamptz not null default now()
);
create table if not exists public.posts (
 id uuid primary key default gen_random_uuid(),
 author_id uuid not null references auth.users(id) on delete cascade,
 body text not null check(char_length(body) <= 5000), image_url text,
 created_at timestamptz not null default now()
);
create table if not exists public.services (
 id uuid primary key default gen_random_uuid(),
 provider_id uuid not null references auth.users(id) on delete cascade,
 title text not null, description text not null default '',
 category text not null default 'Other', price_bdt numeric(12,2),
 contact_method text, status text not null default 'active'
 check(status in ('draft','active','paused')), created_at timestamptz not null default now()
);
create table if not exists public.carts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 product_id uuid not null references public.products(id) on delete cascade,
 quantity integer not null default 1 check(quantity > 0),
 created_at timestamptz not null default now(), unique(user_id,product_id)
);
create table if not exists public.orders (
 id uuid primary key default gen_random_uuid(),
 buyer_id uuid not null references auth.users(id) on delete restrict,
 status text not null default 'pending' check(status in ('pending','confirmed','processing','shipped','delivered','cancelled')),
 total_bdt numeric(12,2) not null check(total_bdt >= 0),
 shipping_name text not null, shipping_phone text not null, shipping_address text not null,
 payment_method text not null default 'cash_on_delivery',
 payment_status text not null default 'unpaid' check(payment_status in ('unpaid','pending','paid','refunded')),
 created_at timestamptz not null default now()
);
create table if not exists public.order_items (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.orders(id) on delete cascade,
 product_id uuid references public.products(id) on delete set null,
 product_title text not null, unit_price_bdt numeric(12,2) not null check(unit_price_bdt >= 0),
 quantity integer not null check(quantity > 0)
);
create table if not exists public.businesses (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 name text not null, description text not null default '', category text not null default 'Other',
 contact_phone text, location text, logo_url text,
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 created_at timestamptz not null default now()
);
create table if not exists public.notifications (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 title text not null, body text not null default '', read_at timestamptz,
 created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.posts enable row level security;
alter table public.services enable row level security;
alter table public.carts enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.businesses enable row level security;
alter table public.notifications enable row level security;

create policy "Profiles readable" on public.profiles for select using (true);
create policy "Own profile" on public.profiles for all using (auth.uid()=id) with check (auth.uid()=id);
create policy "Active products readable" on public.products for select using (status='active' or auth.uid()=seller_id);
create policy "Own products" on public.products for all using (auth.uid()=seller_id) with check (auth.uid()=seller_id);
create policy "Posts readable" on public.posts for select using (true);
create policy "Own posts" on public.posts for all using (auth.uid()=author_id) with check (auth.uid()=author_id);
create policy "Active services readable" on public.services for select using (status='active' or auth.uid()=provider_id);
create policy "Own services" on public.services for all using (auth.uid()=provider_id) with check (auth.uid()=provider_id);
create policy "Own cart" on public.carts for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "Read own orders" on public.orders for select using (auth.uid()=buyer_id);
create policy "Create own orders" on public.orders for insert with check (auth.uid()=buyer_id);
create policy "Read own order items" on public.order_items for select using (exists(select 1 from public.orders o where o.id=order_id and o.buyer_id=auth.uid()));
create policy "Add own order items" on public.order_items for insert with check (exists(select 1 from public.orders o where o.id=order_id and o.buyer_id=auth.uid()));
create policy "Approved businesses readable" on public.businesses for select using (status='approved' or auth.uid()=owner_id);
create policy "Submit business" on public.businesses for insert with check (auth.uid()=owner_id);
create policy "Update own business" on public.businesses for update using (auth.uid()=owner_id) with check (auth.uid()=owner_id);
create policy "Own notifications" on public.notifications for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
