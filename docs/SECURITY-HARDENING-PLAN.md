# Plano de segurança — Capital do Trem

## Objetivo
Reduzir a superfície de ataque e impedir que a interface seja tratada como mecanismo de autorização. A autorização efetiva deve ser aplicada no PostgreSQL/RLS, no Supabase Storage e em serviços confiáveis.

## Controles já presentes no código-fonte (ainda exigem validação no projeto Supabase ativo)
- RLS habilitado nas tabelas principais, inclusive conversas e mensagens privadas.
- Políticas de mensagens privadas limitadas aos participantes de conversas aceitas e respeitando bloqueios.
- Bucket de áudio configurado como privado, com limite de tamanho e MIME types.
- Upload de áudio vinculado à pasta do UUID do usuário e à condição de artista/admin.
- Funções administrativas isoladas no schema `private`; bootstrap exige e-mail proprietário confirmado.
- Cliente web usa chave publicável Supabase. Chave `service_role` nunca deve ser distribuída no APK, PWA ou JavaScript.

## Verificações automatizadas
O script `scripts/check-security-baseline.mjs` valida invariantes críticas no schema, no cliente web gerado e no configurador Android. O workflow `security-baseline.yml` executa a verificação em cada push/PR para `main`.

Essas verificações são estáticas: não provam que as migrations foram aplicadas no banco de produção nem substituem testes com duas contas reais.

## Pendências obrigatórias antes da liberação pública
1. Validar o estado real do Supabase: migrations aplicadas, RLS efetivo, grants, políticas duplicadas/permissivas, buckets e limites.
2. Executar testes negativos com duas contas: usuário A não pode ler/alterar/excluir dados privados de B; usuário comum não pode promover conta, publicar música sem permissão ou administrar conteúdo.
3. Confirmar que segredos privilegiados não existem no bundle, APK, logs, repositório ou artefatos de CI. Rotacionar imediatamente qualquer segredo exposto.
4. Adicionar limites de requisição/anti-abuso e monitoramento no backend, além de proteção contra spam, brute force e enumeração de contas conforme recursos disponíveis.
5. Revisar cabeçalhos HTTP/CSP, dependências, permissões Android/iOS, deep links e navegação externa.
6. Testar uploads com arquivos inválidos, MIME adulterado, nomes maliciosos, arquivos grandes e tentativas de acessar caminhos de terceiros.
7. Revisar e assinar a versão Android de produção; nunca distribuir APK de produção sem assinatura verificável.
8. Testar recuperação de senha, expiração/renovação de sessão, logout e troca de dispositivo.
9. Para mídia de visualização única no chat, aplicar autorização/expiração no servidor e storage; ocultar o item na interface não é proteção suficiente.

## Limites e transparência
Nenhum aplicativo pode ser prometido como invulnerável. A pasta `capital-do-trem-media` contém imagens/vídeos destinados a exibição pública e está configurada como pública no schema; não guardar ali anexos privados do chat. O bucket de áudio é privado. Mídias privadas do chat devem usar bucket privado próprio e políticas específicas.

A auditoria CI é uma barreira contra regressões, não um selo de segurança nem um pentest. A validação de produção depende do acesso ao projeto Supabase e de testes em dispositivos reais.
