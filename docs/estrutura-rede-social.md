# Estrutura da rede social — Capital do Trem

## Objetivo

Evoluir o Capital do Trem para uma rede social comunitária com recursos familiares a quem usa Instagram, preservando integralmente a identidade preta/vermelha, a marca, as capas, os fundos, a imagem de perfil oficial e a abertura aprovada.

Este documento é o mapa técnico inicial. Não autoriza alterações visuais na abertura nem mudanças destrutivas no banco de dados.

## Diagnóstico confirmado no código atual

- A página inicial já contém a área `#public-posts`, uma coleção de publicações salvas e uma seção de agenda.
- O mural consulta `posts` publicados e mantém texto, data, curtidas, comentários, compartilhamento, envio para conversas e salvamento; a nova camada também associa fotos e vídeos via `post_media`.
- `getPublishedPosts()` consulta posts publicados, metadados de mídia e perfis públicos dos autores; o feed renderiza imagens e vídeos.
- `submitMyPost()` grava `author_id`, `content` e `status`; `uploadMyPostMedia()` associa até 10 arquivos ao post.
- Curtidas e comentários de publicações usam `post_likes` e `post_comments`; itens salvos usam `saved_posts`.
- Stories de usuários já aceitam foto/vídeo, expiração e trilha musical, com interface em `stories-ui.js` e criação em `home-story-composer.js`.
- Eventos têm fluxo e compositor próprios (`event-social-composer.js`); músicas têm catálogo e interações próprias.
- Perfis básicos já distinguem artista e usuário e há diretório de perfis públicos.
- O service worker já inclui os módulos atuais e a aplicação tem mecanismo de aviso de atualização.

## Arquitetura funcional desejada

### 1. Feed principal
Uma publicação unificada deve poder representar texto, foto, vídeo ou combinação permitida. Cada item deve ter autor/perfil, data, legenda, mídia, estado de publicação e ações sociais. O feed deve paginar resultados e carregar mídia sob demanda.

### 2. Stories
Manter o fluxo existente de Stories (foto/vídeo, expiração e visualizador). Integrar melhor o acesso ao perfil e ao feed sem duplicar armazenamento ou regras de autorização.

### 3. Perfis
Exibir nome público, @username, avatar, tipo de conta (artista ou usuário uai), bio e publicações públicas. Respeitar `is_public` e as políticas do banco.

### 4. Interações
Reutilizar curtidas, comentários e salvos existentes. Preparar compartilhamento por link e denúncia/bloqueio com controles de abuso, sem expor dados privados.

### 5. Música, eventos e comunidade
Manter catálogo musical, eventos, apoiadores e Koe Fala Tu como áreas integradas, mas com fluxos de dados próprios. Não tornar o bucket privado de áudio público. Links temporários de reprodução/download e autorização de direitos precisam ser preservados.

### 6. Segurança e moderação
Validar autenticação, RLS, propriedade dos registros, limites de tamanho/tipo de arquivo, URLs de mídia e ações de denúncia. Conteúdo público só deve ser servido por consultas e políticas explicitamente públicas.

## Schema atual confirmado no Supabase

Inspeção somente de leitura realizada no projeto conectado:

- `profiles`: já contém username, tipo de conta, bio, cidade, visibilidade pública e campos de avatar.
- `posts`: atualmente contém apenas `id`, `author_id`, `content`, `status` e `created_at`; não há campos de mídia ou tipo de publicação.
- `post_likes`, `post_comments` e `saved_posts`: já existem e têm RLS habilitado.
- `user_stories` e `admin_stories`: já armazenam mídia, tipo, legenda, expiração e campos de música.
- `songs`: 31 registros no momento da inspeção; RLS habilitado.
- `events`: tabela existente com cartaz, localização, data e vínculo opcional com música.
- `video_likes` e `video_comments`: tabelas separadas para interações em vídeos do YouTube; não devem ser confundidas com as publicações do feed.

O banco retornou zero linhas em `posts`, `post_likes`, `post_comments` e `saved_posts` no momento da consulta. Isso é uma fotografia da consulta, não uma garantia sobre dados futuros.

O advisor de segurança também sinalizou alertas de políticas que podem permitir acesso de usuários anônimos em algumas tabelas e a proteção contra senhas vazadas desativada. Esses alertas precisam ser revisados política por política antes de abrir mais conteúdo ao público.

## Segurança e Storage — segunda inspeção

Consulta somente de leitura das políticas e dos buckets:

- `capital-do-trem-audio`: privado, limite de 50 MiB, formatos de áudio; 31 arquivos MP3 no momento da consulta.
- `capital-do-trem-media`: público, limite de 50 MiB, formatos de imagem/áudio/vídeo; 47 arquivos (24 JPEG, 10 PNG, 1 WebP, 11 MP4 e 1 WebM).
- `capital-do-trem-chat` e `capital-do-trem-private-gallery`: buckets privados configurados para anexos de chat e galeria.
- `brand-assets`: público, limitado a imagens de marca.

**Atenção permanente:** o bucket `capital-do-trem-media` é público. Isso significa que os arquivos nele armazenados podem ser acessados por URL pública, mesmo que uma consulta de tabela tenha regras RLS. O compositor novo deve ser usado somente para conteúdo destinado à publicação pública. A migração não mudou a visibilidade do bucket nem moveu/apagou objetos existentes.

As políticas de posts permitem leitura de publicações com status publicado; inserção autenticada com status publicado; edição/exclusão pelo autor apenas enquanto pendente ou por administrador. Curtidas e comentários estão limitados a publicações publicadas e ações de escrita autenticadas. Perfis são lidos publicamente somente quando `is_public=true`. Stories ativos são legíveis por visitante; inserção exige autoria, pasta do usuário e expiração máxima de 24 horas.

O advisor de segurança sinalizou políticas que permitem acesso anônimo em algumas tabelas. Parte delas corresponde a leitura pública intencional de conteúdo publicado, mas a presença de políticas amplas combinadas por OR precisa ser revisada por tabela. A política `require_registered_user` aparece para papéis autenticados em várias tabelas e não substitui a revisão individual de todas as condições. Nenhuma política foi alterada.

O bucket privado de áudio permanece privado. Os 31 objetos de áudio coincidem com os 31 registros de músicas, mas isso não confirma, por si só, autorização de distribuição pública.

## Descoberta adicional: leitura pública bloqueada por política restritiva

A inspeção detalhada de `pg_policy` e das permissões confirmou que `require_registered_user` é uma política **RESTRICTIVE** aplicada somente ao papel `authenticated`; ela não se aplica ao visitante `anon`. As políticas permissivas já permitem SELECT de posts publicados e perfis com `is_public=true`, e os grants de SELECT para `anon` existem. Por isso, as migrações aplicadas **não alteraram** as políticas existentes de `posts` e `profiles`.

A migração SQL aplicada está documentada em `docs/sql/20261112_social_feed_media_candidate.sql` e versionada em `supabase/migrations/`:
- adicionar `post_media` para relacionar mídia ao post, com tipo, MIME, tamanho, ordem e caminho;
- permitir leitura de metadados apenas quando a publicação é pública, própria ou acessível ao administrador;
- limitar inclusão de mídia à publicação do próprio usuário e ao caminho da pasta dele;
- manter o bucket atual e não alterar arquivos existentes.

Migrações aplicadas no projeto conectado: `add_social_post_media`, `enforce_social_post_media_file_limits` e `index_social_post_media_owner`. A tabela foi criada vazia, com RLS ativado, leitura pública condicionada a posts publicados, escrita autenticada restrita ao dono, limite de 10 itens por publicação (ordens 0–9), fotos até 10 MiB e vídeos até 50 MiB. Foram concedidos apenas SELECT a `anon` e SELECT/INSERT/UPDATE/DELETE a `authenticated`, sempre sujeitos a RLS. O índice de `owner_id` foi incluído após alerta de performance.

Implementação de frontend preparada na branch de trabalho:
- `supabase/auth.js`: envio de mídia para posts próprios publicados e leitura de posts com mídias e perfil público do autor; a retomada é idempotente por posição para não duplicar metadados se a resposta do servidor se perder.
- `social-feed-composer.js`: formulário de publicação com legenda opcional quando há mídia, até 10 fotos/vídeos, limite de 100 MB por publicação e retomada do envio sem criar outra publicação.
- `index.html`: feed mostra nome, @username e avatar público (com inicial padrão quando não há foto), renderiza fotos/vídeos; a página Divulgue recebe o formulário.
- `sw.js`: cache atualizado para v290 e novo módulo incluído nos arquivos complementares.
- `scripts/prepare-web.mjs`: módulo incluído na cópia do pacote final PWA após o primeiro CI identificar essa ausência.
- `.github/workflows/web-check.yml`: validação de sintaxe do novo módulo.

**O código de frontend continua somente na branch/PR, não na versão pública.** A tabela e as políticas de metadados já existem no Supabase. O bucket `capital-do-trem-media` é público; portanto, as mídias publicadas nele ficam acessíveis por URL pública. O fluxo deve ser usado somente para conteúdo destinado à publicação pública.

Validação CI: o workflow `Verificar preparação do aplicativo` passou nos commits `f37b28662e78286d20e3af3b663c7bf8dfe1bdcb` e `96ed66d8364afaf21743235ac46c8504244166fc`, incluindo build web, cópia do novo módulo, pré-cache PWA, sintaxe dos módulos e regressões existentes. Foi acrescentado `scripts/check-social-feed-publishing.mjs` para validar o contrato do compositor, limites, políticas, feed, PWA e retomada idempotente; a execução mais recente está sendo validada.

**Verificação pós-migração:** `post_media` existe, RLS está habilitado, as quatro políticas esperadas foram criadas, os privilégios de leitura/escrita foram confirmados e uma consulta executada como `anon` retornou zero linhas (tabela nova, sem mídia cadastrada). As restrições de MIME, tamanho por tipo, caminho por proprietário e máximo de 10 mídias foram confirmadas. Ainda falta teste ponta a ponta de upload com contas reais de usuário/artista/admin e teste em Android/Safari iOS. O código de frontend segue no PR, sem merge/deploy.

## Modelo de dados atualizado

- `posts`: manter compatibilidade com os campos atuais e avaliar campos opcionais `post_type`, `visibility`, `updated_at`.
- `post_media`: tabela criada no Supabase para relacionar mídia com publicação (caminho no Storage, tipo, MIME, tamanho, ordem e metadados seguros); migrações versionadas em `supabase/migrations/`.
- `profiles`: reutilizar identidade pública existente; não duplicar dados do autor nas publicações sem necessidade.
- `post_likes`, `post_comments`, `saved_posts`: manter relações existentes e confirmar índices, constraints e RLS.
- Avaliar denúncia/bloqueio e contagem agregada somente após mapear tabelas e políticas existentes.

## Etapas de implementação

1. **Inventário e segurança (concluído para a primeira entrega):** mapear páginas, módulos, tabelas, buckets, políticas RLS, triggers e fluxos existentes.
2. **Contrato de dados (concluído):** tabela de mídia adicionada por migrações aditivas e RLS verificado.
3. **Serviços de aplicação (em validação):** criação, consulta e upload implementados; falta teste ponta a ponta autenticado.
4. **Feed visual (primeira versão implementada):** mídia responsiva, autor/perfil, ações e estados básicos; falta teste em aparelhos reais.
5. **Perfis e navegação:** conectar feed e perfis, preservando contas artista/usuário uai.
6. **Validação:** testes de visitante, usuário autenticado, artista e administrador; Android e Safari iOS; offline/retorno de conexão; regressão de Stories, músicas, eventos e abertura.
7. **Publicação:** somente após testes e revisão; atualização PWA separada de qualquer APK nativo.

## Critérios de aceite

- A abertura aprovada, a marca, capas, fundos e avatar oficial permanecem inalterados.
- Publicações antigas continuam visíveis e suas curtidas/comentários/salvos não se perdem.
- Mídia privada não fica pública por engano.
- Usuário não consegue editar/excluir conteúdo de outra pessoa.
- Visitante vê apenas conteúdo definido como público.
- Feed funciona em telas pequenas e grandes, com carregamento progressivo e mensagens claras.
- Stories, chat, catálogo de músicas e eventos continuam funcionando.
- Nenhuma migração destrutiva é aplicada sem backup, revisão de RLS e plano de reversão.

## Restrições de lançamento

- As 31 músicas atualmente cadastradas como publicadas não devem ser liberadas para distribuição pública/download sem confirmação dos direitos de uso e distribuição.
- Não divulgar credenciais privilegiadas no frontend; somente chave publicável pode permanecer no cliente.
- A PWA instalada pelo Safari/Chrome não equivale a um IPA ou APK de produção assinado.
