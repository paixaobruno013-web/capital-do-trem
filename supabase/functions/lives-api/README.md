# Infraestrutura de transmissões ao vivo — Capital do Trem

## Estado desta etapa
- Criada migration para registrar transmissões, anfitriões, estado e estado futuro da gravação.
- A tabela é protegida por RLS e não pode ser lida/escrita diretamente por usuários; somente a Edge Function usa service role.
- Criada Edge Function `lives-api` com ações `start`, `join` e `end`.
- O anfitrião recebe permissão de publicar áudio/vídeo; espectadores recebem permissão somente de assistir.
- Uma transmissão ativa por anfitrião; salas LiveKit com limite técnico de até 1.000 conexões por sala (sujeito ao plano e cotas do provedor).
- **Gravação automática ainda não está habilitada.** O estado fica explicitamente `not_configured`; não anunciar nem mostrar a função como disponível.

## Secrets necessários
Configurar somente no Supabase → Edge Functions → Secrets:
- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`

O Supabase fornece `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` ao runtime. Nunca incluir secrets no app, em HTML, no GitHub ou em mensagens.

## Dependências externas antes de ativar
1. Aplicar a migration `20261121130000_live_broadcasts.sql` no projeto Supabase correto.
2. Criar/configurar projeto LiveKit Cloud e confirmar cotas, limites e política de cobrança. Não cadastrar cartão, fazer upgrade ou ativar cobrança sem autorização expressa.
3. Implantar `lives-api` com verificação JWT habilitada.
4. Integrar SDK LiveKit no aplicativo e implementar tela de anfitrião/espectador.
5. Configurar LiveKit Egress e armazenamento de gravações (bucket privado, credenciais server-side, política de retenção e custos).
6. Implementar webhook assinado para atualizar `recording_status` e caminho do arquivo.
7. Criar publicação no Feed somente após gravação concluída e validada; nunca expor arquivo temporário ou URL administrativa.
8. Testar rede móvel/Wi-Fi, permissões, reconexão, encerramento, espectadores simultâneos, limites de uso e falhas de gravação.

## Contrato da função
POST autenticado:
- `{ "action": "list" }` — lista até 30 transmissões ativas.
- `{ "action": "start", "title": "...", "description": "..." }`
- `{ "action": "join", "live_id": "uuid" }`
- `{ "action": "end", "live_id": "uuid" }`

Tokens LiveKit são de curta duração. O servidor valida a sessão e o direito de encerrar a transmissão. O cliente não recebe credenciais administrativas.
