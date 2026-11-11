-- Cobrir chaves estrangeiras identificadas pelo Performance Advisor.
create index if not exists admin_stories_created_by_idx
  on public.admin_stories (created_by);
create index if not exists chat_moderation_reports_reviewed_by_idx
  on public.chat_moderation_reports (reviewed_by);
create index if not exists chat_user_suspensions_created_by_idx
  on public.chat_user_suspensions (created_by);
create index if not exists chat_user_suspensions_reviewed_by_idx
  on public.chat_user_suspensions (reviewed_by);
create index if not exists user_stories_author_id_idx
  on public.user_stories (author_id);
