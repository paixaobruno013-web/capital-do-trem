# Guia simples para ativar o banco do Capital do Trem

Este guia foi preparado para configurar o banco sem precisar criar as tabelas uma por uma.

## Antes de começar

- Projeto Supabase: `zmjxkfjzrbbxyvgkwirv`
- Painel: https://supabase.com/dashboard/project/zmjxkfjzrbbxyvgkwirv
- O arquivo principal de instalação é `supabase/schema.sql`.

**Importante:** o projeto de produção já está ativo e conectado. Não execute o `schema.sql` completo nele novamente. Esse arquivo é somente para uma instalação nova. Em um banco existente, confira o histórico e aplique apenas migrations ainda não executadas.

## Etapa 1 — Abrir o Editor SQL

1. Abra o painel do projeto Supabase pelo link acima.
2. No menu lateral, entre em **SQL Editor**.
3. Toque em **New query** (Nova consulta).

## Etapa 2 — Executar o arquivo principal (somente instalação nova)

1. Em outra aba, abra este arquivo no GitHub: https://github.com/paixaobruno013-web/capital-do-trem/blob/main/supabase/schema.sql
2. Copie o conteúdo completo do arquivo.
3. Volte ao SQL Editor do Supabase e cole o conteúdo na consulta vazia.
4. Toque em **Run** (Executar).
5. Aguarde a mensagem de conclusão. Se aparecer erro, pare e envie à equipe uma captura da mensagem; não tente executar comandos aleatórios.

**Para bancos existentes:** não execute migrations antigas sem conferir se já foram aplicadas. A atualização incremental de segurança mais recente é [2026-11-08-secure-registered-user-access.sql](https://github.com/paixaobruno013-web/capital-do-trem/blob/main/supabase/migrations/2026-11-08-secure-registered-user-access.sql).

## Etapa 3 — Conferir as tabelas

No menu **Table Editor**, confira se aparecem, entre outras, estas tabelas:

- `profiles`
- `artists`
- `events`
- `posts`
- `admin_users`
- `songs`
- `song_likes`
- `song_comments`
- `chat_messages`

O script também configura os espaços de armazenamento de áudio e imagens.

## Etapa 4 — Conferir o administrador da equipe

A conta proprietária já está confirmada e autorizada no projeto atual. O painel também verifica o registro administrativo no banco. Não insira outro administrador sem necessidade. Em uma instalação nova, confirme a conta do proprietário antes de conceder acesso administrativo.



Esse comando só libera o usuário se a conta com esse e-mail já existir em `auth.users`. Não compartilhe senha nem chave secreta.

## Etapa 5 — Testar o aplicativo

Depois da configuração do banco e da liberação do administrador:

1. Entre em https://paixaobruno013-web.github.io/capital-do-trem/conta.html e teste o cadastro/login.
2. Entre no painel https://paixaobruno013-web.github.io/capital-do-trem/admin.html com a conta autorizada.
3. Teste o envio de uma música pequena, a aprovação no painel e a reprodução no catálogo.
4. Teste curtidas, comentários e bate-papo com uma segunda conta comum.

## Segurança

- Nunca coloque a chave `service_role` no site, no aplicativo, em prints ou em mensagens.
- A chave pública do Supabase pode ficar no cliente; as permissões reais devem ser controladas pelas políticas RLS.
- Não divulgue o aplicativo ao público antes de concluir os testes de cadastro, permissões, upload e moderação.

Se alguma etapa apresentar erro, pare e envie a mensagem exata para que a correção seja feita com segurança.
