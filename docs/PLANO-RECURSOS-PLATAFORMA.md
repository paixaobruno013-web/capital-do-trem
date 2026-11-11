# Capital do Trem — mapa de recursos inspirado nas melhores experiências digitais

O objetivo é combinar funções conhecidas de plataformas de música, vídeo, redes sociais e mensagens, sem copiar marcas, interfaces ou conteúdo protegido. A experiência deve continuar com a identidade própria do Capital do Trem: preto Black, vermelho LED, cultura mineira, funk, artistas e comunidade.

## O que já existe ou está em implantação

- **Música:** catálogo compartilhado, reprodução no app, downloads autorizados, curtidas, comentários, links temporários e opção de guardar músicas offline no aparelho.
- **Biblioteca musical (nova etapa):** músicas salvas e histórico de reprodução sincronizados pela conta entre Android, iOS e web.
- **Vídeos:** seleção dos vídeos oficiais do canal na página inicial.
- **Stories:** Stories oficiais e de usuários vinculados à foto de perfil já existente.
- **Comunicação:** grupo geral, conversas privadas com aceite, anexos, gravação de áudio, emojis, presença, chamadas em desenvolvimento e ferramentas de denúncia/bloqueio/moderação.
- **Comunidade:** perfis, artistas, mural, eventos e ações sociais.

## Recursos que vamos desenvolver em fases

### Fase 1 — Música e descoberta
Referências de experiência: Spotify e YouTube Music.
- Biblioteca pessoal sincronizada, histórico recente e músicas salvas.
- Playlists pessoais e colaborativas.
- Fila de reprodução, continuar de onde parou e controles na tela bloqueada.
- Páginas de artistas com discografia, vídeos, agenda e links oficiais.
- Recomendações ajustáveis, com opção “não tenho interesse” e controles de privacidade.

### Fase 2 — Feed de vídeos curtos
Referências de experiência: TikTok, Reels e YouTube Shorts.
- Feed vertical com gesto de deslizar, carregamento progressivo e qualidade adaptável à conexão.
- Clipes de artistas, bastidores, trechos de shows e vídeos da comunidade.
- Curtir, comentar, compartilhar, salvar e abrir o perfil do criador.
- Legendas, indicação de conteúdo sensível, denúncia e moderação.
- Upload com limites de tamanho/duração, validação de formato e compressão no servidor.
- Não reutilizar nem baixar vídeos de outras plataformas sem autorização; incorporar vídeos externos respeitando as regras do provedor.

### Fase 3 — Rede social e comunidade
Referências de experiência: Instagram e Facebook.
- Seguir artistas e perfis, com feed de quem a pessoa escolheu acompanhar.
- Publicações com foto, vídeo, texto e carrossel.
- Stories no avatar atual, arquivo de Stories e controles de audiência.
- Eventos com lembretes, localização pública e compartilhamento.
- Comunidades por interesse e ações sociais com responsáveis identificados.

### Fase 4 — Mensagens e grupos
Referências de experiência: WhatsApp, Messenger e Telegram.
- Melhorias de resposta, reações, edição e remoção de mensagens, fixação e busca.
- Mensagens de voz com velocidade de reprodução e transcrição opcional.
- Envio confiável de mídia, documentos e links com prévia.
- Grupos com administradores, convites, regras, silenciar e sair.
- Chamadas de voz e vídeo com estados claros de conexão.
- Configurações de privacidade: quem pode convidar, chamar, seguir e enviar mensagem.
- Avaliar criptografia ponta a ponta com protocolo auditado antes de anunciar esse recurso. O chat atual não deve ser descrito como ponta a ponta sem essa implantação e auditoria.

### Fase 5 — Criadores, transmissões e comunidade ao vivo
- Ferramentas de artista: agenda, lançamentos, destaques, estatísticas e links.
- Transmissões ao vivo de eventos e apresentações, condicionadas a infraestrutura, moderação e direitos de transmissão.
- Notificações configuráveis para novos Stories, lançamentos, eventos e mensagens.
- Recursos de acessibilidade, consumo reduzido de dados e funcionamento offline quando possível.

## Regras de produto e segurança

1. Android, iOS e web devem usar as mesmas regras de conta, privacidade e permissões.
2. Recursos pessoais sincronizados exigem autenticação e políticas RLS no banco.
3. Vídeos e músicas só podem ser publicados quando houver direito de distribuição.
4. Feed e recomendações precisam de controles de usuário, denúncia, bloqueio e moderação.
5. Não prometer reprodução em segundo plano, criptografia ponta a ponta ou transmissão ao vivo sem testes reais em cada plataforma.
6. Priorizar estabilidade, acessibilidade, consumo de dados e proteção de menores antes de expandir recursos virais.

## Critério de conclusão

Cada recurso só será marcado como pronto depois de: código implementado, políticas do banco revisadas, testes automatizados aprovados, build Android e iOS concluídos e validação funcional em aparelhos reais.
