# Chamadas de voz e vídeo — Capital do Trem

**Status:** arquitetura definida; integração de mídia ainda não ativada.  
**Escopo aprovado pelo produto:** chamadas individuais e em grupo, com limite rígido de 4 participantes por sala (incluindo quem iniciou).  
**Modelo aprovado:** chamadas gratuitas para todos os usuários; iniciar com LiveKit Cloud no plano gratuito (Build), sem contratar plano pago nem habilitar cobrança automática.

## Objetivo

Entregar uma experiência familiar para quem usa WhatsApp, com identidade visual Capital do Trem, priorizando Android, conexões móveis brasileiras e aparelhos de entrada/intermediários. O limite de quatro participantes é uma decisão intencional de produto, mesmo que outros serviços suportem grupos maiores.

## Política de custo e gratuidade

- As chamadas de voz e vídeo serão gratuitas para artistas e usuários Uai; não haverá cobrança por minuto ao usuário na primeira versão.
- Provedor escolhido para iniciar: **LiveKit Cloud — plano Build gratuito**.
- Permanecer dentro das cotas gratuitas publicadas (referência consultada: 5.000 WebRTC participant-minutes/mês, 50 GB de transferência de dados e até 100 conexões simultâneas; os limites podem mudar e devem ser conferidos no painel antes da publicação).
- Não contratar Ship, Scale ou qualquer plano pago; não habilitar upgrade automático, faturamento ou adicionar cartão sem autorização explícita do responsável pelo projeto.
- Implementar medição/alertas de consumo e testar limites. Se a cota gratuita estiver perto de acabar, bloquear novas chamadas de forma controlada ou pausar o recurso e avisar o administrador; nunca gerar despesa silenciosamente.
- Se a operação ultrapassar a cota, avaliar otimização, self-hosting ou nova autorização do responsável antes de qualquer custo. Self-hosting também tem custos próprios de servidor, tráfego e manutenção.
- A gratuidade para usuários é uma decisão do produto; ela não significa que infraestrutura de terceiros seja ilimitada ou gratuita para sempre.

## Recursos previstos

### Primeira entrega
- Chamada de voz 1:1 e em grupo (máximo 4 pessoas).
- Videochamada 1:1 e em grupo (máximo 4 pessoas).
- Chamada recebida: aceitar, recusar e ignorar.
- Controles durante a chamada: microfone, câmera, câmera frontal/traseira, viva-voz/saída de áudio e encerrar.
- Estado de conexão visível: chamando, tocando, conectando, conectado, reconectando, encerrado e falhou.
- Histórico de chamadas (perdidas, recebidas, efetuadas, duração e participantes).
- Limite de participantes validado no servidor, não apenas na interface.
- Permissões de microfone/câmera explicadas antes de solicitar acesso.

### Qualidade e estabilidade
- Arquitetura SFU (Selective Forwarding Unit), evitando malha P2P completa entre os quatro celulares.
- Ajuste adaptativo de resolução e taxa de bits conforme largura de banda, CPU e tamanho do vídeo exibido.
- Publicação dinâmica de camadas de vídeo (Dynacast) para reduzir tráfego e processamento.
- Começar vídeo em qualidade moderada e subir rapidamente quando a rede permitir (experiência QuickHD, sem prometer HD em redes incapazes).
- Preferir áudio estável a vídeo quando a rede oscilar; reduzir resolução/FPS antes de interromper áudio.
- Supressão de ruído e cancelamento de eco quando suportados pelo dispositivo/navegador.
- Reconexão automática, estados de reconexão claros e prevenção de chamadas duplicadas.
- Métricas de qualidade (perda de pacotes, RTT, jitter, bitrate e motivo de encerramento), sem gravar o conteúdo da chamada.

### Evoluções inspiradas nos recursos recentes do WhatsApp
- Sala de espera e aprovação do anfitrião para participantes convidados por link.
- Link de convite com expiração e limite de uso, revogável pelo anfitrião.
- Reações rápidas, levantar a mão e destaque visual de quem está falando.
- Notificação de entrada/saída de participantes.
- Compartilhamento de tela em etapa posterior, após validação de permissões e compatibilidade Android.
- Transferência entre dispositivos em etapa posterior; exige sincronização de sessão e autenticação adicional.

## Arquitetura recomendada

- **Mídia em tempo real:** LiveKit Cloud no plano Build gratuito; self-hosting só será considerado se a cota não atender e após avaliação de custo/operacional.
- **Cliente:** SDK JavaScript oficial `livekit-client`, atualmente documentado na série 2.x. Integrar à página `bate-papo.html` e ao app Capacitor; testar especificamente WebView Android e permissões de câmera/microfone.
- **Identidade:** sessão autenticada do Supabase; identidade do participante derivada no backend, nunca aceita livremente do navegador.
- **Autorização:** Supabase Edge Function para criar/consultar chamadas e emitir tokens LiveKit de curta duração. Chave API e segredo LiveKit ficam somente nos secrets do backend.
- **Sinalização e convites:** registros de chamada no Supabase e Supabase Realtime para convite/estado, com autorização por participante.
- **Push:** FCM no Android e APNs no iOS para chamadas recebidas com app em segundo plano/fechado; a notificação deve abrir a tela da chamada e validar novamente a autorização.
- **Limite de sala:** backend cria sala com máximo de quatro participantes e valida cada entrada. Regras também impedem convidado de adicionar outras pessoas.
- **Segurança:** tokens curtos, autorização por conversa/participante, rate limiting e expiração de convites. Não colocar segredo de servidor, service-role ou chave privada no frontend.
- **Criptografia:** transporte WebRTC protegido. Não anunciar criptografia ponta a ponta no produto até implementar e testar E2EE com distribuição segura de chaves para todos os participantes; SFU e TLS por si só não equivalem a E2EE.

## Modelo de dados a implementar após escolha do provedor

- `calls`: id, room_name aleatório, conversation_id opcional, initiator_id, call_type (audio/video), status, max_participants=4, created_at, started_at, ended_at.
- `call_participants`: call_id, user_id, state, invited_at, joined_at, left_at, role (host/participant), outcome.
- `call_invites`: call_id, invited_user_id ou token_hash, expires_at, approved_at, revoked_at, created_by.
- RLS: somente participantes autorizados podem ler os metadados da chamada; escrita de estados sensíveis feita pelo backend. Nunca armazenar tokens de mídia permanentes.

## Etapas de implementação

1. Provedor escolhido: LiveKit Cloud no plano Build gratuito, limitado às cotas gratuitas; sem cartão, upgrade ou contratação paga.
2. Criar Edge Functions para iniciar chamada, emitir token, convidar, aprovar, entrar e encerrar; validar identidade e limite de quatro no servidor.
3. Criar migrations com RLS para chamadas, participantes e convites.
4. Integrar SDK no chat e construir telas de chamada recebida/ativa, áudio e vídeo.
5. Integrar notificações push e comportamento de segundo plano no Android.
6. Implementar medição/alertas de consumo e comportamento seguro ao atingir a cota gratuita.
7. Testar em dois, três e quatro aparelhos reais, Wi-Fi e 4G/5G, alternância de rede, permissões negadas, chamadas simultâneas, tela bloqueada, app em segundo plano e encerramento abrupto.
8. Liberar gradualmente; monitorar falhas e qualidade antes de ampliar.

## Critérios de aceite

- Nunca permitir mais de quatro participantes simultâneos, mesmo com tentativas concorrentes.
- Usuário não participante não consegue entrar nem consultar dados da chamada.
- Microfone/câmera podem ser desligados sem encerrar a chamada.
- Ao perder rede, o app mostra reconexão e tenta recuperar a sessão; não promete recuperação quando a rede/servidor não permitem.
- Áudio continua priorizado quando a banda cai; vídeo adapta qualidade.
- Chamada recebida funciona em Android em primeiro plano e, depois da integração push, em segundo plano.
- Não há chaves secretas no bundle, repositório ou APK.
- Não há upgrade ou cobrança automática; o uso é monitorado e novas chamadas podem ser pausadas antes de ultrapassar cotas gratuitas.
- Não há anúncio de E2EE antes da validação criptográfica completa.

## Dependências e bloqueios atuais

- O projeto tem chat Supabase em `bate-papo.html`, mensagens privadas em `mensagens.html` e Capacitor 8; não foi encontrada integração de chamadas ou dependência LiveKit no `package.json`.
- O projeto ainda não possui servidor de mídia nem Edge Functions de chamadas.
- A integração não está concluída nem testada em aparelho real.
- As credenciais LiveKit devem ser criadas e guardadas apenas nos secrets do backend; nunca pedir ao usuário para publicar chaves no chat ou no frontend.
