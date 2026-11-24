-- Indexa a chave estrangeira usada para registrar quem moderou cada música.
create index if not exists songs_moderated_by_idx on public.songs (moderated_by);
