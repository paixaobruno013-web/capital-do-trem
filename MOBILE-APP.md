# Capital do Trem — preparação Android e iOS

O projeto agora tem uma base Capacitor para empacotar a aplicação web em aplicativos nativos Android e iOS.

## Identificação

- Nome: Capital do Trem
- ID do aplicativo: `com.capitaldotrem.app`
- Cor de fundo nativa: preto (#000000)
- Tecnologia: Capacitor 8

## Preparar em um computador

É necessário Node.js 22 ou superior e npm.

```bash
npm install
npm run build:web
```

O comando `build:web` copia as páginas e os recursos necessários para a pasta `www/`, que será usada pelo Capacitor.

## Android

Requisitos: Android Studio e Android SDK instalados.

```bash
npm run cap:add:android
npm run android
```

No Android Studio, configurar a assinatura de lançamento, testar em aparelhos reais e gerar o Android App Bundle (AAB) para a Google Play.

## iOS

Requisitos: computador Mac com Xcode instalado.

```bash
npm run cap:add:ios
npm run ios
```

No Xcode, configurar assinatura, identificador, ícones, permissões e testar em iPhone. A publicação exige uma conta Apple Developer e aprovação da App Store.

## Antes de publicar

- Criar e validar ícones nativos em todos os tamanhos exigidos.
- Revisar permissões de localização, fotos, arquivos e notificações conforme as funções realmente ativadas.
- Testar áudio, reprodução em segundo plano, links externos, navegação e formulários em aparelhos Android e iPhone.
- Conectar e testar o Supabase: cadastro, login, perfis, banco, armazenamento e regras de segurança.
- Atualizar a política de privacidade para descrever a versão nativa e os dados efetivamente coletados.
- Preparar capturas de tela, descrição, classificação etária e materiais das lojas.
- Fazer testes internos e corrigir falhas antes de solicitar publicação.

## Situação atual

Esta é a estrutura de empacotamento, não um aplicativo pronto ou publicado. As pastas nativas `android/` e `ios/` são geradas com os comandos acima em um ambiente de desenvolvimento. A compilação Android requer Android Studio; a compilação e assinatura iOS requerem macOS e Xcode.

O site atual ainda depende da configuração do Supabase para oferecer contas e conteúdo compartilhado de verdade. O pacote nativo não substitui essa etapa.
