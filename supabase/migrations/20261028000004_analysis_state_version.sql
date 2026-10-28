-- Optimistic Lock für den Datenstand: Jede Speicherung erhöht version.
-- Der Server aktualisiert nur, wenn die vom Client erwartete Version mit der
-- gespeicherten übereinstimmt; sonst antwortet er mit 409 und dem aktuellen
-- Stand, und der Nutzer entscheidet (Serverstand laden oder überschreiben).

alter table public.analysis_state
  add column if not exists version integer not null default 1;

comment on column public.analysis_state.version is
  'Optimistic Lock: wird bei jeder erfolgreichen Speicherung um 1 erhöht.';
