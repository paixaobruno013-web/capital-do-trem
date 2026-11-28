# Chamadas e transmissões ao vivo — Capital do Trem

**Status (2026-11-28):** chamadas de voz, videochamadas, transmissões ao vivo e gravações estão temporariamente pausadas na primeira fase. O foco é música, playlists, Feed, Stories, perfis e chat por mensagens.

## Comportamento em produção

- `calls-api`: responde HTTP 410 para clientes antigos; não consulta o banco nem emite tokens.
- `lives-api`: responde HTTP 410; não cria salas nem emite tokens LiveKit.
- `lives-webhook`: confirma o recebimento e ignora eventos de gravação.
- A tabela `live_broadcasts` não está na publicação Supabase Realtime.
- Tabelas, registros e buckets já existentes foram preservados. Nenhum conteúdo foi apagado.

## Motivo da pausa

O projeto recebeu restrição de serviço por excesso de transferência de dados (egress e cached egress). Chamadas e transmissões aumentariam a complexidade e o risco de consumo. A pausa reduz essa superfície, mas não remove uma restrição de cota imposta pelo provedor: Auth, REST e Storage precisam ser testados novamente quando o Supabase liberar o serviço.

## Condições para reativação

1. Confirmar que Auth, REST e Storage estão respondendo normalmente.
2. Estimar e medir o consumo real de mídia e tráfego.
3. Revisar cotas e custos do provedor sem habilitar cobrança automaticamente.
4. Implementar limites de duração, participantes, qualidade e frequência.
5. Testar em aparelhos Android reais e Safari no iPhone.
6. Liberar gradualmente, com monitoramento e possibilidade de pausa.

Nenhum plano pago, cartão ou upgrade automático deve ser ativado sem autorização explícita. A pausa é reversível; não excluir tabelas, buckets ou registros existentes sem revisão específica de backup e retenção.
