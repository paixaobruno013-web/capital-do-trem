# Capital do Trem — preparação do banco de dados

Este diretório contém a primeira estrutura de banco de dados para a futura versão conectada do Capital do Trem.

## O que este esquema prepara

- Perfis privados vinculados às contas de autenticação.
- Eventos, shows e ações sociais com aprovação antes da publicação.
- Perfis de artistas com aprovação antes de aparecerem publicamente.
- Mural de divulgações com aprovação.
- Painel administrativo com verificação de função no banco e fila de moderação para artistas, eventos e divulgações.
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

O esquema prepara o bucket público `capital-do-trem-media`, limitado a imagens JPEG, PNG e WebP de até 5 MB. Cada usuário autenticado só pode enviar, substituir ou apagar arquivos dentro da pasta cujo primeiro nome é seu UUID. A área Minha conta já integra o envio de foto artística e cartaz de evento: o arquivo é validado no navegador, enviado para a pasta do usuário e o endereço público é associado à ficha ou ao evento, que permanece pendente para análise. A leitura dos arquivos é pública para permitir exibir imagens de registros aprovados. O bucket e as políticas só entram em vigor depois que `schema.sql` for executado no Supabase; os envios ainda não foram testados contra um projeto conectado.

## Próximas etapas de integração

1. Criar/conferir o projeto Supabase e ativar autenticação por e-mail.
2. Aplicar e testar este esquema em um projeto de desenvolvimento.
3. Integrar cadastro, login, sessão e recuperação de senha no site.
4. Integrar formulários de eventos, artistas e divulgações.
5. Criar armazenamento de imagens com regras de acesso e limites de tamanho.
6. Configurar o primeiro administrador manualmente na tabela `admin_users`.
7. Abrir `admin.html`, entrar com a conta autorizada e testar aprovação/rejeição de cada tipo de publicação.
8. Testar permissões com contas comuns e administrativas diferentes.

## Módulo inicial de autenticação

O arquivo `supabase/auth.js` prepara funções para cadastro com confirmação por e-mail, login, logout, recuperação de senha e acompanhamento da sessão. Ele usa o SDK oficial Supabase JS v2 por CDN.

**A interface de conta e o painel administrativo já importam este módulo, mas a conexão real permanece desativada** enquanto os valores de configuração forem espaços reservados. A agenda, o mural e o diretório públicos também tentam consultar o Supabase e exibem mensagens de indisponibilidade quando ele não está configurado.

1. Substitua os dois valores de configuração no início de `auth.js` pela URL do projeto e pela chave pública (publishable/anon) do Supabase.
2. No painel Supabase, configure a URL pública do site em **Authentication → URL Configuration** e adicione também a URL de redirecionamento usada para confirmação e recuperação de senha.
3. Em **Authentication → Providers → Email**, mantenha confirmação de e-mail habilitada para novos cadastros.
4. Teste cadastro, confirmação, login, logout e recuperação com uma conta de teste.
5. Valide o acesso com duas contas diferentes e confirme que cada uma só consegue alterar os próprios dados.

A URL e a chave publicável são destinadas ao cliente; a chave `service_role` é secreta e nunca deve ser publicada. Não cole credenciais em conversas ou em arquivos públicos.


## Reenvio de perfil recusado

A versão atual do esquema permite que o próprio artista edite uma ficha que esteja pendente ou recusada, mas exige que ela volte a ficar com status `pending` ao salvar. Perfis já publicados não podem ser alterados diretamente pelo artista; isso evita que uma ficha aprovada mude sem nova análise. Se este banco já tiver sido criado com a política anterior, aplique no SQL Editor a atualização da política `artists_update_own_or_admin` presente na versão atual de `schema.sql`.


## Painel administrativo preparado

A página `admin.html` agora contém formulário de entrada, verificação de administrador por `public.is_admin()`, fila de itens pendentes (artistas, eventos e divulgações) e ações de aprovar/rejeitar. As alterações são feitas com a sessão autenticada e dependem das políticas RLS. O painel não concede privilégios por si só.

**Este painel ainda não pode ser usado em produção:** a URL/chave pública do Supabase continuam como marcadores, o esquema SQL ainda não foi aplicado e nenhuma conta foi autorizada como administrador. Não compartilhe credenciais administrativas nem use a chave `service_role` no navegador.


## Agenda pública compartilhada

A página inicial agora tenta carregar os próximos eventos aprovados usando a função `getPublishedEvents()`. Visitantes recebem apenas campos públicos e registros com status `published`; a política RLS da tabela `events` continua sendo a barreira de segurança. Se a conexão Supabase ainda não estiver configurada, a página mantém uma mensagem informativa e o restante do site continua funcionando.

A agenda mostra data, horário, endereço, descrição, contato público e cartaz (quando existir), além de um link para abrir o endereço no Google Maps. O envio de eventos pelo formulário da conta e a publicação pelo painel administrativo só funcionarão depois de configurar o Supabase, executar o SQL e testar as permissões.


## Envio de divulgações da comunidade

A área da conta agora inclui um formulário para enviar lançamentos, notícias, parcerias, eventos e ações sociais para análise. O texto é salvo na tabela `posts` como pendente e só aparece no mural público depois da aprovação no painel administrativo. A página inicial consulta apenas registros publicados, sem expor o identificador do autor.

O formulário limita o conteúdo e exige sessão autenticada. O recurso depende da configuração Supabase, execução de `schema.sql` e testes de RLS; enquanto isso, o mural compartilhado permanece informativo e os formulários de demonstração locais continuam separados.


## Contas abertas para Usuários Uai e artistas

O cadastro agora oferece duas opções: Usuário Uai ou artista. Todos usam a mesma conta e podem acessar as áreas abertas (músicas, eventos, agenda, mural e comunidade). A ficha básica permite nome de exibição, cidade e apresentação curta. O perfil público é opcional: somente quem marcar a opção de aparecer será listado no diretório, e a consulta pública retorna apenas nome, tipo de conta, cidade e apresentação — nunca e-mail.

A tabela `profiles` recebe campos novos de forma aditiva, com políticas RLS para que cada pessoa edite somente o próprio perfil e visitantes consultem apenas perfis com `is_public = true`. O perfil artístico detalhado aparece somente para contas do tipo Artista e continua sendo uma ficha separada, submetida à análise da equipe. Contas Usuário Uai não veem campos de ficha artística; ambas podem participar do mural e enviar eventos. Para ativar em um projeto já existente, é necessário executar a versão atualizada de `schema.sql` no SQL Editor e testar com contas de Usuário Uai e artista.


## Vitrine pública de artistas

A página inicial consulta `getPublishedArtists()` para mostrar somente registros da tabela `artists` com status `published`. A consulta não retorna e-mail nem dados de login. A equipe precisa aprovar o perfil no painel administrativo; perfis pendentes ou rejeitados não aparecem na vitrine. A vitrine só funcionará depois de configurar as credenciais públicas e executar o schema SQL no projeto Supabase.


## Checklist de liberação pública

Antes de divulgar o cadastro ao público, confirme todos os itens:

- [ ] Configurar a URL do projeto Supabase e somente a chave pública (publishable/anon) em `supabase/auth.js`.
- [ ] Executar o `schema.sql` atualizado no projeto correto e conferir se todas as tabelas, políticas RLS e o bucket `capital-do-trem-media` foram criados.
- [ ] Criar uma conta de teste do tipo Usuário Uai e outra do tipo Artista.
- [ ] Confirmar login, saída, recuperação de senha e confirmação de e-mail.
- [ ] Confirmar que perfis privados não aparecem no diretório público.
- [ ] Enviar foto e cartaz de teste; conferir limite de 5 MB e aprovação antes da publicação.
- [ ] Enviar evento e publicação; confirmar que começam pendentes e só aparecem após aprovação administrativa.
- [ ] Testar o painel administrativo com uma conta explicitamente autorizada em `admin_users`.
- [ ] Testar em Android, conexão lenta e modo offline; conferir se mensagens de erro são claras.

**Não anunciar o cadastro como disponível antes de concluir os testes.** O site estático pode abrir enquanto o backend permanece desconfigurado; isso não significa que as contas ou publicações estejam operacionais.
