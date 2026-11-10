-- Permitir anexos de áudio no chat usando o bucket público de mídia.
-- Mantém os limites de tamanho e as políticas RLS existentes.
update storage.buckets
set allowed_mime_types = array[
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/webm',
  'audio/mpeg',
  'audio/mp4',
  'audio/aac',
  'audio/ogg',
  'audio/wav',
  'audio/x-wav',
  'audio/webm'
]
where id = 'capital-do-trem-media';
