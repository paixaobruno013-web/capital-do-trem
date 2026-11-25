# Validação de acesso — Capital do Trem

Este documento registra os bloqueios reais observados em 24/11/2026 e a sequência segura para liberar os três métodos de autenticação. Não contém credenciais.

## Evidências observadas

- E-mail/senha: o endpoint `/auth/v1/token?grant_type=password` respondeu HTTP 400 com `invalid_credentials`. Esse código não permite distinguir senha incorreta, conta não confirmada ou outro estado da conta. Não redefinir senha nem excluir/recriar usuário automaticamente.
- Google: `/auth/v1/authorize?provider=google` respondeu HTTP 400 com `validation_failed`; a validação do projeto indicou que o provedor Google não está habilitado.
- SMS: `/auth/v1/otp` respondeu HTTP 422 com `otp_disabled`; o fluxo de telefone está desabilitado no Supabase.
- Cadastro: `/auth/v1/signup` respondeu HTTP 200. Isso confirma que a solicitação foi aceita, não que a conta esteja confirmada e pronta para login.
- As solicitações originadas do Android WebView usaram `https://localhost/conta.html` como redirect. Esse retorno não deve ser simplesmente substituído por uma URL HTTPS pública para OAuth nativo: o APK precisa de fluxo de retorno/deep link validado para preservar a sessão no WebView.

## Sequência de liberação

### 1. E-mail e senha — contas existentes

1. No Supabase Dashboard, abrir Authentication → Users e verificar o estado da conta pelo e-mail informado pelo próprio titular. Não exportar nem divulgar a lista.
2. Se a conta estiver pendente de confirmação, reenviar a confirmação pelo fluxo suportado. Não marcar contas como confirmadas sem validação do titular.
3. Se estiver confirmada, testar o login com o titular digitando a senha no aplicativo. Se não lembrar a senha, usar “Esqueci a senha”; não solicitar que envie a senha a terceiros.
4. Confirmar que o link de confirmação/recuperação abre uma rota HTTPS permitida e retorna à tela correta.
5. Repetir em Android APK e Safari/PWA.

### 2. Google OAuth

1. Criar/selecionar um OAuth Client ID do tipo adequado no Google Cloud Console.
2. Em Google Cloud, cadastrar como redirect URI autorizado o callback do projeto Supabase: `https://zmjxkfjzrbbxyvgkwirv.supabase.co/auth/v1/callback`.
3. No Supabase Dashboard → Authentication → Sign In / Providers → Google, habilitar o provedor e inserir Client ID e Client Secret diretamente no painel. Nunca colocar o Client Secret no repositório, APK, HTML ou JavaScript.
4. Em Authentication → URL Configuration, incluir a URL pública PWA `https://paixaobruno013-web.github.io/capital-do-trem/conta.html` entre os Redirect URLs permitidos.
5. Antes de declarar Google pronto no APK, implementar e testar retorno OAuth nativo/deep link para o app. O redirect `https://localhost/conta.html` observado nos logs não é prova de um fluxo OAuth nativo funcional.
6. Testar nova conta Google e conta existente, incluindo cancelamento e retorno do navegador.

### 3. Telefone por SMS

1. Escolher e contratar/configurar um provedor SMS compatível com Supabase Auth (por exemplo, Twilio), respeitando custos e regras de envio no Brasil.
2. No Supabase Dashboard → Authentication → Sign In / Providers → Phone, habilitar Phone e configurar o provedor/credenciais diretamente no painel.
3. Definir limites de envio, validade do código e proteção contra abuso.
4. Manter `shouldCreateUser: false` no fluxo de login: o SMS não deve criar uma conta inesperadamente.
5. Testar envio e verificação com número brasileiro real, com consentimento do titular.

## Critérios de aceite

- Conta existente confirmada consegue entrar por e-mail/senha em dois Androids.
- Recuperação de senha funciona sem expor senha a terceiros.
- Google OAuth habilitado e testado em PWA e APK, com retorno de sessão confirmado em cada plataforma.
- SMS envia e valida código em número real; telefone não cria conta automaticamente.
- Nenhum usuário, perfil, mensagem, música ou dado é removido durante a correção.
- Segredos permanecem apenas nos painéis dos provedores/Supabase; nunca em GitHub ou no cliente.

## Limites desta etapa

Os registros de log não expõem a causa específica de `invalid_credentials`. A configuração do provedor Google, a criação do OAuth Client Secret e a contratação/configuração de SMS exigem acesso aos painéis externos e credenciais que não estão disponíveis por meio das ferramentas de repositório/banco usadas nesta revisão. Não simular sucesso nem alterar contas para contornar esses bloqueios.
