# CAPITAL DO TREM — checklist iPhone gratuito (Safari/PWA)

## Distribuição definida

O caminho inicial para iPhone é a aplicação web instalável (PWA), sem App Store, Apple Developer Program, certificados empresariais ou lojas de terceiros. O usuário abre o endereço HTTPS oficial no Safari e escolhe **Compartilhar → Adicionar à Tela de Início**.

Esta instalação cria um atalho/aplicação web no iPhone; não é um pacote iOS nativo nem uma publicação na App Store. Não cobrar taxa de instalação. Não instruir usuários a instalar perfis de configuração ou certificados.

## Verificações técnicas antes de anunciar disponibilidade

- [ ] Confirmar que o endereço público final usa HTTPS válido e permanece sob controle do projeto.
- [ ] Validar `manifest.webmanifest`: `name`, `short_name`, `start_url`, `scope`, `display: standalone` e ícones acessíveis.
- [ ] Validar o ícone Apple touch 180×180 em PNG, servido pelo próprio domínio HTTPS; conferir visualmente no iPhone.
- [ ] Confirmar as meta tags Apple já presentes no HTML principal e testar nome/ícone na Tela de Início.
- [ ] Testar instalação e abertura standalone em iPhone físico, com Safari atualizado.
- [ ] Testar login, encerramento/reabertura, renovação de sessão e logout.
- [ ] Testar Feed, perfil, fotos/vídeos, uploads da biblioteca, chat e Central de Músicas.
- [ ] Pedir câmera, microfone ou localização apenas após ação explícita que precise do recurso; explicar a finalidade antes do prompt do sistema.
- [ ] Verificar VoiceOver, foco, safe areas, teclado virtual, orientação e tamanhos de tela.
- [ ] Testar atualização do service worker: nova versão deve assumir controle sem deixar o usuário preso em cache antigo.
- [ ] Testar modo offline somente para conteúdo público estático e tela offline; não prometer operações sociais sem conexão.
- [ ] Confirmar que tokens, respostas autenticadas, conversas privadas, mídia privada e URLs assinadas nunca são gravados no Cache Storage.
- [ ] Testar permissões negadas e recuperação pelo Ajustes do iPhone.
- [ ] Registrar modelo do iPhone, versão do iOS, Safari e resultado de cada teste.

## Privacidade e cache

O service worker deve armazenar apenas arquivos estáticos públicos necessários à abertura. Requisições com cabeçalho `Authorization`, respostas `private/no-store/no-cache`, respostas autenticadas ou conteúdo de APIs privadas não devem ser adicionados ao cache. Não usar cache offline como mecanismo de armazenamento de sessão ou mídia privada.

## Limitações que precisam ser comunicadas

- A PWA no iOS não é equivalente a um app nativo.
- Reprodução de áudio em segundo plano/tela bloqueada, controles de mídia, notificações e tarefas em background dependem das versões e políticas do iOS; validar no aparelho e não prometer suporte antes do teste.
- A instalação pelo Safari é gratuita, mas hospedagem, domínio e serviços de backend podem ter custos ou limites próprios. Manter a opção de infraestrutura gratuita sempre que possível e monitorar limites.

## Critério de liberação

Só anunciar “versão iPhone pronta” depois de completar os testes em iPhone físico, corrigir falhas críticas e confirmar HTTPS, ícone, instalação, autenticação, uploads e proteção de dados privados. Até lá, descrever como versão em preparação/teste.
