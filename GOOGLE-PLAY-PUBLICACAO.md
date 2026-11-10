# Publicação do Capital do Trem na Google Play

Atualizado em 10/11/2026. Este documento separa o que já existe no repositório do que ainda precisa ser comprovado antes do lançamento.

## Situação técnica verificada no repositório

- Identificador configurado no Capacitor: `com.capitaldotrem.app`.
- Nome nativo: `Capital do Trem`.
- Empacotamento web: Capacitor 8, com `www/` gerado por `npm run build:web`.
- A documentação atual informa que as pastas nativas Android/iOS são geradas no ambiente de desenvolvimento; não há projeto Android Gradle versionado na raiz neste momento.
- A política de privacidade já está publicada no projeto em `privacidade.html`: https://paixaobruno013-web.github.io/capital-do-trem/privacidade.html
- O ícone web atual é `marca.svg`. Isso não substitui os ícones PNG e os recursos gráficos exigidos para a ficha da loja e para o pacote Android.
- O site público é https://paixaobruno013-web.github.io/capital-do-trem/

## Bloqueios antes de enviar à Play Store

- [ ] Gerar o projeto Android nativo e confirmar que compila em ambiente limpo.
- [ ] Configurar `targetSdk` 36 ou superior para novo app enviado depois de 31/08/2026.
- [ ] Definir `versionCode` e `versionName` de lançamento.
- [ ] Criar e guardar com segurança a chave de assinatura de produção; gerar um Android App Bundle (.aab) assinado. Não publicar APK debug.
- [ ] Instalar o pacote de lançamento em aparelhos reais e testar login, cadastro, navegação, áudio, reprodução com tela bloqueada (se suportada), upload autorizado, chat, eventos, localização, links externos, offline e atualização.
- [ ] Conferir no Supabase as políticas RLS e as permissões de Storage. A restrição na interface não substitui a proteção no servidor.
- [ ] Validar a política de privacidade contra o comportamento real do app nativo e os SDKs incluídos.
- [ ] Preencher a seção Segurança dos dados com informações verdadeiras sobre coleta, compartilhamento, retenção e exclusão. Não marcar respostas por suposição.
- [ ] Declarar anúncios, público-alvo, classificação indicativa, permissões e instruções de acesso para os revisores.
- [ ] Criar ícone de loja 512×512, imagem de destaque 1024×500 e capturas de tela reais do app em execução.
- [ ] Fazer teste interno e, se a conta for pessoal criada após 13/11/2023, teste fechado com pelo menos 12 participantes inscritos continuamente por 14 dias antes de solicitar acesso à produção.
- [ ] Enviar para análise e só então iniciar a distribuição pública.

## Texto inicial para a ficha da loja

### Nome
Capital do Trem

### Descrição curta
Música, artistas, eventos e comunidade em um só lugar.

### Descrição completa
O Capital do Trem conecta música, cultura e comunidade.

Descubra artistas, acompanhe lançamentos, explore divulgações e fique por dentro de eventos e ações da comunidade. Participe do espaço de conversa, conheça novidades e encontre conteúdos ligados à cultura musical da nossa quebrada.

O Capital do Trem é um projeto em evolução. Algumas funções podem depender de conexão com a internet, cadastro e aprovação da equipe.

### Categoria sugerida
Entretenimento ou Música e áudio. Confirmar a categoria que melhor representa a versão final antes de enviar.

## Dados que só o responsável pela conta pode confirmar

- Tipo e data de criação da conta Play Console (pessoal ou organização).
- Dados legais e de contato do desenvolvedor.
- Se o app exibe anúncios.
- Faixa etária pretendida e conteúdo que será disponibilizado.
- Lista de testadores e e-mails autorizados.
- Credenciais de demonstração para a equipe de análise, se houver áreas protegidas por login.

## Regras oficiais consultadas

- Requisito de API: novos apps e atualizações enviados desde 31/08/2026 devem mirar Android 16 / API 36 ou superior: https://support.google.com/googleplay/android-developer/answer/11926878
- Testes para contas pessoais criadas após 13/11/2023: pelo menos 12 testadores por 14 dias consecutivos antes do pedido de acesso à produção: https://support.google.com/googleplay/android-developer/answer/14151465
- Preparação para revisão, política de privacidade, anúncios, acesso dos revisores e classificação: https://support.google.com/googleplay/android-developer/answer/9859455
- Segurança dos dados: https://support.google.com/googleplay/android-developer/answer/10787469

**Importante:** este checklist e o texto de loja são preparação. Eles não significam que o AAB foi gerado, que a conta Play Console foi configurada ou que o app foi aprovado/publicado.
