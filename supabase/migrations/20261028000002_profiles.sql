-- Profile zu Supabase Auth: Rolle, Plan, Status und Einstellungen je Nutzer.
-- Zugriffsregel (serverseitig in lib/access.ts ausgewertet):
--   active = true und (role = 'admin'
--     oder plan = 'internal'
--     oder (plan = 'pro' und (plan_valid_until ist null oder in der Zukunft)))

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'member'
    check (role in ('admin', 'member')),
  plan text not null default 'none'
    check (plan in ('none', 'internal', 'pro')),
  plan_valid_until timestamptz,
  active boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- Bewusst keine Policies: Lesen und Schreiben nur über den Service-Role-Key
-- des Servers. Der Browser spricht nie direkt mit dieser Tabelle.

comment on table public.profiles is
  'Profil je Auth-Nutzer: Rolle, Plan, Gültigkeit, Status, UI-Einstellungen.';

-- Nach jedem neuen Auth-Nutzer (Einladung) automatisch die Profilzeile anlegen.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- E-Mail-Änderungen in Auth ins Profil spiegeln.
create or replace function public.handle_auth_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = coalesce(new.email, '') where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_auth_user_email_change();

-- updated_at bei jeder Änderung setzen.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
