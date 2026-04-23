create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '读者',
  phone text,
  avatar_url text not null default '',
  reading_time_minutes integer not null default 0,
  finished_books integer not null default 0,
  consecutive_days integer not null default 0,
  last_check_in_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  author text not null default '未知作者',
  cover_url text not null default '',
  progress numeric(5,2) not null default 0,
  last_read text not null default '刚刚',
  format text not null default 'TXT',
  description text,
  is_featured boolean not null default false,
  accent_color text,
  content text,
  chapters jsonb not null default '[]'::jsonb,
  source_file_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  book_id uuid references public.books (id) on delete cascade,
  book_title text,
  chapter text not null,
  date text not null,
  content text not null,
  type text,
  progress numeric(5,2),
  is_bookmark boolean not null default false,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.feedbacks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  user_name text not null,
  content text not null,
  reply text,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists phone text;
alter table public.books add column if not exists source_file_url text;

create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_books_updated_at ON public.books;
create trigger trg_books_updated_at before update on public.books
for each row execute function public.touch_updated_at();

create index if not exists idx_books_user_id_created_at on public.books(user_id, created_at desc);
create index if not exists idx_highlights_user_id_created_at on public.highlights(user_id, created_at desc);
create index if not exists idx_feedbacks_user_id_created_at on public.feedbacks(user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.highlights enable row level security;
alter table public.feedbacks enable row level security;

do $$ begin
  create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "books_all_own" on public.books for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "highlights_all_own" on public.highlights for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "feedbacks_all_own" on public.feedbacks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

insert into storage.buckets (id, name, public)
values ('public-assets', 'public-assets', true)
on conflict (id) do nothing;
