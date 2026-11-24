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
