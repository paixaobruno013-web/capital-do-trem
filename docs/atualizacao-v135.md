# Capital do Trem — revisão da versão 136

## Alterações registradas
- Adicionado o atalho **Minhas conversas** aos atalhos do aplicativo instalado (manifesto PWA).
- Atualizado o nome do cache do service worker para `capital-do-trem-v136`, para que a instalação atualize os recursos pré-armazenados.
- Ampliado o diagnóstico somente de leitura para conferir também `chat_messages`, `song_likes` e `song_comments` (8 tabelas, conexão e 2 espaços de mídia).
- Mantidas as estratégias existentes: páginas HTML priorizam a rede e recorrem ao cache quando offline; arquivos estáticos podem ser servidos do cache e atualizados em segundo plano.

## Itens revisados
- Página inicial, conta, bate-papo, avatar, conversas privadas, diagnóstico ampliado, manifesto, service worker e rotina de atualização automática.
- O service worker mantém a lista de páginas complementares em cache individualmente, sem bloquear a instalação quando um recurso opcional falha.

## Limitações que continuam explícitas
- Conversas privadas ainda são uma tela de preparação; envio e armazenamento de mensagens não estão ativos.
- Avatar ainda é uma prévia local; sincronização entre contas e exibição no bate-papo dependem da integração do banco.
- A integração com Supabase permanece pausada até o usuário enviar as capturas de tela e autorizar a retomada. Nenhum SQL, política RLS ou configuração remota foi alterado nesta revisão.
- O cadastro, os perfis e outras funções dependentes do banco precisam de testes reais com contas distintas antes de serem considerados prontos para produção.

## Verificação de publicação
As alterações foram gravadas na branch `main` do GitHub. A publicação do GitHub Pages e a atualização em cada aparelho dependem da conclusão do deploy e do ciclo de atualização do navegador/service worker.
