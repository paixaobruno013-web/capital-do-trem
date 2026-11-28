# Chamadas de voz e vídeo — Capital do Trem

**Status atual (2026-11-27):** videochamadas e transmissões ao vivo foram adiadas para uma fase futura. Chamadas de voz permanecem como possibilidade técnica, mas não devem ser consideradas liberadas ao público sem validação de custo e testes reais.

## Prioridade da primeira fase

O lançamento deve concentrar recursos em:
- Catálogo, envio e reprodução de músicas.
- Playlists e experiência de reprodução estável.
- Feed, fotos, Stories e perfis.
- Seguidores, publicações e chat por mensagens.
- Login, cadastro e recuperação de acesso.

## Recursos adiados

- Videochamadas individuais e em grupo.
- Transmissões públicas ao vivo.
- Gravação, armazenamento e reprodução de lives.
- Convites, notificações e controles específicos de chamadas de vídeo.

A API de chamadas rejeita o tipo `video` com HTTP 410. A API de lives responde HTTP 410 sem criar salas ou emitir tokens. O webhook de gravações ignora eventos. As tabelas e buckets já existentes são preservados nesta etapa para evitar perda de dados e permitir reavaliação futura.

## Por que adiar

O projeto apresentou restrição por excesso de transferência de dados (egress e cached egress). Vídeo em tempo real e transmissões podem elevar rapidamente o tráfego, além de adicionar custos e complexidade operacional. Adiar essas funções reduz a superfície de consumo potencial, mas **não garante por si só** a liberação do Supabase: a restrição de quota precisa ser resolvida no painel/na cobrança e o tráfego restante (principalmente mídia do feed, Stories e músicas) também precisa ser medido.

## Regras para uma futura retomada

1. Não contratar plano, adicionar cartão ou habilitar cobrança automática sem autorização explícita.
2. Estimar custo de mídia e tráfego antes de reativar qualquer função.
3. Implementar limites de duração, participantes, qualidade e frequência.
4. Medir consumo e criar alertas/limites antes de liberar ao público.
5. Testar em aparelhos Android reais e Safari no iPhone.
6. Reativar gradualmente, somente após validação técnica e financeira.

## Observação

Esta decisão é uma redução de escopo, não uma exclusão definitiva do produto. Não apagar tabelas, buckets ou registros existentes sem uma revisão específica de retenção e backup.
