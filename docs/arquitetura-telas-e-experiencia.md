# CAPITAL DO TREM — arquitetura funcional das telas

## Objetivo
Organizar a experiência do aplicativo em áreas com responsabilidades claras, preservando a identidade visual, os recursos existentes, os dados dos usuários e os fluxos já implementados. Esta especificação orienta a próxima etapa de implementação; não autoriza remover ou substituir funcionalidades existentes.

## Identidade e boas-vindas
- Manter a marca CAPITAL DO TREM, paleta vermelho/preto/branco e o triângulo vermelho 🔺 associado à identidade mineira.
- Mensagem de entrada: **SEJA BEM-VINDO, MAQUINISTA DESSE TREM!**
- Apresentar informações curtas e corretas sobre a Capital do Trem, sua comunidade e sua relação com a cultura Funk de Minas Gerais, sem afirmar tombamento ou reconhecimento legal que não tenha sido comprovado.

## Navegação principal
1. **Início / Feed** — tela inicial após entrar: publicações da comunidade, fotos, vídeos, Stories, curtidas, comentários e compartilhamentos.
2. **Chat** — somente conversas:
   - grupo oficial CAPITAL DO TREM;
   - conversas/assuntos que o usuário cria com seus seguidores;
   - espaço para conhecer e conversar com pessoas por proximidade/localização, com consentimento explícito, controles de visibilidade e opção de bloquear/denunciar.
3. **Músicas** — catálogo dedicado exclusivamente a faixas de áudio, com capa, título, artista, duração quando disponível e player. Faixas autorizadas e liberadas para publicação devem entrar automaticamente no catálogo público, sem cada usuário precisar adicionar/importar o arquivo. Respeitar direitos autorais, estado de moderação, permissões de armazenamento e políticas de acesso; nunca expor arquivos privados ou uploads não autorizados.
4. **Perfil** — foto de perfil, foto de capa, descrição, fotos, vídeos, contagem de seguidores/seguindo e listas de seguidores/seguindo. Não misturar o perfil com o feed geral nem com o catálogo musical.
5. **Artistas** — área de descoberta/apresentação de artistas e DJs. O selo de verificado só pode ser concedido por processo administrativo/autorização, nunca automaticamente por nome ou tipo de conta.
6. **Pesquisa / Descobrir** — pesquisa de pessoas, artistas e conteúdos; recomendações de vídeos aleatórios em feed de descoberta, com controles para atualizar, ocultar e denunciar.
7. **Cadastro / Sobre** — criar conta ou entrar, com apresentação institucional da Capital do Trem e a mensagem de boas-vindas.

## Regras de implementação e preservação
- Reaproveitar autenticação, banco, tabelas, armazenamento, publicação, Stories, perfis, seguidores, mensagens, catálogo e players já existentes.
- Antes de alterar qualquer fluxo, identificar seus arquivos, scripts, tabelas, políticas RLS e verificações automatizadas.
- Não remover nem duplicar rotas/recursos existentes. Atualizar navegação e hierarquia visual gradualmente.
- Manter compatibilidade Android (Capacitor) e iPhone Safari/PWA, acessibilidade, telas pequenas e estados offline.
- Preservar a política do lançamento gratuito e sem anúncios.
- Localização para amizades deve ser opcional, com permissão do usuário, divulgação mínima (por exemplo, região aproximada em vez de coordenadas exatas), possibilidade de desligar a qualquer momento e ferramentas de segurança.
- Vídeos aleatórios devem vir de conteúdo público/autorizado da própria comunidade ou de fontes com integração e direitos adequados; não fazer scraping ou reprodução sem permissão.

## Critérios de aceite
- Feed é a tela inicial e contém as publicações sociais.
- Chat mostra apenas experiências de conversa, separadas em grupo, assuntos com seguidores e descoberta de amizades.
- Música é uma área exclusiva de áudio; faixa autorizada e publicada aparece automaticamente para todos.
- Perfil mostra apenas identidade e mídia pessoal, além de seguidores/seguindo.
- Artistas verificados têm selo visível cuja concessão é controlada.
- Pesquisa/Descobrir reúne busca e vídeos aleatórios com controles de segurança.
- Cadastro e apresentação institucional incluem “SEJA BEM-VINDO, MAQUINISTA DESSE TREM!”.
- Os fluxos atuais continuam funcionando e os testes de regressão passam antes de integrar à versão principal.

## Sequência técnica sugerida
1. Mapear navegação atual e todos os pontos de entrada; registrar testes existentes.
2. Organizar a navegação principal sem alterar regras de dados.
3. Separar Feed, Chat, Música e Perfil usando páginas/módulos existentes.
4. Validar catálogo automático e player com contas diferentes e estados de publicação.
5. Implementar controles de descoberta por localização e recomendações com privacidade.
6. Revisar selo de artista, pesquisa, cadastro e conteúdo institucional.
7. Rodar testes automatizados e testes manuais Android/iPhone antes da integração.
