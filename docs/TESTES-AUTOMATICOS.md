# Testes automáticos — Capital do Trem

## Navegação no navegador

O workflow **Testes automáticos de navegação e Supabase** roda em cada pull request para `main`, em cada push para `main` e também pode ser iniciado manualmente em Actions.

Os testes Playwright usam Chromium e uma cópia estática do app em `www/`. Eles verificam a abertura, a navegação Feed ↔ Música e erros JavaScript não tratados. O relatório HTML, screenshots e traces são publicados como artefato do workflow por 14 dias.

## Conectar um Supabase isolado (não produção)

1. Crie um projeto Supabase separado, exclusivo para testes. Não use o projeto de produção.
2. No painel desse projeto de teste, copie a Project URL e a chave pública/anon (publishable/anon). Nunca use `service_role`, senha do banco ou chave secreta.
3. No GitHub, abra **Settings → Secrets and variables → Actions** do repositório.
4. Crie estes repository secrets, com estes nomes exatos:
   - `SUPABASE_TEST_URL`: Project URL do projeto de teste.
   - `SUPABASE_TEST_ANON_KEY`: chave pública/anon do projeto de teste.
5. Execute novamente o workflow **Testes automáticos de navegação e Supabase**.

Sem esses dois secrets, a etapa Supabase é marcada como ignorada (não falha o workflow). Com eles, a verificação consulta somente `/auth/v1/health`. Isso prova conectividade com o serviço Auth, mas ainda não testa login, Storage, RLS ou gravações.

## Próxima etapa de integração

Para testar autenticação, upload e políticas RLS com segurança, o projeto isolado precisa receber as migrations do repositório e dados fictícios. Os testes de escrita devem usar contas e arquivos descartáveis e nunca tocar no banco de produção.

## Segurança

- Não publique secrets em issues, commits, screenshots ou mensagens.
- Não cadastre a chave `service_role` em workflows de navegador.
- Não execute testes destrutivos contra o projeto de produção.
