-- Índice para a chave estrangeira de autoria da mídia dos apoiadores.
create index if not exists supporter_media_created_by_idx
on public.supporter_media(created_by);
