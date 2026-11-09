# Backend de chamadas — Capital do Trem

## Situação

- As tabelas `calls`, `call_participants` e `call_invites` já foram criadas no Supabase.
- RLS está ativo; acesso direto por `anon` e `authenticated` foi revogado. O backend usa credenciais privilegiadas apenas no servidor.
- O limite de quatro participantes é validado por trigger no banco.
- A Edge Function `calls-api` está preparada no repositório, mas **ainda não foi implantada**.
- A integração de interface, notificações e teste em aparelhos ainda não foi feita.

## Plano de implantação sem cobrança

O projeto deve usar o LiveKit Cloud Build (gratuito). Esse plano tem cotas incluídas e limite rígido: ao atingir uma cota, novas operações falham em vez de gerar cobrança excedente. Não fazer upgrade, cadastrar cartão ou ativar plano pago sem autorização expressa.

## Secrets necessários para a Edge Function

Adicionar no Supabase Dashboard → Project → Edge Functions → Secrets:

- `LIVEKIT_URL` — endereço WebSocket do projeto LiveKit (normalmente começa com `wss://`).
- `LIVEKIT_API_KEY` — chave de API LiveKit.
- `LIVEKIT_API_SECRET` — segredo de API LiveKit.

O Supabase fornece automaticamente `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` ao ambiente da Edge Function. Se o painel indicar nomes diferentes, revisar antes de implantar.

**Nunca** colocar o segredo LiveKit, a service-role key ou qualquer segredo em HTML/JavaScript público, no APK, no GitHub ou em mensagens de chat.

## Implantação

Após cadastrar os três secrets, implantar `calls-api` com verificação JWT habilitada (`verify_jwt: true`). A função valida a sessão Supabase, verifica que a pessoa participa de uma conversa privada aceita, cria os convites e emite token LiveKit de curta duração. Ela só emite token para participante registrado na chamada.

## Ações preparadas

- `start`: cria chamada de voz/vídeo e convida a pessoa da conversa selecionada, podendo incluir até mais duas pessoas com conversa privada aceita com o anfitrião.
- `join`: valida convite e emite token para entrar.
- `decline`: recusa convite.
- `leave`: sai da chamada; se o anfitrião sair, encerra para todos.
- `end`: somente o anfitrião encerra para todos.

## Antes de liberar aos usuários

1. Implantar a Edge Function após configurar secrets.
2. Integrar o SDK LiveKit ao chat e à interface Capacitor.
3. Implementar sinalização/notificações de chamadas recebidas.
4. Validar limite de quatro pessoas, expiração de convite e autorização em testes.
5. Monitorar as cotas Build e pausar novas chamadas antes de qualquer tentativa de upgrade.
6. Testar em aparelhos Android reais, Wi-Fi e rede móvel, com permissões aceitas/negadas e alternância de rede.
