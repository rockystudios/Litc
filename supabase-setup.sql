-- Lost In The Cosmos account profiles
-- Run this once in Supabase Dashboard -> SQL Editor.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null check (
    char_length(username) between 3 and 24
    and username ~ '^[A-Za-z0-9 _-]+$'
  ),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_username_case_insensitive
  on public.profiles (lower(username));

alter table public.profiles enable row level security;

drop policy if exists "Anyone can read usernames" on public.profiles;
create policy "Anyone can read usernames"
  on public.profiles for select
  to anon, authenticated
  using (true);

drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.create_litc_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text;
begin
  requested_username := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'username'), ''),
    'explorer_' || left(replace(new.id::text, '-', ''), 8)
  );

  insert into public.profiles (id, username)
  values (new.id, requested_username);

  return new;
end;
$$;

drop trigger if exists on_litc_auth_user_created on auth.users;
create trigger on_litc_auth_user_created
  after insert on auth.users
  for each row execute procedure public.create_litc_profile();
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
