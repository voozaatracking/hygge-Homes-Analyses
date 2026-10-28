-- Entfernt die alte Nutzerverwaltung (Tabelle app_users).
--
-- ERST AUSFÜHREN, wenn die Datenübernahme per
-- supabase/scripts/migrate-users.sql abgeschlossen und bestätigt ist
-- (siehe README, Abschnitt "Supabase Auth einrichten", Schritt 7).

drop table if exists public.app_users;
