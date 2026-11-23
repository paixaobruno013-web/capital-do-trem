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
- [ ] Validar catálogo de músicas, upload, edição/exclusão autorizada, playlists e player persistente em segundo plano.
- [ ] Preservar layout de músicas aprovado e corrigir apresentação de arquivos.

## Identidade e iOS
- [ ] Aplicar exatamente a logo fornecida pelo proprietário, sem editar o desenho; apenas encaixe no canvas do ícone com cantos arredondados, sem cortar a arte.
- [ ] Aplicar ícone Apple Touch/PWA e ícones Android coerentes com a mesma marca.
- [ ] Confirmar ícone Instagram com gradiente oficial rosa/roxo/laranja/amarelo.
- [ ] Testar GitHub Pages/PWA no Safari iOS: manifest, service worker, adicionar à Tela de Início, safe areas, mídia, login e cache.
- [ ] Testar atualização do PWA e limpar cache antigo sem perder dados/sessão.

## Critério de conclusão
- [ ] Testes automatizados e testes manuais em Android e Safari iOS.
- [ ] Confirmar migrations incrementais no Supabase antes de pedir qualquer execução manual; nunca reaplicar schema completo no projeto de produção.
- [ ] Gerar novo APK assinado somente depois da aprovação dos testes Android.
- [ ] Publicar a versão web/PWA somente depois da aprovação dos testes Safari iOS.
- [ ] Não publicar chaves privadas, senhas, service_role ou credenciais de provedores no repositório.
