-- Hygge Homes Analyse: Cloud-Speicherung
--
-- Einrichtung:
-- 1. Im Supabase-Dashboard ein Projekt anlegen (oder ein bestehendes nutzen).
-- 2. SQL Editor öffnen, dieses Skript einfügen und ausführen.
-- 3. Project Settings > API: "Project URL" und "service_role"-Key kopieren
--    und in Vercel als Umgebungsvariablen setzen:
--      SUPABASE_URL
--      SUPABASE_SERVICE_ROLE_KEY
--    Danach neu deployen.
--
-- Sicherheit: Die Tabelle hat Row Level Security ohne öffentliche Policies.
-- Sie ist damit weder mit dem anon-Key noch ohne Key lesbar. Zugriff hat
-- ausschließlich der Server über den Service-Role-Key, und dessen API-Route
-- verlangt zusätzlich das Login-Cookie der Seite.

create table if not exists public.analysis_state (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.analysis_state enable row level security;

-- Bewusst keine Policies: kein öffentlicher Zugriff.

comment on table public.analysis_state is
  'Gemeinsamer Datenstand der Hygge-Homes-Analyse (eine Zeile, komplettes Analyse-JSON, letzter Schreiber gewinnt).';
