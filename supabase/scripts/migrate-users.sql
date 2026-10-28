-- Datenübernahme der zwei Bestandsnutzer auf Supabase Auth.
--
-- Voraussetzungen:
--   * Migrationen 0001 und 0002 sind angewendet.
--   * Beide Personen wurden über die Verwaltung (oder das Supabase-Dashboard)
--     eingeladen und haben ihr Passwort gesetzt. Dadurch existieren ihre
--     Zeilen in auth.users und (per Trigger) in public.profiles.
--
-- Platzhalter ersetzen, dann das Skript im SQL Editor als Ganzes ausführen:
--   <ADMIN_AUTH_ID>   Auth-ID (uuid) des Admins, Dashboard > Authentication > Users
--   <USER2_AUTH_ID>   Auth-ID (uuid) des zweiten Bestandsnutzers
--   <USER2_OLD_ID>    bisherige Zeilen-ID in analysis_state (= alte app_users.id)
--                     Nachsehen: select id, updated_at from public.analysis_state;
--
-- Das Skript läuft in einer Transaktion; schlägt ein Schritt fehl, bleibt alles unverändert.

begin;

-- Schritt 1: Den Admin als Admin mit Plan "internal" markieren (kein Payment nötig).
update public.profiles
set role = 'admin',
    plan = 'internal',
    active = true
where id = '<ADMIN_AUTH_ID>';

-- Schritt 2: Den bisherigen gemeinsamen Datenstand (Zeile "shared", vom alten
-- Master-Zugang genutzt) dem Admin zuordnen. Zeilenschlüssel ist die Auth-ID als Text.
update public.analysis_state
set id = '<ADMIN_AUTH_ID>'
where id = 'shared';

-- Schritt 3: Den zweiten Bestandsnutzer mit Plan "internal" freischalten.
update public.profiles
set plan = 'internal',
    active = true
where id = '<USER2_AUTH_ID>';

-- Schritt 4: Dessen Datenzeile von der alten app_users-ID auf die Auth-ID umhängen.
update public.analysis_state
set id = '<USER2_AUTH_ID>'
where id = '<USER2_OLD_ID>';

-- Kontrolle: Beide Auth-IDs müssen jetzt je eine Zeile haben.
select id, updated_at from public.analysis_state
where id in ('<ADMIN_AUTH_ID>', '<USER2_AUTH_ID>');

commit;
