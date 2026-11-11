# Publicação do Capital do Trem na Google Play

# Modelo de distribuição definido: gratuito e sem investimento

A decisão do projeto é manter o Capital do Trem gratuito para baixar e usar, sem mensalidade, assinatura ou compras dentro do aplicativo. Não contratar serviços pagos nem iniciar etapas que exijam pagamento sem autorização expressa do responsável.

**Plano imediato sem custo de cadastro em loja:** manter a versão web/PWA publicada no GitHub Pages e orientar os usuários Android a abrir o site no Chrome e usar o menu **⋮ → Adicionar à tela inicial** (ou **Instalar aplicativo**, quando essa opção aparecer). Isso cria um atalho instalável, mas não é um APK/AAB distribuído pela Play Store.

**Google Play:** fica como etapa futura, pausada enquanto a decisão for não gastar. A conta de desenvolvedor exige taxa única de cadastro (US$ 25, conforme a regra consultada); portanto, não é uma opção de custo zero. Não há cobrança por download de um app gratuito, mas o cadastro inicial continua sendo pago.

**Regra de produto:** não adicionar paywall, assinatura, plano premium ou cobrança para ouvir, curtir, comentar, baixar músicas, conversar ou acessar eventos. Qualquer futura fonte de apoio/patrocínio deverá ser opcional e não bloquear as funções comunitárias.

---

Atualizado em 11/11/2026. Este documento separa o que já existe no repositório do que ainda precisa ser comprovado antes do lançamento.

## Atualização técnica — 11/11/2026

As compilações de CI no commit `0e884e3c` foram concluídas com sucesso:
- [x] APK Android de depuração gerado como artefato de teste (não é pacote de publicação).
- [x] Compilação iOS para simulador concluída.
- [x] Compilação iOS para dispositivo concluída sem assinatura.
- [x] Site/PWA publicado.
- [x] Verificações automáticas do código concluídas.

**Ainda não há publicação nas lojas.** O APK atual é debug; o build iOS de dispositivo é unsigned. Nenhum deles deve ser enviado à Play Console ou ao App Store Connect.

Foi adicionado o workflow `.github/workflows/store-package-validation.yml`. Na execução `42955993898`, em 11/11/2026, os dois jobs terminaram com sucesso: o Android gerou e conferiu `capital-do-trem-android-aab-unsigned` (AAB de validação, 3,05 MB), e o iOS gerou `capital-do-trem-ios-archive-unsigned` (archive técnico, 3,99 MB). Os artefatos ficam disponíveis no GitHub Actions por 14 dias. Ambos continuam sem assinatura de distribuição; não substituem credenciais de desenvolvedor, testes em aparelhos reais ou revisão das lojas. O workflow também foi ampliado para disparar automaticamente quando arquivos HTML, JavaScript, CSS, JSON, imagens e demais recursos do app mudarem.

## Revisão de mensagens e anexos — 11/11/2026

- [x] Anexos novos do grupo e das conversas privadas migrados para bucket privado `capital-do-trem-chat`.
- [x] Regras de Storage verificam membro ativo do grupo ou participante de conversa aceita; bloqueios impedem a leitura de anexos privados.
- [x] Links de acesso são temporários (15 minutos); o aplicativo continua exibindo a mensagem mesmo se a assinatura do anexo falhar.
- [x] Interface de anexos no estilo mensageiro: galeria, câmera, áudio, documentos, prévia, remoção e estado de envio.
- [x] Formatos compatíveis incluem imagens, MP4/WebM/MOV, áudio e documentos PDF/Office; limite de 20 MB por arquivo e 12 MB para imagens.
- [x] Fluxo de exclusão de conta atualizado para localizar e remover arquivos de grupo e de conversas privadas; Edge Function `delete-account` implantada na versão 2, com JWT obrigatório.
- [x] Cinco índices de chaves estrangeiras adicionados após revisão do Performance Advisor.
- [x] A abertura impede a exibição da marca antiga enquanto a arte oficial carrega; o vídeo usa poster de alta prioridade e a duração fica fixa em 10 segundos, com trem de 9,8 segundos, mesmo quando o vídeo demora.
- [ ] Testar envio e leitura com duas contas reais, incluindo bloqueio, saída do grupo e exclusão de uma conta de teste.
- [ ] Testar seleção de arquivos em Android real e iPhone real; a compilação nativa em CI não substitui esses testes.

## Situação técnica verificada no repositório

- Identificador configurado no Capacitor: `com.capitaldotrem.app`.
- Nome nativo: `Capital do Trem`.
- Empacotamento web: Capacitor 8, com `www/` gerado por `npm run build:web`.
- A documentação atual informa que as pastas nativas Android/iOS são geradas no ambiente de desenvolvimento; não há projeto Android Gradle versionado na raiz neste momento.
- A política de privacidade já está publicada no projeto em `privacidade.html`: https://paixaobruno013-web.github.io/capital-do-trem/privacidade.html
- O ícone web atual é `marca.svg`. Isso não substitui os ícones PNG e os recursos gráficos exigidos para a ficha da loja e para o pacote Android.
- O site público é https://paixaobruno013-web.github.io/capital-do-trem/

## Distribuição gratuita para iPhone (sem App Store)

Enquanto o projeto não tiver orçamento para a assinatura Apple Developer, a opção gratuita é distribuir a versão web instalável (PWA) pelo link público:

https://paixaobruno013-web.github.io/capital-do-trem/

No iPhone, a pessoa deve:
1. Abrir o link no Safari.
2. Tocar em Compartilhar.
3. Escolher **Adicionar à Tela de Início**.
4. Se aparecer a opção, ativar **Abrir como App da Web** e tocar em Adicionar.

O ícone fica na tela inicial e abre o site em uma janela própria. A instalação é feita em cada iPhone pelo próprio usuário; compartilhar o link não instala automaticamente o app.

**Limites importantes:** isso não coloca o Capital do Trem na App Store e não gera um IPA nativo. Algumas funções de um app nativo podem ter diferenças no navegador/PWA e precisam ser testadas em iPhone real.

## App Store e TestFlight (etapa futura, paga)

A distribuição de um app nativo pela App Store ou pelo TestFlight exige participação no Apple Developer Program, atualmente US$ 99 por ano (ou valor local exibido pela Apple). Uma conta Apple gratuita permite estudar e testar em dispositivos próprios com Xcode, mas não substitui a associação paga para distribuição pública/TestFlight.

Fontes oficiais:
- Apple Developer Program e valores: https://developer.apple.com/programs/
- Adicionar um site à tela inicial do iPhone: https://support.apple.com/en-mide/guide/iphone/iph42ab2f3a7/27/ios/27

## Bloqueios antes de enviar à Play Store

- [x] Gerar o projeto Android nativo e confirmar compilação limpa em CI (a validação em aparelho real ainda está pendente).
- [x] Confirmar no workflow que `targetSdk` é 36 ou superior; a etapa de conferência passou na execução `42955993898`.
- [ ] Definir `versionCode` e `versionName` de lançamento.
- [ ] Criar e guardar com segurança a chave de assinatura de produção; gerar um Android App Bundle (.aab) assinado. Não publicar APK debug.
- [ ] Instalar o pacote de lançamento assinado em aparelhos reais e testar login, cadastro, navegação, áudio, reprodução com tela bloqueada (se suportada), upload autorizado, chat, eventos, localização, links externos, offline e atualização.
- [ ] Conferir no Supabase as políticas RLS e as permissões de Storage. A restrição na interface não substitui a proteção no servidor.
- [ ] Validar a política de privacidade contra o comportamento real do app nativo e os SDKs incluídos.
- [x] Implementar fluxo autenticado de exclusão de conta dentro de Minha conta e página pública de instruções: https://paixaobruno013-web.github.io/capital-do-trem/account-deletion.html (a validação real com conta de teste ainda é necessária antes do envio).
- [ ] Preencher a seção Segurança dos dados com informações verdadeiras sobre coleta, compartilhamento, retenção e exclusão. Não marcar respostas por suposição.
- [ ] Declarar anúncios, público-alvo, classificação indicativa, permissões e instruções de acesso para os revisores.
- [ ] Criar ícone de loja 512×512, imagem de destaque 1024×500 e capturas de tela reais do app em execução.
- [ ] Fazer teste interno e, se a conta for pessoal criada após 13/11/2023, teste fechado com pelo menos 12 participantes inscritos continuamente por 14 dias antes de solicitar acesso à produção.
- [ ] Enviar para análise e só então iniciar a distribuição pública.

## Bloqueios antes de enviar à App Store

- [ ] Confirmar inscrição ativa no Apple Developer Program e acesso ao App Store Connect.
- [ ] Configurar certificado de distribuição, perfil de provisionamento e assinatura do archive/IPA.
- [ ] Criar o registro do app no App Store Connect com o Bundle ID `com.capitaldotrem.app`.
- [ ] Fazer testes em iPhone real, inclusive câmera, microfone, fotos, localização, notificações, áudio, login, exclusão de conta e retorno de apps externos.
- [ ] Revisar a experiência nativa para que o app ofereça utilidade e recursos próprios além de um site reempacotado; a diretriz 4.2 da Apple é um ponto de atenção para apps baseados em WebView.
- [ ] Conferir a política de privacidade e preencher as declarações App Privacy com os dados coletados pelo app e por todos os SDKs/serviços integrados.
- [ ] Disponibilizar acesso de demonstração à equipe de revisão, se houver áreas protegidas por login.
- [ ] Preparar capturas de tela reais, descrição, categoria, classificação etária e notas de revisão.
- [ ] Enviar para TestFlight, testar e depois submeter à revisão da App Store.

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

**Importante:** o AAB e o archive técnico de validação foram gerados, mas estão sem assinatura de distribuição. Este checklist não significa que as contas de desenvolvedor foram configuradas, que os pacotes assinados foram enviados ou que os apps foram aprovados/publicados.
