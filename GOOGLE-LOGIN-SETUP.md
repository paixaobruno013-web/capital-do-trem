# Ativar o acesso com Google — Capital do Trem

O botão **Continuar com Google** e a chamada OAuth já estão no código do site. Para o botão autenticar de verdade, o provedor Google ainda precisa ser ativado no Supabase com credenciais criadas pelo proprietário.

## 1. Criar o cliente OAuth no Google

1. Abra o [Google Cloud Console](https://console.cloud.google.com/).
2. Entre com a conta Google que será usada como proprietária do Capital do Trem.
3. Crie ou selecione um projeto.
4. Abra Google Auth Platform / APIs e serviços e configure a tela de consentimento OAuth. Se o app ficar em modo de teste, adicione o e-mail proprietário como usuário de teste.
5. Crie um OAuth Client ID do tipo **Web application**.
6. Em **Authorized JavaScript origins**, adicione:
   `https://paixaobruno013-web.github.io`
7. Em **Authorized redirect URIs**, adicione:
   `https://zmjxkfjzrbbxyvgkwirv.supabase.co/auth/v1/callback`
8. Crie o cliente e mantenha o Client ID e o Client Secret em local seguro. Não os publique no GitHub nem os envie em mensagens.

## 2. Ativar Google no Supabase

1. Abra o [Supabase Dashboard](https://supabase.com/dashboard/project/zmjxkfjzrbbxyvgkwirv/auth/providers).
2. Entre em **Authentication → Sign In / Providers → Google**.
3. Ative o provedor Google.
4. Cole o Client ID e o Client Secret gerados no Google Cloud.
5. Salve.

## 3. Autorizar o retorno ao site

No Supabase, abra **Authentication → URL Configuration** e confira:

- **Site URL:** `https://paixaobruno013-web.github.io/capital-do-trem/`
- Em **Redirect URLs**, inclua exatamente:
  `https://paixaobruno013-web.github.io/capital-do-trem/conta.html`

## 4. Testar

1. Abra [Minha conta no Capital do Trem](https://paixaobruno013-web.github.io/capital-do-trem/conta.html).
2. Clique em **Continuar com Google**.
3. Selecione a conta `capitaldotrem07@gmail.com`.
4. Confirme que o retorno ocorre para a página Minha conta e que a sessão aparece ativa.

A permissão de administrador continua sendo validada no banco pelo e-mail proprietário confirmado. Habilitar Google não concede administração a outras contas.

## Importante

- Nunca compartilhe senhas, códigos de recuperação ou Client Secret em conversas ou repositórios.
- O Client Secret deve ser inserido diretamente no painel do Supabase.
- A URL de callback deve ser conferida no próprio painel do provedor Google do Supabase; use o valor exibido lá caso seja diferente.
