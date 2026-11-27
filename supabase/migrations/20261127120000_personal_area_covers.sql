alter table public.profiles
  add column if not exists home_cover_url text,
  add column if not exists home_cover_path text,
  add column if not exists music_cover_url text,
  add column if not exists music_cover_path text;

comment on column public.profiles.home_cover_url is 'Capa personalizada da tela inicial, visível somente ao próprio usuário na navegação do aplicativo.';
comment on column public.profiles.home_cover_path is 'Caminho do arquivo da capa personalizada da tela inicial no Storage.';
comment on column public.profiles.music_cover_url is 'Capa personalizada da área Músicas, visível somente ao próprio usuário na navegação do aplicativo.';
comment on column public.profiles.music_cover_path is 'Caminho do arquivo da capa personalizada da área Músicas no Storage.';
