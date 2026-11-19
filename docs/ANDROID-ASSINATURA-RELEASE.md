# Preparar a assinatura do APK Android

O workflow `.github/workflows/android-signed-release.yml` gera um APK de distribuição direta, mas exige uma chave de assinatura permanente. **Não use a chave de depuração do APK de teste.**

## 1. Gerar a chave uma única vez

Em um computador com Java (JDK) instalado, abra o terminal na pasta em que deseja guardar a chave e execute:

```bash
keytool -genkeypair -v \
  -keystore capital-do-trem-release.jks \
  -alias capital-do-trem \
  -keyalg RSA -keysize 4096 -validity 10000
```

Escolha senhas fortes. Guarde o arquivo `capital-do-trem-release.jks`, a senha do keystore, o alias e a senha da chave em local seguro. **Faça uma cópia de segurança offline.** Perder essa chave pode impedir atualizações do mesmo aplicativo com a mesma identidade de assinatura.

## 2. Converter o arquivo para Base64

No Linux/macOS:

```bash
base64 -w 0 capital-do-trem-release.jks > capital-do-trem-release.base64.txt
```

No macOS, se `-w 0` não for aceito:

```bash
base64 capital-do-trem-release.jks | tr -d '\\n' > capital-do-trem-release.base64.txt
```

No Windows PowerShell:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("capital-do-trem-release.jks")) | Set-Content -NoNewline capital-do-trem-release.base64.txt
```

## 3. Cadastrar os quatro segredos no GitHub

No repositório, abra **Settings → Secrets and variables → Actions → New repository secret** e crie estes quatro segredos, com os nomes exatos:

| Nome do secret | Valor |
|---|---|
| `ANDROID_APP_SIGNING_KEYSTORE_BASE64` | Conteúdo completo do arquivo `capital-do-trem-release.base64.txt` |
| `ANDROID_APP_SIGNING_STORE_PASSWORD` | Senha do keystore |
| `ANDROID_APP_SIGNING_KEY_ALIAS` | `capital-do-trem` (ou o alias escolhido) |
| `ANDROID_APP_SIGNING_KEY_PASSWORD` | Senha da chave |

Não coloque o arquivo JKS, Base64 ou senhas no repositório, em issues, prints ou mensagens. Nunca use `service_role` do Supabase para essa finalidade.

## 4. Gerar a versão assinada

Depois que os quatro secrets estiverem cadastrados, abra **Actions → Publicar CAPITAL DO TREM — APK Android direto → Run workflow** e informe a versão (por exemplo, `1.0.0`).

O workflow valida a chave, compila o APK Release, verifica a assinatura com `apksigner` e publica o APK e o SHA-256 em uma GitHub Release.

## Importante

- O APK `debug` é apenas para testes e usa uma assinatura de depuração.
- O APK definitivo só pode ser declarado pronto depois que o workflow assinado concluir com sucesso e o arquivo for instalado e validado em um Android real.
- Preserve a mesma chave para todas as atualizações futuras. Não gere outra chave a cada versão.
