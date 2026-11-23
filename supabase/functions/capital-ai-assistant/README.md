# Assistente IA do Capital do Trem

## Como ativar (administrador)

A integração fica desligada até a função ser publicada e a chave do provedor ser configurada no servidor. **Nunca coloque a chave no JavaScript, no APK, no GitHub público ou nesta conversa.**

1. Configure `OPENAI_API_KEY` como secret do projeto Supabase.
2. Publique a função `capital-ai-assistant` com o Supabase CLI.
3. Se o app usar um domínio diferente, configure `AI_ALLOWED_ORIGINS` com uma lista separada por vírgulas dos domínios autorizados.
4. Teste com uma conta comum e confirme que não é possível chamar a função sem sessão válida.

## Privacidade e custos

- A análise da foto só é iniciada depois do toque explícito no botão da câmera.
- A imagem é redimensionada no aparelho e enviada diretamente à função; não é gravada em tabela ou Storage pelo app.
- A função usa a API Responses com `store: false` e devolve apenas texto.
- A chave permanece no ambiente da função, nunca no cliente.
- O uso da API é cobrado por consumo e separado de qualquer assinatura do ChatGPT. Defina orçamento e alertas no provedor antes de ativar.

## Limites

A função exige JWT válido, aceita apenas os modos `assistant`, `caption` e `describe`, restringe origens, limita o corpo a 5,5 MB e aplica um limite básico por usuário no processo da função. Esse limite em memória é uma proteção inicial, não substitui rate limiting persistente no backend para produção.
