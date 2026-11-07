# Projeto técnico — Conversas privadas

Status: planejamento preparado; integração com Supabase aguardando retomada autorizada pelo responsável do projeto.

Este documento registra a arquitetura proposta. **Não é uma migration SQL e não deve ser executado no Supabase.** Nenhuma tabela, política, bucket ou dado remoto foi alterado nesta etapa.

## Objetivo

Permitir que duas contas conversem individualmente, sem publicar mensagens na sala geral, e que artistas/usuários enviem convites para colaborações musicais ou conversas pessoais.

## Experiência prevista

1. O perfil público aprovado terá a ação **Chamar no privado**.
2. O primeiro contato será um pedido, não uma conversa aberta automaticamente.
3. O remetente escolhe o assunto: parceria musical, convite para evento/encontro ou conversa.
4. O destinatário pode aceitar, recusar ou bloquear. Só depois de aceitar a conversa poderá trocar mensagens.
5. A área **Minhas conversas** mostrará pedidos recebidos, enviados e conversas aceitas, com indicador de não lidas.
6. Cada conversa terá opções de bloquear, denunciar e encerrar.
7. O usuário poderá configurar quem pode enviar pedidos: todos, apenas pessoas com perfil público ou ninguém.
8. Nenhum telefone, endereço residencial ou localização precisa será compartilhado automaticamente.

## Modelo de dados proposto

### `private_conversations`
- `id`: UUID.
- `created_at`, `updated_at`: timestamps.
- `status`: `pending`, `accepted`, `rejected`, `closed`.
- `requester_id`, `recipient_id`: UUIDs de `auth.users`, diferentes entre si.
- `subject`: lista controlada de assuntos.
- Restrição para impedir duplicação de pedidos pendentes entre o mesmo par, considerando a direção.
- Índices para participante, status e atualização recente.

### `private_messages`
- `id`: UUID.
- `conversation_id`: referência à conversa.
- `sender_id`: UUID do autor.
- `content`: texto limitado em tamanho; anexos ficam para uma etapa posterior.
- `created_at`, `read_at`: timestamps.
- Índices por conversa e data.
- A inserção só será permitida quando o remetente participar da conversa e o status estiver `accepted`.

### `user_blocks`
- `blocker_id`, `blocked_id`: UUIDs.
- `created_at`.
- Chave única por par; impedir auto bloqueio.
- Um bloqueio impede novos pedidos e mensagens entre as duas contas, inclusive em conversas já existentes.

### Preferências
Guardar a opção de recebimento de pedidos no perfil, com padrão conservador e possibilidade de alteração pelo próprio usuário. Não expor preferências privadas no diretório público.

## Regras de segurança (RLS)

- Conversas: somente solicitante e destinatário podem consultar.
- Mensagens: somente participantes da conversa aceita podem ler; o remetente autenticado deve ser o autor da inserção.
- Pedidos pendentes: destinatário pode aceitar/recusar; solicitante pode cancelar o próprio pedido.
- Bloqueios: usuário administra apenas os bloqueios que criou; checagem de bloqueio deve ser aplicada no banco, não apenas na interface.
- Não permitir que o cliente escolha livremente `sender_id` ou altere status sem a regra correspondente.
- Realtime deve respeitar as mesmas políticas; não confiar em filtros de interface como controle de acesso.
- Não usar chave `service_role` no navegador.

## Antispam e proteção

- Limite de pedidos novos por período e limite de tamanho/frequência de mensagens.
- Um pedido pendente por par de usuários.
- Denúncia com categoria e contexto mínimo necessário; acesso restrito à equipe autorizada.
- Bloqueio disponível sem precisar responder.
- Mensagens renderizadas como texto, nunca como HTML fornecido pelo usuário.
- Anexos, áudio e imagens somente numa fase posterior, com validação de MIME, tamanho, autorização e política de armazenamento.
- Exibir aviso para não enviar dinheiro, senhas, documentos ou endereço pessoal a desconhecidos.

## Integração com a interface atual

- `mensagens.html`: abas funcionais para pedidos recebidos, enviados e conversas; estados vazios; badge de não lidas.
- `conta.html` e diretório de perfis: preferências de privacidade e botão **Chamar no privado**.
- `bate-papo.html`: manter a sala geral separada e oferecer acesso ao inbox, sem misturar mensagens privadas.
- Perfil/avatar: exibir apenas imagem autorizada pelo próprio titular; fallback padrão quando não houver avatar.
- Notificações: primeiro dentro do app; push do sistema fica para etapa posterior e consentida.

## Plano de implementação quando o Supabase for retomado

1. Conferir as tabelas, políticas, buckets e configurações reais do projeto com as capturas de tela do responsável.
2. Comparar o estado real com este desenho; adaptar sem apagar dados existentes.
3. Preparar migration aditiva, com políticas RLS e índices; revisar antes de executar.
4. Validar com duas contas de teste: pedido, aceite, recusa, mensagem em tempo real, bloqueio, denúncia e isolamento entre usuários.
5. Só então ligar os botões e estados da interface à API.
6. Testar em celular, conexão instável, atualização do app e sessão expirada.

## Critérios de conclusão

- Usuários não participantes nunca conseguem ler uma conversa.
- Não é possível enviar mensagem antes do aceite.
- Bloqueio funciona no banco e em tempo real.
- Pedidos recusados/cancelados não abrem canal de mensagens.
- A sala geral continua independente.
- Interface informa claramente falhas de conexão e não afirma envio sem confirmação do servidor.

## Limite desta etapa

A tela atual de Minhas conversas é uma prévia. Até a integração segura, não deve simular envio, persistir mensagens localmente como se fossem compartilhadas ou sugerir que outro usuário recebeu um pedido.
