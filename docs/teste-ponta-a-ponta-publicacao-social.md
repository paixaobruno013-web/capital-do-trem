# Roteiro de teste ponta a ponta — publicações sociais

Este roteiro valida a publicação de texto, fotos e vídeos antes de qualquer merge ou atualização da versão pública.

## Segurança antes de começar

- Use somente contas de teste ou contas autorizadas pelo proprietário.
- Não compartilhe senhas, códigos de confirmação, tokens ou chaves com ninguém.
- Use apenas fotos e vídeos que possam ficar públicos: o bucket atual `capital-do-trem-media` é público por URL.
- Não envie documentos, fotos pessoais privadas, conversas, dados de terceiros ou conteúdo que deveria ficar restrito.
- Faça os testes em ambiente de prévia isolado. Não use a versão pública de produção para validar uma alteração que ainda está em revisão.
- Se não houver uma prévia HTTPS separada, interrompa antes do upload real; não publique a branch diretamente sobre o site oficial.

## Preparação

- [ ] Confirmar que a prévia está apontando para o projeto Supabase correto.
- [ ] Confirmar que o commit testado é `51f29769b78edd4f68a5a8501d865246caa892f7` ou um commit posterior da mesma revisão.
- [ ] Separar uma imagem JPG/PNG/WebP pequena e um vídeo MP4/WebM/MOV curto, ambos autorizados para publicação pública.
- [ ] Ter acesso a uma conta comum, uma conta de artista e à conta administradora autorizada.
- [ ] Abrir o console/logs do navegador apenas para diagnóstico; nunca copiar tokens ou dados de sessão para relatórios.

## Casos de teste

### 1. Visitante sem login

- [ ] Abrir a prévia sem entrar na conta.
- [ ] Confirmar que o mural carrega publicações públicas existentes.
- [ ] Confirmar que o formulário de publicação pede autenticação.
- [ ] Confirmar que não é possível curtir ou comentar sem login.
- [ ] Confirmar que perfis privados não expõem dados no mural.

### 2. Conta comum — Usuário Uai

- [ ] Entrar com uma conta comum autorizada.
- [ ] Publicar somente texto.
- [ ] Confirmar que a publicação aparece no mural e mantém o autor correto.
- [ ] Publicar uma foto com legenda.
- [ ] Publicar uma foto sem legenda.
- [ ] Publicar um vídeo curto com legenda.
- [ ] Confirmar que imagem e vídeo abrem no mural e que os controles de vídeo funcionam.
- [ ] Curtir, comentar, salvar e remover dos salvos.
- [ ] Confirmar que a coleção de salvos exibe a mídia salva.

### 3. Conta de artista

- [ ] Entrar com uma conta de artista autorizada.
- [ ] Publicar texto, foto e vídeo em testes separados.
- [ ] Confirmar que o mural identifica a conta como Artista.
- [ ] Confirmar que o avatar público aparece ou que o fallback é exibido.
- [ ] Confirmar que a conta só consegue anexar mídia às próprias publicações.

### 4. Conta administradora

- [ ] Entrar com a conta administradora autorizada.
- [ ] Conferir a leitura das publicações públicas.
- [ ] Confirmar que a identidade de administrador não altera o autor exibido nas publicações.
- [ ] Confirmar que não é possível anexar mídia a uma publicação de outro usuário por meio do fluxo comum de publicação.

### 5. Limites e validação de arquivos

- [ ] Confirmar que legenda vazia sem mídia é recusada.
- [ ] Confirmar que publicação com mídia e sem legenda é aceita.
- [ ] Confirmar limite de 10 arquivos por publicação.
- [ ] Confirmar limite de 10 MiB por imagem.
- [ ] Confirmar limite de 50 MiB por vídeo.
- [ ] Confirmar limite de 100 MiB no conjunto.
- [ ] Confirmar recusa de formatos não permitidos.

### 6. Interrupção e retentativa

- [ ] Em ambiente de prévia, interromper a conexão durante o envio de uma publicação com mais de um arquivo.
- [ ] Usar “Continuar envio” na mesma tela.
- [ ] Confirmar que a publicação não é duplicada.
- [ ] Confirmar que cada posição de mídia aparece uma única vez.
- [ ] Confirmar que a interface informa claramente quando o envio não terminou.

### 7. Dispositivos

- [ ] Android: testar seleção de fotos, seleção de vídeo, envio, reprodução e retentativa.
- [ ] iPhone Safari: testar seleção de fotos, seleção de vídeo, envio, reprodução e retentativa.
- [ ] Testar em conexão Wi-Fi e rede móvel.
- [ ] Testar retorno da conexão após uma interrupção.
- [ ] Confirmar que o layout continua legível sem alterar a abertura, capas, fundos, avatar oficial ou identidade visual.

## Critérios para liberar a revisão

- [ ] Todos os casos aplicáveis passam em conta comum, artista e administrador.
- [ ] Visitantes veem apenas conteúdo público.
- [ ] Nenhuma conta consegue anexar mídia a publicações de outra pessoa.
- [ ] Fotos e vídeos aparecem corretamente em Android e Safari iOS.
- [ ] Retentativas não duplicam publicações nem anexos.
- [ ] Stories, chat, músicas, eventos e abertura continuam funcionando.
- [ ] A revisão do código e o CI permanecem aprovados.

## Registro do resultado

Anotar somente: dispositivo/navegador, tipo de conta usado (sem e-mail), caso testado, resultado e mensagem de erro sem dados privados.

**Regra de liberação:** este roteiro não autoriza merge ou deploy. A revisão só deve sair de draft após os testes reais, revisão final e autorização expressa do proprietário.
