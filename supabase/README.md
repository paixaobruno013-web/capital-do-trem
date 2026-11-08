# Capital do Trem — banco de dados e integração

O projeto Capital do Trem já está conectado a um projeto Supabase ativo. O site usa autenticação, tabelas com RLS, armazenamento de imagens e áudio, moderação de conteúdo e recursos de comunidade.

## Estado confirmado do projeto

- Supabase: projeto ativo e saudável.
- Tabelas de perfis, artistas, eventos, publicações, músicas, curtidas, comentários, chat e conversas privadas criadas.
- RLS habilitada nas tabelas públicas.
- Upload de músicas limitado a administradores autorizados.
- Administrador proprietário confirmado na tabela `admin_users`.
- Buckets de imagens públicos para exibição de conteúdo aprovado; bucket de áudio privado.
- A política pública de configurações permite ler somente as duas URLs oficiais de identidade visual; administradores podem ler e editar as demais configurações.
- Uma política restritiva adicional bloqueia sessões anônimas nas operações que exigem uma conta cadastrada.

## Arquivos importantes

- `schema.sql`: estrutura completa para uma instalação nova.
- `migrations/`: atualizações incrementais para bancos já existentes.
- `auth.js`: integração do site com Supabase Auth, banco e Storage.

**Atenção:** não execute novamente o `schema.sql` completo no projeto de produção que já está ativo. Para esse projeto, aplique somente migrations ainda não executadas, depois de revisar o conteúdo. A migration de segurança mais recente é `2026-11-08-secure-registered-user-access.sql`.

## Segurança

- O navegador usa somente a chave publicável do Supabase.
- A chave `service_role` ou qualquer chave secreta nunca deve entrar no HTML, JavaScript ou aplicativo.
- Administradores são controlados pela tabela `admin_users`, não pelo tipo público de conta.
- O tipo `artist` não concede privilégios administrativos.
- Contas comuns podem enviar conteúdo para análise; somente a equipe aprova a publicação.
- Sessões anônimas não recebem as permissões reservadas a contas cadastradas.

## Testes ainda necessários em aparelhos/contas reais

A inspeção de código, estrutura e políticas não substitui os testes ponta a ponta. Ainda é necessário validar com contas reais e aparelhos: cadastro e confirmação por e-mail, recuperação de senha, upload de avatar/cartaz, upload de música pela equipe, curtidas/comentários, chat em tempo real e convites de conversa privada entre duas contas.

Consulte `../SUPABASE-SETUP.md` para orientação de instalação em um projeto novo.