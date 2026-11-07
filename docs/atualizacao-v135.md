# Capital do Trem — revisão da versão 141

## Alterações registradas
- Refinado o símbolo do alerta offline: agora representa a frente de uma locomotiva, com cabine, janelas, faróis e detalhes ferroviários dentro do triângulo vermelho.
- Personalizado o alerta offline com um símbolo vetorial: um trem dentro de um triângulo de contorno vermelho, inspirado na identidade visual do Capital do Trem.
- Criado o alerta visual característico **ALERTA: VOCÊ TÁ OFFLINE!**, com corneta eletrônica original sintetizada no próprio aparelho, botão para ligar/desligar o som e aviso de conexão restabelecida.
- O áudio respeita as restrições de reprodução automática dos navegadores: é liberado após uma interação do usuário; se ainda não estiver liberado, o alerta visual continua funcionando e o botão permite ativar a corneta.
- A página offline dedicada também carrega a rotina de alerta, e o cache do aplicativo foi atualizado para a versão 139.
- Criada uma página offline dedicada, com identidade visual do Capital do Trem, instruções claras, botão para tentar novamente e retorno à página inicial.
- Incluída `offline.html` no núcleo obrigatório do cache do aplicativo instalado; quando uma navegação falha sem internet, o service worker prioriza a página offline armazenada, com uma resposta mínima de reserva.
- Adicionado o atalho **Minhas conversas** aos atalhos do aplicativo instalado (manifesto PWA).
- Atualizado o nome do cache do service worker para `capital-do-trem-v141`, para que a instalação atualize os recursos pré-armazenados.
- Ampliado o diagnóstico somente de leitura para conferir também `chat_messages`, `song_likes` e `song_comments` (8 tabelas, conexão e 2 espaços de mídia).
- Adicionado na área Minha conta um atalho direto para a página de diagnóstico do sistema.
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
