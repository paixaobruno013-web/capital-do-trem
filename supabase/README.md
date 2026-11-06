# Capital do Trem — preparação do banco de dados

Este diretório contém a primeira estrutura de banco de dados para a futura versão conectada do Capital do Trem.

## O que este esquema prepara

- Perfis privados vinculados às contas de autenticação.
- Eventos, shows e ações sociais com aprovação antes da publicação.
- Perfis de artistas com aprovação antes de aparecerem publicamente.
- Mural de divulgações com aprovação.
- Regras de acesso por usuário e uma lista privada de administradores.

## Situação atual

O site publicado em GitHub Pages continua sendo uma demonstração estática. **Estes arquivos ainda não foram executados em um projeto Supabase e não ativam login, banco de dados ou publicação compartilhada.** A integração do site com autenticação, tabelas e armazenamento de imagens será uma etapa posterior.

## Como aplicar quando o projeto Supabase estiver pronto

1. Entre no painel do projeto Supabase correto.
2. Abra **SQL Editor**.
3. Escolha **New query**.
4. Abra o arquivo `supabase/schema.sql` deste repositório e copie todo o conteúdo.
5. Cole no editor SQL e clique em **Run**.
6. Confira se a execução terminou sem erros antes de conectar o site.

Se aparecer qualquer erro, pare e revise a mensagem antes de tentar executar novamente. O script usa `create table if not exists` e recria suas políticas nomeadas, mas não substitui uma revisão de alterações futuras no banco.

## Primeiro administrador

Depois de criar a conta do administrador pelo sistema de autenticação do Supabase, copie o UUID dessa conta e insira-o manualmente na tabela `public.admin_users`, pelo painel SQL. A tabela não tem políticas para leitura ou alteração por usuários comuns.

**Nunca coloque a chave `service_role` no HTML, JavaScript público ou aplicativo.** A integração do cliente deve usar apenas a chave pública/anon (ou publishable) e depender das políticas RLS.

## Fotos e cartazes

O esquema também prepara o bucket público `capital-do-trem-media`, limitado a imagens JPEG, PNG e WebP de até 5 MB. Cada usuário autenticado só pode enviar, substituir ou apagar arquivos dentro da pasta cujo primeiro nome é seu UUID. A leitura é pública para que imagens de perfis e eventos aprovados possam aparecer no site. Antes de publicar imagens, o site deverá vincular os caminhos dos arquivos aos respectivos registros e aplicar moderação.

## Próximas etapas de integração

1. Criar/conferir o projeto Supabase e ativar autenticação por e-mail.
2. Aplicar e testar este esquema em um projeto de desenvolvimento.
3. Integrar cadastro, login, sessão e recuperação de senha no site.
4. Integrar formulários de eventos, artistas e divulgações.
5. Criar armazenamento de imagens com regras de acesso e limites de tamanho.
6. Criar o painel administrativo protegido e testar permissões com contas diferentes.

## Módulo inicial de autenticação

O arquivo `supabase/auth.js` prepara funções para cadastro com confirmação por e-mail, login, logout, recuperação de senha e acompanhamento da sessão. Ele usa o SDK oficial Supabase JS v2 por CDN.

**Ainda não está conectado à página pública.** Antes de importá-lo na interface:

1. Substitua os dois valores de configuração no início de `auth.js` pela URL do projeto e pela chave pública (publishable/anon) do Supabase.
2. No painel Supabase, configure a URL pública do site em **Authentication → URL Configuration** e adicione também a URL de redirecionamento usada para confirmação e recuperação de senha.
3. Em **Authentication → Providers → Email**, mantenha confirmação de e-mail habilitada para novos cadastros.
4. Teste cadastro, confirmação, login, logout e recuperação com uma conta de teste.
5. Só então integre o módulo à interface e valide o acesso com duas contas diferentes.

A URL e a chave publicável são destinadas ao cliente; a chave `service_role` é secreta e nunca deve ser publicada. Não cole credenciais em conversas ou em arquivos públicos.
