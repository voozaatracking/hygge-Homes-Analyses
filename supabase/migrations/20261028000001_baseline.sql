-- Baseline: Datenhaltung, wie sie vor Einführung von Supabase Auth bestand.
-- Eine Zeile je Nutzer mit dem kompletten, versionierten Analyse-JSON.
-- Zeilenschlüssel ist ab Phase 2 die Auth-ID (auth.users.id als Text);
-- Bestandszeilen ("shared", alte app_users-IDs) werden per
-- supabase/scripts/migrate-users.sql umgehängt.
--
-- Die Tabelle app_users der alten Nutzerverwaltung wird hier bewusst nicht
-- angelegt; sie wird nach der Datenübernahme entfernt (Migration 0003).

create table if not exists public.analysis_state (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.analysis_state enable row level security;

-- Bewusst keine Policies: Zugriff ausschließlich über den Service-Role-Key
-- des Servers (Route Handler), nie direkt aus dem Browser.

comment on table public.analysis_state is
  'Datenstand der Hygge-Homes-Analyse je Nutzer (id = Auth-ID, komplettes Analyse-JSON).';
