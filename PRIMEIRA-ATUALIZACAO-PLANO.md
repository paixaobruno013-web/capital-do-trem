# Primeira atualização do CAPITAL DO TREM — plano de fechamento

Esta lista acompanha a primeira atualização pós-lançamento. Não marcar item como concluído apenas por existir código: exigir teste ponta a ponta no Android e no Safari do iPhone.

## Acesso e autenticação
- [ ] Manter login com e-mail e senha para contas já cadastradas.
- [x] Adicionar botão de acesso Google à tela de conta e ligar ao fluxo OAuth já existente.
- [ ] Validar e ativar OAuth Google no Supabase; depende de Client ID/Secret e URLs autorizadas no painel.
- [x] Implementar fluxo de envio e confirmação de código SMS para contas já cadastradas.
- [ ] Configurar provedor SMS no Supabase e testar com número real.
- [ ] Definir e configurar entrega por WhatsApp. Depende de provedor compatível, credenciais e modelo/template aprovados; não apresentar como ativo antes dessa configuração.
- [ ] Garantir fluxo de retorno ao app no Safari iOS e Android, recuperação de senha e sessão persistente.

## Perfis, seguidores e pesquisa
- [ ] Confirmar conta/perfil oficial CAPITAL DO TREM e sua identificação visual/verificação.
- [x] Adicionar listas de seguidores e de perfis seguidos ao tocar nos contadores do perfil.
- [x] Confirmar busca existente de perfis públicos por nome, @ e cidade.
- [ ] Confirmar que o perfil oficial CAPITAL DO TREM está público e aparece na busca.
- [ ] Testar seguir/deixar de seguir, contadores e auto-follow do perfil oficial.
- [ ] Respeitar perfis privados e políticas RLS: nunca revelar e-mail ou dados privados.

## Conectividade e presença
- [x] Alinhar o teste automatizado com a nova regra de alerta imediato/confirmação curta para perda de rede.
- [x] Reduzir o atraso do alerta de perda de internet: evento de rede do sistema dispara alerta imediatamente; falha de internet com Wi-Fi ainda conectado recebe confirmação curta.
- [ ] Testar perda/retorno de rede real em Android e Safari iOS, incluindo Wi-Fi conectado sem internet, troca Wi-Fi/4G, app em segundo plano e retorno ao primeiro plano.
- [ ] Validar que presença online no banco não fica marcada como ativa após desconexão/fechamento inesperado.
- [ ] Manter alertas visual/sonoro/vibração sujeitos às permissões e políticas do aparelho.

## Recursos sociais e comunicação em tempo real — prioridade da próxima etapa
- [x] Stories de usuários e do administrador já aceitam selecionar música publicada no catálogo, definir trecho/duração e volume, e armazenar os metadados para reprodução no visualizador.
- [ ] Validar no Android e Safari iOS a reprodução da música em Stories, incluindo avançar/trocar Story, silenciar, pausar e encerrar sem deixar áudio preso.
- [ ] Live dentro do aplicativo: integrar a interface de anfitrião e espectador ao backend `lives-api`, incluindo lista de transmissões ativas, iniciar/entrar/encerrar, estados de conexão e reconexão.
- [ ] Live salva no Feed: configurar e validar gravação privada via LiveKit Egress, webhook e Storage; somente depois de a gravação estar concluída e validada, criar publicação no Feed com reprodução segura. Não publicar arquivo temporário nem URL administrativa.
- [ ] Chamadas de áudio e vídeo no FALA UAI: integrar o SDK LiveKit à interface, chamadas individuais e em grupo (máximo de 4 participantes), convite recebido, aceitar/recusar, microfone/câmera, alternar câmera, viva-voz e encerrar.
- [ ] Implantar as Edge Functions `lives-api` e `calls-api` após configuração segura dos secrets do LiveKit no Supabase; nenhum segredo no app ou no GitHub.
- [ ] Configurar notificações de chamadas recebidas em segundo plano (FCM Android/APNs iOS) e validar em aparelhos reais.
- [ ] Confirmar limites e cotas do provedor LiveKit antes de ativar; não cadastrar cartão, fazer upgrade ou habilitar cobrança sem autorização expressa.
- [ ] Testar permissões, rede móvel/Wi-Fi, reconexão, privacidade, RLS, limite de participantes, falhas de gravação e fluxo completo em Android e Safari iOS.

## Envio de arquivos e retomada
- [x] Ampliar o guardião de rascunhos para FALA UAI, Rede social e Estúdio, além da página principal e do painel administrativo.
- [x] Preservar campos de texto/metadados ao retornar do seletor de arquivos quando o Android recriar a tela.
- [ ] Testar no Android a seleção de foto, vídeo, áudio e documento em cada área; confirmar que o app não reinicia e que o anexo continua selecionado.
- [ ] Se o Android encerrar o processo, re-selecionar o arquivo é necessário por segurança do sistema; os metadados do formulário devem permanecer recuperados.

## FALA UAI — chat
- [ ] Revisar envio de texto e anexos com duas contas reais e corrigir falhas de ponta a ponta.
- [ ] Fechar interface de conversa no estilo WhatsApp, mantendo identidade preta/vermelha do projeto.
- [ ] Validar grupo fixo CAPITAL DO TREM, conversas privadas e conversas por localização/amizades.
- [ ] Validar edição/exclusão de mensagens próprias, status de envio e atualização em tempo real.
- [ ] Validar visualização única somente para mídia e suas regras de expiração/consumo.
- [ ] Testar permissões, RLS, upload e retomada após troca de rede.

## Feed, Stories, Live e música
- [ ] Validar publicar foto/vídeo no Feed e salvar/guardar publicações.
- [ ] Validar Stories, câmera/galeria, marcação de usuários e compartilhamento.
- [ ] Validar início/fim de Live, gravação e acesso conforme permissões; testar em aparelhos reais.
- [x] Player flutuante permanece montado no documento principal durante a navegação entre áreas e publica comandos Media Session quando suportados pelo navegador.
- [ ] Validar reprodução ao alternar entre Perfil, FALA UAI e Pesquisas em Android e Safari iOS.
- [ ] Implementar e validar serviço nativo Android de reprodução em segundo plano com notificação/controles de mídia; a implementação web atual, isoladamente, não garante áudio quando o Android suspende/encerra o WebView.
- [ ] Validar reprodução fora do app e controles de tela bloqueada no Android e Safari iOS.
- [ ] Validar catálogo de músicas, upload, edição/exclusão autorizada, playlists e player persistente em segundo plano.
- [ ] Preservar layout de músicas aprovado e corrigir apresentação de arquivos.

## Identidade e iOS
- [ ] Aplicar exatamente a logo fornecida pelo proprietário, sem editar o desenho; apenas encaixe no canvas do ícone com cantos arredondados, sem cortar a arte.
- [ ] Aplicar ícone Apple Touch/PWA e ícones Android coerentes com a mesma marca.
- [ ] Confirmar ícone Instagram com gradiente oficial rosa/roxo/laranja/amarelo.
- [x] Teste do aplicativo atual no Safari do iPhone informado pelo usuário como concluído com funcionamento correto.
- [ ] Fazer regressão da NOVA atualização no Safari iOS após integrar os ajustes: manifest, service worker, adicionar à Tela de Início, safe areas, mídia, login e cache.
- [ ] Testar atualização do PWA e limpar cache antigo sem perder dados/sessão.

## Critério de conclusão
- [ ] Testes automatizados e testes manuais em Android e Safari iOS.
- [ ] Confirmar migrations incrementais no Supabase antes de pedir qualquer execução manual; nunca reaplicar schema completo no projeto de produção.
- [ ] Gerar novo APK assinado somente depois da aprovação dos testes Android.
- [x] Aprovação do usuário para o funcionamento da versão atual no Safari iOS.
- [ ] Publicar a atualização web/PWA somente depois dos testes de regressão desta nova versão.
- [ ] Não publicar chaves privadas, senhas, service_role ou credenciais de provedores no repositório.



## Nova interface da área Músicas — atualização ampliada de 24/11

Referência visual enviada pelo usuário: catálogo escuro em tela cheia, semelhante à organização da imagem anexada, mas mantendo integralmente a identidade CAPITAL DO TREM (preto, vermelho e branco). A referência orienta a disposição e a densidade da lista, não a cópia da marca ou das cores do aplicativo mostrado.

- [ ] Aplicar fundo escuro com degradê discreto preto → vermelho profundo → preto, usando branco para textos principais e vermelho para realces, bordas e estados ativos. Evitar azul/verde da referência.
- [ ] Cada faixa deve aparecer em um cartão/linha de catálogo com capa quadrada própria (arte do arquivo ou capa padrão da marca quando não houver arte).
- [ ] Exibir em destaque o nome da música e, logo abaixo, o nome do artista; truncar textos longos sem ocultar a informação completa nos detalhes.
- [ ] Manter controles de reprodução e adicionar à playlist acessíveis em cada faixa, com estados visuais claros.
- [ ] Exibir menu de três pontos por faixa. Para quem tiver permissão de proprietário/admin: editar artista, título e capa; excluir com confirmação explícita. Para ouvintes comuns: não mostrar ações administrativas.
- [ ] Respeitar permissões existentes no banco e no Storage; validar autorização no servidor/RLS, não apenas esconder botões na interface.
- [ ] Não substituir nem alterar os arquivos de áudio ao editar metadados/capa; exclusão deve remover o registro e tratar o arquivo conforme política segura, com confirmação e tratamento de falhas.
- [ ] Preservar player persistente, playlists, busca e envio já existentes; não reiniciar a página ao selecionar arquivo e não perder metadados do formulário.
- [ ] Garantir layout responsivo Android/iPhone Safari, acessibilidade, contraste, alvos de toque e carregamento de capas com fallback.
- [ ] Testar com faixas sem capa, nomes extensos, upload interrompido, rede instável, usuário comum, artista e administrador; testar editar/excluir e reprodução durante navegação entre abas.
- [ ] Só marcar como concluído após validação visual e funcional em aparelhos reais. A especificação e os testes estáticos, isoladamente, não comprovam que a interface foi entregue.



### Reprodutor minimizável — requisito obrigatório da área Músicas

- [ ] Manter o reprodutor fixo e acessível enquanto o usuário navega entre Músicas, Perfil, Feed, Pesquisas e FALA UAI.
- [ ] Incluir controle visível para minimizar e restaurar o reprodutor, sem interromper a faixa em execução.
- [ ] No modo minimizado, exibir uma barra compacta com capa pequena, título/artista e controles essenciais de reproduzir/pausar e restaurar.
- [ ] Preservar posição de reprodução, faixa atual e estado de pausa ao alternar entre os modos.
- [ ] Garantir que a área compacta respeite a navegação inferior, áreas seguras do Android/iPhone e não cubra botões ou campos.
- [ ] Validar minimização/restauração durante navegação e após retorno do app; não afirmar reprodução em segundo plano fora do app sem serviço nativo Android e teste real em iOS Safari.



### Preservar a capa oficial no topo da área Músicas

- [ ] Manter a capa/banner oficial já existente no topo da área Músicas, antes do título e do catálogo; não remover, substituir pela lista de faixas, nem deslocar para baixo.
- [ ] Preservar a arte original dos alto-falantes e o texto “AQUI A MÚSICA NÃO PARA!”, com enquadramento integral sem cortes, em formato horizontal e altura compacta.
- [ ] Manter o gerenciamento da capa pelo administrador, sem alterar a identidade visual preto, vermelho e branco.
- [ ] A nova interface de catálogo com capas individuais, nomes de artista/faixa e menu de três pontos deve começar abaixo desse banner.


## Ajustes efetivamente aplicados nesta rodada — 24/11

- [x] FALA UAI: mensagens próprias agora recebem classe visual separada, ficam alinhadas à direita e usam balão em degradê preto/vermelho; mensagens recebidas permanecem à esquerda. O recurso de editar/excluir mensagens próprias já existia no código e foi preservado.
- [x] Atualizações: o aviso do Service Worker agora anuncia "🚂 TEM ATUALIZAÇÃO NOVA NO TREM!" e o botão usa "🚂 ATUALIZAR AGORA". A atualização só é aplicada após ação do usuário e continua protegendo formulários com alterações não salvas.
- [ ] Ícone oficial: a arte enviada pelo proprietário ainda precisa ser incorporada como arquivo binário de origem do pipeline de ícones e validada no APK/PWA. Não marcar como concluído até conferir o arquivo gerado e a instalação real.
- [ ] Ícone do Instagram: identificar o ponto exato da interface em que o ícone deve aparecer e aplicar o símbolo oficial com gradiente; não confundir com o ícone geral do aplicativo.
- [ ] FALA UAI: a melhoria visual acima não substitui os testes de duas contas, mensagens privadas, chamadas de áudio/vídeo, notificações e integrações de backend descritos neste plano.
